/**
 * Serviço que roda em background verificando sessões e adicionando listas automaticamente
 */

import { sessionMonitorService, type SessionData } from './sessionMonitorService'

class SessionVerifierService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private currentVerification: Promise<void> | null = null

  /**
   * Iniciar serviço de verificação em background
   */
  start() {
    if (this.isRunning) {
      console.log('[sessionVerifierService] Já está rodando')
      return
    }

    console.log('[sessionVerifierService] Iniciando serviço de verificação automática...')
    this.isRunning = true

    // Verificar a cada 10 minutos (reduz carga no sistema)
    this.intervalId = setInterval(() => {
      this.verificarSessoes()
    }, 10 * 60 * 1000) // 10 minutos

    // Verificar imediatamente na primeira execução
    this.verificarSessoes()
  }

  /**
   * Parar serviço
   */
  stop() {
    if (!this.isRunning) return

    console.log('[sessionVerifierService] Parando serviço...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Verificar sessões que precisam ser verificadas
   */
  private async verificarSessoes() {
    // Se já está verificando, aguardar
    if (this.currentVerification) {
      console.log('[sessionVerifierService] Verificação já em andamento, aguardando...')
      return
    }

    this.currentVerification = this.executeVerification()
    
    try {
      await this.currentVerification
    } catch (error) {
      console.error('[sessionVerifierService] Erro na verificação:', error)
    } finally {
      this.currentVerification = null
    }
  }

  /**
   * Executar verificação de sessões
   */
  private async executeVerification() {
    const sessions = sessionMonitorService.getSessionsToVerify()
    
    if (sessions.length === 0) {
      console.log('[sessionVerifierService] Nenhuma sessão precisa ser verificada')
      return
    }

    console.log(`[sessionVerifierService] Verificando ${sessions.length} sessão(ões)...`)

    // Selecionar sessão aleatória
    const randomIndex = Math.floor(Math.random() * sessions.length)
    const session = sessions[randomIndex]

    console.log(`[sessionVerifierService] Verificando sessão: ${session.sessionId}`)

    // Verificar se precisa aguardar intervalo
    if (session.ultimaVerificacao) {
      const ultimaVerificacao = new Date(session.ultimaVerificacao)
      const agora = new Date()
      const intervaloMs = session.intervaloVerificacao * 60 * 1000
      const tempoDecorrido = agora.getTime() - ultimaVerificacao.getTime()

      if (tempoDecorrido < intervaloMs) {
        const tempoRestante = Math.ceil((intervaloMs - tempoDecorrido) / 1000 / 60)
        console.log(`[sessionVerifierService] Aguardando ${tempoRestante} minuto(s) antes da próxima verificação`)
        return
      }
    }

    // Verificar cada conta da sessão (uma por vez)
    for (const accountId of session.accountIds) {
      // Verificar se já foram adicionadas todas as listas
      if (session.listaAdicionada) {
        console.log(`[sessionVerifierService] Todas as listas já foram adicionadas na sessão ${session.sessionId}`)
        continue
      }

      // Obter próxima lista a ser adicionada
      let listName = sessionMonitorService.getProximaLista(session.sessionId)
      
      // Se não houver próxima lista, tentar obter listas automaticamente
      if (!listName) {
        const listasParaAdicionar = await sessionMonitorService.obterListasParaAdicionar()
        if (listasParaAdicionar.length > 0) {
          listName = listasParaAdicionar[0]
          sessionMonitorService.updateSession(session.sessionId, {
            listasParaAdicionar,
            listName,
          })
          console.log(`[sessionVerifierService] Listas obtidas automaticamente para sessão ${session.sessionId}: ${listasParaAdicionar.join(', ')}`)
        } else {
          console.warn(`[sessionVerifierService] Sessão ${session.sessionId} não tem listas para adicionar`)
          continue
        }
      }

      try {
        console.log(`[sessionVerifierService] Verificando conta ${accountId} para adicionar lista ${listName}...`)

        if (!(window as any).electron?.sessionMonitor?.verificarEAdicionarListas) {
          console.error('[sessionVerifierService] API Electron não disponível')
          continue
        }

        const result = await (window as any).electron.sessionMonitor.verificarEAdicionarListas({
          accountId,
          listName,
          sessionId: session.sessionId,
        })

        if (result.success) {
          console.log(`[sessionVerifierService] ✅ Lista "${listName}" adicionada com sucesso na conta ${accountId}`)
          
          // Marcar lista como adicionada
          sessionMonitorService.markListAdded(session.sessionId, listName)
          
          // Marcar que grupos estão acima de 500
          sessionMonitorService.markGroupsAbove500(session.sessionId)
          
          // Verificar se há mais listas para adicionar nesta conta e adicionar todas em sequência
          let proximaLista = sessionMonitorService.getProximaLista(session.sessionId)
          
          while (proximaLista) {
            try {
              console.log(`[sessionVerifierService] Adicionando próxima lista "${proximaLista}" na conta ${accountId}...`)
              
              const resultProxima = await (window as any).electron.sessionMonitor.verificarEAdicionarListas({
                accountId,
                listName: proximaLista,
                sessionId: session.sessionId,
              })
              
              if (resultProxima.success) {
                console.log(`[sessionVerifierService] ✅ Lista "${proximaLista}" adicionada com sucesso na conta ${accountId}`)
                sessionMonitorService.markListAdded(session.sessionId, proximaLista)
                
                // Obter próxima lista
                proximaLista = sessionMonitorService.getProximaLista(session.sessionId)
              } else {
                console.error(`[sessionVerifierService] ❌ Erro ao adicionar lista "${proximaLista}":`, resultProxima.motivo || resultProxima.error)
                break // Parar se houver erro (não tem grupos com 500+)
              }
            } catch (error) {
              console.error(`[sessionVerifierService] Erro ao adicionar lista "${proximaLista}":`, error)
              break // Parar se houver erro
            }
          }
          
          console.log(`[sessionVerifierService] ✅ Processo de adicionar listas concluído na conta ${accountId}`)
          
          // Continuar para próxima conta
          continue
        } else {
          console.error(`[sessionVerifierService] ❌ Não foi possível adicionar lista "${listName}" na conta ${accountId}:`, result.motivo || result.error)
          
          // Falha - incrementar verificações e aguardar 30 minutos
          sessionMonitorService.incrementVerificacoes(session.sessionId)
          
          // Aguardar 30 minutos antes da próxima (conforme especificado)
          console.log('[sessionVerifierService] Aguardando 30 minutos antes da próxima verificação...')
          await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000))
        }
      } catch (error) {
        console.error(`[sessionVerifierService] Erro ao verificar conta ${accountId}:`, error)
        
        // Erro - incrementar verificações
        sessionMonitorService.incrementVerificacoes(session.sessionId)
      }
    }

    // Verificar se todas as contas da sessão já tiveram listas adicionadas
    // (isso seria verificado logicamente, mas por enquanto deixamos assim)
  }
}

// Instância única do serviço
export const sessionVerifierService = new SessionVerifierService()

// Iniciar automaticamente quando o módulo for carregado
if (typeof window !== 'undefined') {
  // Aguardar um pouco antes de iniciar para garantir que tudo está carregado
  setTimeout(() => {
    sessionVerifierService.start()
  }, 10000) // 10 segundos após carregar
}


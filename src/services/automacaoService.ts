import { Automacao, AutomacaoTipo, CriarGruposAutomacaoData, VerificarContasAutomacaoData, AdicionarListasAutomacaoData, EncherGruposAutomacaoData } from '@/types/Automacao'
import { soundNotificationService } from './soundNotificationService'
import { logService } from './logService'
import { sessionMonitorService } from './sessionMonitorService'

type QueueItem = 
  | { type: 'criar-grupos'; id: string; data: CriarGruposAutomacaoData }
  | { type: 'adicionar-listas'; id: string; data: AdicionarListasAutomacaoData }

class AutomacaoService {
  private automacoes: Map<string, Automacao> = new Map()
  private listeners: Set<(automacoes: Automacao[]) => void> = new Set()
  private verificarContasCompleteListeners: Set<() => void> = new Set()
  // Fila global para operações críticas (criar grupos e adicionar listas)
  private filaGlobal: QueueItem[] = []
  private operacaoCriticaEmExecucao: boolean = false

  // Gerar ID único
  private generateId(): string {
    return `automacao-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Notificar listeners
  private notifyListeners() {
    const automacoes = Array.from(this.automacoes.values())
    this.listeners.forEach((listener) => listener(automacoes))
  }

  // Inscrever-se em mudanças
  subscribe(callback: (automacoes: Automacao[]) => void) {
    this.listeners.add(callback)
    // Notificar imediatamente com o estado atual
    callback(Array.from(this.automacoes.values()))
    
    // Retornar função de unsubscribe
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Inscrever-se em conclusão de verificar contas
  onVerificarContasComplete(callback: () => void) {
    this.verificarContasCompleteListeners.add(callback)
    return () => {
      this.verificarContasCompleteListeners.delete(callback)
    }
  }

  // Notificar listeners de verificar contas completo
  private notifyVerificarContasComplete() {
    this.verificarContasCompleteListeners.forEach((listener) => listener())
    // Disparar evento global para que GruposList e outros componentes atualizem
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('verificacao-contas-completa'))
    }
  }

  // Obter todas as automações
  getAll(): Automacao[] {
    return Array.from(this.automacoes.values()).sort(
      (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    )
  }

  // Obter automação por ID
  getById(id: string): Automacao | undefined {
    return this.automacoes.get(id)
  }

  // Criar nova automação
  create(automacao: Omit<Automacao, 'id' | 'dataInicio' | 'status'>): Automacao {
    const novaAutomacao: Automacao = {
      ...automacao,
      id: this.generateId(),
      status: 'pendente',
      dataInicio: new Date().toISOString(),
    }
    
    this.automacoes.set(novaAutomacao.id, novaAutomacao)
    this.notifyListeners()
    return novaAutomacao
  }

  // Atualizar automação
  update(id: string, updates: Partial<Automacao>): void {
    const automacao = this.automacoes.get(id)
    if (!automacao) return

    const updated: Automacao = {
      ...automacao,
      ...updates,
      id: automacao.id, // Garantir que o ID não mude
    }

    // Se status mudou para concluída ou erro, adicionar dataFim
    const statusMudouParaFinal = (updates.status === 'concluida' || updates.status === 'erro' || updates.status === 'cancelada') && automacao.status !== updates.status
    if (statusMudouParaFinal && !updated.dataFim) {
      updated.dataFim = new Date().toISOString()
    }

    this.automacoes.set(id, updated)
    this.notifyListeners()

    // Adicionar log quando status muda
    if (statusMudouParaFinal) {
      const logLevel: 'success' | 'error' = updates.status === 'concluida' ? 'success' : 'error'
      const categoriaMap: Record<AutomacaoTipo, string> = {
        'criar-grupos': 'criar-grupos',
        'verificar-contas': 'verificar-contas',
        'adicionar-listas': 'adicionar-listas',
        'encher-grupos': 'encher-grupos',
        'clonador-vip': 'clonador-vip',
        'importar-videos': 'importar-videos',
        'outra': 'outra',
      }
      
      logService.addLog(
        logLevel,
        categoriaMap[updated.tipo],
        updates.status === 'concluida' 
          ? `Automação concluída: ${updated.titulo}`
          : `Automação com erro: ${updated.titulo}${updated.erro ? ` - ${updated.erro}` : ''}`,
        {
          automacaoId: updated.id,
          tipo: updated.tipo,
          resultado: updated.resultado,
        },
        updated.id
      )
    }

    // Reproduzir notificação sonora quando status muda para concluída ou erro
    // Apenas para tarefas importantes (criar grupos, verificar contas, adicionar listas, encher grupos, clonador VIP)
    if (statusMudouParaFinal && (updates.status === 'concluida' || updates.status === 'erro')) {
      const tiposImportantes: AutomacaoTipo[] = ['criar-grupos', 'verificar-contas', 'adicionar-listas', 'encher-grupos', 'clonador-vip']
      if (tiposImportantes.includes(updated.tipo)) {
        if (updates.status === 'concluida') {
          soundNotificationService.playSuccess().catch(err => {
            console.warn('[AutomacaoService] Erro ao reproduzir som de sucesso:', err)
          })
          
          // Incrementar contador de automações executadas no banco de dados
          try {
            if ((window as any).electron?.database?.incrementAutomacoes) {
              ;(window as any).electron.database.incrementAutomacoes(1).catch((dbError: any) => {
                console.warn('[AutomacaoService] Erro ao registrar automação no banco de dados:', dbError)
              })
            }
          } catch (dbError) {
            console.warn('[AutomacaoService] Erro ao registrar automação no banco de dados:', dbError)
          }
        } else if (updates.status === 'erro') {
          soundNotificationService.playError().catch(err => {
            console.warn('[AutomacaoService] Erro ao reproduzir som de erro:', err)
          })
        }
      }
    }
  }

  // Remover automação
  remove(id: string): void {
    this.automacoes.delete(id)
    this.notifyListeners()
  }

  // Iniciar automação de criar grupos
  async iniciarCriarGrupos(data: CriarGruposAutomacaoData): Promise<string> {
    // Buscar nome da categoria se categoriaId estiver presente
    let categoriaNome: string | undefined = undefined
    if (data.categoriaId) {
      try {
        if ((window as any).electron?.criador?.carregarCategorias) {
          const categorias = await (window as any).electron.criador.carregarCategorias()
          const categoria = categorias.find((c: any) => c.id === data.categoriaId)
          if (categoria) {
            categoriaNome = categoria.nome
          }
        }
      } catch (error) {
        console.warn('[automacaoService] Erro ao buscar nome da categoria:', error)
      }
    }

    const automacao = this.create({
      tipo: 'criar-grupos',
      titulo: `Criar ${data.quantidadeGrupos} grupo(s) em ${data.accountIds.length} conta(s)${data.sessoesParalelas && data.sessoesParalelas > 1 ? ` (${data.sessoesParalelas} sessões paralelas)` : ''}`,
      descricao: `Bots: ${data.bots.map(b => b.botName).join(', ')}`,
      categoriaId: data.categoriaId,
      categoriaNome,
      dados: data,
      progresso: {
        current: 0,
        total: data.accountIds.length * data.quantidadeGrupos,
      },
    })

    // Registrar sessão para monitoramento automático (lista será escolhida automaticamente)
    try {
      const sessionId = await sessionMonitorService.registerSession({
        accountIds: data.accountIds,
        tipo: 'criar-grupos',
        listName: data.listName, // Opcional: se não fornecida, escolherá uma lista aleatória
      })
      console.log('[automacaoService] Sessão registrada para monitoramento:', sessionId)
    } catch (error) {
      console.error('[automacaoService] Erro ao registrar sessão:', error)
    }

    // Adicionar à fila global de operações críticas
    this.filaGlobal.push({ type: 'criar-grupos', id: automacao.id, data })
    
    // Processar fila global
    this.processarFilaGlobal()
    
    return automacao.id
  }

  // Processar fila global de operações críticas (criar grupos e adicionar listas)
  private async processarFilaGlobal() {
    // Se já estiver em execução, não fazer nada
    if (this.operacaoCriticaEmExecucao) {
      console.log('[automacaoService] Fila global já está em execução, aguardando...')
      return
    }

    // Se não houver itens na fila, não fazer nada
    if (this.filaGlobal.length === 0) {
      console.log('[automacaoService] Fila global vazia')
      return
    }

    // Marcar como em execução
    this.operacaoCriticaEmExecucao = true
    console.log(`[automacaoService] Iniciando processamento da fila global (${this.filaGlobal.length} item(s) na fila)`)

    // Processar itens da fila sequencialmente (um por vez)
    while (this.filaGlobal.length > 0) {
      const item = this.filaGlobal.shift()
      if (!item) break

      console.log(`[automacaoService] Processando item da fila: ${item.type} (ID: ${item.id})`)

      try {
        if (item.type === 'criar-grupos') {
          await this.executarCriarGrupos(item.id, item.data)
        } else if (item.type === 'adicionar-listas') {
          await this.executarAdicionarListas(item.id, item.data)
        }
        console.log(`[automacaoService] Item ${item.id} processado com sucesso`)
      } catch (error) {
        console.error(`[automacaoService] Erro ao executar operação crítica ${item.id}:`, error)
        const status = 'erro'
        const erro = error instanceof Error ? error.message : 'Erro desconhecido'
        this.update(item.id, { status, erro })
      }
    }

    // Marcar como não em execução
    this.operacaoCriticaEmExecucao = false
    console.log('[automacaoService] Fila global processada completamente')
  }


  // Iniciar automação de verificar contas
  async iniciarVerificarContas(data: VerificarContasAutomacaoData): Promise<string> {
    const tipoVerificacao = data.tipo === 'advanced' ? 'Completa' : 'Básica'
    const automacao = this.create({
      tipo: 'verificar-contas',
      titulo: `Verificar ${tipoVerificacao} - ${data.accountIds.length} conta(s)`,
      descricao: `Verificação ${tipoVerificacao.toLowerCase()} do status das contas e grupos`,
      dados: data,
      progresso: {
        current: 0,
        total: data.accountIds.length,
      },
    })

    // Executar em background
    this.executarVerificarContas(automacao.id, data)
    
    return automacao.id
  }

  // Iniciar automação de encher grupos
  async iniciarEncherGrupos(data: EncherGruposAutomacaoData): Promise<string> {
    // Registrar sessão para monitoramento automático (lista será escolhida automaticamente)
    try {
      const sessionId = await sessionMonitorService.registerSession({
        accountIds: data.accountIds,
        tipo: 'encher-grupos',
        listName: data.listName, // Opcional: se não fornecida, escolherá uma lista aleatória
      })
      console.log('[automacaoService] Sessão registrada para monitoramento:', sessionId)
    } catch (error) {
      console.error('[automacaoService] Erro ao registrar sessão:', error)
    }

    const automacao = this.create({
      tipo: 'encher-grupos',
      titulo: `Encher grupos sem membros em ${data.accountIds.length} conta(s)`,
      descricao: 'Adicionando membros aos grupos vazios',
      dados: data,
      progresso: {
        current: 0,
        total: data.accountIds.length,
      },
    })

    // Executar em background
    this.executarEncherGrupos(automacao.id, data)
    
    return automacao.id
  }

  // Executar criar grupos em background
  private async executarCriarGrupos(id: string, data: CriarGruposAutomacaoData) {
    try {
      this.update(id, { status: 'em-andamento' })

      // Mapear bots para o formato esperado pelo backend
      const botsConfig = data.bots.map((botConfig) => {
        return {
          bot: {
            id: botConfig.botId,
            botId: botConfig.botId,
            botUsername: botConfig.botName,
            name: botConfig.botName,
            nicheId: botConfig.nicheId || '',
          },
          percentage: botConfig.porcentagem ? parseFloat(botConfig.porcentagem) : null,
        }
      })

      console.log('[automacaoService] Preparando payload:', {
        accountIds: data.accountIds,
        accountIdsLength: data.accountIds?.length || 0,
        accountIdsType: Array.isArray(data.accountIds) ? 'array' : typeof data.accountIds,
        sessoesParalelas: data.sessoesParalelas || 1,
      })

      if (!data.accountIds || !Array.isArray(data.accountIds) || data.accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada. Por favor, selecione pelo menos uma conta na tabela.')
      }

      const payload = {
        bots: botsConfig,
        groupCount: data.quantidadeGrupos, // Manter para compatibilidade
        gruposPorConta: data.gruposPorConta, // Novo: grupos específicos por conta
        accountIds: data.accountIds,
        autoDeleteTTL: 0,
        tipoGrupo: data.tipoGrupo || 'privado',
        criarBots: data.criarBots || false,
        quantidadeBots: data.quantidadeBots || undefined,
        botsDisparo: data.botsDisparo || [],
        botsExtras: data.botsExtras || [],
        memberProvider: data.painelSMM || null,
        serviceId: data.codigoServico || null,
        memberQuantity: data.quantidadeMembros || null,
        categoriaId: data.categoriaId || null,
        grupoNomesId: data.grupoNomesId || null,
        usarNomeSistema: data.usarNomeSistema ?? true,
        nomeEspecifico: data.nomeEspecifico || null,
        usarFotos: data.usarFotos || false,
        usarDescricao: data.usarDescricao || false,
        descricaoGrupo: data.descricaoGrupo || null,
        sessoesParalelas: data.sessoesParalelas || 1,
        proxyId: data.proxyId ?? null,
      }
      
      console.log('[automacaoService] Payload final:', {
        ...payload,
        accountIds: payload.accountIds,
        accountIdsLength: payload.accountIds.length,
        sessoesParalelas: payload.sessoesParalelas,
      })

      // Chamar handler IPC
      if (!window.electron?.grupos) {
        throw new Error('API Electron não disponível')
      }

      // Atualizar progresso inicial
      const totalTarefas = data.accountIds.length * data.quantidadeGrupos
      this.update(id, {
        progresso: {
          current: 0,
          total: totalTarefas,
          mensagem: 'Iniciando criação de grupos...',
        },
      })

      // Escutar eventos de progresso ANTES de iniciar
      const gruposApi = window.electron?.grupos as any
      if (gruposApi?.onProgresso) {
        gruposApi.onProgresso((progressData: any) => {
          // Atualizar progresso - aceitar qualquer progressData relacionado
          // O backend pode ou não enviar processId, mas vamos atualizar sempre
          this.update(id, {
            progresso: {
              current: progressData.completed || 0,
              total: progressData.total || totalTarefas,
              mensagem: progressData.message || `Processando... (${progressData.completed || 0}/${progressData.total || totalTarefas})`,
            },
          })
        })
      }

      const result = await window.electron.grupos.criar(payload) as any
      
      // Remover listener após conclusão
      if (gruposApi?.removeProgresso) {
        gruposApi.removeProgresso()
      }

      // Verificar se é erro de contas grupo base ANTES de processar resultado
      if (!result.success && (result.error === 'CONTAS_GRUPO_BASE' || result.detalhes?.error === 'CONTAS_GRUPO_BASE')) {
        const errorObj: any = new Error(result.mensagem || result.error || 'Contas de grupo base detectadas')
        errorObj.error = 'CONTAS_GRUPO_BASE'
        errorObj.contasGrupoBase = result.contasGrupoBase || result.detalhes?.contasGrupoBase || []
        errorObj.mensagem = result.mensagem || result.detalhes?.mensagem || 'Contas de grupo base detectadas'
        throw errorObj
      }

      if (result.success) {
        // Mesmo com sucesso, pode haver alguns erros
        const errorCount = result.errorCount || 0
        const mensagem = errorCount > 0
          ? `${result.successCount || 0} grupos criados, ${errorCount} erro(s) encontrado(s)`
          : `${result.successCount || 0} grupos criados com sucesso`
        
        this.update(id, {
          status: errorCount > 0 ? 'erro' : 'concluida',
          erro: errorCount > 0 ? `Alguns grupos falharam. ${errorCount} erro(s).` : undefined,
          resultado: {
            sucesso: errorCount === 0,
            mensagem,
            detalhes: result,
          },
          progresso: {
            current: data.accountIds.length * data.quantidadeGrupos,
            total: data.accountIds.length * data.quantidadeGrupos,
          },
        })
      } else {
        // Construir mensagem de erro detalhada
        let errorMessage = result.error || 'Erro ao criar grupos'
        
        if (result.errorsList && result.errorsList.length > 0) {
          const errorsSummary = result.errorsList
            .slice(0, 5) // Mostrar apenas os 5 primeiros erros
            .map((err: any) => {
              if (typeof err === 'string') return err
              if (err.error && err.accountId) {
                return `Conta ${err.accountId}: ${err.error}`
              }
              return err.error || JSON.stringify(err)
            })
            .join('; ')
          
          errorMessage = `${errorMessage}\n\nErros encontrados:\n${errorsSummary}`
          
          if (result.errorsList.length > 5) {
            errorMessage += `\n... e mais ${result.errorsList.length - 5} erro(s)`
          }
        }
        
        this.update(id, {
          status: 'erro',
          erro: errorMessage,
          resultado: {
            sucesso: false,
            mensagem: errorMessage,
            detalhes: result,
          },
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      const errorStack = error instanceof Error ? error.stack : ''
      const logs = [
        `[${new Date().toLocaleString('pt-BR')}] [ERROR] Erro ao executar criação de grupos`,
        `[${new Date().toLocaleString('pt-BR')}] [ERROR] ${errorMessage}`,
        ...(errorStack ? [`[${new Date().toLocaleString('pt-BR')}] [ERROR] Stack: ${errorStack}`] : [])
      ]
      
      this.update(id, {
        status: 'erro',
        erro: errorMessage,
        resultado: {
          sucesso: false,
          mensagem: errorMessage,
        },
        logs: logs.length > 0 ? logs : undefined,
      })
    }
  }

  // Iniciar automação de adicionar listas
  async iniciarAdicionarListas(data: AdicionarListasAutomacaoData): Promise<string> {
    // Suportar tanto listName (antigo) quanto listNames (novo)
    const listasParaProcessar = data.listNames && data.listNames.length > 0 
      ? data.listNames 
      : (data.listName ? [data.listName] : [])
    
    const quantidadeListas = listasParaProcessar.length
    const quantidadeContas = data.accountIds.length
    const sessoesParalelas = data.sessoesParalelas || 1
    
    // Buscar categoria/nome das listas selecionadas para exibição
    let categoriaNome: string | undefined = undefined
    try {
      if (listasParaProcessar.length > 0) {
        if (quantidadeListas === 1) {
          // Se for apenas uma lista, usar o nome da lista como categoria
          categoriaNome = listasParaProcessar[0]
        } else if (quantidadeListas <= 3) {
          // Se houver até 3 listas, mostrar os nomes separados por vírgula
          categoriaNome = listasParaProcessar.slice(0, 3).join(', ')
        } else {
          // Se houver mais de 3 listas, mostrar quantidade
          categoriaNome = `${quantidadeListas} listas: ${listasParaProcessar.slice(0, 2).join(', ')}...`
        }
      }
    } catch (error) {
      console.warn('[automacaoService] Erro ao formatar categoria das listas:', error)
    }
    
    // Criar título consolidado
    const titulo = `Colocando listas em ${quantidadeContas} conta(s)${sessoesParalelas > 1 ? ` (${sessoesParalelas} sessões paralelas)` : ''}`
    
    const descricao = quantidadeListas > 1
      ? `Adicionando bots de ${quantidadeListas} lista(s) aos grupos`
      : `Adicionando bots da lista ${listasParaProcessar[0] || 'N/A'} aos grupos`
    
    const automacao = this.create({
      tipo: 'adicionar-listas',
      titulo,
      descricao,
      categoriaNome, // Incluir categoria se encontrada
      dados: data,
      progresso: {
        current: 0,
        total: quantidadeContas, // Uma tarefa por conta (cada conta processa todas as listas)
      },
    })

    // Adicionar à fila global de operações críticas
    this.filaGlobal.push({ type: 'adicionar-listas', id: automacao.id, data })
    
    // Processar fila global
    this.processarFilaGlobal()
    
    return automacao.id
  }

  // Executar adicionar listas em background
  private async executarAdicionarListas(id: string, data: AdicionarListasAutomacaoData) {
    try {
      this.update(id, { status: 'em-andamento' })
      console.log('[automacaoService] Executando adicionar listas (fila global)')

      // Chamar handler IPC
      if (!window.electron?.telegram) {
        throw new Error('API Electron não disponível')
      }

      // Atualizar progresso inicial
      const totalTarefas = data.accountIds.length
      this.update(id, {
        progresso: {
          current: 0,
          total: totalTarefas,
          mensagem: 'Iniciando adição de bots...',
        },
      })

      // Escutar eventos de progresso ANTES de iniciar
      const telegramApi = window.electron?.telegram as any
      if (telegramApi?.onProgresso) {
        telegramApi.onProgresso((progressData: any) => {
          this.update(id, {
            progresso: {
              current: progressData.completed || 0,
              total: progressData.total || totalTarefas,
              mensagem: progressData.message || `Processando... (${progressData.completed || 0}/${progressData.total || totalTarefas})`,
              activeWorkers: progressData.activeWorkers,
              averageTime: progressData.averageTime,
              estimatedTimeRemaining: progressData.estimatedTimeRemaining,
              currentTask: progressData.currentTask,
            },
          })
        })
      }

      // Suportar tanto listName (antigo) quanto listNames (novo)
      const listasParaProcessar = data.listNames && data.listNames.length > 0 
        ? data.listNames 
        : (data.listName ? [data.listName] : [])

      const result = await (window.electron.telegram.adicionarListas as any)({
        accountIds: data.accountIds,
        listNames: listasParaProcessar, // Passar todas as listas de uma vez
        sessoesParalelas: data.sessoesParalelas || 1,
        proxyId: data.proxyId || null,
      })
      
      // Verificar se é erro de contas grupo base
      if (!result.success && (result.error === 'CONTAS_GRUPO_BASE' || result.detalhes?.error === 'CONTAS_GRUPO_BASE')) {
        const errorObj: any = new Error(result.mensagem || result.error || 'Contas de grupo base detectadas')
        errorObj.error = 'CONTAS_GRUPO_BASE'
        errorObj.contasGrupoBase = result.contasGrupoBase || result.detalhes?.contasGrupoBase || []
        errorObj.mensagem = result.mensagem || result.detalhes?.mensagem || 'Contas de grupo base detectadas'
        throw errorObj
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao adicionar listas')
      }
      
      // Remover listener após conclusão
      if (telegramApi?.removeProgresso) {
        telegramApi.removeProgresso()
      }

      // Verificar se result existe antes de acessar suas propriedades
      if (!result) {
        throw new Error('Resposta inválida do handler IPC')
      }

      // Verificar se há erros mesmo que success seja true (pode ser sucesso parcial)
      const errorsList = result.errorsList || result.errors || []
      const hasErrorsList = Array.isArray(errorsList) && errorsList.length > 0
      const totalBotsAdded = result.totalBotsAdded || 0
      const totalErrors = errorsList.length

      if (result.success && !hasErrorsList) {
        // Sucesso total: sem erros
        this.update(id, {
          status: 'concluida',
          progresso: {
            current: data.accountIds.length,
            total: data.accountIds.length,
            mensagem: 'Concluído',
          },
          resultado: {
            sucesso: true,
            mensagem: `${totalBotsAdded} bot(s) adicionado(s) com sucesso`,
            detalhes: result,
          },
        })
      } else if (result.success && hasErrorsList) {
        // Sucesso parcial: alguns bots adicionados, mas há erros
        const errorMessage = totalErrors > 0 
          ? `${totalBotsAdded} bot(s) adicionado(s), ${totalErrors} erro(s) encontrado(s)`
          : `${totalBotsAdded} bot(s) adicionado(s) com sucesso (com avisos)`
        
        this.update(id, {
          status: 'concluida',
          progresso: {
            current: data.accountIds.length,
            total: data.accountIds.length,
            mensagem: 'Concluído com erros',
          },
          resultado: {
            sucesso: true,
            mensagem: errorMessage,
            detalhes: {
              ...result,
              errorsList: errorsList,
            },
          },
        })
      } else {
        // Erro total ou parcial
        const errorSummary = hasErrorsList && errorsList.length > 0
          ? errorsList.slice(0, 3).map((err: any) => {
              if (typeof err === 'string') return err
              if (err.accountId && err.error) return `Conta ${err.accountId}: ${err.error}`
              if (err.error) return err.error
              return JSON.stringify(err)
            }).join('; ')
          : result.error || 'Erro desconhecido'
        
        const errorMessage = totalErrors > 0
          ? `${totalErrors} erro(s) encontrado(s)${errorSummary ? `: ${errorSummary}${errorsList.length > 3 ? '...' : ''}` : ''}`
          : (result.error || 'Erro ao adicionar listas')
        
        this.update(id, {
          status: 'erro',
          erro: errorMessage,
          resultado: {
            sucesso: false,
            mensagem: errorMessage,
            detalhes: {
              ...result,
              errorsList: errorsList,
            },
          },
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      this.update(id, {
        status: 'erro',
        erro: errorMessage,
        resultado: {
          sucesso: false,
          mensagem: errorMessage,
        },
      })
    }
    // Não precisa chamar processarFilaGlobal() aqui - o loop while no processarFilaGlobal já processa o próximo item automaticamente
  }

  // Executar verificar contas em background
  private async executarVerificarContas(id: string, data: VerificarContasAutomacaoData) {
    try {
      this.update(id, { status: 'em-andamento' })

      // Configurar listener de progresso
      if (window.electron?.telegram?.onVerificarContasProgress) {
        window.electron.telegram.onVerificarContasProgress((progress: {
          current: number
          total: number
          currentAccount?: string
          activeWorkers?: number
          averageTime?: number
          estimatedTimeRemaining?: number
          queueLength?: number
        }) => {
          this.update(id, {
            progresso: {
              current: progress.current,
              total: progress.total,
              mensagem: progress.currentAccount,
              activeWorkers: progress.activeWorkers,
              averageTime: progress.averageTime,
              estimatedTimeRemaining: progress.estimatedTimeRemaining,
            },
          })
        })
      }

      // Chamar handler IPC
      if (!window.electron?.telegram?.verificarContas) {
        throw new Error('API Electron não disponível')
      }

      const normalizeOptions = (options: string[]) => {
        const normalized = new Set(options)
        if (normalized.has('configurarContaNova')) {
          return ['configurarContaNova']
        }
        if (normalized.has('syncGroups')) {
          normalized.delete('syncGroups')
          normalized.add('listGroups')
          normalized.add('updateMembers')
          normalized.add('updateBots')
          normalized.add('checkGroupsOnline')
        }
        if (normalized.has('verifyForUse')) {
          normalized.delete('verifyForUse')
          normalized.add('detectBannedFrozen')
          normalized.add('detectFrozen')
          normalized.add('detectSpam')
          normalized.add('testChannel')
          normalized.add('checkBotFatherBots')
        }
        if (normalized.has('checkGroupsOnline')) {
          normalized.add('listGroups')
        }
        return Array.from(normalized)
      }
      
      // Se options foi fornecido, usar options; caso contrário, usar tipo (compatibilidade retroativa)
      const verificationOptions = normalizeOptions(
        data.options && data.options.length > 0 
        ? data.options 
        : (data.tipo === 'advanced' 
          ? ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots', 'checkGroupsOnline', 'detectSpam', 'detectFrozen', 'testChannel', 'checkBotFatherBots']
          : ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots', 'checkGroupsOnline'])
      )

      const result = await (window.electron?.telegram?.verificarContas as any)?.(
        data.accountIds,
        verificationOptions,
        data.sessoesParalelas || 1,
        data.proxyId || null,
        data.criarApiAposVerificacao || false
      )

      // Remover listener
      if (window.electron?.telegram?.removeVerificarContasProgress) {
        window.electron.telegram.removeVerificarContasProgress()
      }

      // Preparar logs para armazenar
      const logs = result.logs || []

      // Verificar tanto result.results quanto result.detalhes (pode vir de diferentes fontes)
      // O resultado pode estar em result.results, result.detalhes ou diretamente em result (array)
      let resultsArray: any[] = []
      if (Array.isArray(result)) {
        // Se result é diretamente um array
        resultsArray = result
      } else if (Array.isArray(result.results)) {
        resultsArray = result.results
      } else if (Array.isArray(result.detalhes)) {
        resultsArray = result.detalhes
      } else if (result.detalhes && Array.isArray(result.detalhes)) {
        resultsArray = result.detalhes
      }
      
      const hasResults = resultsArray.length > 0
      const hasErrors = result.errors && Array.isArray(result.errors) && result.errors.length > 0
      const totalProcessed = result.totalProcessed !== undefined ? result.totalProcessed : (hasResults ? resultsArray.length : 0)
      const totalErrors = result.totalErrors !== undefined ? result.totalErrors : (hasErrors ? result.errors.length : 0)
      
      // Verificar se TODAS as contas nos detalhes têm success: true
      const allAccountsSuccessful = hasResults && resultsArray.length > 0 && 
        resultsArray.every((item: any) => item.success === true)
      
      // Verificar se há pelo menos uma conta com success: true
      const hasSuccessfulAccounts = hasResults && resultsArray.some((item: any) => item.success === true)
      
      // Verificar quantas APIs foram criadas com sucesso (se estava criando APIs)
      const apisCriadasComSucesso = hasResults ? resultsArray.filter((item: any) => item.apiCreated === true).length : 0
      const apisComErro = hasResults ? resultsArray.filter((item: any) => item.apiCreated === false && item.apiError).length : 0
      const tentouCriarApi = hasResults ? resultsArray.some((item: any) => item.hasOwnProperty('apiCreated')) : false
      
      // Debug: Log do resultado recebido
      console.log('[automacaoService] Resultado da verificação:', {
        resultSuccess: result.success,
        hasResults,
        resultsArrayLength: resultsArray.length,
        hasErrors,
        totalErrors,
        allAccountsSuccessful,
        hasSuccessfulAccounts,
        totalProcessed,
        apisCriadasComSucesso,
        apisComErro,
        tentouCriarApi,
        resultKeys: Object.keys(result),
        firstResult: resultsArray[0],
        allResultsHaveSuccess: resultsArray.map((r: any) => ({ 
          accountId: r.accountId, 
          success: r.success 
        }))
      })
      
      // REGRA PRINCIPAL: 
      // Se TODAS as contas nos resultados têm success: true, é SUCESSO (mesmo que result.success seja false)
      // Isso corrige o caso onde todas as contas foram verificadas com sucesso mas result.success está false por algum motivo
      const isSuccess = allAccountsSuccessful || 
                       (result.success === true && hasResults) ||
                       (hasSuccessfulAccounts && totalProcessed > 0 && totalErrors === 0) ||
                       (hasResults && !hasErrors && totalErrors === 0)

      const buildResumoVerificacao = (items: any[]) => {
        const totalSessoes = items.length
        const totalGrupos = items.reduce((acc, item) => acc + (item.groupsTotal || item.groupsProcessed || 0), 0)
        const gruposOnline = items.reduce((acc, item) => acc + (item.groupsOnline || 0), 0)
        const gruposOffline = items.reduce((acc, item) => acc + (item.groupsOffline || 0), 0)
        const prontasParaUso = items.filter((item: any) => {
          return item.success === true &&
            !item.banned &&
            !item.frozen &&
            !item.restricted &&
            !item.spam &&
            !item.botfatherBlocked
        }).length
        const bots = items.flatMap((item: any) => {
          if (!Array.isArray(item.botFatherBots)) return []
          return item.botFatherBots.map((bot: any) => ({
            accountId: item.accountId,
            name: bot.name || null,
            username: bot.username || null,
            token: bot.token || null,
            error: bot.error || null
          }))
        })

        const contasComUsername = items
          .filter((item: any) => item.username && item.accountId)
          .map((item: any) => ({
            accountId: item.accountId,
            username: item.username
          }))

        return {
          totalSessoes,
          totalGrupos,
          gruposOnline,
          gruposOffline,
          prontasParaUso,
          bots,
          contasComUsername
        }
      }

      const emitResumo = async (items: any[]) => {
        if (typeof window === 'undefined') return
        const resumo = buildResumoVerificacao(items)
        
        // Salvar bots encontrados com token na aba de Bots automaticamente
        if (resumo.bots && resumo.bots.length > 0) {
          const botsComToken = resumo.bots.filter((bot: any) => bot.token)
          if (botsComToken.length > 0) {
            console.log(`[automacaoService] 🤖 Salvando ${botsComToken.length} bot(s) encontrado(s) automaticamente...`)
            try {
              // Chamar API do Electron para salvar os bots
              if ((window as any).electron?.botMidia?.salvarBotsVerificacao) {
                const saveResult = await (window as any).electron.botMidia.salvarBotsVerificacao(botsComToken)
                if (saveResult?.success) {
                  console.log(`[automacaoService] ✅ ${saveResult.savedCount || 0} bot(s) salvo(s) na aba de Bots`)
                }
              } else {
                console.log('[automacaoService] ⚠️ API de salvar bots não disponível, salvando via categoria padrão...')
                // Fallback: salvar via salvar-bot-midia individual
                for (const bot of botsComToken) {
                  try {
                    if ((window as any).electron?.botMidia?.salvar) {
                      await (window as any).electron.botMidia.salvar(
                        bot.name || `@${bot.username}` || 'Bot sem nome',
                        bot.token,
                        null, // nichoId
                        'Bots Encontrados' // categoriaId
                      )
                    }
                  } catch (e) {
                    console.warn(`[automacaoService] Erro ao salvar bot ${bot.username}:`, e)
                  }
                }
              }
            } catch (error) {
              console.error('[automacaoService] Erro ao salvar bots encontrados:', error)
            }
          }
        }
        
        window.dispatchEvent(new CustomEvent('verificacao-contas-resumo', { detail: resumo }))
      }
      
      console.log('[automacaoService] Decisão de sucesso:', {
        isSuccess,
        reason: allAccountsSuccessful ? 'allAccountsSuccessful (todas as contas têm success: true)' :
                result.success === true && hasResults ? 'result.success === true && hasResults' :
                (hasSuccessfulAccounts && totalProcessed > 0 && totalErrors === 0) ? 'hasSuccessfulAccounts && totalProcessed > 0 && totalErrors === 0' :
                (hasResults && !hasErrors && totalErrors === 0) ? 'hasResults && !hasErrors && totalErrors === 0' :
                'nenhuma condição atendida',
        details: {
          resultSuccess: result.success,
          allAccountsSuccessful,
          hasResults,
          hasErrors,
          totalProcessed,
          totalErrors,
          resultsCount: resultsArray.length
        }
      })

      if (isSuccess) {
        // Construir mensagem detalhada
        let mensagem = `${totalProcessed} conta(s) verificada(s)`
        if (tentouCriarApi) {
          if (apisCriadasComSucesso > 0) {
            mensagem += `, ${apisCriadasComSucesso} API(s) criada(s) com sucesso`
          }
          if (apisComErro > 0) {
            mensagem += `, ${apisComErro} API(s) com erro (possível timeout/rate limit do Telegram)`
          }
        }
        if (totalErrors > 0) {
          mensagem += `, ${totalErrors} erro(s) na verificação`
        }
        
        this.update(id, {
          status: 'concluida',
          logs: logs.length > 0 ? logs : undefined,
          resultado: {
            sucesso: true,
            mensagem: mensagem,
            detalhes: resultsArray || result,
          },
          progresso: {
            current: data.accountIds.length,
            total: data.accountIds.length,
          },
        })
        emitResumo(resultsArray)
        // Notificar que a verificação foi concluída para recarregar contas
        // Adicionar um pequeno delay para garantir que os arquivos foram escritos completamente
        setTimeout(() => {
          this.notifyVerificarContasComplete()
        }, 500)
      } else {
        // Construir mensagem de erro mais detalhada
        let errorMessage = result.error || 'Erro ao verificar contas'
        
        // Se há resultados mas foram marcados como erro, tentar entender o motivo
        if (hasResults) {
          const failedAccounts = resultsArray.filter((item: any) => item.success === false)
          const successfulAccounts = resultsArray.filter((item: any) => item.success === true)
          
          if (successfulAccounts.length > 0 && failedAccounts.length === 0) {
            // Todas as contas têm success: true mas result.success é false
            // Provavelmente um problema na lógica do handler, considerar como sucesso parcial
            console.warn('[automacaoService] Todas as contas têm success: true mas result.success é false. Tratando como sucesso parcial.')
            this.update(id, {
              status: 'concluida',
              logs: logs.length > 0 ? logs : undefined,
              resultado: {
                sucesso: true,
                mensagem: `${successfulAccounts.length} conta(s) verificada(s) com sucesso`,
                detalhes: resultsArray || result.results || result.detalhes || result,
              },
              progresso: {
                current: data.accountIds.length,
                total: data.accountIds.length,
              },
            })
            emitResumo(resultsArray)
            setTimeout(() => {
              this.notifyVerificarContasComplete()
            }, 500)
            return
          } else if (failedAccounts.length > 0) {
            errorMessage = `${failedAccounts.length} conta(s) falharam na verificação`
          }
        }
        
        this.update(id, {
          status: 'erro',
          erro: errorMessage,
          logs: logs.length > 0 ? logs : undefined,
          resultado: {
            sucesso: false,
            mensagem: errorMessage,
            detalhes: resultsArray.length > 0 ? resultsArray : (result.results || result.detalhes || result),
          },
        })
        if (hasResults) {
          emitResumo(resultsArray)
        }
        // Mesmo em caso de erro total, tentar recarregar (pode ter havido atualizações parciais)
        setTimeout(() => {
          this.notifyVerificarContasComplete()
        }, 500)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      const errorStack = error instanceof Error ? error.stack : ''
      const logs = [
        `[${new Date().toLocaleString('pt-BR')}] [ERROR] Erro ao executar verificação de contas`,
        `[${new Date().toLocaleString('pt-BR')}] [ERROR] ${errorMessage}`,
        ...(errorStack ? [`[${new Date().toLocaleString('pt-BR')}] [ERROR] Stack: ${errorStack}`] : [])
      ]
      
      this.update(id, {
        status: 'erro',
        erro: errorMessage,
        logs: logs.length > 0 ? logs : undefined,
        resultado: {
          sucesso: false,
          mensagem: errorMessage,
        },
      })
    }
  }

  // Executar encher grupos em background
  private async executarEncherGrupos(id: string, data: EncherGruposAutomacaoData) {
    try {
      this.update(id, { status: 'em-andamento' })

      // Chamar handler IPC
      if (!window.electron?.grupos) {
        throw new Error('API Electron não disponível')
      }

      // Atualizar progresso inicial
      this.update(id, {
        progresso: {
          current: 0,
          total: data.accountIds.length,
          mensagem: 'Iniciando processo de encher grupos...',
        },
      })

      // Escutar progresso de encher grupos
      const gruposApi = window.electron?.grupos as typeof window.electron.grupos & {
        onEncherGruposProgresso: (callback: (data: any) => void) => void;
        removeEncherGruposProgresso: () => void;
      }
      
      if (gruposApi?.onEncherGruposProgresso) {
        gruposApi.onEncherGruposProgresso((progressData: any) => {
          const automacao = this.automacoes.get(id)
          if (automacao && automacao.status === 'em-andamento') {
            // Se tem sessionId, é uma sessão (lote de pedidos)
            if (progressData.sessionId) {
              this.update(id, {
                progresso: {
                  current: progressData.pedidosCompletos || 0,
                  total: progressData.totalPedidos || 0,
                  mensagem: progressData.sessaoCompleta 
                    ? `✅ Todos os pedidos da sessão completaram! (${progressData.pedidosCompletos}/${progressData.totalPedidos})`
                    : `Monitorando sessão... (${progressData.pedidosCompletos}/${progressData.totalPedidos} pedidos completos)`,
                  gruposCompletos: progressData.pedidosCompletos,
                  mediaMembros: progressData.mediaMembros,
                },
              })
              
              // Se a sessão completa, tocar 4 bips longos
              if (progressData.sessaoCompleta && progressData.finalizado) {
                this.update(id, {
                  status: 'concluida',
                  progresso: {
                    current: progressData.totalPedidos,
                    total: progressData.totalPedidos,
                    mensagem: `✅ Todos os ${progressData.totalPedidos} pedido(s) da sessão completaram!`,
                    gruposCompletos: progressData.pedidosCompletos,
                    mediaMembros: progressData.mediaMembros,
                  },
                  resultado: {
                    sucesso: true,
                    mensagem: `Todos os ${progressData.totalPedidos} pedido(s) foram finalizados com sucesso!`,
                    detalhes: progressData,
                  },
                })
                
                // Tocar 4 bips longos quando a sessão completar
                soundNotificationService.playGruposEnchidos().catch(err => {
                  console.warn('[AutomacaoService] Erro ao reproduzir notificação de grupos enchidos:', err)
                })
                
                if (gruposApi?.removeEncherGruposProgresso) {
                  gruposApi.removeEncherGruposProgresso()
                }
              }
            } else {
              // Sistema antigo (compatibilidade)
              this.update(id, {
                progresso: {
                  current: progressData.completos || 0,
                  total: progressData.total || 0,
                  mensagem: progressData.todosCompletos 
                    ? `✅ Todos os grupos completaram! (${progressData.completos}/${progressData.total})`
                    : `Monitorando grupos... (${progressData.completos}/${progressData.total} completos)`,
                  gruposCompletos: progressData.completos,
                  mediaMembros: progressData.mediaMembros,
                },
              })
              
              if (progressData.todosCompletos && progressData.finalizado) {
                this.update(id, {
                  status: 'concluida',
                  progresso: {
                    current: progressData.total,
                    total: progressData.total,
                    mensagem: `✅ Todos os ${progressData.total} grupo(s) completaram!`,
                    gruposCompletos: progressData.completos,
                    mediaMembros: progressData.mediaMembros,
                  },
                  resultado: {
                    sucesso: true,
                    mensagem: `Todos os ${progressData.total} grupo(s) foram enchidos com sucesso!`,
                    detalhes: progressData,
                  },
                })
                
                soundNotificationService.playGruposEnchidos().catch(err => {
                  console.warn('[AutomacaoService] Erro ao reproduzir notificação de grupos enchidos:', err)
                })
                
                if (gruposApi?.removeEncherGruposProgresso) {
                  gruposApi.removeEncherGruposProgresso()
                }
              }
            }
          }
        })
      }

      const result = await (window.electron?.grupos as any)?.encherGrupos?.({
        accountIds: data.accountIds,
        painelSMM: data.painelSMM,
        codigoServico: data.codigoServico,
        quantidadeMembros: data.quantidadeMembros,
      })

      // Verificar se result existe antes de acessar suas propriedades
      if (!result) {
        throw new Error('Resposta inválida do handler IPC')
      }

      if (result.success) {
        // Não marcar como concluída imediatamente - aguardar todos os grupos completarem
        // O status será atualizado quando receber o evento de todos completos
        this.update(id, {
          progresso: {
            current: result.gruposEnchidos || 0,
            total: result.gruposEnchidos || 0,
            mensagem: `Pedidos criados. Monitorando progresso... (${result.gruposEnchidos} grupo(s))`,
          },
          resultado: {
            sucesso: true,
            mensagem: `${result.gruposEnchidos || 0} pedido(s) criado(s). Aguardando conclusão...`,
            detalhes: result,
          },
        })
      } else {
        this.update(id, {
          status: 'erro',
          erro: result.error || 'Erro desconhecido',
          resultado: {
            sucesso: false,
            mensagem: result.error || 'Erro ao encher grupos',
            detalhes: result,
          },
        })
      }
    } catch (error) {
      this.update(id, {
        status: 'erro',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        resultado: {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      })
    }
  }


  // Cancelar automação
  cancelar(id: string): void {
    const automacao = this.automacoes.get(id)
    if (!automacao || automacao.status === 'concluida' || automacao.status === 'erro') {
      return
    }

    this.update(id, {
      status: 'cancelada',
      dataFim: new Date().toISOString(),
    })
  }
}

export const automacaoService = new AutomacaoService()


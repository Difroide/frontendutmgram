/**
 * Serviço para monitorar sessões de encher grupos e adicionar listas automaticamente
 */

export interface SessionData {
  sessionId: string
  accountIds: string[]
  tipo: 'criar-grupos' | 'encher-grupos'
  dataInicio: string
  listName?: string // Nome da primeira lista a ser adicionada (será escolhida automaticamente se não fornecido)
  listasParaAdicionar?: string[] // Array de listas para adicionar (2 prioritárias + LISTA 1)
  listasAdicionadas?: string[] // Listas já adicionadas
  verificacoes: number // Contador de verificações
  ultimaVerificacao?: string
  gruposAcima500?: boolean // Se algum grupo já passou de 500 membros
  listaAdicionada?: boolean // Se todas as listas já foram adicionadas
  intervaloVerificacao: number // Intervalo em minutos (inicial: 30, reduzido: 20, aumentado: 60)
}

export interface ListaBots {
  id: string
  listName: string
  bots: string[]
  prioritaria?: boolean
  createdAt: string
}

const STORAGE_KEY = 'session-monitor-sessions'

export const sessionMonitorService = {
  /**
   * Registrar uma nova sessão para monitoramento
   * Se listasParaAdicionar não for fornecida, será escolhida automaticamente: 2 prioritárias + LISTA 1
   */
  async registerSession(data: Omit<SessionData, 'sessionId' | 'dataInicio' | 'verificacoes' | 'intervaloVerificacao' | 'listasAdicionadas'>): Promise<string> {
    const sessions = this.getAllSessions()
    
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Se não houver listasParaAdicionar, obter automaticamente (2 prioritárias + LISTA 1)
    let listasParaAdicionar = data.listasParaAdicionar
    if (!listasParaAdicionar || listasParaAdicionar.length === 0) {
      listasParaAdicionar = await this.obterListasParaAdicionar()
      if (listasParaAdicionar.length === 0) {
        console.warn('[sessionMonitorService] Não foi possível obter listas. Sessão será registrada sem listas.')
      }
    }
    
    // Definir listName como primeira lista (para compatibilidade)
    const listName = listasParaAdicionar && listasParaAdicionar.length > 0 ? listasParaAdicionar[0] : data.listName
    
    const newSession: SessionData = {
      sessionId,
      ...data,
      listName,
      listasParaAdicionar,
      listasAdicionadas: [],
      dataInicio: new Date().toISOString(),
      verificacoes: 0,
      intervaloVerificacao: 30, // Inicial: 30 minutos
    }
    
    sessions.push(newSession)
    this.saveSessions(sessions)
    
    console.log('[sessionMonitorService] Nova sessão registrada:', sessionId, 
      listasParaAdicionar && listasParaAdicionar.length > 0 
        ? `(${listasParaAdicionar.length} lista(s): ${listasParaAdicionar.join(', ')})` 
        : '(sem listas)')
    return sessionId
  },

  /**
   * Obter todas as sessões
   */
  getAllSessions(): SessionData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      return JSON.parse(stored)
    } catch (error) {
      console.error('[sessionMonitorService] Erro ao carregar sessões:', error)
      return []
    }
  },

  /**
   * Obter sessão por ID
   */
  getSessionById(sessionId: string): SessionData | null {
    const sessions = this.getAllSessions()
    return sessions.find(s => s.sessionId === sessionId) || null
  },

  /**
   * Obter sessões que precisam ser verificadas (após 1 hora)
   */
  getSessionsToVerify(): SessionData[] {
    const sessions = this.getAllSessions()
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000) // 1 hora atrás
    
    return sessions.filter(session => {
      // Filtrar sessões que já foram verificadas e têm lista adicionada
      if (session.listaAdicionada) return false
      
      // Filtrar sessões que já passaram de 1 hora desde o início
      const dataInicio = new Date(session.dataInicio)
      return dataInicio <= oneHourAgo
    })
  },

  /**
   * Atualizar sessão
   */
  updateSession(sessionId: string, updates: Partial<SessionData>): boolean {
    const sessions = this.getAllSessions()
    const index = sessions.findIndex(s => s.sessionId === sessionId)
    
    if (index === -1) return false
    
    sessions[index] = {
      ...sessions[index],
      ...updates,
    }
    
    this.saveSessions(sessions)
    return true
  },

  /**
   * Incrementar contador de verificações
   */
  incrementVerificacoes(sessionId: string): void {
    const session = this.getSessionById(sessionId)
    if (!session) return
    
    const novasVerificacoes = session.verificacoes + 1
    
    // Lógica de timing adaptativo
    let novoIntervalo = session.intervaloVerificacao
    
    // Se já tem grupos acima de 500, reduzir para 20 minutos
    if (session.gruposAcima500) {
      novoIntervalo = 20
    }
    // Se após 5 verificações ainda não tem grupos acima de 500, aumentar para 1 hora
    else if (novasVerificacoes >= 5 && !session.gruposAcima500) {
      novoIntervalo = 60
    }
    
    this.updateSession(sessionId, {
      verificacoes: novasVerificacoes,
      ultimaVerificacao: new Date().toISOString(),
      intervaloVerificacao: novoIntervalo,
    })
  },

  /**
   * Marcar lista como adicionada
   */
  markListAdded(sessionId: string, listName: string): void {
    const session = this.getSessionById(sessionId)
    if (!session) return

    const listasAdicionadas = session.listasAdicionadas || []
    
    // Se a lista já foi adicionada, não fazer nada
    if (listasAdicionadas.includes(listName)) {
      return
    }

    // Adicionar à lista de adicionadas
    listasAdicionadas.push(listName)

    // Verificar se todas as listas foram adicionadas
    const todasAdicionadas = session.listasParaAdicionar && 
      session.listasParaAdicionar.length > 0 &&
      session.listasParaAdicionar.every(lista => listasAdicionadas.includes(lista))

    this.updateSession(sessionId, {
      listasAdicionadas,
      listaAdicionada: todasAdicionadas || false,
    })

    console.log(`[sessionMonitorService] Lista "${listName}" marcada como adicionada na sessão ${sessionId}`)
    if (todasAdicionadas) {
      console.log(`[sessionMonitorService] ✅ Todas as listas foram adicionadas na sessão ${sessionId}`)
    }
  },

  /**
   * Obter próxima lista a ser adicionada
   */
  getProximaLista(sessionId: string): string | null {
    const session = this.getSessionById(sessionId)
    if (!session || !session.listasParaAdicionar) return null

    const listasAdicionadas = session.listasAdicionadas || []
    
    // Encontrar primeira lista que ainda não foi adicionada
    const proximaLista = session.listasParaAdicionar.find(
      lista => !listasAdicionadas.includes(lista)
    )

    return proximaLista || null
  },

  /**
   * Marcar que grupos estão acima de 500
   */
  markGroupsAbove500(sessionId: string): void {
    this.updateSession(sessionId, {
      gruposAcima500: true,
      intervaloVerificacao: 20, // Reduzir intervalo
    })
  },

  /**
   * Remover sessão
   */
  removeSession(sessionId: string): boolean {
    const sessions = this.getAllSessions()
    const filtered = sessions.filter(s => s.sessionId !== sessionId)
    
    if (filtered.length === sessions.length) return false
    
    this.saveSessions(filtered)
    return true
  },

  /**
   * Obter lista aleatória (priorizando listas prioritárias)
   * Retorna uma lista ou null se não encontrar
   */
  async obterListaAleatoria(): Promise<string | null> {
    const listas = await this.obterListasParaAdicionar()
    return listas && listas.length > 0 ? listas[0] : null
  },

  /**
   * Obter listas para adicionar: X prioritárias aleatórias (configurado) + listas normais aleatórias
   */
  async obterListasParaAdicionar(): Promise<string[]> {
    try {
      // Carregar todas as listas via Electron API
      if (!(window as any).electron?.criador?.carregarTodasListas) {
        console.error('[sessionMonitorService] API para carregar listas não disponível')
        return []
      }

      const listas: ListaBots[] = await (window as any).electron.criador.carregarTodasListas()
      
      if (!listas || listas.length === 0) {
        console.warn('[sessionMonitorService] Nenhuma lista disponível')
        return []
      }

      const listasParaAdicionar: string[] = []

      // Separar listas prioritárias e normais
      const listasPrioritarias = listas.filter(lista => lista.prioritaria === true)
      const listasNormais = listas.filter(lista => !lista.prioritaria)

      // NOVO: Carregar configuração de quantidade de listas prioritárias
      let quantidadePrioritarias = 2 // Padrão: 2
      try {
        if ((window as any).electron?.criador?.carregarConfigListasPrioritarias) {
          const config = await (window as any).electron.criador.carregarConfigListasPrioritarias()
          if (config.success && config.quantidade !== undefined) {
            quantidadePrioritarias = config.quantidade || 0
          }
        }
      } catch (error) {
        console.warn('[sessionMonitorService] Erro ao carregar configuração de listas prioritárias, usando padrão:', error)
      }

      // Escolher listas prioritárias aleatórias (quantidade configurada)
      if (listasPrioritarias.length > 0 && quantidadePrioritarias > 0) {
        // Embaralhar listas prioritárias
        const prioritariaEmbaralhada = [...listasPrioritarias].sort(() => Math.random() - 0.5)
        
        // Pegar quantidade configurada (ou todas se houver menos)
        const quantidade = Math.min(quantidadePrioritarias, prioritariaEmbaralhada.length)
        const listasPrioritariasEscolhidas = prioritariaEmbaralhada.slice(0, quantidade)
        
        listasPrioritariasEscolhidas.forEach(lista => {
          listasParaAdicionar.push(lista.listName)
        })
        
        console.log(`[sessionMonitorService] ${quantidade} lista(s) prioritária(s) escolhida(s):`, listasPrioritariasEscolhidas.map(l => l.listName))
      }

      // NOVO: Adicionar listas normais aleatoriamente (para distribuir melhor)
      if (listasNormais.length > 0) {
        // Embaralhar listas normais
        const normaisEmbaralhadas = [...listasNormais].sort(() => Math.random() - 0.5)
        
        // Adicionar todas as listas normais (serão usadas aleatoriamente)
        normaisEmbaralhadas.forEach(lista => {
          listasParaAdicionar.push(lista.listName)
        })
        
        console.log(`[sessionMonitorService] ${normaisEmbaralhadas.length} lista(s) normal(is) adicionada(s) para uso aleatório`)
      }

      return listasParaAdicionar
    } catch (error) {
      console.error('[sessionMonitorService] Erro ao obter listas para adicionar:', error)
      return []
    }
  },

  /**
   * Limpar sessões antigas (mais de 7 dias)
   */
  cleanupOldSessions(): void {
    const sessions = this.getAllSessions()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const filtered = sessions.filter(session => {
      const dataInicio = new Date(session.dataInicio)
      return dataInicio >= sevenDaysAgo || !session.listaAdicionada
    })
    
    if (filtered.length !== sessions.length) {
      this.saveSessions(filtered)
      console.log('[sessionMonitorService] Sessões antigas removidas')
    }
  },

  /**
   * Salvar sessões
   */
  saveSessions(sessions: SessionData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('[sessionMonitorService] Erro ao salvar sessões:', error)
    }
  },
}

// Limpar sessões antigas ao carregar o serviço
sessionMonitorService.cleanupOldSessions()


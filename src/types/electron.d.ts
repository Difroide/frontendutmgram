// Interface para tópico na análise de grupo
export interface TopicoAnalise {
  id: number
  titulo: string
  midias: number | null  // null quando contarMidias=false
  mensagens: number | null  // null quando contarMidias=false
  closed?: boolean
  pinned?: boolean
}

// Interface para resultado da análise de grupo
export interface AnaliseGrupoResult {
  success: boolean
  grupoNome: string
  grupoTipo: 'PUBLICO' | 'PRIVADO'
  temRestricao: boolean
  temTopicos: boolean
  totalMidias: number | null  // null quando contarMidias=false
  totalMensagens: number | null  // null quando contarMidias=false
  topicos: TopicoAnalise[]
  error?: string
}

// Payload para análise de grupo
export interface AnaliseGrupoPayload {
  sessionPath: string
  sourceLink: string
  contarMidias?: boolean  // default: false (modo rápido)
}

// Interface para progresso da análise
export interface AnaliseGrupoProgress {
  fase: 'contando_topicos' | 'contando_geral'
  atual: number
  total: number
  topicoAtual?: string
}

// Tipo para filtro de mídia
export type FiltroMidia = 'fotos' | 'videos' | 'ambos'

// Interface para tópico selecionado com filtro individual
export interface TopicoSelecionado {
  id: number
  filtroMidia: FiltroMidia
}

// Tipo para tópicos a clonar - suporta formato antigo (array de números) ou novo (array de objetos)
export type TopicosParaClonar = number[] | TopicoSelecionado[] | null

// Payload para clonagem VIP
export interface ClonagemVIPPayload {
  sessionPath: string
  sourceLink: string
  proxy?: any
  clonarTopicos?: boolean
  nomeGrupoDestino?: string | null
  retomar?: boolean
  criarTopicosAuto?: boolean
  midiasPorTopico?: number
  tagSessao?: string | null
  grupoTemRestricao?: boolean
  topicosParaClonar?: TopicosParaClonar
  filtroMidia?: FiltroMidia // Fallback para grupos sem tópicos
}

// Payload para adicionar mídias VIP
export interface AdicionarMidiasVIPPayload {
  sessionPath: string
  sourceLink: string
  grupoDestinoId: string
  grupoDestinoAccessHash?: string
  proxy?: any
  clonarTopicos?: boolean
  criarTopicosAuto?: boolean
  midiasPorTopico?: number
  retomar?: boolean
  tagSessao?: string | null
  grupoTemRestricao?: boolean
  topicosParaClonar?: TopicosParaClonar
  filtroMidia?: FiltroMidia // Fallback para grupos sem tópicos
}

// Payload para clonagem VIP multi-sessão por tópicos
export interface ClonagemMultiSessaoTopicosPayload {
  sessaoMaePath: string
  sessoesAuxiliaresPaths: string[]
  sourceLink: string
  topicosParaClonar: number[]
  topicosInfo: { id: number; titulo: string }[]
  nomeGrupoDestino?: string | null
  grupoTemRestricao?: boolean
  clonarTopicos?: boolean
  tagSessao?: string | null
  filtroMidia?: FiltroMidia
}

// Resultado da clonagem multi-sessão
export interface ClonagemMultiSessaoResult {
  success: boolean
  groupLink?: string
  grupoNome?: string
  grupoOrigemNome?: string
  grupoId?: string
  grupoAccessHash?: string
  totalMensagens: number
  sessoesUtilizadas: number
  topicosClonados: number
  distribuicaoTopicos: {
    sessao: string
    topicos: string[]
  }[]
  resultadosPorSessao: {
    sessao: string
    topicosClonados: number
    mensagensClonadas: number
    erros: number
  }[]
  error?: string
}

// Interface para evento de log de clonagem (com operationId para clonagens simultâneas)
export interface ClonagemLogEvent {
  operationId: string
  sessionPath: string
  sessionName: string
  sourceLink: string
  message: string
}

// Interface para evento de progresso de clonagem (com operationId para clonagens simultâneas)
export interface ClonagemProgressEvent {
  operationId: string
  sessionPath: string
  sessionName: string
  sourceLink: string
  current: number
  total: number
  grupoDestinoId?: string
}

// Interface para evento de conclusão de clonagem
export interface ClonagemCompleteEvent {
  operationId: string
  sessionPath: string
  sessionName: string
  sourceLink: string
  success: boolean
  groupLink?: string
  totalMensagens?: number
  grupoNome?: string
  grupoId?: string
  grupoAccessHash?: string
  error?: string
}

// Interface para evento de erro de clonagem
export interface ClonagemErrorEvent {
  operationId: string
  sessionPath: string
  sessionName: string
  sourceLink: string
  error: string
}

export interface ElectronAPI {
  desktop?: {
    minimize: () => Promise<{ success: boolean; error?: string }>
    toggleMaximize: () => Promise<{ success: boolean; isMaximized?: boolean; error?: string }>
    close: () => Promise<{ success: boolean; error?: string }>
    isMaximized: () => Promise<{ success: boolean; isMaximized?: boolean; error?: string }>
    onMaximizedChanged: (callback: (maximized: boolean) => void) => void
    removeMaximizedChanged: () => void
  }
  dashboard?: {
    carregarProfile: () => Promise<{ success: boolean; profile?: any; error?: string }>
    salvarProfile: (profile: any) => Promise<{ success: boolean; error?: string }>
  }
  craftpay?: {
    getEstatisticas: (forceRefresh?: boolean) => Promise<{ success: boolean; stats?: any; botsDetalhados?: Array<{ bot: string; valorConvertido: string; vendas: number; planos: string[]; conversao: string; valorMedio: string }>; error?: string }>
    salvarCredenciais: (payload: { email: string; senha: string }) => Promise<{ success: boolean; error?: string }>
    carregarConfig: () => Promise<{ success: boolean; configurado?: boolean; email?: string }>
    listarFunis?: () => Promise<{ success: boolean; funis?: Array<{ nome: string }>; fetchedAt?: string; error?: string }>
    carregarFunisCache?: () => Promise<{ success: boolean; funis?: Array<{ nome: string }>; fetchedAt?: string | null; error?: string }>
    adicionarBotsAoFunil?: (payload: { nomeFunil: string; bots: Array<{ nome: string; token: string }> }) => Promise<{ success: boolean; error?: string; mensagem?: string }>
    adicionarBotsAoFunilBackground?: (payload: { nomeFunil: string; bots: Array<{ nome: string; token: string }> }) => Promise<{ success: boolean; jobId?: string; status?: string; error?: string }>
    consultarJobFunil?: (jobId: string) => Promise<{ success: boolean; job?: { jobId: string; status: 'queued' | 'running' | 'completed' | 'failed'; createdAt?: string; finishedAt?: string | null; result?: any; error?: string | null }; error?: string }>
  }
  configuracoes?: {
    salvar: (config: any) => Promise<void>
    carregar: () => Promise<any>
  }
  utils?: {
    selecionarPasta: () => Promise<string | null>
  }
  reels?: {
    selecionarYtDlp: () => Promise<string | null>
    checkYtDlp: (ytDlpPath?: string | null) => Promise<{ success: boolean; version: string | null; error: string | null }>
    downloadReels: (payload: { urls: string[]; outputDir: string; concurrency?: number; ytDlpPath?: string | null; cookiesFromBrowser?: string | null; cookiesString?: string | null }) => Promise<{
      success: boolean
      total: number
      completed: number
      failed: number
      errors: Array<{ url: string; error: string }>
    }>
    onDownloadProgress: (callback: (data: { completed: number; total: number; currentUrl: string; success: boolean; error?: string; fileName?: string }) => void) => void
    removeDownloadProgress: () => void
    onReelsInsta3Log: (callback: (data: { line: string; type: string }) => void) => void
    removeReelsInsta3Log: () => void
    extractLinksInsta3: (payload: { usernames: string[]; cookiesString?: string | null; cookiesFromBrowser?: string | null; includeStats?: boolean; ytDlpPath?: string | null }) => Promise<{ success: boolean; links: string[]; reportPath: string | null; csvPath?: string | null; error: string | null }>
    analyzeReelsStats: (payload: { urls: string[]; cookiesString?: string | null; cookiesFromBrowser?: string | null; ytDlpPath?: string | null }) => Promise<{ success: boolean; data: Array<{ url: string; views: number | null; likes: number | null; comments?: number | null; description?: string | null }>; reportPath: string | null; csvPath: string | null; error: string | null }>
  }
  database?: {
    getTodayStats: () => Promise<{ success: boolean; data?: any; error?: string }>
    incrementGrupos: (count: number) => Promise<{ success: boolean; data?: any; error?: string }>
    incrementAutomacoes: (count: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getStatsLastDays: (days: number) => Promise<{ success: boolean; data?: any; error?: string }>
    saveConfig: (key: string, value: any) => Promise<{ success: boolean; error?: string }>
    getConfig: (key: string, defaultValue?: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getAllConfig: () => Promise<{ success: boolean; data?: any; error?: string }>
    saveAccountStats: (contasOnline: number, contasCaidas: number) => Promise<{ success: boolean; data?: any; error?: string }>
    saveGruposStats: (gruposOnline: number, gruposCriadosHoje: number, gruposCaidosHoje: number) => Promise<{ success: boolean; data?: any; error?: string }>
  }
  contingencia?: {
    listarSessoes?: (searchDir: string | null) => Promise<any>
    obterTag?: (sessionPath: string) => Promise<any>
    definirTag?: (sessionPath: string, tag: string) => Promise<any>
    clonarVIP?: (payload: any) => Promise<any>
    verificarVIP?: (sessionPath: string) => Promise<any>
    verificarVIPsLote?: (sessionPaths: string[]) => Promise<any>
    listarSessoesComGrupoBase?: () => Promise<any>
    listarGruposVip?: () => Promise<any>
    atualizarGrupoVip?: (payload: any) => Promise<any>
    removerGrupoVip?: (grupoId: string) => Promise<any>
    editarGrupoVip?: (payload: any) => Promise<any>
    transferirPosseVip?: (payload: { grupoId: string; sessionPath: string; novoDonoUsername: string }) => Promise<any>
    adicionarBotsAoGrupoBase?: (payload: any) => Promise<any>
    obterLinksMensagens?: (sessionPath: string) => Promise<any>
    listarTodosGrupos?: () => Promise<any>
    buscarGruposPorNomes?: (nomesGrupos: string[]) => Promise<any>
    sincronizarCategoriasGrupos?: () => Promise<any>
    cadastrarGrupoBase?: (payload: any) => Promise<any>
    deletarGrupoBase?: (sessionPath: string) => Promise<any>
    apagarGruposContas?: (accountIds: string[], sessoesParalelas?: number) => Promise<{ success: boolean; processadas?: number; erros?: Array<{ accountId: string; error: string }> }>
    // Pré-análise de grupo
    analisarGrupo?: (payload: AnaliseGrupoPayload) => Promise<AnaliseGrupoResult>
    onAnaliseGrupoProgress?: (callback: (data: AnaliseGrupoProgress) => void) => void
    onAnaliseGrupoLog?: (callback: (data: string) => void) => void
    removeAnaliseGrupoListeners?: () => void
    // Clonador VIP Avançado
    clonarVIPAvancado?: (payload: ClonagemVIPPayload) => Promise<any>
    adicionarMidiasVip?: (payload: AdicionarMidiasVIPPayload) => Promise<any>
    // Clonagem multi-sessão por tópicos
    clonarVIPMultiSessao?: (payload: ClonagemMultiSessaoTopicosPayload) => Promise<ClonagemMultiSessaoResult>
    verificarCheckpoint?: (payload: any) => Promise<any>
    removerCheckpoint?: (payload: any) => Promise<any>
    adicionarAdmins?: (payload: any) => Promise<any>
    // Eventos de clonagem (suporte a múltiplas clonagens simultâneas)
    onClonagemVIPAvancadaProgress?: (callback: (data: ClonagemProgressEvent | any) => void) => void
    onClonagemVIPAvancadaLog?: (callback: (data: ClonagemLogEvent | string) => void) => void
    onClonagemVIPAvancadaComplete?: (callback: (data: ClonagemCompleteEvent) => void) => void
    onClonagemVIPAvancadaError?: (callback: (data: ClonagemErrorEvent) => void) => void
    onMultiSessaoProgress?: (callback: (data: { sessaoPath: string; clonadas: number; total: number }) => void) => void
    // Multi-sessão por tópicos
    onClonagemMultiSessaoProgress?: (callback: (data: any) => void) => void
    onClonagemMultiSessaoLog?: (callback: (data: string) => void) => void
    removeClonagemMultiSessaoListeners?: () => void
    removeClonagemVIPAvancadaListeners?: () => void
  }
  verificarMembros?: {
    verificarGrupos: (accountIds: string[]) => Promise<VerificarMembrosResult>
    contarGrupos: (accountIds: string[]) => Promise<{ success: boolean; total: number; error?: string }>
    verificarTodosGrupos: () => Promise<VerificarTodosGruposResult>
    contarTodosGrupos: () => Promise<{ success: boolean; total: number; error?: string }>
    getVerificacaoDiariaConfig: () => Promise<VerificacaoDiariaConfig>
    setVerificacaoDiariaEnabled: (enabled: boolean) => Promise<boolean>
    iniciarVerificacao: () => Promise<{ started: boolean; totalGrupos: number; totalBots: number }>
    onVerificacaoProgress: (callback: (data: VerificacaoMembrosProgress) => void) => void
    removeVerificacaoProgress: () => void
  }
  verificadorDisparo?: {
    verificarDisparoSessao: (accountId: string) => Promise<VerificacaoDisparoResult>
    verificarDisparoSessaoCategoria: (accountId: string, categoriaId: string, botUsername: string) => Promise<VerificacaoDisparoCategoriaResult>
    onVerificacaoDisparoProgress: (callback: (data: VerificacaoDisparoProgress) => void) => void
    removeVerificacaoDisparoProgress: () => void
    onVerificacaoDisparoResultadoCategoria?: (callback: (resultado: ResultadoVerificacaoDisparoCompleto) => void) => void
    removeVerificacaoDisparoResultadoCategoria?: () => void
  }
  criador?: {
    carregarCategorias?: () => Promise<Array<{ id: string; nome: string; descricao: string; rodando?: boolean; quantidadeBots?: number }>>
    analisarCategoriasRelatorio?: (customPaths?: object) => Promise<AnalisarCategoriasRelatorioResult>
    deletarCategoriasEmMassa?: (categoriaIds: string[]) => Promise<{ success: boolean; deletados?: number; error?: string }>
    reutilizarBotsCategoria?: (categorias: Array<{ categoriaId: string }>) => Promise<{ success: boolean; totalMovidos?: number; error?: string }>
    carregarBotsReutilizados?: () => Promise<BotReutilizado[]>
    removerBotReutilizado?: (botId: string) => Promise<{ success: boolean; error?: string }>
    atualizarBotReutilizado?: (botId: string, data: { nome?: string; username?: string; token?: string | null }) => Promise<{ success: boolean; bot?: BotReutilizado; error?: string }>
    vincularBotReutilizadoCategoria?: (botId: string, categoriaId: string) => Promise<{ success: boolean; error?: string }>
    onAnalisarCategoriasProgress?: (callback: (data: any) => void) => void
    removeAnalisarCategoriasProgress?: () => void
  }
  [key: string]: any
}

export interface CategoriaRelatorio {
  id: string
  nome: string
  totalGrupos: number
  gruposOn: number
  gruposOff: number
  botDisparoOnline: boolean | null
  bots: Array<{ nome: string; username: string; online: boolean }>
}

export interface AnalisarCategoriasRelatorioResult {
  categorias: CategoriaRelatorio[]
  categoriasSemGrupos: CategoriaRelatorio[]
  categoriasComBotsOnlineSemGrupos: CategoriaRelatorio[]
  error?: string
}

export interface BotReutilizado {
  id: string
  nome: string
  username: string
  token: string | null
  categoriaOrigemId: string
  categoriaOrigemNome: string
  reutilizadoEm: string
}

export interface VerificarMembrosResult {
  success: boolean
  total: number
  atualizados: number
  erros: number
  results: Array<{ grupoId: string; success: boolean; membros?: number; nome?: string; link_convite?: string; caido?: boolean; error?: string }>
  error?: string
  message?: string
}

export interface VerificarTodosGruposResult {
  success: boolean
  total: number
  atualizados: number
  caidos: number
  erros: number
  results: Array<{ grupoId: string; success: boolean; membros?: number; nome?: string; link_convite?: string; caido?: boolean; error?: string }>
  error?: string
  message?: string
}

export interface VerificacaoDiariaConfig {
  enabled: boolean
  lastRunDate: string | null
}

export interface VerificacaoMembrosProgress {
  grupos: {
    total: number
    verificados: number
    faltam: number
    online: number
    caidos?: { nome: string; link: string }[]
  }
  bots: {
    total: number
    verificados: number
    faltam: number
    online: number
    offline?: { nome: string; username: string }[]
  }
  concluido?: boolean
  ultimaAtualizacao?: number
}

// ─── Tipos legados (mantidos para compatibilidade com runUmaCategoria) ───────

export interface ResultadoVerificacaoDisparo {
  categoriaId: string
  categoriaNome: string
  grupoLabel: string
  botUsername: string | null
  botEncontrado: boolean
  tempoMedioMin: number | null
  ok10: boolean
  ok30: boolean
  ok1h: boolean
  ok5h: boolean
  instabilidade: boolean
  mensagemInstabilidade: string | null
  erro: string | null
  botsCategoria: Array<{ nome: string; username: string | null }>
}

// ─── Tipos novos para verificação completa ───────────────────────────────────

export interface BotDisparoInfo {
  username: string
  nome: string
  tipo: 'midia' | 'lista' | 'desconhecido'
  totalDisparos: number
  ultimoDisparo: string | null
  gruposEncontrados: number
  gruposDetalhes: Array<{
    nome: string
    link: string
    vezes: number
    /** ISO da última mensagem onde o grupo foi visto */
    ultimaVez?: string | null
  }>
}

export interface ResultadoVerificacaoDisparoCompleto {
  categoriaId: string
  categoriaNome: string
  grupoLabel: string
  /** Link t.me para abrir o grupo analisado */
  grupoLink?: string | null

  botVendas: {
    username: string | null
    online: boolean
    erro: string | null
  } | null

  botMidia: {
    username: string | null
    tempoMedioMin: number | null
    ok10: boolean
    ok30: boolean
    ok1h: boolean
    ok5h: boolean
    instabilidade: boolean
    mensagemInstabilidade: string | null
  } | null

  botsGrupo: BotDisparoInfo[]

  erro: string | null
  botsCategoria: Array<{ nome: string; username: string | null }>
}

export interface VerificacaoDisparoResult {
  success: boolean
  resultados: ResultadoVerificacaoDisparoCompleto[]
  error?: string | null
}

export interface VerificacaoDisparoCategoriaResult {
  success: boolean
  resultado: ResultadoVerificacaoDisparo | null
  error?: string | null
}

export interface VerificacaoDisparoProgress {
  categoriaNome: string
  sessao?: string
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}


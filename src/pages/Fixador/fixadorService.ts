const api = (window as any).electron?.fixador
if (!api) {
  console.warn('[fixadorService] Electron fixador API não disponível')
}

export interface Mensagem {
  id: string
  titulo: string
  texto: string
  botaoTexto: string
  botaoUrl: string
  fotoPath?: string
}

export interface Grupo {
  groupId: string
  groupLink: string
  groupName: string
  topicId: number | null
  topicTitle?: string
}

export interface Bot {
  id: string
  nome: string
  token: string
  username: string
  grupos: Grupo[]
}

export interface Topico {
  id: number
  title: string
  closed?: boolean
  pinned?: boolean
}

export interface VerificarTopicosResult {
  topicos: Topico[]
  groupId?: string
  groupName?: string
  isForum: boolean
  error?: string
}

export interface DispararResult {
  enviados: number
  erros: Array<{ bot: string; grupo: string; error: string }>
  message?: string
}

export interface VariavelTexto {
  nome: string
  descricao: string
}

export const fixadorService = {
  listarMensagens: (): Promise<Mensagem[]> =>
    api?.listarMensagens?.() ?? Promise.resolve([]),

  listarFormatacoes: (): Promise<{ tag: string; nome: string; atalho: string; icone: string }[]> =>
    api?.listarFormatacoes?.() ?? Promise.resolve([]),

  prepararPreviewHtml: (texto: string): Promise<string> =>
    api?.prepararPreviewHtml?.(texto) ?? Promise.resolve(texto || ''),

  listarVariaveisTexto: (): Promise<VariavelTexto[]> =>
    api?.listarVariaveisTexto?.() ?? Promise.resolve([]),

  criarMensagem: (data: Partial<Mensagem>): Promise<Mensagem> =>
    api?.criarMensagem?.(data) ?? Promise.reject(new Error('API não disponível')),

  atualizarMensagem: (id: string, updates: Partial<Mensagem>): Promise<Mensagem | null> =>
    api?.atualizarMensagem?.(id, updates) ?? Promise.reject(new Error('API não disponível')),

  removerMensagem: (id: string): Promise<boolean> =>
    api?.removerMensagem?.(id) ?? Promise.reject(new Error('API não disponível')),

  selecionarFoto: (): Promise<string | null> =>
    api?.selecionarFoto?.() ?? Promise.resolve(null),

  listarBots: (): Promise<Bot[]> =>
    api?.listarBots?.() ?? Promise.resolve([]),

  criarBot: (data: Partial<Bot>): Promise<Bot> =>
    api?.criarBot?.(data) ?? Promise.reject(new Error('API não disponível')),

  atualizarBot: (id: string, updates: Partial<Bot>): Promise<Bot | null> =>
    api?.atualizarBot?.(id, updates) ?? Promise.reject(new Error('API não disponível')),

  removerBot: (id: string): Promise<boolean> =>
    api?.removerBot?.(id) ?? Promise.reject(new Error('API não disponível')),

  adicionarGrupo: (botId: string, grupo: Partial<Grupo>): Promise<Bot | null> =>
    api?.adicionarGrupo?.(botId, grupo) ?? Promise.reject(new Error('API não disponível')),

  removerGrupo: (botId: string, groupId: string, topicId?: number | null): Promise<Bot | null> =>
    api?.removerGrupo?.(botId, groupId, topicId) ?? Promise.reject(new Error('API não disponível')),

  atualizarGrupo: (botId: string, groupId: string, updates: { groupName?: string; topics?: { topicId: number | null; topicTitle?: string }[] }): Promise<Bot | null> =>
    api?.atualizarGrupo?.(botId, groupId, updates) ?? Promise.reject(new Error('API não disponível')),

  atualizarTopicosGrupo: (botId: string, groupId: string, topicId: number | null): Promise<Bot | null> =>
    api?.atualizarTopicosGrupo?.(botId, groupId, topicId) ?? Promise.reject(new Error('API não disponível')),

  disparar: (): Promise<DispararResult> =>
    api?.disparar?.() ?? Promise.reject(new Error('API não disponível')),

  dispararSelecionado: (botIds: string[], mensagemId?: string): Promise<DispararResult> =>
    api?.dispararSelecionado?.(botIds, mensagemId) ?? Promise.reject(new Error('API não disponível')),

  verificarTopicosGrupo: (accountId: string, groupLink: string): Promise<VerificarTopicosResult> =>
    api?.verificarTopicosGrupo?.(accountId, groupLink) ?? Promise.reject(new Error('API não disponível')),

  getStatus: (): Promise<{ ativo: boolean }> =>
    api?.getStatus?.() ?? Promise.resolve({ ativo: false }),

  ativar: (): Promise<void> =>
    api?.ativar?.() ?? Promise.reject(new Error('API não disponível')),

  desativar: (): Promise<void> =>
    api?.desativar?.() ?? Promise.reject(new Error('API não disponível')),

  iniciarCicloGrupo: (botId: string, groupId: string, topicId: number | null): Promise<void> =>
    api?.iniciarCicloGrupo?.(botId, groupId, topicId) ?? Promise.resolve(),
}

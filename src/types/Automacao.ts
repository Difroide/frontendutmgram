export type AutomacaoTipo = 'criar-grupos' | 'verificar-contas' | 'adicionar-listas' | 'encher-grupos' | 'importar-videos' | 'clonador-vip' | 'outra'

export type AutomacaoStatus = 'pendente' | 'em-andamento' | 'concluida' | 'erro' | 'cancelada'

export interface Automacao {
  id: string
  tipo: AutomacaoTipo
  titulo: string
  descricao?: string
  categoriaId?: string // ID da categoria relacionada à automação
  categoriaNome?: string // Nome da categoria (para exibição)
  status: AutomacaoStatus
  progresso?: {
    current: number
    total: number
    mensagem?: string
    activeWorkers?: number
    averageTime?: number // ms per item
    estimatedTimeRemaining?: number // ms
    currentTask?: string
    membrosAtuais?: number // Para encher grupos - membros atuais do grupo sendo monitorado
    metaMinima?: number // Para encher grupos - meta de membros (min entre solicitado e 500)
    gruposCompletos?: number // Para encher grupos - quantos grupos completaram
    mediaMembros?: number // Para encher grupos - média de membros entre todos os grupos
  }
  resultado?: {
    sucesso: boolean
    mensagem?: string
    detalhes?: any
  }
  erro?: string
  logs?: string[] // Logs do terminal durante a execução
  dataInicio: string
  dataFim?: string
  dados?: any // Dados específicos da automação
}

export interface CriarGruposAutomacaoData {
  quantidadeGrupos: number
  gruposPorConta?: Array<{ accountId: string; groupCount: number }> // Novo: grupos específicos por conta (calculado baseado em grupos existentes)
  tipoGrupo?: 'publico' | 'privado'
  bots: Array<{
    id: string
    botId: string
    botName: string
    nicheId?: string
    porcentagem: string
  }>
  criarBots?: boolean
  quantidadeBots?: number
  botsDisparo?: Array<{
    id: string
    nome: string
    username: string
    foto?: string
  }>
  usarDescricao?: boolean
  descricaoGrupo?: string
  botsExtras?: string[]
  painelSMM?: string
  codigoServico?: string
  quantidadeMembros?: number
  categoriaId?: string
  arquivoNomesId?: string
  grupoNomesId?: string
  usarNomeSistema?: boolean
  nomeEspecifico?: string
  usarFotos?: boolean
  grupoBaseId?: string
  accountIds: string[]
  sessoesParalelas?: number // Número de sessões trabalhando simultaneamente
  listName?: string // Nome da lista a ser adicionada automaticamente quando grupos atingirem 500+ membros
  proxyId?: number | null
}

export type VerificationOption = 
  | 'syncGroups'           // Listar grupos, atualizar membros/bots e checar online
  | 'verifyForUse'         // Verificacao completa para uso
  | 'configurarContaNova'  // Configurar conta nova: nome, 2FA, foto, privacidade, username
  | 'listGroups'           // Listar grupos onde é admin
  | 'updateMembers'        // Atualizar contagem de membros
  | 'detectBannedFrozen'   // Detectar conta banida e congelada
  | 'updateBots'           // Atualizar os bots presentes em cada grupo
  | 'checkGroupsOnline'    // Verificar se grupos estão online
  | 'checkBotFatherBots'   // Consultar bots e tokens via BotFather
  | 'detectSpam'           // Detectar contas com SPAM
  | 'detectFrozen'         // Verificar se a conta está congelada
  | 'testChannel'          // Teste de criação de canal

export interface VerificarContasAutomacaoData {
  accountIds: string[]
  tipo?: 'basic' | 'advanced' // Deprecated: usar options
  options?: VerificationOption[] // Opções de verificação personalizadas
  sessoesParalelas?: number // Número de sessões trabalhando simultaneamente com rotação de API e proxy
  proxyId?: number | null
  criarApiAposVerificacao?: boolean // Se true, cria API automaticamente após verificar usando o login reaproveitado
}

export interface AdicionarListasAutomacaoData {
  accountIds: string[]
  listName?: string // Deprecated: usar listNames
  listNames?: string[] // Array de listas para adicionar (todas de uma vez)
  sessoesParalelas?: number // Número de sessões trabalhando simultaneamente
  proxyId?: number | null
  criarApiAposAdicionarListas?: boolean // Se true, cria API automaticamente em paralelo enquanto adiciona listas
}

export interface EncherGruposAutomacaoData {
  accountIds: string[]
  painelSMM: string
  codigoServico: string
  quantidadeMembros: number
  listName?: string // Nome da lista a ser adicionada automaticamente quando grupos atingirem 500+ membros
}


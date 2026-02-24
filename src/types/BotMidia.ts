export interface BotMidia {
  id: number | string
  nome: string
  token: string
  username?: string // Username do bot (ex: @linuenviadormidiasbot)
  nichoId?: string
  nichoNome?: string
  categoriaId?: string
  categoriaNome?: string
  tipo: 'Instagram' | 'Twitter' | 'Facebook' | 'TikTok' | 'LinkedIn'
  tipoBot: 'vendas' | 'disparo' // Tipo do bot: vendas ou disparo
  status: 'Ativo' | 'Inativo' | 'Pausado'
  statusDetalhe?: 'online' | 'offline' | 'erro'
  startOn?: boolean
  linkOn?: boolean
  error?: string
  origem?: 'nicho' | 'categoria' // Origem do bot
  categoriasVinculadas?: string[] // DEPRECATED - usar tags de bot
  tags?: string[] // IDs das tags associadas ao bot
  contaId?: number
  configuracoes?: Record<string, unknown>
  arquivoPath?: string
  createdAt?: string
  updatedAt?: string
}

/** Tag específica para bots */
export interface BotTag {
  id: string
  nome: string
  cor: string
  createdAt?: string
}

export type BotMidiaFormData = Omit<BotMidia, 'id' | 'createdAt' | 'updatedAt'>


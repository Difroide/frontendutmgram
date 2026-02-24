/**
 * Tipos para o Criador de Fluxo
 */

export interface VipGroup {
  chatId: string
  durationDays: number
  name: string
}

export interface OrderBump {
  enabled: boolean
  description: string
  video: string
  value: number
  btnAccept: string
  btnDecline: string
  vipGroups: VipGroup[]
}

export interface OrderBumpSalvo {
  id: string
  nome: string
  orderBump: OrderBump
}

export interface BotaoSalvo {
  id: string
  nome: string           // Nome identificador do botão na biblioteca
  plano: Plano           // O plano completo (name, value, vipGroups)
}

export interface BotaoReconhecido {
  id: string
  nomeBase: string
  valorBase: number
  porTexto: string
  moeda: 'R$' | '$'
  desconto?: number
  sufixo: string
  vipGroups: VipGroup[]
  count: number
}

// Bot de vendas
export interface BotVendas {
  id: string
  nome: string           // Nome do fluxo/bot (ex: "Lives")
  username: string       // Username do bot (ex: "@livss3930f_bot")
  token: string          // Token do bot
  isPrincipal: boolean   // Se é o bot principal
}

export interface Plano {
  name: string
  value: number
  vipGroups: VipGroup[]
  orderBump?: OrderBump
  descontoPercentual?: number
}

export interface Mensagem {
  id: number
  description: string           // HTML da copy
  video: string | null
  delay: number                 // segundos (relativo)
  delayType: 'relative' | 'absolute'
  scheduleTime: string          // "HH:MM" para absolute
  scheduleDays: number
  planos: Plano[]
  orderBumpPerPlan: boolean
  orderBumpGlobal?: OrderBump   // Order bump global da mensagem
  upsellId?: string             // Upsell vinculado (biblioteca)
  posicao: number               // ordem no fluxo
  originalNodeId?: number       // ID original do nó no drawflow
}

export interface RateLimitConfig {
  enabled: boolean
  start: {
    maxAttempts: number
    windowMinutes: number
    blockMinutes: number
    floodLimit: number
    floodWindowMinutes: number
    floodPauseMinutes: number
  }
  verification: {
    maxAttempts: number
    windowMinutes: number
    firstBlockMinutes: number
    secondBlockMinutes: number
    thirdBlockHours: number
  }
  planSelection: {
    maxPerMinute: number
    blockMinutes: number
  }
  messaging: {
    maxPerSecond: number
    maxPerMinutePerUser: number
    adaptiveEnabled: boolean
    targetSuccessRate: number
  }
  blocking: {
    warningThreshold: number
    banThreshold: number
    ignoreHours: number
    banDays: number
  }
}

export interface Fluxo {
  name: string
  botName: string
  token: string
  description: string | null
  video: string | null
  paymentMethod: string
  paymentMethodSecondary: string
  paymentMethodTertiary: string
  paymentRouterEnabled: boolean
  paymentRouterStats: Record<string, unknown>
  rateLimitConfig: RateLimitConfig
  mensagens: Mensagem[]
  orderBumpGlobal: OrderBump | null
  orderBumpsLibrary: OrderBumpSalvo[]
  botoesLibrary: BotaoSalvo[]
  upsellsLibrary: UpsellSalvo[]
  bots: BotVendas[]                    // Lista de bots de vendas
  backupBotToken: string | null
  clonedBots: string[]
  stripeCheckoutMode: string
  stripeUpsellConfig: Record<string, unknown>
  // Campos originais para preservar na exportação
  originalJson?: string
}

// Tipos para o formato original do drawflow
export interface DrawflowNode {
  id: number
  name: string
  data: DrawflowNodeData
  class: string
  html: string
  typenode: boolean
  inputs: Record<string, { connections: Array<{ node: string; input: string }> }>
  outputs: Record<string, { connections: Array<{ node: string; output: string }> }>
  pos_x: number
  pos_y: number
}

export interface DrawflowNodeData {
  type?: string
  description?: string
  video?: string
  delay?: number
  scheduleTime?: string
  scheduleDays?: number
  delayType?: 'relative' | 'absolute'
  buttons?: DrawflowButton[]
  orderBumpPerPlan?: boolean
  orderBumpGlobal?: OrderBump
  vipDurationDays?: number
  condition?: string
  rebuyFlowId?: string | null
  stripeUpsellConfig?: Record<string, unknown>
}

export interface UpsellSalvo {
  id: string
  nome: string
  mensagem: Omit<Mensagem, 'id' | 'posicao'>
}

export interface DrawflowButton {
  name: string
  value: number
  vipGroups: VipGroup[]
  orderBump?: OrderBump
}

export interface DrawflowStructure {
  drawflow: {
    Home: {
      data: Record<string, DrawflowNode>
    }
  }
}

export interface FluxoOriginal {
  name: string
  token: string
  description: string | null
  video: string | null
  buttonsJson: string | null
  remarketingJson: string | null
  vipChatId: string | null
  isAbTest: boolean
  descriptionB: string | null
  videoB: string | null
  buttonsJsonB: string | null
  remarketingJsonB: string | null
  vipDurationDays: number | null
  wooviAppId: string | null
  flowJson: string
  flowJsonB: string | null
  rebuyFlowId: string | null
  sortOrder: number
  paymentMethod: string
  paymentMethodSecondary: string
  paymentMethodTertiary: string
  paymentRouterEnabled: boolean
  paymentRouterStats: Record<string, unknown>
  backupBotToken: string | null
  clonedBots: string[]
  rateLimitConfig: RateLimitConfig
  stripeCheckoutMode: string
  stripeUpsellConfig: Record<string, unknown>
  /** Clones exportados (cada um com name + token); reconhecidos como lista de bots na importação. */
  exportedClones?: Array<{ name?: string; token?: string; [key: string]: unknown }>
  /** Campos usados pelo Criador de Fluxo (bots com nome, bibliotecas). Ignorados por consumidores que não os utilizam. */
  _customFields?: {
    bots?: BotVendas[]
    botName?: string
    orderBumpsLibrary?: OrderBumpSalvo[]
    botoesLibrary?: BotaoSalvo[]
    upsellsLibrary?: UpsellSalvo[]
  }
}

// Horários pré-definidos para seleção
export const HORARIOS_PREDEFINIDOS = [
  { label: '2 minutos', value: 120 },
  { label: '3 minutos', value: 180 },
  { label: '5 minutos', value: 300 },
  { label: '7 minutos', value: 420 },
  { label: '10 minutos', value: 600 },
  { label: '12 minutos', value: 720 },
  { label: '15 minutos', value: 900 },
  { label: '20 minutos', value: 1200 },
  { label: '25 minutos', value: 1500 },
  { label: '30 minutos', value: 1800 },
  { label: '35 minutos', value: 2100 },
  { label: '40 minutos', value: 2400 },
  { label: '45 minutos', value: 2700 },
  { label: '50 minutos', value: 3000 },
  { label: '55 minutos', value: 3300 },
  { label: '1 hora', value: 3600 },
  { label: '1.5 horas', value: 5400 },
  { label: '2 horas', value: 7200 },
  { label: '3 horas', value: 10800 },
  { label: '4 horas', value: 14400 },
  { label: '5 horas', value: 18000 },
  { label: '6 horas', value: 21600 },
  { label: '8 horas', value: 28800 },
  { label: '10 horas', value: 36000 },
  { label: '12 horas', value: 43200 },
  { label: '14 horas', value: 50400 },
  { label: '16 horas', value: 57600 },
  { label: '18 horas', value: 64800 },
  { label: '20 horas', value: 72000 },
  { label: '22 horas', value: 79200 },
  { label: '1 dia', value: 86400 },
  { label: '2 dias', value: 172800 },
  { label: '3 dias', value: 259200 },
  { label: '4 dias', value: 345600 },
  { label: '5 dias', value: 432000 },
  { label: '6 dias', value: 518400 },
  { label: '7 dias', value: 604800 },
  { label: '10 dias', value: 864000 },
  { label: '15 dias', value: 1296000 },
  { label: '30 dias', value: 2592000 },
]

// Função auxiliar para formatar delay em texto legível
export function formatDelay(segundos: number): string {
  if (segundos === 0) return 'Imediato'
  
  const dias = Math.floor(segundos / 86400)
  const horas = Math.floor((segundos % 86400) / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const segs = segundos % 60
  
  const partes: string[] = []
  if (dias > 0) partes.push(`${dias}d`)
  if (horas > 0) partes.push(`${horas}h`)
  if (minutos > 0) partes.push(`${minutos}min`)
  if (segs > 0 && partes.length === 0) partes.push(`${segs}s`)
  
  return partes.join(' ') || 'Imediato'
}

// Função para formatar valor monetário
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

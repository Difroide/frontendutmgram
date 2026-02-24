/**
 * Parser para converter JSON do drawflow para estrutura interna simplificada
 */

import {
  Fluxo,
  Mensagem,
  Plano,
  OrderBump,
  VipGroup,
  FluxoOriginal,
  DrawflowStructure,
  DrawflowNode,
  DrawflowButton,
  BotVendas,
} from '../types/Fluxo'
import { criarAssinaturaUpsell, criarNomeUpsell } from './upsellUtils'

/**
 * Converte um JSON de fluxo original para a estrutura interna simplificada
 * Aceita tanto string JSON quanto objeto já parseado
 */
/**
 * Normaliza o payload importado: se for array de fluxos, retorna o primeiro fluxo.
 * Assim os bots (e demais dados) do fluxo importado são sempre reconhecidos.
 */
function normalizarPayloadImportado(parsed: unknown): FluxoOriginal {
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
    return parsed[0] as FluxoOriginal
  }
  return parsed as FluxoOriginal
}

export function parseFluxoJson(jsonStringOrObject: string | object): Fluxo {
  // Se já é um objeto, usa diretamente; se é string, faz parse
  let original: FluxoOriginal
  let originalJsonString: string

  if (typeof jsonStringOrObject === 'string') {
    originalJsonString = jsonStringOrObject
    const parsed = JSON.parse(jsonStringOrObject)
    original = normalizarPayloadImportado(parsed)
  } else {
    originalJsonString = JSON.stringify(jsonStringOrObject, null, 2)
    original = normalizarPayloadImportado(jsonStringOrObject)
  }

  // Parse do flowJson (estrutura drawflow) - também pode ser string ou objeto
  let flowJson: DrawflowStructure
  if (typeof original.flowJson === 'string') {
    flowJson = JSON.parse(original.flowJson)
  } else {
    flowJson = original.flowJson as unknown as DrawflowStructure
  }
  
  const nodes = flowJson.drawflow.Home.data
  
  // Encontrar upsells no fluxo (mensagens com condition purchased)
  const { upsellNodes, upsellPorBaseId } = extrairUpsells(nodes)

  // Encontrar todas as mensagens (nós MSG) e ordená-las por conexão
  const mensagens = extrairMensagensOrdenadas(nodes, new Set(upsellNodes))
  
  // Extrair order bump global (do primeiro nó com orderBumpGlobal enabled)
  let orderBumpGlobal: OrderBump | null = null
  for (const msg of mensagens) {
    if (msg.orderBumpGlobal?.enabled) {
      orderBumpGlobal = msg.orderBumpGlobal
      break
    }
  }
  
  // Extrair botName, orderBumpsLibrary e botoesLibrary de campos customizados se existirem
  const customFields = (original as any)._customFields || {}
  const botName = customFields.botName || ''
  const orderBumpsLibrary = customFields.orderBumpsLibrary || []
  const botoesLibrary = customFields.botoesLibrary || []
  const upsellsLibrary = customFields.upsellsLibrary || []

  // Consolidar upsells detectados no fluxo com biblioteca existente
  const upsellMap = new Map<string, { id: string; mensagem: Omit<Mensagem, 'id' | 'posicao'>; nome: string }>()
  const upsellIdPorAssinatura = new Map<string, string>()

  ;(upsellsLibrary || []).forEach((upsell: any) => {
    if (!upsell?.mensagem) return
    const assinatura = criarAssinaturaUpsell(upsell.mensagem)
    upsellMap.set(assinatura, {
      id: upsell.id,
      nome: upsell.nome || criarNomeUpsell(upsell.mensagem),
      mensagem: upsell.mensagem,
    })
    upsellIdPorAssinatura.set(assinatura, upsell.id)
  })

  upsellPorBaseId.forEach((mensagemUpsell, baseNodeId) => {
    const assinatura = criarAssinaturaUpsell(mensagemUpsell)
    if (!upsellMap.has(assinatura)) {
      const novoId = `up-${Math.abs(hashString(assinatura))}`
      upsellMap.set(assinatura, {
        id: novoId,
        nome: criarNomeUpsell(mensagemUpsell),
        mensagem: mensagemUpsell,
      })
      upsellIdPorAssinatura.set(assinatura, novoId)
    }
  })

  const upsellsLibraryFinal = Array.from(upsellMap.values()).map(item => ({
    id: item.id,
    nome: item.nome,
    mensagem: item.mensagem,
  }))

  const upsellIdPorBase = new Map<number, string>()
  upsellPorBaseId.forEach((mensagemUpsell, baseNodeId) => {
    const assinatura = criarAssinaturaUpsell(mensagemUpsell)
    const upsellId = upsellIdPorAssinatura.get(assinatura)
    if (upsellId) upsellIdPorBase.set(baseNodeId, upsellId)
  })

  const mensagensComUpsell = mensagens.map(mensagem => {
    const upsellId = upsellIdPorBase.get(mensagem.originalNodeId || mensagem.id)
    return upsellId ? { ...mensagem, upsellId } : mensagem
  })
  
  // Extrair bots de vendas do JSON (sempre reconhecer e preencher a lista de bots do fluxo importado)
  const bots = extrairBotsDeVendas(original, customFields)

  return {
    name: original.name,
    botName, // Novo campo
    token: original.token,
    description: original.description,
    video: original.video,
    paymentMethod: original.paymentMethod,
    paymentMethodSecondary: original.paymentMethodSecondary,
    paymentMethodTertiary: original.paymentMethodTertiary,
    paymentRouterEnabled: original.paymentRouterEnabled,
    paymentRouterStats: original.paymentRouterStats,
    rateLimitConfig: original.rateLimitConfig,
    mensagens: mensagensComUpsell,
    orderBumpGlobal,
    orderBumpsLibrary, // Carregar da biblioteca salva ou inicializar vazio
    botoesLibrary, // Biblioteca de botões/planos reutilizáveis
    upsellsLibrary: upsellsLibraryFinal, // Biblioteca de upsells consolidada
    bots: bots ?? [], // Bots do fluxo importado (reconhecidos de _customFields.bots ou token/backup/cloned)
    backupBotToken: original.backupBotToken || null,
    clonedBots: original.clonedBots || [],
    stripeCheckoutMode: original.stripeCheckoutMode,
    stripeUpsellConfig: original.stripeUpsellConfig,
    originalJson: originalJsonString,
  }
}

/**
 * Extrai bots de vendas do JSON original
 */
/**
 * Verifica se o nome do bot parece um username (formato inválido)
 * Usernames geralmente: sem espaços, sem acentos, apenas letras/números/underscores
 */
function nomePareceBotUsername(nome: string): boolean {
  // Se tem espaço ou caracteres especiais (exceto @ e _), provavelmente é nome válido
  if (/[\s\-\.]/.test(nome)) return false
  
  // Se tem apenas letras minúsculas + números + underscores, e tem mais de 8 chars, provavelmente é username
  if (/^[a-z0-9_]+bot$/i.test(nome) && nome.length > 8) return true
  
  // Se tem muitos números juntos, provavelmente é username gerado
  if (/\d{4,}/.test(nome)) return true
  
  return false
}

function extrairBotsDeVendas(original: FluxoOriginal, customFields: any): BotVendas[] {
  const bots: BotVendas[] = []
  const timestamp = Date.now()
  
  // Se já tiver bots salvos nos campos customizados, validar e usar
  if (customFields.bots && Array.isArray(customFields.bots) && customFields.bots.length > 0) {
    console.log('[FluxoParser] Validando bots de _customFields:', customFields.bots.length)
    
    // Validar e corrigir nomes de bots suspeitos
    const botsValidados = customFields.bots.map((bot: any, index: number) => {
      const nomeOriginal = bot.nome || 'Bot sem nome'
      let nomeCorrigido = nomeOriginal
      
      // Se o nome parece um username, substituir pelo nome do fluxo
      if (nomePareceBotUsername(nomeOriginal)) {
        nomeCorrigido = index === 0 && bot.isPrincipal 
          ? original.name || 'Bot Principal'
          : `Bot ${index + 1}`
        console.log(`[FluxoParser] ⚠️ Nome suspeito detectado: "${nomeOriginal}" → "${nomeCorrigido}"`)
      }
      
      return {
        ...bot,
        nome: nomeCorrigido
      }
    })
    
    return botsValidados
  }
  
  // Bot principal (token na raiz do fluxo)
  if (original.token) {
    bots.push({
      id: `bot-principal-${timestamp}`,
      nome: original.name || 'Bot Principal',
      username: '',
      token: original.token,
      isPrincipal: true,
    })
    console.log('[FluxoParser] Bot principal encontrado:', original.token.substring(0, 15) + '...')
  }

  // Bots em exportedClones (cada item tem name + token) — formato do arquivo exportado com clones
  const exportedClones = original.exportedClones
  if (exportedClones && Array.isArray(exportedClones) && exportedClones.length > 0) {
    exportedClones.forEach((clone: { name?: string; token?: string }, index: number) => {
      const token = clone?.token && typeof clone.token === 'string' ? clone.token.trim() : ''
      if (!token) return
      const nome = clone?.name && typeof clone.name === 'string' ? clone.name.trim() : `Bot Clone ${index + 1}`
      bots.push({
        id: `bot-exported-${index}-${timestamp + 100 + index}`,
        nome,
        username: nome,
        token,
        isPrincipal: false,
      })
      console.log('[FluxoParser] Bot de exportedClones:', nome, token.substring(0, 15) + '...')
    })
  } else {
    // Formato legado: backupBotToken e clonedBots (apenas tokens, sem nome)
    if (original.backupBotToken && original.backupBotToken.trim() !== '') {
      bots.push({
        id: `bot-backup-${timestamp + 1}`,
        nome: 'Bot Backup',
        username: '',
        token: original.backupBotToken,
        isPrincipal: false,
      })
      console.log('[FluxoParser] Bot backup encontrado:', original.backupBotToken.substring(0, 15) + '...')
    }
    if (original.clonedBots && Array.isArray(original.clonedBots)) {
      original.clonedBots.forEach((token, index) => {
        if (token && token.trim() !== '') {
          bots.push({
            id: `bot-clone-${index}-${timestamp + 2 + index}`,
            nome: `Bot Clone ${index + 1}`,
            username: '',
            token: token,
            isPrincipal: false,
          })
          console.log('[FluxoParser] Bot clone encontrado:', token.substring(0, 15) + '...')
        }
      })
    }
  }

  console.log('[FluxoParser] Total de bots encontrados:', bots.length)
  return bots
}

/**
 * Extrai mensagens ordenadas seguindo as conexões do fluxo
 */
function extrairMensagensOrdenadas(nodes: Record<string, DrawflowNode>, ignoredIds: Set<number> = new Set()): Mensagem[] {
  const mensagens: Mensagem[] = []
  const nodeArray = Object.values(nodes)
  
  // Encontrar o nó START
  const startNode = nodeArray.find(node => node.name === 'START' || node.data?.type === 'start')
  if (!startNode) {
    // Se não houver START, pegar todos os nós MSG
    const msgNodes = nodeArray.filter(node => node.name === 'MSG' && !ignoredIds.has(node.id))
    return msgNodes.map((node, index) => converterNodeParaMensagem(node, index))
  }
  
  // Seguir as conexões a partir do START
  const visitados = new Set<number>()
  let currentNodeId = getNextNodeId(startNode, nodes, ignoredIds)
  let posicao = 0
  
  while (currentNodeId && !visitados.has(currentNodeId)) {
    visitados.add(currentNodeId)
    const node = nodes[currentNodeId.toString()]
    
    if (node && node.name === 'MSG' && !ignoredIds.has(node.id)) {
      mensagens.push(converterNodeParaMensagem(node, posicao))
      posicao++
    }
    
    currentNodeId = getNextNodeId(node, nodes, ignoredIds)
  }
  
  // Adicionar nós MSG que não foram visitados (desconectados)
  const msgNodesNaoVisitados = nodeArray.filter(
    node => node.name === 'MSG' && !visitados.has(node.id) && !ignoredIds.has(node.id)
  )
  for (const node of msgNodesNaoVisitados) {
    mensagens.push(converterNodeParaMensagem(node, posicao))
    posicao++
  }
  
  return mensagens
}

/**
 * Obtém o ID do próximo nó conectado
 */
function getNextNodeId(
  node: DrawflowNode | undefined,
  nodes: Record<string, DrawflowNode>,
  ignoredIds: Set<number>
): number | null {
  if (!node?.outputs?.output_1?.connections?.length) return null
  const connections = node.outputs.output_1.connections

  const preferencial = connections.find(conn => {
    const nextNode = nodes[conn.node]
    if (!nextNode) return false
    if (ignoredIds.has(nextNode.id)) return false
    return nextNode.data?.condition !== 'purchased'
  })

  const fallback = connections.find(conn => {
    const nextNode = nodes[conn.node]
    return nextNode && !ignoredIds.has(nextNode.id)
  })

  const connection = preferencial || fallback || connections[0]
  return connection ? parseInt(connection.node) : null
}

function extrairUpsells(nodes: Record<string, DrawflowNode>) {
  const upsellNodes: number[] = []
  const upsellPorBaseId = new Map<number, Omit<Mensagem, 'id' | 'posicao'>>()

  Object.values(nodes).forEach(node => {
    if (node.name !== 'MSG') return
    if (node.data?.condition !== 'purchased') return
    const baseId = node.inputs?.input_1?.connections?.[0]?.node
    if (!baseId) return
    const baseNodeId = parseInt(baseId)
    if (Number.isNaN(baseNodeId)) return

    const mensagemUpsell = converterNodeParaMensagem(node, 0)
    const { id, posicao, ...mensagemSemId } = mensagemUpsell
    upsellNodes.push(node.id)
    upsellPorBaseId.set(baseNodeId, mensagemSemId)
  })

  return { upsellNodes, upsellPorBaseId }
}

function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(i)
  }
  return hash
}

/**
 * Converte um nó drawflow para o formato Mensagem interno
 */
function converterNodeParaMensagem(node: DrawflowNode, posicao: number): Mensagem {
  const data = node.data
  
  // Converter buttons para planos
  const planos: Plano[] = (data.buttons || []).map((btn: DrawflowButton) => ({
    name: btn.name,
    value: btn.value,
    vipGroups: btn.vipGroups || [],
    orderBump: btn.orderBump,
  }))
  
  return {
    id: node.id,
    description: data.description || '',
    video: data.video || null,
    delay: data.delay || 0,
    delayType: data.delayType || 'relative',
    scheduleTime: data.scheduleTime || '',
    scheduleDays: data.scheduleDays || 0,
    planos,
    orderBumpPerPlan: data.orderBumpPerPlan || false,
    orderBumpGlobal: data.orderBumpGlobal,
    posicao,
    originalNodeId: node.id,
  }
}

/**
 * Extrai texto limpo de HTML (para preview)
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return ''
  
  // Remover tags HTML
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n')
    .trim()
  
  return text
}

/**
 * Gera um preview curto do texto da mensagem
 */
export function gerarPreviewMensagem(html: string, maxLength: number = 100): string {
  const text = extractTextFromHtml(html)
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Exportador para gerar JSON no formato original drawflow
 */

import {
  Fluxo,
  Mensagem,
  Plano,
  OrderBump,
  FluxoOriginal,
  DrawflowStructure,
  DrawflowNode,
  DrawflowNodeData,
  BotVendas,
} from '../types/Fluxo'

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

/**
 * Converte a estrutura interna de volta para o JSON original
 */
export function exportFluxoToJson(fluxo: Fluxo): string {
  // Gerar a estrutura drawflow
  const drawflowData: Record<string, DrawflowNode> = {}
  
  // Criar nó START
  const startNode = criarNoStart()
  drawflowData['1'] = startNode
  
  // Criar nós MSG para cada mensagem
  let nodeId = 2
  const mensagensOrdenadas = [...fluxo.mensagens].sort((a, b) => a.posicao - b.posicao)
  const totalMensagens = mensagensOrdenadas.length
  const nodeIdMap = new Map<number, number>()
  const nodePosMap = new Map<number, { x: number; y: number }>()
  
  for (let i = 0; i < mensagensOrdenadas.length; i++) {
    const mensagem = mensagensOrdenadas[i]
    const posicao = calcularPosicaoNo(i, totalMensagens)
    const msgNode = criarNoMensagem(
      nodeId,
      mensagem,
      fluxo.orderBumpGlobal,
      i === 0 ? 1 : nodeId - 1, // inputNodeId
      i < mensagensOrdenadas.length - 1 ? nodeId + 1 : null, // outputNodeId
      i, // index da mensagem
      totalMensagens,
      undefined,
      posicao
    )
    drawflowData[nodeId.toString()] = msgNode
    nodeIdMap.set(mensagem.id, nodeId)
    nodePosMap.set(mensagem.id, posicao)
    nodeId++
  }
  
  // Inserir Upsells (condição de compra)
  const upsellMap = new Map((fluxo.upsellsLibrary || []).map(upsell => [upsell.id, upsell]))
  mensagensOrdenadas.forEach((mensagem, index) => {
    if (!mensagem.upsellId) return
    const upsell = upsellMap.get(mensagem.upsellId)
    if (!upsell) return
    
    const baseNodeId = nodeIdMap.get(mensagem.id)
    if (!baseNodeId) return
    const basePos = nodePosMap.get(mensagem.id)
    const posicaoUpsell = basePos
      ? { x: basePos.x + 260, y: basePos.y + 200 }
      : calcularPosicaoNo(index, totalMensagens)
    const nextMensagem = mensagensOrdenadas[index + 1]
    const nextNodeId = nextMensagem ? nodeIdMap.get(nextMensagem.id) || null : null
    
    const upsellMensagem: Mensagem = {
      id: -1,
      posicao: 0,
      ...upsell.mensagem,
    }
    
    const upsellNode = criarNoMensagem(
      nodeId,
      upsellMensagem,
      fluxo.orderBumpGlobal,
      baseNodeId,
      nextNodeId,
      index,
      totalMensagens,
      'purchased',
      posicaoUpsell
    )
    
    drawflowData[nodeId.toString()] = upsellNode
    
    const baseNode = drawflowData[baseNodeId.toString()]
    if (baseNode?.outputs?.output_1?.connections) {
      baseNode.outputs.output_1.connections.push({ node: nodeId.toString(), output: 'input_1' })
    }
    
    nodeId++
  })
  
  // Conectar START ao primeiro MSG
  if (mensagensOrdenadas.length > 0) {
    startNode.outputs.output_1.connections = [{ node: '2', output: 'input_1' }]
  }
  
  const flowJson: DrawflowStructure = {
    drawflow: {
      Home: {
        data: drawflowData
      }
    }
  }
  
  // Extrair tokens dos bots para os campos legados
  const { tokenPrincipal, backupBotToken, clonedBots } = extrairTokensDosBots(fluxo.bots || [])
  
  // Validar e sanitizar nomes dos bots antes de exportar
  const botsValidados = (fluxo.bots || []).map((bot, index) => {
    const nomeOriginal = bot.nome || 'Bot sem nome'
    let nomeValido = nomeOriginal
    
    // Se o nome parece um username, substituir pelo nome do fluxo
    if (nomePareceBotUsername(nomeOriginal)) {
      nomeValido = index === 0 && bot.isPrincipal 
        ? fluxo.name || 'Bot Principal'
        : `Bot ${index + 1}`
      console.log(`[FluxoExporter] ⚠️ Nome de bot corrigido: "${nomeOriginal}" → "${nomeValido}"`)
    }
    
    return {
      ...bot,
      nome: nomeValido
    }
  })

  const rateLimitConfig = fluxo.rateLimitConfig || getDefaultRateLimitConfig()
  const botsSecundarios = (fluxo.bots || []).filter(b => !b.isPrincipal)
  const temExportedClones = botsSecundarios.length > 0

  // Montar o JSON final no mesmo formato que o outro sistema importa (raiz + exportedClones)
  const original: FluxoOriginal = {
    name: fluxo.name,
    token: tokenPrincipal || fluxo.token,
    description: fluxo.description,
    video: fluxo.video,
    buttonsJson: null,
    remarketingJson: null,
    vipChatId: null,
    isAbTest: false,
    descriptionB: null,
    videoB: null,
    buttonsJsonB: null,
    remarketingJsonB: null,
    vipDurationDays: null,
    wooviAppId: null,
    flowJson: flowJson,
    flowJsonB: null,
    rebuyFlowId: null,
    sortOrder: 0,
    paymentMethod: fluxo.paymentMethod || 'pushin',
    paymentMethodSecondary: fluxo.paymentMethodSecondary || 'none',
    paymentMethodTertiary: fluxo.paymentMethodTertiary || 'none',
    paymentRouterEnabled: fluxo.paymentRouterEnabled ?? true,
    paymentRouterStats: fluxo.paymentRouterStats || {},
    backupBotToken: temExportedClones ? null : backupBotToken,
    clonedBots: temExportedClones ? [] : clonedBots,
    rateLimitConfig,
    stripeCheckoutMode: fluxo.stripeCheckoutMode || 'hosted',
    stripeUpsellConfig: fluxo.stripeUpsellConfig || {},
  }

  // Exportar clones no mesmo formato do import (name + token + flowJson por clone) para o outro sistema reconhecer
  if (temExportedClones) {
    original.exportedClones = botsSecundarios.map(bot => ({
      name: (bot.username && bot.username.trim()) || bot.nome || 'Bot',
      token: bot.token,
      description: null,
      video: null,
      buttonsJson: null,
      remarketingJson: null,
      vipChatId: null,
      isAbTest: false,
      descriptionB: null,
      videoB: null,
      buttonsJsonB: null,
      remarketingJsonB: null,
      vipDurationDays: null,
      wooviAppId: null,
      flowJson,
      rateLimitConfig,
      stripeCheckoutMode: fluxo.stripeCheckoutMode || 'hosted',
      stripeUpsellConfig: fluxo.stripeUpsellConfig || {},
    }))
  }

  // Incluir _customFields para o Criador de Fluxo reconhecer bots (nome, etc.) na reimportação
  original._customFields = {
    bots: botsValidados,
    botName: fluxo.botName || '',
  }

  return JSON.stringify(original, null, 2)
}

/**
 * Cria o nó START
 */
function criarNoStart(): DrawflowNode {
  return {
    id: 1,
    name: 'START',
    data: { type: 'start' },
    class: 'start',
    html: `
    <div class="fb-node-box start" data-selected="false">
      <div class="fb-node-head">
        <div class="fb-node-title">
          <i class="lucide lucide-rocket mr-1"></i> Start
        </div>
      </div>
      <div class="fb-node-body">
        <div class="fb-node-desc"><em>Ponto inicial do funil</em></div>
      </div>
    </div>`,
    typenode: false,
    inputs: {},
    outputs: { output_1: { connections: [] } },
    pos_x: 19,
    pos_y: 21,
  }
}

/**
 * Calcula posição do nó para organizar em 2 linhas
 * Mensagens são distribuídas: primeira metade na linha 1, segunda metade na linha 2
 */
function calcularPosicaoNo(index: number, total: number): { x: number, y: number } {
  const NODE_WIDTH = 280    // Largura aproximada do nó
  const NODE_HEIGHT = 200   // Altura aproximada do nó
  const START_X = 350       // Posição X inicial (após o nó START)
  const LINE_1_Y = 50       // Posição Y da linha 1
  const LINE_2_Y = 300      // Posição Y da linha 2
  const SPACING_X = 300     // Espaçamento horizontal entre nós
  
  // Calcular quantos nós por linha
  const nodesPerLine = Math.ceil(total / 2)
  
  // Determinar em qual linha está este nó
  const isLine2 = index >= nodesPerLine
  
  // Posição dentro da linha
  const posInLine = isLine2 ? index - nodesPerLine : index
  
  return {
    x: START_X + (posInLine * SPACING_X),
    y: isLine2 ? LINE_2_Y : LINE_1_Y,
  }
}

/**
 * Cria um nó de mensagem
 */
function criarNoMensagem(
  id: number,
  mensagem: Mensagem,
  orderBumpGlobal: OrderBump | null,
  inputNodeId: number,
  outputNodeId: number | null,
  index: number,
  totalMensagens: number,
  conditionOverride?: string,
  posicaoOverride?: { x: number; y: number }
): DrawflowNode {
  const data: DrawflowNodeData = {
    description: mensagem.description,
    video: mensagem.video || '',
    delay: mensagem.delay,
    scheduleTime: mensagem.scheduleTime,
    scheduleDays: mensagem.scheduleDays,
    delayType: mensagem.delayType,
    buttons: mensagem.planos.map(plano => ({
      name: plano.name,
      value: plano.value,
      vipGroups: plano.vipGroups,
      orderBump: plano.orderBump || {
        enabled: false,
        description: '',
        video: '',
        value: 0,
        btnAccept: 'QUERO MAIS UM GRUPO',
        btnDecline: 'VOU PERDER A PROMOÇÃO',
        vipGroups: [],
      },
    })),
    orderBumpPerPlan: mensagem.orderBumpPerPlan,
    orderBumpGlobal: mensagem.orderBumpGlobal || orderBumpGlobal || {
      description: '',
      value: 0,
      btnAccept: '',
      btnDecline: '',
      vipGroups: [],
      enabled: false,
      video: '',
    },
    vipDurationDays: 0,
    type: 'msg',
    condition: conditionOverride || (index === 0 ? 'free' : 'not_purchased'),
    rebuyFlowId: null,
    stripeUpsellConfig: {},
  }
  
  // Gerar preview da descrição para o HTML do nó
  const descPreview = gerarPreviewParaHtml(mensagem.description)
  const buttonsHtml = mensagem.planos.slice(0, 3).map(p => 
    `<div class="fb-node-btn">${p.name}</div>`
  ).join('')
  
  const hasOrderBump = orderBumpGlobal?.enabled || mensagem.orderBumpGlobal?.enabled
  const condTag = data.condition && data.condition !== 'free'
    ? `<span class="fb-cond-tag">${data.condition}</span>`
    : ''
  
  const posicaoFinal = posicaoOverride || calcularPosicaoNo(index, totalMensagens)
  
  return {
    id,
    name: 'MSG',
    data,
    class: 'msg',
    html: `
<div class="fb-node-box" data-selected="false">
  <div class="fb-node-head">
    <div class="fb-node-title">
      <i class="lucide lucide-message-square mr-1"></i> Mensagem
    </div>
    <div class="fb-node-actions">
      <button type="button" class="fb-node-dup"  title="Duplicar">📄</button>
      <button type="button" class="fb-node-edit" title="Abrir">⚙️</button>
      <button type="button" class="fb-node-del"  title="Excluir">🗑️</button>
    </div>
  </div>

  <div class="fb-node-body">
    
    <div class="fb-node-desc">
      ${descPreview}
    </div>
    <div class="fb-node-btns">${buttonsHtml}</div>
  </div>

  ${hasOrderBump ? '<span class="fb-ob-flag">🛒</span>' : ''}
  ${condTag}
</div>`,
    typenode: false,
    inputs: {
      input_1: {
        connections: [{ node: inputNodeId.toString(), input: 'output_1' }]
      }
    },
    outputs: {
      output_1: {
        connections: outputNodeId 
          ? [{ node: outputNodeId.toString(), output: 'input_1' }]
          : []
      }
    },
    pos_x: posicaoFinal.x,
    pos_y: posicaoFinal.y,
  }
}

/**
 * Gera preview da descrição para o HTML do nó
 */
function gerarPreviewParaHtml(html: string): string {
  if (!html) return '<em>sem descrição</em>'
  
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  return text.substring(0, 60)
}

/**
 * Retorna configuração padrão de rate limit
 */
function getDefaultRateLimitConfig() {
  return {
    enabled: true,
    start: {
      maxAttempts: 8,
      windowMinutes: 5,
      blockMinutes: 5,
      floodLimit: 20,
      floodWindowMinutes: 6,
      floodPauseMinutes: 6,
    },
    verification: {
      maxAttempts: 4,
      windowMinutes: 1,
      firstBlockMinutes: 2,
      secondBlockMinutes: 10,
      thirdBlockHours: 24,
    },
    planSelection: {
      maxPerMinute: 3,
      blockMinutes: 5,
    },
    messaging: {
      maxPerSecond: 25,
      maxPerMinutePerUser: 20,
      adaptiveEnabled: true,
      targetSuccessRate: 0.95,
    },
    blocking: {
      warningThreshold: 2,
      banThreshold: 3,
      ignoreHours: 72,
      banDays: 7,
    },
  }
}

/**
 * Aplica desconto percentual aos valores dos planos
 */
export function aplicarDesconto(
  planos: Plano[],
  porcentagem: number
): Plano[] {
  const fator = 1 - (porcentagem / 100)
  return planos.map(plano => ({
    ...plano,
    value: Math.round(plano.value * fator * 100) / 100,
  }))
}

/**
 * Adiciona texto extra ao final do nome dos planos
 */
export function adicionarTextoExtra(
  planos: Plano[],
  textoExtra: string
): Plano[] {
  return planos.map(plano => ({
    ...plano,
    name: `${plano.name} ${textoExtra}`.trim(),
  }))
}

/**
 * Gera nome do arquivo para download
 */
export function gerarNomeArquivo(fluxo: Fluxo): string {
  const timestamp = Date.now()
  const nomeBase = fluxo.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  return `fluxo-${nomeBase}-${timestamp}.json`
}

/**
 * Extrai tokens dos bots para os campos legados do JSON
 * Converte o array de BotVendas para: token (principal), backupBotToken, clonedBots[]
 */
function extrairTokensDosBots(bots: BotVendas[]): {
  tokenPrincipal: string | null
  backupBotToken: string | null
  clonedBots: string[]
} {
  console.log('[FluxoExporter] Exportando bots:', bots?.length || 0)
  
  if (!bots || bots.length === 0) {
    return {
      tokenPrincipal: null,
      backupBotToken: null,
      clonedBots: [],
    }
  }
  
  // Encontrar o bot principal
  const botPrincipal = bots.find(b => b.isPrincipal) || bots[0]
  const tokenPrincipal = botPrincipal?.token || null
  
  // Bots secundários (todos exceto o principal)
  const botsSecundarios = bots.filter(b => b.id !== botPrincipal?.id)
  
  // O primeiro bot secundário vai para backupBotToken
  const backupBotToken = botsSecundarios.length > 0 ? botsSecundarios[0].token : null
  
  // Os demais vão para clonedBots
  const clonedBots = botsSecundarios.slice(1).map(b => b.token).filter(Boolean)
  
  console.log('[FluxoExporter] Token principal:', tokenPrincipal?.substring(0, 15) + '...')
  console.log('[FluxoExporter] Backup bot:', backupBotToken ? backupBotToken.substring(0, 15) + '...' : 'null')
  console.log('[FluxoExporter] Cloned bots:', clonedBots.length)
  
  return {
    tokenPrincipal,
    backupBotToken,
    clonedBots,
  }
}

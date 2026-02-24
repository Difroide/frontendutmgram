import fs from 'fs'
import path from 'path'
import {
  getBlastsendConfig,
  importBot,
  importGroup,
  createCampaign,
} from './blastsendApiService.js'
import { PATHS } from '../config/paths.js'

function inferBotUsername(json) {
  const explicit = json.botUsername || json.bot_username
  if (explicit) return String(explicit).replace(/^@+/, '')
  const senderName = json.campaign?.senderName || ''
  if (senderName && /^[a-zA-Z][a-zA-Z0-9_]*_?bot$/i.test(senderName)) {
    return senderName.replace(/^@+/, '')
  }
  return null
}

export async function processarCampanhasNovas(logFn = () => {}) {
  const log = (msg, type = 'info') => logFn({ msg, type })

  const cfg = getBlastsendConfig()
  if (!cfg || !cfg.enabled) {
    log('Blastsend não configurado. Configure em Configurações (ícone ⋮).', 'error')
    return {
      success: false,
      error: 'Blastsend não configurado',
      log: [],
      botsImportados: 0,
      gruposImportados: 0,
      campanhasCriadas: 0,
      arquivosProcessados: 0,
      erros: [],
    }
  }

  const dirNovas = PATHS.CAMPANHAS_NOVAS_DIR
  const dirRodando = PATHS.CAMPANHAS_RODANDO_DIR
  const entries = []
  const logCollect = (msg, type) => {
    entries.push({ msg, type })
    log(msg, type)
  }

  logCollect('Iniciando processamento de Campanhas-novas...', 'info')
  logCollect(`API: ${cfg.url}`, 'info')

  if (!fs.existsSync(dirNovas)) {
    fs.mkdirSync(dirNovas, { recursive: true })
  }
  if (!fs.existsSync(dirRodando)) {
    fs.mkdirSync(dirRodando, { recursive: true })
  }

  const files = fs.readdirSync(dirNovas, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.json'))
    .map((d) => d.name)

  if (files.length === 0) {
    logCollect('Nenhum arquivo JSON em Campanhas-novas', 'info')
    return {
      success: true,
      log: entries,
      botsImportados: 0,
      gruposImportados: 0,
      campanhasCriadas: 0,
      arquivosProcessados: 0,
      erros: [],
    }
  }

  logCollect(`${files.length} arquivo(s) encontrado(s)`, 'info')

  const campaigns = []
  const invalids = []

  for (const f of files) {
    const filePath = path.join(dirNovas, f)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const json = JSON.parse(content)
      if (!json.botToken) {
        invalids.push({ file: f, reason: 'botToken ausente' })
        continue
      }
      if (!json.exportedGroups || !Array.isArray(json.exportedGroups) || json.exportedGroups.length === 0) {
        invalids.push({ file: f, reason: 'exportedGroups ausente ou vazio' })
        continue
      }
      const botUsername = inferBotUsername(json)
      if (!botUsername) {
        invalids.push({ file: f, reason: 'botUsername ausente e não foi possível inferir de campaign.senderName' })
        continue
      }
      campaigns.push({ file: f, filePath, json, botUsername })
    } catch (e) {
      invalids.push({ file: f, reason: e.message || 'Erro ao ler/parsear JSON' })
    }
  }

  for (const inv of invalids) {
    logCollect(`⚠ ${inv.file}: ${inv.reason}`, 'warn')
  }

  if (campaigns.length === 0) {
    logCollect('Nenhuma campanha válida para processar', 'warn')
    return {
      success: false,
      error: invalids.length ? 'Arquivos inválidos' : 'Nenhum arquivo processável',
      log: entries,
      botsImportados: 0,
      gruposImportados: 0,
      campanhasCriadas: 0,
      arquivosProcessados: 0,
      erros: invalids.map((i) => `${i.file}: ${i.reason}`),
    }
  }

  const stats = { botsImportados: 0, gruposImportados: 0, campanhasCriadas: 0 }
  const botsJaImportados = new Set()
  const gruposJaImportados = new Map()

  // Fase 1: importar todos os bots únicos
  logCollect('\n--- Fase 1: Bots ---', 'info')
  const uniqueBots = new Map()
  for (const { json, botUsername } of campaigns) {
    const token = json.botToken
    if (!token) continue
    const key = `${botUsername}:${token.slice(0, 20)}`
    if (!uniqueBots.has(key)) {
      uniqueBots.set(key, { username: botUsername, token, name: json.campaign?.senderName || botUsername })
    }
  }
  for (const [, bot] of uniqueBots) {
    const key = `${bot.username}:${bot.token.slice(0, 20)}`
    if (botsJaImportados.has(key)) continue
    logCollect(`Importando bot @${bot.username}...`, 'info')
    const ok = await importBot(cfg, bot.username, bot.token, bot.name)
    if (ok) {
      botsJaImportados.add(key)
      stats.botsImportados++
      logCollect(`✓ Bot @${bot.username} importado`, 'success')
    } else {
      logCollect(`✗ Falha ao importar bot @${bot.username}`, 'error')
    }
  }

  // Fase 2: importar todos os grupos
  logCollect('\n--- Fase 2: Grupos ---', 'info')
  for (const { json } of campaigns) {
    const niche = json.campaign?.senderName || json.campaign?.name || 'Geral'
    for (let i = 0; i < (json.exportedGroups || []).length; i++) {
      const g = json.exportedGroups[i]
      const gId = g.filePath || g.id || g.groupId || ''
      const link = g.link || ''
      const name = g.name || `${niche} ${i + 1}`
      if (!gId) continue
      const mapKey = gId
      if (gruposJaImportados.has(mapKey)) continue
      const ok = await importGroup(cfg, name, gId, link, niche, 0, niche)
      if (ok) {
        gruposJaImportados.set(mapKey, true)
        stats.gruposImportados++
      }
    }
  }
  logCollect(`✓ ${stats.gruposImportados} grupo(s) importado(s)`, 'success')

  // Fase 3: criar campanhas
  logCollect('\n--- Fase 3: Campanhas ---', 'info')
  const processed = []
  const erros = []

  for (const { file, filePath, json, botUsername } of campaigns) {
    const campaignName = json.campaign?.name || json.campaign?.senderName || file.replace(/\.json$/i, '')
    const niche = json.campaign?.senderName || json.campaign?.name || 'Geral'
    const groupIds = (json.exportedGroups || [])
      .map((g) => g.filePath || g.id || g.groupId)
      .filter(Boolean)

    if (groupIds.length === 0) {
      logCollect(`⚠ ${file}: nenhum groupId`, 'warn')
      erros.push(`${file}: sem grupos`)
      continue
    }

    logCollect(`Criando campanha: ${campaignName} (${groupIds.length} grupos)`, 'info')
    const ok = await createCampaign(cfg, campaignName, botUsername, groupIds, niche)
    if (ok) {
      stats.campanhasCriadas++
      logCollect(`✓ Campanha criada: ${campaignName}`, 'success')
      processed.push(filePath)
    } else {
      logCollect(`✗ Falha ao criar campanha: ${campaignName}`, 'error')
      erros.push(campaignName)
    }
  }

  // Pós-processamento: mover arquivos processados com sucesso para Campanhas-rodando
  for (const filePath of processed) {
    try {
      const fileName = path.basename(filePath)
      const destPath = path.join(dirRodando, fileName)
      fs.renameSync(filePath, destPath)
      logCollect(`Movido: ${fileName} → Campanhas-rodando`, 'info')
    } catch (e) {
      logCollect(`Erro ao mover ${filePath}: ${e.message}`, 'error')
    }
  }

  logCollect('\n--- Concluído ---', 'info')
  logCollect(
    `${stats.botsImportados} bot(s), ${stats.gruposImportados} grupo(s), ${stats.campanhasCriadas} campanha(s), ${processed.length} arquivo(s) processado(s)`,
    stats.campanhasCriadas > 0 ? 'success' : 'info'
  )
  if (erros.length) logCollect(`Erros: ${erros.join('; ')}`, 'error')

  return {
    success: erros.length === 0 || stats.campanhasCriadas > 0,
    ...stats,
    arquivosProcessados: processed.length,
    erros,
    log: entries,
  }
}

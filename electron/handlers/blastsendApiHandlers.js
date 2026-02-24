import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  getBlastsendConfig,
  testConnection as testConnectionService,
  importBot,
  importGroup,
  createCampaign,
} from '../services/blastsendApiService.js'
import { PATHS } from '../config/paths.js'

function getBlastsendConfigPath() {
  return path.join(PATHS.BASE, 'blastsend-config.json')
}

function getCategoriasDir() {
  try {
    return path.join(PATHS.BANCO_DIR, 'categorias')
  } catch (e) {
    return path.join(PATHS.BASE, 'banco', 'categorias')
  }
}

export function registerBlastsendApiHandlers() {
  ipcMain.handle('blastsend-api:saveConfig', async (event, config) => {
    try {
      const configPath = getBlastsendConfigPath()
      const data = {
        url: (config?.url || '').trim(),
        token: (config?.token || '').trim(),
        enabled: !!(config?.url && config?.token),
        updatedAt: new Date().toISOString(),
      }
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('blastsend-api:loadConfig', async () => {
    try {
      const configPath = getBlastsendConfigPath()
      if (!fs.existsSync(configPath)) {
        return { success: true, config: null }
      }
      const content = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content)
      return { success: true, config }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('blastsend-api:testConnection', async (event, config) => {
    if (!config?.url?.trim() || !config?.token?.trim()) {
      return { success: false, error: 'URL e Token são obrigatórios' }
    }
    return testConnectionService(config)
  })

  ipcMain.handle('blastsend-api:enviarCategorias', async (event, { categoriaIds = [] }) => {
    const entries = []
    const log = (msg, type = 'info') => entries.push({ msg, type })

    log('Iniciando envio para Blastsend...', 'info')

    const cfg = getBlastsendConfig()
    if (!cfg || !cfg.enabled) {
      log('Blastsend não configurado. Configure em Configurações (ícone ⋮).', 'error')
      return { success: false, error: 'Blastsend não configurado. Configure em Configurações (ícone ⋮).', log: entries }
    }
    log(`API: ${cfg.url}`, 'info')

    if (!categoriaIds.length) {
      log('Nenhuma categoria selecionada', 'error')
      return { success: false, error: 'Nenhuma categoria selecionada', log: entries }
    }
    log(`${categoriaIds.length} categoria(s) selecionada(s): ${categoriaIds.join(', ')}`, 'info')

    const CATEGORIAS_DIR = getCategoriasDir()
    if (!fs.existsSync(CATEGORIAS_DIR)) {
      log(`Pasta de categorias não encontrada: ${CATEGORIAS_DIR}`, 'error')
      return { success: false, error: 'Pasta de categorias não encontrada', log: entries }
    }
    log(`Lendo categorias de: ${CATEGORIAS_DIR}`, 'info')

    const stats = { botsImportados: 0, gruposImportados: 0, campanhasCriadas: 0, erros: [] }
    const botsJaImportados = new Set()

    for (const catId of categoriaIds) {
      const catPath = path.join(CATEGORIAS_DIR, catId)
      if (!fs.existsSync(catPath)) {
        log(`Categoria não encontrada: ${catId}`, 'warn')
        continue
      }

      let catNome = catId
      const metadataPath = path.join(catPath, 'metadata.json')
      if (fs.existsSync(metadataPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          catNome = meta.nome || catId
        } catch (_) {}
      }

      log(`\n→ Processando: ${catNome} (${catId})`, 'info')
      const nicheInitial = catNome && catNome.length ? catNome[0].toUpperCase() : 'G'

      const botsPath = path.join(catPath, 'bots.json')
      const gruposPath = path.join(catPath, 'grupos.json')
      let bots = []
      let grupos = []

      if (fs.existsSync(botsPath)) {
        try {
          const b = JSON.parse(fs.readFileSync(botsPath, 'utf-8'))
          bots = Array.isArray(b) ? b : []
        } catch (e) {
          log(`Erro ao ler bots.json: ${e.message}`, 'error')
        }
      }
      if (fs.existsSync(gruposPath)) {
        try {
          const g = JSON.parse(fs.readFileSync(gruposPath, 'utf-8'))
          grupos = Array.isArray(g) ? g : []
        } catch (e) {
          log(`Erro ao ler grupos.json: ${e.message}`, 'error')
        }
      }

      log(`  Bots: ${bots.length}, Grupos: ${grupos.length}`, 'info')

      for (const bot of bots) {
        const token = bot.token || bot.bot_token
        const username = bot.username || bot.bot_username || ''
        if (!token) {
          log(`  Bot sem token ignorado`, 'warn')
          continue
        }
        const key = `${username}:${token.slice(0, 20)}`
        if (botsJaImportados.has(key)) {
          log(`  Bot @${username} já importado`, 'info')
          continue
        }
        log(`  Importando bot @${username}...`, 'info')
        const ok = await importBot(cfg, username, token, bot.nome || bot.name || catNome)
        if (ok) {
          botsJaImportados.add(key)
          stats.botsImportados++
          log(`  ✓ Bot @${username} importado`, 'success')
        } else {
          log(`  ✗ Falha ao importar bot @${username}`, 'error')
        }
      }

      let gruposOk = 0
      for (let i = 0; i < grupos.length; i++) {
        const g = grupos[i]
        const gId = g.id || g.groupId
        const link = g.link_convite || g.link || ''
        const nome = g.nome || `${catNome} ${i + 1}`
        if (!gId) {
          log(`  Grupo sem ID ignorado`, 'warn')
          continue
        }
        const ok = await importGroup(cfg, nome, gId, link, catNome, 0, catNome)
        if (ok) {
          stats.gruposImportados++
          gruposOk++
        } else {
          log(`  ✗ Falha ao importar grupo ${gId}`, 'error')
        }
      }
      if (gruposOk > 0) {
        log(`  ✓ ${gruposOk} grupo(s) importado(s)`, 'success')
      }

      if (grupos.length > 0) {
        const groupIds = grupos
          .map((g) => g.id || g.groupId)
          .filter(Boolean)
          .map((id) => {
            let s = String(id).trim()
            if (s.startsWith('-100')) return s
            if (s.startsWith('-')) s = s.substring(1)
            return `-100${s}`
          })

        const botComToken = bots.find((b) => b.token || b.bot_token)
        const botUsername = botComToken?.username || botComToken?.bot_username || ''
        if (botUsername && groupIds.length > 0) {
          const campaignName = `[${nicheInitial}] ${catNome} @${botUsername.replace('@', '')}`
          log(`  Criando campanha: ${campaignName} (${groupIds.length} grupos)`, 'info')
          const ok = await createCampaign(cfg, campaignName, botUsername, groupIds, catNome)
          if (ok) {
            stats.campanhasCriadas++
            log(`  ✓ Campanha criada`, 'success')
          } else {
            stats.erros.push(`Campanha "${campaignName}"`)
            log(`  ✗ Falha ao criar campanha`, 'error')
          }
        } else {
          if (!botUsername) log(`  Sem bot com token para criar campanha`, 'warn')
        }
      }
    }

    log(`\n--- Concluído ---`, 'info')
    log(`${stats.botsImportados} bot(s), ${stats.gruposImportados} grupo(s), ${stats.campanhasCriadas} campanha(s)`, stats.campanhasCriadas > 0 ? 'success' : 'info')
    if (stats.erros.length) log(`Erros: ${stats.erros.join('; ')}`, 'error')

    return {
      success: stats.erros.length === 0 || (stats.botsImportados + stats.gruposImportados + stats.campanhasCriadas) > 0,
      ...stats,
      log: entries,
    }
  })
}

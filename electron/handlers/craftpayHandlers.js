import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const require = createRequire(import.meta.url)

const CRAFTPAY_CONFIG_FILE = () => path.join(PATHS.BANCO_DIR, 'craftpay-config.json')
const CRAFTPAY_CACHE_FILE = () => path.join(PATHS.BANCO_DIR, 'craftpay-cache.json')
const CRAFTPAY_FUNIS_FILE = () => path.join(PATHS.BANCO_DIR, 'craftpay-funis.json')
const CRAFTPAY_HISTORY_FILE = () => path.join(PATHS.BANCO_DIR, 'craftpay-stats-history.json')

const CACHE_VALID_MS = 5 * 60 * 1000 // 5 minutos

let fetchInProgress = false
const craftpayFunilJobs = new Map()

function criarJobId() {
  return `craftpay-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Carregar credenciais do CraftPay (sem expor senha ao frontend)
 */
function loadCraftPayConfig() {
  try {
    const configPath = CRAFTPAY_CONFIG_FILE()
    if (!fs.existsSync(configPath)) {
      return null
    }
    const data = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[craftpayHandlers] Erro ao carregar config:', error)
    return null
  }
}

/**
 * Carregar cache de estatísticas (se válido, < 5 min)
 */
function loadCraftPayCache() {
  try {
    const cachePath = CRAFTPAY_CACHE_FILE()
    if (!fs.existsSync(cachePath)) return null

    const data = fs.readFileSync(cachePath, 'utf-8')
    const cache = JSON.parse(data)
    const fetchedAt = cache.fetchedAt ? new Date(cache.fetchedAt).getTime() : 0
    const now = Date.now()

    if (now - fetchedAt < CACHE_VALID_MS) {
      return cache
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Carregar último cache conhecido (mesmo expirado) - para fallback em erros
 */
function loadCraftPayCacheLastKnown() {
  try {
    const cachePath = CRAFTPAY_CACHE_FILE()
    if (!fs.existsSync(cachePath)) return null
    const data = fs.readFileSync(cachePath, 'utf-8')
    const cache = JSON.parse(data)
    return cache?.stats ? cache : null
  } catch {
    return null
  }
}

/**
 * Salvar cache de estatísticas
 */
function saveCraftPayCache(stats, botsDetalhados) {
  try {
    const cachePath = CRAFTPAY_CACHE_FILE()
    const dir = path.dirname(cachePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const cache = {
      stats,
      botsDetalhados: Array.isArray(botsDetalhados) ? botsDetalhados : [],
      fetchedAt: new Date().toISOString(),
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')

    // Também salva no histórico permanente
    saveStatsHistory(stats, botsDetalhados)
  } catch (error) {
    console.warn('[craftpayHandlers] Erro ao salvar cache:', error.message)
  }
}

/**
 * Carregar histórico de estatísticas (persistência permanente)
 */
function loadStatsHistory() {
  try {
    const historyPath = CRAFTPAY_HISTORY_FILE()
    if (!fs.existsSync(historyPath)) return {}
    const data = fs.readFileSync(historyPath, 'utf-8')
    return JSON.parse(data) || {}
  } catch (error) {
    console.warn('[craftpayHandlers] Erro ao carregar histórico:', error.message)
    return {}
  }
}

/**
 * Salvar snapshot diário no histórico de estatísticas
 * Acumula dados dia após dia, nunca deleta entradas antigas
 */
function saveStatsHistory(stats, botsDetalhados) {
  try {
    const historyPath = CRAFTPAY_HISTORY_FILE()
    const dir = path.dirname(historyPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const history = loadStatsHistory()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    history[today] = {
      stats,
      botsDetalhados: Array.isArray(botsDetalhados) ? botsDetalhados : [],
      fetchedAt: new Date().toISOString(),
    }

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8')
  } catch (error) {
    console.warn('[craftpayHandlers] Erro ao salvar histórico:', error.message)
  }
}

/**
 * Fechar browser do CraftPay (chamado ao encerrar app)
 */
export async function closeCraftPayBrowser() {
  try {
    const scraperPath = path.join(PATHS.BASE, 'back', 'utils', 'craftpayScraper.js')
    const { closeCraftPayBrowser: closeFn } = require(scraperPath)
    await closeFn()
  } catch (error) {
    console.warn('[craftpayHandlers] Erro ao fechar browser CraftPay:', error.message)
  }
}

export function registerCraftPayHandlers() {
  // Obter estatísticas do CraftPay (usa cache se < 5 min, exceto quando forceRefresh)
  ipcMain.handle('craftpay-get-estatisticas', async (event, forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cache = loadCraftPayCache()
        if (cache && cache.stats) {
          return {
            success: true,
            stats: cache.stats,
            botsDetalhados: cache.botsDetalhados || [],
          }
        }
        if (fetchInProgress) {
          const lastCache = loadCraftPayCacheLastKnown()
          if (lastCache?.stats) {
            return { success: true, stats: lastCache.stats, botsDetalhados: lastCache.botsDetalhados || [] }
          }
        }
      }

      if (fetchInProgress && !forceRefresh) {
        const lastCache = loadCraftPayCacheLastKnown()
        if (lastCache?.stats) {
          return { success: true, stats: lastCache.stats, botsDetalhados: lastCache.botsDetalhados || [] }
        }
      }

      fetchInProgress = true

      const config = loadCraftPayConfig()
      if (!config || !config.email || !config.senha) {
        const lastCache = loadCraftPayCacheLastKnown()
        if (lastCache?.stats) {
          return { success: true, stats: lastCache.stats, botsDetalhados: lastCache.botsDetalhados || [] }
        }
        return {
          success: false,
          error: 'Credenciais não configuradas. Configure email e senha nas configurações do CraftPay.',
        }
      }

      const scraperPath = path.join(PATHS.BASE, 'back', 'utils', 'craftpayScraper.js')
      const { buscarEstatisticasCraftPay } = require(scraperPath)

      const result = await buscarEstatisticasCraftPay({
        email: config.email,
        senha: config.senha,
      })

      if (result.success && result.stats) {
        saveCraftPayCache(result.stats, result.botsDetalhados)
      }

      return result
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao buscar estatísticas:', error)

      const cache = loadCraftPayCacheLastKnown()
      if (cache && cache.stats) {
        return {
          success: true,
          stats: cache.stats,
          botsDetalhados: cache.botsDetalhados || [],
        }
      }

      return {
        success: false,
        error: error.message || 'Erro ao buscar estatísticas',
      }
    } finally {
      fetchInProgress = false
    }
  })

  // Salvar credenciais (sem 2FA)
  ipcMain.handle('craftpay-salvar-credenciais', async (event, { email, senha }) => {
    try {
      const configPath = CRAFTPAY_CONFIG_FILE()
      const dir = path.dirname(configPath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const existing = loadCraftPayConfig()
      const config = {
        email: email || existing?.email || '',
        senha: senha || existing?.senha || '',
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      console.log('[craftpayHandlers] Credenciais CraftPay salvas')
      return { success: true }
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao salvar credenciais:', error)
      return { success: false, error: error.message }
    }
  })

  // Verificar se há config (sem expor senha)
  ipcMain.handle('craftpay-carregar-config', async () => {
    try {
      const config = loadCraftPayConfig()
      if (!config || !config.email) {
        return { success: true, configurado: false }
      }
      return {
        success: true,
        configurado: true,
        email: config.email,
      }
    } catch (error) {
      return { success: false, configurado: false }
    }
  })

  // Listar funis (scrape + salvar cache)
  ipcMain.handle('craftpay-listar-funis', async () => {
    try {
      const config = loadCraftPayConfig()
      if (!config || !config.email || !config.senha) {
        return {
          success: false,
          error: 'Credenciais não configuradas. Configure email e senha nas configurações do CraftPay.',
        }
      }
      const scraperPath = path.join(PATHS.BASE, 'back', 'utils', 'craftpayScraper.js')
      const { listarFunisCraftPay } = require(scraperPath)
      const result = await listarFunisCraftPay({ email: config.email, senha: config.senha })
      if (result.success && Array.isArray(result.funis)) {
        const dir = path.dirname(CRAFTPAY_FUNIS_FILE())
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        const fetchedAt = new Date().toISOString()
        fs.writeFileSync(
          CRAFTPAY_FUNIS_FILE(),
          JSON.stringify({ funis: result.funis, fetchedAt }, null, 2),
          'utf-8'
        )
        return { ...result, fetchedAt }
      }
      return result
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao listar funis:', error)
      return { success: false, error: error.message || 'Erro ao listar funis.' }
    }
  })

  // Carregar funis salvos (apenas leitura do arquivo; busca no site só ao clicar em "Atualizar funis")
  ipcMain.handle('craftpay-carregar-funis-cache', async () => {
    try {
      const filePath = CRAFTPAY_FUNIS_FILE()
      if (!fs.existsSync(filePath)) {
        return { success: true, funis: [], fetchedAt: null }
      }
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      return {
        success: true,
        funis: Array.isArray(parsed.funis) ? parsed.funis : [],
        fetchedAt: parsed.fetchedAt || null,
      }
    } catch (error) {
      return { success: true, funis: [], fetchedAt: null }
    }
  })

  // Adicionar bots a um funil (em massa)
  ipcMain.handle('craftpay-adicionar-bots-funil', async (event, payload) => {
    try {
      const { nomeFunil, bots } = payload || {}
      if (!nomeFunil || !Array.isArray(bots) || bots.length === 0) {
        return { success: false, error: 'Informe o funil e ao menos um bot (nome e token).' }
      }
      const config = loadCraftPayConfig()
      if (!config || !config.email || !config.senha) {
        return { success: false, error: 'Credenciais não configuradas. Configure email e senha nas configurações do CraftPay.' }
      }
      const scraperPath = path.join(PATHS.BASE, 'back', 'utils', 'craftpayScraper.js')
      const { adicionarBotsAoFunil } = require(scraperPath)
      return await adicionarBotsAoFunil(
        { email: config.email, senha: config.senha },
        nomeFunil,
        bots
      )
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao adicionar bots ao funil:', error)
      return { success: false, error: error.message || 'Erro ao adicionar bots ao funil.' }
    }
  })

  // Adicionar bots a funil em background (não bloqueia a UI)
  ipcMain.handle('craftpay-adicionar-bots-funil-bg', async (event, payload) => {
    try {
      const { nomeFunil, bots } = payload || {}
      if (!nomeFunil || !Array.isArray(bots) || bots.length === 0) {
        return { success: false, error: 'Informe o funil e ao menos um bot (nome e token).' }
      }
      const config = loadCraftPayConfig()
      if (!config || !config.email || !config.senha) {
        return { success: false, error: 'Credenciais não configuradas. Configure email e senha nas configurações do CraftPay.' }
      }

      const jobId = criarJobId()
      craftpayFunilJobs.set(jobId, {
        jobId,
        status: 'queued',
        createdAt: new Date().toISOString(),
        finishedAt: null,
        payload: { nomeFunil, botsCount: bots.length },
        result: null,
        error: null,
      })

      setImmediate(async () => {
        const current = craftpayFunilJobs.get(jobId)
        if (!current) return
        current.status = 'running'
        craftpayFunilJobs.set(jobId, current)

        try {
          const scraperPath = path.join(PATHS.BASE, 'back', 'utils', 'craftpayScraper.js')
          const { adicionarBotsAoFunil } = require(scraperPath)
          const result = await adicionarBotsAoFunil(
            { email: config.email, senha: config.senha },
            nomeFunil,
            bots
          )
          current.status = result?.success ? 'completed' : 'failed'
          current.result = result || null
          current.error = result?.success ? null : (result?.error || 'Erro ao cadastrar bots no funil.')
        } catch (error) {
          current.status = 'failed'
          current.error = error?.message || 'Erro ao cadastrar bots no funil.'
          current.result = null
        } finally {
          current.finishedAt = new Date().toISOString()
          craftpayFunilJobs.set(jobId, current)
        }
      })

      return { success: true, jobId, status: 'queued' }
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao iniciar cadastro em background.' }
    }
  })

  // Consultar status do job de cadastro de funil
  ipcMain.handle('craftpay-consultar-job-funil', async (event, jobId) => {
    try {
      if (!jobId) return { success: false, error: 'jobId não informado.' }
      const job = craftpayFunilJobs.get(jobId)
      if (!job) return { success: false, error: 'Job não encontrado.' }
      return { success: true, job }
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao consultar status do job.' }
    }
  })

  // Obter histórico completo de estatísticas (persistência permanente)
  ipcMain.handle('craftpay-get-historico', async () => {
    try {
      const history = loadStatsHistory()
      return { success: true, historico: history }
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao carregar histórico:', error)
      return { success: false, error: error.message || 'Erro ao carregar histórico.' }
    }
  })
  // Obter ranking agregado de bots (todos os tempos)
  ipcMain.handle('craftpay-get-ranking-bots', async () => {
    try {
      const history = loadStatsHistory()
      const aggregated = {}

      // Consolidar histórico
      // Estratégia: O histórico salva snapshots diários. 
      // Se um bot aparece em múltiplos dias, assumimos que o valor é ACUMULADO no site.
      // Portanto, pegamos o valor MÁXIMO de vendas/faturamento registrado para aquele bot.

      Object.keys(history).forEach(date => {
        const entry = history[date]
        if (entry && Array.isArray(entry.botsDetalhados)) {
          entry.botsDetalhados.forEach(bot => {
            if (!aggregated[bot.bot]) {
              aggregated[bot.bot] = { ...bot }
            } else {
              // Atualizar se tiver mais vendas ou maior valor (assumindo acumulativo)
              if (bot.vendas > aggregated[bot.bot].vendas) {
                aggregated[bot.bot] = { ...bot }
              }
            }
          })
        }
      })

      // Converter para array e ordenar
      const ranking = Object.values(aggregated).sort((a, b) => {
        // Ordenar por Vendas (DESC)
        if (b.vendas !== a.vendas) return b.vendas - a.vendas
        // Desempate por Valor Convertido (ignorando R$)
        const valA = parseFloat(a.valorConvertido.replace(/[^0-9,.]/g, '').replace(',', '.') || 0)
        const valB = parseFloat(b.valorConvertido.replace(/[^0-9,.]/g, '').replace(',', '.') || 0)
        return valB - valA
      })

      return { success: true, ranking }
    } catch (error) {
      console.error('[craftpayHandlers] Erro ao gerar ranking:', error)
      return { success: false, error: error.message || 'Erro ao gerar ranking.' }
    }
  })
}

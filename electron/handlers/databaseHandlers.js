import { ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Importar módulo do banco de dados (CommonJS)
const databasePath = path.join(PATHS.BASE, 'back', 'utils', 'database.js')
const {
  initDatabase,
  getTodayStats,
  incrementGruposCriados,
  incrementAutomacoesExecutadas,
  getStatsLastDays,
  saveConfig,
  getConfig,
  getAllConfig,
  saveAccountStats,
  saveGruposStats,
  salvarVerificacaoDiariaDisparo,
  salvarVerificacaoDiariaMembros,
  carregarVerificacaoDiaria,
} = require(databasePath)

/**
 * Handlers para banco de dados
 */
export function registerDatabaseHandlers() {
  console.log('[databaseHandlers] Registrando handlers de banco de dados...')

  // Inicializar banco de dados na primeira vez
  try {
    const customPaths = {
      rootDir: PATHS.BASE,
      bancoDir: PATHS.BANCO_DIR,
    }
    initDatabase(customPaths)
    console.log('[databaseHandlers] ✅ Banco de dados inicializado')
  } catch (error) {
    console.error('[databaseHandlers] Erro ao inicializar banco de dados:', error)
  }

  // Obter estatísticas do dia atual
  ipcMain.handle('database:get-today-stats', async () => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = getTodayStats(customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao obter estatísticas do dia:', error)
      return { success: false, error: error.message }
    }
  })

  // Incrementar grupos criados
  ipcMain.handle('database:increment-grupos', async (event, count = 1) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = incrementGruposCriados(count, customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao incrementar grupos:', error)
      return { success: false, error: error.message }
    }
  })

  // Incrementar automações executadas
  ipcMain.handle('database:increment-automacoes', async (event, count = 1) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = incrementAutomacoesExecutadas(count, customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao incrementar automações:', error)
      return { success: false, error: error.message }
    }
  })

  // Obter estatísticas dos últimos N dias
  ipcMain.handle('database:get-stats-last-days', async (event, days = 7) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = getStatsLastDays(days, customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao obter estatísticas dos últimos dias:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar configuração
  ipcMain.handle('database:save-config', async (event, key, value) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      saveConfig(key, value, customPaths)
      return { success: true }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar configuração:', error)
      return { success: false, error: error.message }
    }
  })

  // Obter configuração
  ipcMain.handle('database:get-config', async (event, key, defaultValue = null) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const value = getConfig(key, defaultValue, customPaths)
      return { success: true, data: value }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao obter configuração:', error)
      return { success: false, error: error.message }
    }
  })

  // Obter todas as configurações
  ipcMain.handle('database:get-all-config', async () => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const config = getAllConfig(customPaths)
      return { success: true, data: config }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao obter todas as configurações:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar estatísticas de contas
  ipcMain.handle('database:save-account-stats', async (event, contasOnline, contasCaidas) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = saveAccountStats(contasOnline, contasCaidas, customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar estatísticas de contas:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar estatísticas de grupos
  ipcMain.handle('database:save-grupos-stats', async (event, gruposOnline, gruposCriadosHoje = 0, gruposCaidosHoje = 0) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const stats = saveGruposStats(gruposOnline, gruposCriadosHoje, gruposCaidosHoje, customPaths)
      return { success: true, data: stats }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar estatísticas de grupos:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar wallpaper
  ipcMain.handle('database:save-wallpaper', async (event, target, wallpaperData) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      // Salvar wallpaper usando saveConfig
      const key = `wallpaper-${target}` // Ex: "wallpaper-dashboard", "wallpaper-contas", "wallpaper-loading"
      saveConfig(key, wallpaperData, customPaths)
      console.log(`[databaseHandlers] ✅ Wallpaper salvo: ${key}`)
      return { success: true }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar wallpaper:', error)
      return { success: false, error: error.message }
    }
  })

  // Carregar wallpaper
  ipcMain.handle('database:get-wallpaper', async (event, target, defaultValue = null) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const key = `wallpaper-${target}`
      const wallpaper = getConfig(key, defaultValue, customPaths)
      return { success: true, data: wallpaper }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao carregar wallpaper:', error)
      return { success: false, error: error.message, data: defaultValue }
    }
  })

  // Remover wallpaper
  ipcMain.handle('database:remove-wallpaper', async (event, target) => {
    try {
      const customPaths = {
        rootDir: PATHS.BASE,
        bancoDir: PATHS.BANCO_DIR,
      }
      const key = `wallpaper-${target}`
      // Salvar null para remover
      saveConfig(key, null, customPaths)
      console.log(`[databaseHandlers] ✅ Wallpaper removido: ${key}`)
      return { success: true }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao remover wallpaper:', error)
      return { success: false, error: error.message }
    }
  })

  // ─── Verificação Diária: persistência ──────────────────────────────────────

  // Salvar resultados do disparo
  ipcMain.handle('database:salvar-verificacao-diaria-disparo', async (event, resultados) => {
    try {
      const customPaths = { rootDir: PATHS.BASE, bancoDir: PATHS.BANCO_DIR }
      salvarVerificacaoDiariaDisparo(resultados, customPaths)
      return { success: true }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar verificação diária (disparo):', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar resultados de membros (grupos/bots)
  ipcMain.handle('database:salvar-verificacao-diaria-membros', async (event, lastProgress) => {
    try {
      const customPaths = { rootDir: PATHS.BASE, bancoDir: PATHS.BANCO_DIR }
      salvarVerificacaoDiariaMembros(lastProgress, customPaths)
      return { success: true }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao salvar verificação diária (membros):', error)
      return { success: false, error: error.message }
    }
  })

  // Carregar resultados salvos da verificação diária (somente do dia)
  ipcMain.handle('database:carregar-verificacao-diaria', async () => {
    try {
      const customPaths = { rootDir: PATHS.BASE, bancoDir: PATHS.BANCO_DIR }
      const data = carregarVerificacaoDiaria(customPaths)
      return { success: true, data }
    } catch (error) {
      console.error('[databaseHandlers] Erro ao carregar verificação diária:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('[databaseHandlers] ✅ Handlers de banco de dados registrados')
}


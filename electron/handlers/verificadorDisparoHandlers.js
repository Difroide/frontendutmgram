import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'
import { getOperacaoAtual } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

function requireBackendModule(modulePath) {
  const BACK_DIR = path.join(PATHS.BASE, 'back')
  const fullPath = path.join(BACK_DIR, modulePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Módulo não encontrado: ${fullPath}`)
  }
  return require(fullPath)
}

function getCustomPaths() {
  const operacaoAtual = getOperacaoAtual()
  const rootDir = PATHS.BASE
  return {
    rootDir,
    accountsDir: PATHS.CONTAS_DIR,
    bancoDir: PATHS.BANCO_DIR,
    bancoPrincipalDir: path.join(rootDir, 'banco'),
  }
}

export function registerVerificadorDisparoHandlers() {
  console.log('📝 Registrando handlers do verificador de disparo (sessão)...')

  ipcMain.handle('verificar-disparo-sessao', async (event, accountId) => {
    const sender = event.sender
    try {
      if (!accountId || typeof accountId !== 'string') {
        return { success: false, resultados: [], error: 'Sessão não selecionada' }
      }
      const customPaths = getCustomPaths()
      const { run } = requireBackendModule('verificador/verificadorDisparoSessao.js')
      const onProgress = (info) => {
        try {
          if (sender && !sender.isDestroyed()) {
            const data = typeof info === 'string'
              ? { categoriaNome: info }
              : { categoriaNome: info.categoriaNome || '', sessao: info.sessao || '' }
            sender.send('verificacao-disparo-progress', data)
          }
        } catch (_) {}
      }
      const onResultado = (resultado) => {
        try {
          if (sender && !sender.isDestroyed()) {
            sender.send('verificacao-disparo-resultado-categoria', resultado)
          }
        } catch (_) {}
      }
      const result = await run(accountId, customPaths, onProgress, onResultado)
      return result
    } catch (error) {
      console.error('[verificadorDisparo] Erro:', error)
      return {
        success: false,
        resultados: [],
        error: error.message || 'Erro ao verificar disparo',
      }
    }
  })

  ipcMain.handle('verificar-disparo-sessao-categoria', async (event, accountId, categoriaId, botUsername) => {
    try {
      if (!accountId || !categoriaId || !botUsername) {
        return { success: false, resultado: null, error: 'Parâmetros incompletos' }
      }
      const customPaths = getCustomPaths()
      const { runUmaCategoria } = requireBackendModule('verificador/verificadorDisparoSessao.js')
      return await runUmaCategoria(accountId, categoriaId, botUsername, customPaths)
    } catch (error) {
      console.error('[verificadorDisparo] Erro categoria:', error)
      return {
        success: false,
        resultado: null,
        error: error.message || 'Erro ao verificar',
      }
    }
  })
}

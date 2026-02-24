import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

const NOVAS_CONTAS_FILE_PATH = path.join(PATHS.BANCO_DIR, 'novas-contas.json')

function ensureNovasContasFile() {
  if (!fs.existsSync(PATHS.BANCO_DIR)) {
    fs.mkdirSync(PATHS.BANCO_DIR, { recursive: true })
  }
  if (!fs.existsSync(NOVAS_CONTAS_FILE_PATH)) {
    fs.writeFileSync(NOVAS_CONTAS_FILE_PATH, '[]', 'utf-8')
  }
}

function readNovasContasIds() {
  try {
    ensureNovasContasFile()
    const raw = fs.readFileSync(NOVAS_CONTAS_FILE_PATH, 'utf-8').trim()
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(id => Number(id)).filter(id => !isNaN(id)) : []
  } catch (error) {
    console.error('[novasContasHandlers] Erro ao ler novas-contas.json:', error)
    return []
  }
}

function writeNovasContasIds(ids) {
  try {
    ensureNovasContasFile()
    // Garantir que são números e remover duplicatas
    const idsUnicos = Array.from(new Set(ids.map(id => Number(id)).filter(id => !isNaN(id))))
    fs.writeFileSync(NOVAS_CONTAS_FILE_PATH, JSON.stringify(idsUnicos, null, 2), 'utf-8')
  } catch (error) {
    console.error('[novasContasHandlers] Erro ao escrever novas-contas.json:', error)
    throw error
  }
}

export function registerNovasContasHandlers() {
  console.log('📝 Registrando handlers de Novas Contas...')

  // Handler para carregar IDs das novas contas
  ipcMain.handle('novas-contas-carregar', async () => {
    try {
      const ids = readNovasContasIds()
      return { success: true, ids }
    } catch (error) {
      console.error('[novasContasHandlers] Erro ao carregar novas contas:', error)
      return { success: false, error: error.message, ids: [] }
    }
  })

  // Handler para salvar lista completa de IDs
  ipcMain.handle('novas-contas-salvar', async (event, ids) => {
    try {
      if (!Array.isArray(ids)) {
        throw new Error('ids deve ser um array')
      }
      writeNovasContasIds(ids)
      return { success: true }
    } catch (error) {
      console.error('[novasContasHandlers] Erro ao salvar novas contas:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para adicionar IDs (sem duplicar)
  ipcMain.handle('novas-contas-adicionar', async (event, ids) => {
    try {
      if (!Array.isArray(ids)) {
        throw new Error('ids deve ser um array')
      }
      const idsAtuais = readNovasContasIds()
      const idsUnicos = Array.from(new Set([...idsAtuais, ...ids.map(id => Number(id))]))
      writeNovasContasIds(idsUnicos)
      return { success: true }
    } catch (error) {
      console.error('[novasContasHandlers] Erro ao adicionar novas contas:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para remover IDs
  ipcMain.handle('novas-contas-remover', async (event, ids) => {
    try {
      if (!Array.isArray(ids)) {
        throw new Error('ids deve ser um array')
      }
      const idsAtuais = readNovasContasIds()
      const idsParaRemover = ids.map(id => Number(id))
      const idsFiltrados = idsAtuais.filter(id => !idsParaRemover.includes(id))
      writeNovasContasIds(idsFiltrados)
      return { success: true }
    } catch (error) {
      console.error('[novasContasHandlers] Erro ao remover novas contas:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para limpar todas as IDs
  ipcMain.handle('novas-contas-limpar', async () => {
    try {
      writeNovasContasIds([])
      return { success: true }
    } catch (error) {
      console.error('[novasContasHandlers] Erro ao limpar novas contas:', error)
      return { success: false, error: error.message }
    }
  })
}


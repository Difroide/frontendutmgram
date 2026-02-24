import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

/**
 * Handlers para Biblioteca de Upsells (persistente)
 */

const LIBRARY_FILENAME = 'upsell-library.json'

function getLibraryPath() {
  return path.join(PATHS.BANCO_DIR, LIBRARY_FILENAME)
}

function ensureLibraryExists() {
  const libraryPath = getLibraryPath()
  const bancoDir = PATHS.BANCO_DIR
  
  if (!fs.existsSync(bancoDir)) {
    fs.mkdirSync(bancoDir, { recursive: true })
  }
  
  if (!fs.existsSync(libraryPath)) {
    fs.writeFileSync(libraryPath, JSON.stringify([], null, 2), 'utf-8')
  }
}

export function registerUpsellLibraryHandlers() {
  console.log('[upsellLibraryHandlers] Registrando handlers...')
  
  ipcMain.handle('upsell-library:load', async () => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      const upsells = JSON.parse(data)
      console.log(`[upsellLibraryHandlers] ✅ Carregados ${upsells.length} Upsell(s)`)
      return { success: true, data: upsells }
    } catch (error) {
      console.error('[upsellLibraryHandlers] Erro ao carregar:', error)
      return { success: false, error: error.message, data: [] }
    }
  })
  
  ipcMain.handle('upsell-library:save', async (event, upsells) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      fs.writeFileSync(libraryPath, JSON.stringify(upsells, null, 2), 'utf-8')
      console.log(`[upsellLibraryHandlers] ✅ Salvos ${upsells.length} Upsell(s)`)
      return { success: true }
    } catch (error) {
      console.error('[upsellLibraryHandlers] Erro ao salvar:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('upsell-library:add', async (event, upsell) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      const upsells = JSON.parse(data)
      upsells.push(upsell)
      fs.writeFileSync(libraryPath, JSON.stringify(upsells, null, 2), 'utf-8')
      console.log(`[upsellLibraryHandlers] ✅ Adicionado: ${upsell.nome}`)
      return { success: true, data: upsells }
    } catch (error) {
      console.error('[upsellLibraryHandlers] Erro ao adicionar:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('upsell-library:update', async (event, upsell) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      let upsells = JSON.parse(data)
      upsells = upsells.map(item => item.id === upsell.id ? upsell : item)
      fs.writeFileSync(libraryPath, JSON.stringify(upsells, null, 2), 'utf-8')
      console.log(`[upsellLibraryHandlers] ✅ Atualizado: ${upsell.nome}`)
      return { success: true, data: upsells }
    } catch (error) {
      console.error('[upsellLibraryHandlers] Erro ao atualizar:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('upsell-library:delete', async (event, id) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      let upsells = JSON.parse(data)
      upsells = upsells.filter(item => item.id !== id)
      fs.writeFileSync(libraryPath, JSON.stringify(upsells, null, 2), 'utf-8')
      console.log(`[upsellLibraryHandlers] ✅ Excluído: ${id}`)
      return { success: true, data: upsells }
    } catch (error) {
      console.error('[upsellLibraryHandlers] Erro ao excluir:', error)
      return { success: false, error: error.message }
    }
  })
  
  console.log('[upsellLibraryHandlers] ✅ Handlers registrados')
}

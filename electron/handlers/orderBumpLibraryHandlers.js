import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

/**
 * Handlers para Biblioteca de Order Bumps (persistente)
 */

const LIBRARY_FILENAME = 'orderbump-library.json'

function getLibraryPath() {
  return path.join(PATHS.BANCO_DIR, LIBRARY_FILENAME)
}

function ensureLibraryExists() {
  const libraryPath = getLibraryPath()
  const bancoDir = PATHS.BANCO_DIR
  
  // Criar diretório banco se não existir
  if (!fs.existsSync(bancoDir)) {
    fs.mkdirSync(bancoDir, { recursive: true })
  }
  
  // Criar arquivo vazio se não existir
  if (!fs.existsSync(libraryPath)) {
    fs.writeFileSync(libraryPath, JSON.stringify([], null, 2), 'utf-8')
  }
}

export function registerOrderBumpLibraryHandlers() {
  console.log('[orderBumpLibraryHandlers] Registrando handlers...')
  
  // Carregar biblioteca
  ipcMain.handle('orderbump-library:load', async () => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      const orderBumps = JSON.parse(data)
      console.log(`[orderBumpLibraryHandlers] ✅ Carregados ${orderBumps.length} Order Bumps`)
      return { success: true, data: orderBumps }
    } catch (error) {
      console.error('[orderBumpLibraryHandlers] Erro ao carregar:', error)
      return { success: false, error: error.message, data: [] }
    }
  })
  
  // Salvar biblioteca completa
  ipcMain.handle('orderbump-library:save', async (event, orderBumps) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      fs.writeFileSync(libraryPath, JSON.stringify(orderBumps, null, 2), 'utf-8')
      console.log(`[orderBumpLibraryHandlers] ✅ Salvos ${orderBumps.length} Order Bumps`)
      return { success: true }
    } catch (error) {
      console.error('[orderBumpLibraryHandlers] Erro ao salvar:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Adicionar um Order Bump
  ipcMain.handle('orderbump-library:add', async (event, orderBump) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      const orderBumps = JSON.parse(data)
      orderBumps.push(orderBump)
      fs.writeFileSync(libraryPath, JSON.stringify(orderBumps, null, 2), 'utf-8')
      console.log(`[orderBumpLibraryHandlers] ✅ Adicionado: ${orderBump.nome}`)
      return { success: true, data: orderBumps }
    } catch (error) {
      console.error('[orderBumpLibraryHandlers] Erro ao adicionar:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Atualizar um Order Bump
  ipcMain.handle('orderbump-library:update', async (event, orderBump) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      let orderBumps = JSON.parse(data)
      orderBumps = orderBumps.map(ob => ob.id === orderBump.id ? orderBump : ob)
      fs.writeFileSync(libraryPath, JSON.stringify(orderBumps, null, 2), 'utf-8')
      console.log(`[orderBumpLibraryHandlers] ✅ Atualizado: ${orderBump.nome}`)
      return { success: true, data: orderBumps }
    } catch (error) {
      console.error('[orderBumpLibraryHandlers] Erro ao atualizar:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Excluir um Order Bump
  ipcMain.handle('orderbump-library:delete', async (event, id) => {
    try {
      ensureLibraryExists()
      const libraryPath = getLibraryPath()
      const data = fs.readFileSync(libraryPath, 'utf-8')
      let orderBumps = JSON.parse(data)
      orderBumps = orderBumps.filter(ob => ob.id !== id)
      fs.writeFileSync(libraryPath, JSON.stringify(orderBumps, null, 2), 'utf-8')
      console.log(`[orderBumpLibraryHandlers] ✅ Excluído: ${id}`)
      return { success: true, data: orderBumps }
    } catch (error) {
      console.error('[orderBumpLibraryHandlers] Erro ao excluir:', error)
      return { success: false, error: error.message }
    }
  })
  
  console.log('[orderBumpLibraryHandlers] ✅ Handlers registrados')
}

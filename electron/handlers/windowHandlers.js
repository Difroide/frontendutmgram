import { ipcMain } from 'electron'
import { getMainWindow } from '../window/windowManager.js'

export function registerWindowHandlers() {
  console.log('📝 Registrando handlers de janela...')

  // Minimizar janela
  ipcMain.handle('desktop-minimize', async () => {
    try {
      const window = getMainWindow()
      if (window) {
        window.minimize()
        return { success: true }
      }
      return { success: false, error: 'Janela não encontrada' }
    } catch (error) {
      console.error('[windowHandlers] Erro ao minimizar:', error)
      return { success: false, error: error.message }
    }
  })

  // Maximizar/Restaurar janela
  ipcMain.handle('desktop-toggle-maximize', async () => {
    try {
      const window = getMainWindow()
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
        return { success: true, isMaximized: window.isMaximized() }
      }
      return { success: false, error: 'Janela não encontrada' }
    } catch (error) {
      console.error('[windowHandlers] Erro ao maximizar/restaurar:', error)
      return { success: false, error: error.message }
    }
  })

  // Fechar janela
  ipcMain.handle('desktop-close', async () => {
    try {
      const window = getMainWindow()
      if (window) {
        window.close()
        return { success: true }
      }
      return { success: false, error: 'Janela não encontrada' }
    } catch (error) {
      console.error('[windowHandlers] Erro ao fechar:', error)
      return { success: false, error: error.message }
    }
  })

  // Verificar se está maximizado
  ipcMain.handle('desktop-is-maximized', async () => {
    try {
      const window = getMainWindow()
      if (window) {
        return { success: true, isMaximized: window.isMaximized() }
      }
      return { success: false, error: 'Janela não encontrada' }
    } catch (error) {
      console.error('[windowHandlers] Erro ao verificar estado:', error)
      return { success: false, error: error.message }
    }
  })

  // Listener para mudanças de estado de maximização
  const window = getMainWindow()
  if (window) {
    window.on('maximize', () => {
      window.webContents.send('desktop-maximized-changed', true)
    })
    
    window.on('unmaximize', () => {
      window.webContents.send('desktop-maximized-changed', false)
    })
  }

  console.log('✅ Handlers de janela registrados')
}


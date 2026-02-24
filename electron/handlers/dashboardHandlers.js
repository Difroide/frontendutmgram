import { ipcMain } from 'electron'
import fs from 'fs'
import { PATHS } from '../config/paths.js'

export function registerDashboardHandlers() {
  // Handler IPC para salvar perfil do dashboard
  ipcMain.handle('salvar-dashboard-profile', async (event, profile) => {
    try {
      // Verificar se a pasta banco existe, se não, criar
      if (!fs.existsSync(PATHS.BANCO_DIR)) {
        fs.mkdirSync(PATHS.BANCO_DIR, { recursive: true })
        console.log('Pasta "banco" criada em:', PATHS.BANCO_DIR)
      }

      // Salvar perfil no arquivo (usa path dinâmico baseado na operação atual)
      fs.writeFileSync(PATHS.DASHBOARD_PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf-8')
      console.log('Perfil do dashboard salvo em:', PATHS.DASHBOARD_PROFILE_FILE)

      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar perfil do dashboard:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar perfil do dashboard
  ipcMain.handle('carregar-dashboard-profile', async () => {
    try {
      if (!fs.existsSync(PATHS.DASHBOARD_PROFILE_FILE)) {
        return { success: true, profile: { photo: null, name: '' } }
      }

      const data = fs.readFileSync(PATHS.DASHBOARD_PROFILE_FILE, 'utf-8')
      const profile = JSON.parse(data)
      return { success: true, profile }
    } catch (error) {
      console.error('Erro ao carregar perfil do dashboard:', error)
      return { success: false, error: error.message, profile: { photo: null, name: '' } }
    }
  })
}


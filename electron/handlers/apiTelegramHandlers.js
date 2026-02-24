import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

export function registerApiTelegramHandlers() {
  // Handler IPC para salvar API Telegram
  ipcMain.handle('salvar-api-telegram', async (event, apiId, apiHash) => {
    try {
      // Verificar se a pasta existe, se não, criar
      if (!fs.existsSync(PATHS.APIS_TELEGRAM_DIR)) {
        fs.mkdirSync(PATHS.APIS_TELEGRAM_DIR, { recursive: true })
        console.log('Pasta "apis telegram" criada em:', PATHS.APIS_TELEGRAM_DIR)
      }

      // Ler o arquivo se existir, senão criar estrutura inicial
      let apis = []
      if (fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
        try {
          const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
          const json = JSON.parse(data)
          apis = json.apis || []
        } catch (error) {
          console.warn('Erro ao ler api.json, criando novo:', error)
          apis = []
        }
      }

      // Adicionar nova API
      const novaApi = {
        id: Date.now().toString(),
        api_id: apiId,
        api_hash: apiHash,
        createdAt: new Date().toISOString(),
      }

      apis.push(novaApi)

      // Salvar no arquivo
      const data = {
        apis: apis,
      }

      fs.writeFileSync(PATHS.APIS_TELEGRAM_FILE, JSON.stringify(data, null, 2), 'utf-8')
      console.log('API Telegram salva em:', PATHS.APIS_TELEGRAM_FILE)

      return { success: true, api: novaApi }
    } catch (error) {
      console.error('Erro ao salvar API Telegram:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar todas as APIs
  ipcMain.handle('carregar-apis-telegram', async () => {
    try {
      if (!fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
        console.log('[API Telegram] Arquivo não encontrado:', PATHS.APIS_TELEGRAM_FILE)
        return []
      }

      const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
      const json = JSON.parse(data)
      let apis = json.apis || []
      
      // Normalizar formato: garantir que todas as APIs tenham id e createdAt
      apis = apis.map((api, index) => {
        // Se já tem id e createdAt, retornar como está
        if (api.id && api.createdAt) {
          return api
        }
        // Se não tem, criar id e createdAt (compatibilidade com formato antigo)
        return {
          id: api.id || (Date.now() + index).toString(),
          api_id: api.api_id || api.apiId || '',
          api_hash: api.api_hash || api.apiHash || '',
          createdAt: api.createdAt || new Date().toISOString(),
        }
      })
      
      console.log('[API Telegram] Carregadas', apis.length, 'APIs de:', PATHS.APIS_TELEGRAM_FILE)
      return apis
    } catch (error) {
      console.error('Erro ao carregar APIs Telegram:', error)
      console.error('Path tentado:', PATHS.APIS_TELEGRAM_FILE)
      return []
    }
  })

  // Handler IPC para excluir API
  ipcMain.handle('excluir-api-telegram', async (event, apiId) => {
    try {
      if (!fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
        return { success: false, error: 'Arquivo não encontrado' }
      }

      const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
      const json = JSON.parse(data)
      let apis = json.apis || []

      // Remover API pelo ID
      apis = apis.filter((api) => api.id !== apiId)

      // Salvar de volta
      const newData = {
        apis: apis,
      }

      fs.writeFileSync(PATHS.APIS_TELEGRAM_FILE, JSON.stringify(newData, null, 2), 'utf-8')
      console.log('API Telegram excluída')

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir API Telegram:', error)
      return { success: false, error: error.message }
    }
  })
}


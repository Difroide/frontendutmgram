import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
// import fetch from 'node-fetch' // Using global fetch from Node 18+ / Electron

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_FILE = path.join(app.getAppPath(), 'sendergram-config.json')

function ensureConfigFile() {
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfig = {
            enabled: false,
            apiUrl: 'https://nuebasendergram-production.up.railway.app',
            apiKey: ''
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8')
    }
}

export function registerSendergramHandlers() {
    console.log('[SenderGRAM Handlers] Registrando handlers...')

    ipcMain.handle('sendergram:carregar-config', async () => {
        try {
            ensureConfigFile()
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
            return JSON.parse(data)
        } catch (error) {
            console.error('[SenderGRAM] Erro ao carregar configuração:', error)
            return {
                enabled: false,
                apiUrl: 'https://nuebasendergram-production.up.railway.app',
                apiKey: ''
            }
        }
    })

    ipcMain.handle('sendergram:salvar-config', async (event, config) => {
        try {
            ensureConfigFile()
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
            console.log('[SenderGRAM] Configuração salva com sucesso')
            return { success: true }
        } catch (error) {
            console.error('[SenderGRAM] Erro ao salvar configuração:', error)
            return { success: false, error: error.message }
        }
    })

    // Handler para testar conexão (Backend -> API) evita CORS
    ipcMain.handle('sendergram:test-connection', async (event, config) => {
        const { apiUrl, apiKey } = config || {}
        if (!apiUrl) return { success: false, error: 'URL não fornecida' }

        try {
            console.log('[SenderGRAM] Testando conexão com:', apiUrl)
            const headers = { 'Content-Type': 'application/json' }
            if (apiKey) headers['x-api-key'] = apiKey

            const response = await fetch(`${apiUrl}/api/grupos/detectados`, {
                method: 'GET',
                headers
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => '')
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const data = await response.json()
            const groups = (data.data || []).map((g) => ({
                name: g.name || '',
                chatId: g.chatId,
                memberCount: g.memberCount
            }))

            return { success: true, groups }
        } catch (error) {
            console.error('[SenderGRAM] Erro no teste de conexão:', error)
            return { success: false, error: error.message || 'Erro desconhecido' }
        }
    })

    // Handler para enviar campanha (Backend -> API) evita CORS
    ipcMain.handle('sendergram:send-campaign', async (event, campaignData) => {
        try {
            ensureConfigFile()
            const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
            const { apiUrl, apiKey } = configData

            if (!apiUrl) return { success: false, error: 'URL não configurada no backend' }

            console.log('[SenderGRAM] Enviando campanha via backend...')
            const headers = { 'Content-Type': 'application/json' }
            if (apiKey) headers['x-api-key'] = apiKey

            const response = await fetch(`${apiUrl}/api/campaigns`, {
                method: 'POST',
                headers,
                body: JSON.stringify(campaignData)
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => '')
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const data = await response.json()
            return { success: true, campaignId: data.data?.id || data.id }
        } catch (error) {
            console.error('[SenderGRAM] Erro ao enviar campanha:', error)
            return { success: false, error: error.message || 'Erro desconhecido' }
        }
    })

    console.log('[SenderGRAM Handlers] ✅ Handlers registrados')
}

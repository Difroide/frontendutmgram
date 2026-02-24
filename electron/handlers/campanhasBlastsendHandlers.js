import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'
import { processarCampanhasNovas } from '../services/campanhasBlastsendService.js'

function sanitizeName(name) {
  return String(name || 'campaign')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'campaign'
}

export function registerCampanhasBlastsendHandlers() {
  ipcMain.handle('salvar-campanha-nova', async (event, campaignJson) => {
    try {
      const dir = PATHS.CAMPANHAS_NOVAS_DIR
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      let data = campaignJson
      if (typeof campaignJson === 'string') {
        try {
          data = JSON.parse(campaignJson)
        } catch (e) {
          return { success: false, error: 'JSON inválido' }
        }
      }
      const name = sanitizeName(data?.campaign?.name || data?.campaign?.senderName || 'campaign')
      const timestamp = Date.now()
      const fileName = `campaign_${name}_${timestamp}.json`
      const filePath = path.join(dir, fileName)
      const content = typeof campaignJson === 'string' ? campaignJson : JSON.stringify(data, null, 2)
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true, filePath: fileName }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('campanhas-blastsend:processarNovas', async () => {
    return processarCampanhasNovas()
  })

  ipcMain.handle('campanhas-blastsend:contarNovas', async () => {
    try {
      const dir = PATHS.CAMPANHAS_NOVAS_DIR
      if (!fs.existsSync(dir)) return 0
      const files = fs.readdirSync(dir, { withFileTypes: true })
      return files.filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.json')).length
    } catch (e) {
      return 0
    }
  })

  ipcMain.handle('campanhas-blastsend:listarNovas', async () => {
    try {
      const dir = PATHS.CAMPANHAS_NOVAS_DIR
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        return { success: true, campanhas: [], folderPath: dir }
      }
      const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.json'))
        .map((d) => d.name)
      const campanhas = []
      for (const fileName of files) {
        try {
          const filePath = path.join(dir, fileName)
          const content = fs.readFileSync(filePath, 'utf-8')
          const json = JSON.parse(content)
          const name = json?.campaign?.name || json?.campaign?.senderName || fileName.replace(/\.json$/i, '')
          const botUsername = json?.botUsername || json?.bot_username || json?.campaign?.senderName || '-'
          const groupsCount = Array.isArray(json?.exportedGroups) ? json.exportedGroups.length : 0
          campanhas.push({
            fileName,
            name,
            botUsername: String(botUsername).replace(/^@+/, ''),
            groupsCount,
            hasBotToken: !!(json?.botToken),
          })
        } catch (e) {
          campanhas.push({
            fileName,
            name: fileName,
            botUsername: '-',
            groupsCount: 0,
            hasBotToken: false,
            error: e.message,
          })
        }
      }
      return { success: true, campanhas, folderPath: dir }
    } catch (e) {
      return { success: false, error: e.message, campanhas: [], folderPath: '' }
    }
  })

  ipcMain.handle('campanhas-blastsend:excluirNovas', async (event, fileNames) => {
    try {
      const dir = PATHS.CAMPANHAS_NOVAS_DIR
      if (!fs.existsSync(dir)) return { success: true, excluidos: 0, erros: [] }
      const names = Array.isArray(fileNames) ? fileNames : [fileNames]
      let excluidos = 0
      const erros = []
      for (const fileName of names) {
        if (!fileName || typeof fileName !== 'string') continue
        const base = path.basename(fileName)
        if (!base.toLowerCase().endsWith('.json')) continue
        const filePath = path.join(dir, base)
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            excluidos++
          }
        } catch (e) {
          erros.push(`${base}: ${e.message}`)
        }
      }
      return { success: erros.length === 0, excluidos, erros }
    } catch (e) {
      return { success: false, excluidos: 0, erros: [e.message] }
    }
  })
}

import fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import { PATHS } from '../config/paths.js'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

function ensureApiUrl(url) {
  const u = String(url || '').trim().replace(/\/+$/, '')
  if (!u) return ''
  if (u.endsWith('/api')) return u
  return u + '/api'
}

function getBlastsendConfigPath() {
  return path.join(PATHS.BASE, 'blastsend-config.json')
}

export function getBlastsendConfig() {
  try {
    const configPath = getBlastsendConfigPath()
    if (!fs.existsSync(configPath)) return null
    const content = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(content)
    if (!config.url || !config.token) return null
    if (config.enabled === false) return null
    config.url = config.url.replace(/\/$/, '')
    return config
  } catch (e) {
    console.warn('[Blastsend API] Erro ao ler config:', e.message)
    return null
  }
}

export async function testConnection(config) {
  const testUrl = `${ensureApiUrl(config.url)}/user/token`
  try {
    const res = await axios.get(testUrl, {
      headers: {
        'X-API-Token': config.token,
        'Content-Type': 'application/json',
      },
      httpsAgent,
      timeout: 10000,
    })
    if (res.status === 200 && res.data?.user?.email) {
      return { success: true, email: res.data.user.email }
    }
    return { success: true }
  } catch (err) {
    const msg = err.response?.status === 401 || err.response?.status === 403
      ? 'Token inválido ou sem permissão'
      : err.message || 'Erro ao conectar'
    return { success: false, error: msg }
  }
}

export async function importBot(config, username, token, name) {
  const baseUrl = ensureApiUrl(config.url)
  const cleanUsername = String(username || '').replace(/^@+/, '').replace('@', '') || 'bot'
  const cleanName = (name || '').trim() || cleanUsername || 'Bot'
  if (!token) return false
  // API Blastsend: username, token, name (nome e token são obrigatórios)
  try {
    const res = await axios.post(`${baseUrl}/bots/import`, {
      username: cleanUsername,
      token,
      name: cleanName,
    }, {
      headers: {
        'X-API-Token': config.token,
        'Content-Type': 'application/json',
      },
      httpsAgent,
      timeout: 20000,
    })
    return res.status === 200 || res.status === 409
  } catch (e) {
    console.warn('[Blastsend API] Erro ao importar bot:', e.message)
    return false
  }
}

export async function importGroup(config, groupName, groupId, groupLink, sessionName, cdNumber, nicheName) {
  const baseUrl = ensureApiUrl(config.url)
  let groupIdFormatted = String(groupId || '').trim()
  if (!groupIdFormatted.startsWith('-100')) {
    if (groupIdFormatted.startsWith('-')) groupIdFormatted = groupIdFormatted.substring(1)
    groupIdFormatted = `-100${groupIdFormatted}`
  }
  if (!groupIdFormatted.startsWith('-100') || groupIdFormatted.length < 10) return false

  let linkFinal = (groupLink || '').trim()
  if (!linkFinal || !linkFinal.startsWith('https://t.me/')) {
    if (linkFinal && linkFinal.includes('t.me')) {
      linkFinal = linkFinal.startsWith('http') ? linkFinal : 'https://' + linkFinal
    } else {
      linkFinal = `https://t.me/placeholder_${groupIdFormatted}`
    }
  }
  const nameFinal = (groupName || '').trim() || groupIdFormatted

  try {
    const res = await axios.post(`${baseUrl}/groups/import`, {
      name: nameFinal,
      groupId: groupIdFormatted,
      link: linkFinal,
      sessionName: sessionName || nameFinal,
      cdNumber: String(cdNumber || '0'),
      niche: nicheName || 'Geral',
    }, {
      headers: {
        'X-API-Token': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      httpsAgent,
      timeout: 30000,
    })
    return res.status === 200
  } catch (e) {
    console.warn('[Blastsend API] Erro ao importar grupo:', e.message)
    return false
  }
}

export async function createCampaign(config, campaignName, botUsername, groupIds, niche) {
  const baseUrl = ensureApiUrl(config.url)
  if (!groupIds?.length) return false
  const normalizedIds = groupIds.map((id) => {
    let s = String(id).trim()
    if (s.startsWith('-100')) return s
    if (s.startsWith('-')) s = s.substring(1)
    return `-100${s}`
  })
  const cleanBot = String(botUsername || '').replace(/^@+/, '').replace('@', '')
  if (!cleanBot) return false
  try {
    const res = await axios.post(`${baseUrl}/campaigns/create-full`, {
      name: campaignName,
      botUsername: cleanBot,
      groupIds: normalizedIds,
      niche: niche || 'Geral',
      type: 'bot',
    }, {
      headers: {
        'X-API-Token': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      httpsAgent,
      timeout: 45000,
    })
    return res.status === 200
  } catch (e) {
    console.warn('[Blastsend API] Erro ao criar campanha:', e.message)
    return false
  }
}

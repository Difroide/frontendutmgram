import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

// Arquivo separado para proxies da API (captura de API Telegram)
const PROXIES_DIR = PATHS.PROXIES_DIR || path.join(PATHS.BASE, 'banco', 'proxies')
const PROXIES_API_FILE_PATH = path.join(PROXIES_DIR, 'proxies-api.json')

function ensureProxiesApiFile() {
  if (!fs.existsSync(PROXIES_DIR)) {
    fs.mkdirSync(PROXIES_DIR, { recursive: true })
  }
  if (!fs.existsSync(PROXIES_API_FILE_PATH)) {
    fs.writeFileSync(PROXIES_API_FILE_PATH, '[]', 'utf-8')
  }
}

function readProxiesApi() {
  try {
    ensureProxiesApiFile()
    const raw = fs.readFileSync(PROXIES_API_FILE_PATH, 'utf-8').trim()
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('[proxyApiHandlers] Erro ao ler proxies-api.json:', error)
    return []
  }
}

function writeProxiesApi(proxies) {
  ensureProxiesApiFile()
  fs.writeFileSync(PROXIES_API_FILE_PATH, JSON.stringify(proxies, null, 2), 'utf-8')
}

function getNextId(proxies) {
  const maxId = proxies.reduce((max, proxy) => Math.max(max, Number(proxy.id) || 0), 0)
  return maxId + 1
}

export function registerProxyApiHandlers() {
  // Handler para carregar todos os proxies API
  ipcMain.handle('carregar-proxies-api', async () => {
    try {
      const proxies = readProxiesApi()
      return proxies.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao carregar proxies API:', error)
      return []
    }
  })

  // Handler para criar proxy API
  ipcMain.handle('criar-proxy-api', async (event, data) => {
    try {
      const proxies = readProxiesApi()
      const now = new Date().toISOString()
      const newProxy = {
        id: getNextId(proxies),
        endereco: data.endereco,
        porta: Number(data.porta),
        tipo: data.tipo || 'HTTP',
        usuario: data.usuario || undefined,
        senha: data.senha || undefined,
        status: data.status || 'Ativo',
        rotativo: data.rotativo || false,
        descricao: data.descricao || undefined,
        ultimaVerificacao: null,
        createdAt: now,
        updatedAt: now,
      }

      proxies.push(newProxy)
      writeProxiesApi(proxies)

      return { success: true, proxy: newProxy }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao criar proxy API:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para criar proxies API em lote
  ipcMain.handle('criar-proxies-api-lote', async (event, dataArray) => {
    try {
      const proxies = readProxiesApi()
      const now = new Date().toISOString()
      const novosProxies = []

      for (const data of dataArray) {
        const newProxy = {
          id: getNextId([...proxies, ...novosProxies]),
          endereco: data.endereco,
          porta: Number(data.porta),
          tipo: data.tipo || 'HTTP',
          usuario: data.usuario || undefined,
          senha: data.senha || undefined,
          status: data.status || 'Ativo',
          rotativo: data.rotativo || false,
          descricao: data.descricao || undefined,
          ultimaVerificacao: null,
          createdAt: now,
          updatedAt: now,
        }
        novosProxies.push(newProxy)
      }

      proxies.push(...novosProxies)
      writeProxiesApi(proxies)

      return { success: true, proxies: novosProxies, count: novosProxies.length }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao criar proxies API em lote:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para atualizar proxy API
  ipcMain.handle('atualizar-proxy-api', async (event, id, data) => {
    try {
      const proxies = readProxiesApi()
      const index = proxies.findIndex((proxy) => Number(proxy.id) === Number(id))
      if (index === -1) {
        return { success: false, error: 'Proxy API não encontrado' }
      }

      const proxy = proxies[index]
      const now = new Date().toISOString()
      const updatedProxy = {
        ...proxy,
        endereco: data.endereco ?? proxy.endereco,
        porta: data.porta !== undefined ? Number(data.porta) : proxy.porta,
        tipo: data.tipo ?? proxy.tipo,
        usuario: data.usuario !== undefined ? data.usuario || undefined : proxy.usuario,
        senha: data.senha !== undefined ? data.senha || undefined : proxy.senha,
        status: data.status ?? proxy.status,
        rotativo: data.rotativo !== undefined ? data.rotativo : proxy.rotativo,
        descricao: data.descricao !== undefined ? data.descricao : proxy.descricao,
        ultimaVerificacao: data.ultimaVerificacao ?? proxy.ultimaVerificacao,
        updatedAt: now,
      }

      proxies[index] = updatedProxy
      writeProxiesApi(proxies)

      return { success: true, proxy: updatedProxy }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao atualizar proxy API:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para excluir proxy API
  ipcMain.handle('excluir-proxy-api', async (event, id) => {
    try {
      const proxies = readProxiesApi()
      const newProxies = proxies.filter((proxy) => Number(proxy.id) !== Number(id))
      writeProxiesApi(newProxies)

      return { success: true }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao excluir proxy API:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para excluir proxies API em lote
  ipcMain.handle('excluir-proxies-api-lote', async (event, ids) => {
    try {
      const proxies = readProxiesApi()
      const idsSet = new Set(ids.map(id => Number(id)))
      const newProxies = proxies.filter((proxy) => !idsSet.has(Number(proxy.id)))
      const deletedCount = proxies.length - newProxies.length
      writeProxiesApi(newProxies)

      return { success: true, count: deletedCount }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao excluir proxies API em lote:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para verificar proxy API
  ipcMain.handle('verificar-proxy-api', async (event, id) => {
    try {
      const proxies = readProxiesApi()
      const index = proxies.findIndex((proxy) => Number(proxy.id) === Number(id))
      if (index === -1) {
        return { success: false, error: 'Proxy API não encontrado' }
      }

      const now = new Date().toISOString()
      // TODO: Implementar verificação real do proxy
      const newStatus = Math.random() > 0.3 ? 'Ativo' : 'Erro' // Simulação
      const updatedProxy = {
        ...proxies[index],
        status: newStatus,
        ultimaVerificacao: now,
        updatedAt: now,
      }

      proxies[index] = updatedProxy
      writeProxiesApi(proxies)

      return { success: true, status: newStatus }
    } catch (error) {
      console.error('[proxyApiHandlers] Erro ao verificar proxy API:', error)
      return { success: false, error: error.message }
    }
  })
}





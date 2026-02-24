import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

const PROXIES_DIR = PATHS.PROXIES_DIR || path.join(PATHS.BASE, 'banco', 'proxies')
const PROXIES_FILE_PATH = PATHS.PROXIES_FILE || path.join(PROXIES_DIR, 'proxies.json')

function ensureProxiesFile() {
  if (!fs.existsSync(PROXIES_DIR)) {
    fs.mkdirSync(PROXIES_DIR, { recursive: true })
  }
  if (!fs.existsSync(PROXIES_FILE_PATH)) {
    fs.writeFileSync(PROXIES_FILE_PATH, '[]', 'utf-8')
  }
}

function readProxies() {
  try {
    ensureProxiesFile()
    const raw = fs.readFileSync(PROXIES_FILE_PATH, 'utf-8').trim()
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('[proxyHandlers] Erro ao ler proxies.json:', error)
    return []
  }
}

function writeProxies(proxies) {
  ensureProxiesFile()
  fs.writeFileSync(PROXIES_FILE_PATH, JSON.stringify(proxies, null, 2), 'utf-8')
}

function getNextId(proxies) {
  const maxId = proxies.reduce((max, proxy) => Math.max(max, Number(proxy.id) || 0), 0)
  return maxId + 1
}

export function registerProxyHandlers() {
  // Handler para carregar todos os proxies
  ipcMain.handle('carregar-proxies', async () => {
    try {
      const proxies = readProxies()
      return proxies.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    } catch (error) {
      console.error('[proxyHandlers] Erro ao carregar proxies:', error)
      return []
    }
  })

  // Handler para criar proxy
  ipcMain.handle('criar-proxy', async (event, data) => {
    try {
      const proxies = readProxies()
      const now = new Date().toISOString()
      // Se esta proxy for marcada como padrão, remover padrão de todas as outras
      if (data.padrao) {
        proxies.forEach(p => { p.padrao = false })
      }

      const newProxy = {
        id: getNextId(proxies),
        nome: data.nome || undefined,
        endereco: data.endereco,
        porta: Number(data.porta),
        tipo: data.tipo || 'HTTP',
        usuario: data.usuario || undefined,
        senha: data.senha || undefined,
        status: data.status || 'Inativo',
        padrao: data.padrao || false,
        ultimaVerificacao: null,
        createdAt: now,
        updatedAt: now,
      }

      proxies.push(newProxy)
      writeProxies(proxies)

      return { success: true, proxy: newProxy }
    } catch (error) {
      console.error('[proxyHandlers] Erro ao criar proxy:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para atualizar proxy
  ipcMain.handle('atualizar-proxy', async (event, id, data) => {
    try {
      const proxies = readProxies()
      const index = proxies.findIndex((proxy) => Number(proxy.id) === Number(id))
      if (index === -1) {
        return { success: false, error: 'Proxy não encontrado' }
      }

      const proxy = proxies[index]
      
      // Se esta proxy for marcada como padrão, remover padrão de todas as outras
      if (data.padrao === true) {
        proxies.forEach((p, i) => {
          if (i !== index) {
            p.padrao = false
          }
        })
      }
      
      const now = new Date().toISOString()
      const updatedProxy = {
        ...proxy,
        nome: data.nome !== undefined ? (data.nome || undefined) : proxy.nome,
        endereco: data.endereco ?? proxy.endereco,
        porta: data.porta !== undefined ? Number(data.porta) : proxy.porta,
        tipo: data.tipo ?? proxy.tipo,
        usuario: data.usuario !== undefined ? data.usuario || undefined : proxy.usuario,
        // Se senha foi fornecida (mesmo que vazia), usar. Se não foi fornecida (undefined), manter a existente
        senha: data.senha !== undefined ? (data.senha && data.senha.trim() ? data.senha.trim() : undefined) : proxy.senha,
        status: data.status ?? proxy.status,
        padrao: data.padrao !== undefined ? data.padrao : proxy.padrao,
        ultimaVerificacao: data.ultimaVerificacao ?? proxy.ultimaVerificacao,
        updatedAt: now,
      }

      proxies[index] = updatedProxy
      writeProxies(proxies)

      return { success: true, proxy: updatedProxy }
    } catch (error) {
      console.error('[proxyHandlers] Erro ao atualizar proxy:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para excluir proxy
  ipcMain.handle('excluir-proxy', async (event, id) => {
    try {
      const proxies = readProxies()
      const newProxies = proxies.filter((proxy) => Number(proxy.id) !== Number(id))
      writeProxies(newProxies)

      return { success: true }
    } catch (error) {
      console.error('[proxyHandlers] Erro ao excluir proxy:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para verificar proxy
  ipcMain.handle('verificar-proxy', async (event, id) => {
    try {
      const proxies = readProxies()
      const index = proxies.findIndex((proxy) => Number(proxy.id) === Number(id))
      if (index === -1) {
        return { success: false, error: 'Proxy não encontrado' }
      }

      const now = new Date().toISOString()
      const newStatus = Math.random() > 0.3 ? 'Ativo' : 'Erro' // Simulação
      const updatedProxy = {
        ...proxies[index],
        status: newStatus,
        ultimaVerificacao: now,
        updatedAt: now,
      }

      proxies[index] = updatedProxy
      writeProxies(proxies)

      return { success: true, status: newStatus }
    } catch (error) {
      console.error('[proxyHandlers] Erro ao verificar proxy:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para definir proxy padrão
  ipcMain.handle('definir-proxy-padrao', async (event, id) => {
    try {
      const proxies = readProxies()
      const index = proxies.findIndex((proxy) => Number(proxy.id) === Number(id))
      if (index === -1) {
        return { success: false, error: 'Proxy não encontrado' }
      }

      // Remover padrão de todas as proxies
      proxies.forEach(p => { p.padrao = false })
      
      // Definir esta como padrão
      proxies[index].padrao = true
      proxies[index].updatedAt = new Date().toISOString()
      
      writeProxies(proxies)

      return { success: true }
    } catch (error) {
      console.error('[proxyHandlers] Erro ao definir proxy padrão:', error)
      return { success: false, error: error.message }
    }
  })
}


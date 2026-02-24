/**
 * Handlers IPC para Sistema de Levas
 * 
 * Gerencia CRUD de levas e status de APIs.
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { PATHS, getOperacaoAtual } from '../config/paths.js'
import { logger } from '../utils/logger.js'

/**
 * Obtém o caminho do arquivo de levas (por operação)
 */
function getLevasFilePath() {
  const operacao = getOperacaoAtual()
  if (!operacao) {
    throw new Error('Nenhuma operação selecionada')
  }
  const operacaoPath = path.join(PATHS.OPERACOES_DIR, operacao.path, 'banco')
  return path.join(operacaoPath, 'levas.json')
}

/**
 * Lê levas do arquivo
 */
function lerLevas() {
  try {
    const filePath = getLevasFilePath()
    if (!fs.existsSync(filePath)) {
      return { levas: [] }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    logger.error('[Levas] Erro ao ler levas:', error.message)
    return { levas: [] }
  }
}

/**
 * Salva levas no arquivo
 */
function salvarLevas(data) {
  try {
    const filePath = getLevasFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    logger.error('[Levas] Erro ao salvar levas:', error.message)
    return false
  }
}

/**
 * Lê APIs do arquivo global
 */
function lerApis() {
  try {
    if (!fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
      return { apis: [] }
    }
    const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    logger.error('[Levas] Erro ao ler APIs:', error.message)
    return { apis: [] }
  }
}

/**
 * Salva APIs no arquivo global
 */
function salvarApis(data) {
  try {
    const dir = path.dirname(PATHS.APIS_TELEGRAM_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(PATHS.APIS_TELEGRAM_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    logger.error('[Levas] Erro ao salvar APIs:', error.message)
    return false
  }
}

/**
 * Atualiza status da API (emUso, usadaPor)
 */
function atualizarStatusApi(apiId, emUso, usadaPor = null) {
  const apisData = lerApis()
  const apiIndex = apisData.apis.findIndex(api => api.id === apiId)
  
  if (apiIndex === -1) {
    logger.warn('[Levas] API não encontrada:', apiId)
    return false
  }
  
  apisData.apis[apiIndex].emUso = emUso
  apisData.apis[apiIndex].usadaPor = usadaPor
  
  return salvarApis(apisData)
}

/**
 * Obtém credenciais da API pelo ID
 */
function getApiCredentials(apiId) {
  const apisData = lerApis()
  const api = apisData.apis.find(a => a.id === apiId)
  
  if (!api) {
    return null
  }
  
  return {
    apiId: Number(api.api_id),
    apiHash: api.api_hash
  }
}

/**
 * Registra todos os handlers de Levas
 */
export function registerLevaHandlers() {
  logger.log('📁 Registrando handlers de Levas...')

  // Listar todas as levas da operação atual
  ipcMain.handle('listar-levas', async () => {
    try {
      const data = lerLevas()
      logger.log('[Levas] Listando', data.levas.length, 'levas')
      return data.levas
    } catch (error) {
      logger.error('[Levas] Erro ao listar levas:', error.message)
      return []
    }
  })

  // Criar nova leva
  ipcMain.handle('criar-leva', async (event, { nome, apiId, sessoes }) => {
    try {
      const data = lerLevas()
      
      // Verificar se já existe leva com esse nome
      const levaExistente = data.levas.find(l => l.nome.toLowerCase() === nome.toLowerCase())
      if (levaExistente) {
        return { success: false, error: 'Já existe uma leva com esse nome' }
      }
      
      // Verificar se as sessões já estão em outra leva
      for (const sessao of sessoes) {
        const levaComSessao = data.levas.find(l => l.sessoes.includes(sessao))
        if (levaComSessao) {
          return { 
            success: false, 
            error: `A sessão ${sessao} já está na leva "${levaComSessao.nome}"` 
          }
        }
      }
      
      // Criar nova leva
      const novaLeva = {
        id: crypto.randomUUID(),
        nome,
        apiId,
        sessoes,
        status: 'disponivel',
        dataCriacao: new Date().toISOString(),
        ultimoUso: null,
        gruposCriados: 0
      }
      
      data.levas.push(novaLeva)
      
      if (!salvarLevas(data)) {
        return { success: false, error: 'Erro ao salvar leva' }
      }
      
      // Atualizar status da API
      const operacao = getOperacaoAtual()
      atualizarStatusApi(apiId, true, `${novaLeva.nome} (${operacao?.nome || ''})`)
      
      logger.log('[Levas] Leva criada:', novaLeva.nome)
      return { success: true, leva: novaLeva }
    } catch (error) {
      logger.error('[Levas] Erro ao criar leva:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Atualizar leva existente
  ipcMain.handle('atualizar-leva', async (event, { id, nome, apiId, sessoes }) => {
    try {
      const data = lerLevas()
      const levaIndex = data.levas.findIndex(l => l.id === id)
      
      if (levaIndex === -1) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      const levaAntiga = data.levas[levaIndex]
      
      // Verificar se o novo nome já existe (em outra leva)
      if (nome !== levaAntiga.nome) {
        const levaComNome = data.levas.find(l => l.id !== id && l.nome.toLowerCase() === nome.toLowerCase())
        if (levaComNome) {
          return { success: false, error: 'Já existe uma leva com esse nome' }
        }
      }
      
      // Verificar se as novas sessões já estão em outra leva
      for (const sessao of sessoes) {
        const levaComSessao = data.levas.find(l => l.id !== id && l.sessoes.includes(sessao))
        if (levaComSessao) {
          return { 
            success: false, 
            error: `A sessão ${sessao} já está na leva "${levaComSessao.nome}"` 
          }
        }
      }
      
      // Se mudou a API, liberar a antiga e marcar a nova
      if (apiId !== levaAntiga.apiId) {
        atualizarStatusApi(levaAntiga.apiId, false, null)
        const operacao = getOperacaoAtual()
        atualizarStatusApi(apiId, true, `${nome} (${operacao?.nome || ''})`)
      } else if (nome !== levaAntiga.nome) {
        // Se só mudou o nome, atualizar o usadaPor da API
        const operacao = getOperacaoAtual()
        atualizarStatusApi(apiId, true, `${nome} (${operacao?.nome || ''})`)
      }
      
      // Atualizar leva
      data.levas[levaIndex] = {
        ...levaAntiga,
        nome,
        apiId,
        sessoes
      }
      
      if (!salvarLevas(data)) {
        return { success: false, error: 'Erro ao salvar leva' }
      }
      
      logger.log('[Levas] Leva atualizada:', nome)
      return { success: true, leva: data.levas[levaIndex] }
    } catch (error) {
      logger.error('[Levas] Erro ao atualizar leva:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Excluir leva
  ipcMain.handle('excluir-leva', async (event, id) => {
    try {
      const data = lerLevas()
      const levaIndex = data.levas.findIndex(l => l.id === id)
      
      if (levaIndex === -1) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      const leva = data.levas[levaIndex]
      
      // Liberar a API
      atualizarStatusApi(leva.apiId, false, null)
      
      // Remover leva
      data.levas.splice(levaIndex, 1)
      
      if (!salvarLevas(data)) {
        return { success: false, error: 'Erro ao salvar alterações' }
      }
      
      logger.log('[Levas] Leva excluída:', leva.nome)
      return { success: true }
    } catch (error) {
      logger.error('[Levas] Erro ao excluir leva:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Marcar leva como disponível
  ipcMain.handle('marcar-leva-disponivel', async (event, id) => {
    try {
      const data = lerLevas()
      const levaIndex = data.levas.findIndex(l => l.id === id)
      
      if (levaIndex === -1) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      data.levas[levaIndex].status = 'disponivel'
      
      if (!salvarLevas(data)) {
        return { success: false, error: 'Erro ao salvar alterações' }
      }
      
      logger.log('[Levas] Leva marcada como disponível:', data.levas[levaIndex].nome)
      return { success: true, leva: data.levas[levaIndex] }
    } catch (error) {
      logger.error('[Levas] Erro ao marcar leva como disponível:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Marcar leva como em uso (após criar grupos)
  ipcMain.handle('marcar-leva-em-uso', async (event, { id, gruposCriados }) => {
    try {
      const data = lerLevas()
      const levaIndex = data.levas.findIndex(l => l.id === id)
      
      if (levaIndex === -1) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      data.levas[levaIndex].status = 'em_uso'
      data.levas[levaIndex].ultimoUso = new Date().toISOString()
      if (gruposCriados) {
        data.levas[levaIndex].gruposCriados = (data.levas[levaIndex].gruposCriados || 0) + gruposCriados
      }
      
      if (!salvarLevas(data)) {
        return { success: false, error: 'Erro ao salvar alterações' }
      }
      
      logger.log('[Levas] Leva marcada como em uso:', data.levas[levaIndex].nome)
      return { success: true, leva: data.levas[levaIndex] }
    } catch (error) {
      logger.error('[Levas] Erro ao marcar leva como em uso:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Obter leva por ID
  ipcMain.handle('obter-leva', async (event, id) => {
    try {
      const data = lerLevas()
      const leva = data.levas.find(l => l.id === id)
      
      if (!leva) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      return { success: true, leva }
    } catch (error) {
      logger.error('[Levas] Erro ao obter leva:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Obter credenciais da API de uma leva
  ipcMain.handle('obter-api-leva', async (event, levaId) => {
    try {
      const data = lerLevas()
      const leva = data.levas.find(l => l.id === levaId)
      
      if (!leva) {
        return { success: false, error: 'Leva não encontrada' }
      }
      
      const credentials = getApiCredentials(leva.apiId)
      
      if (!credentials) {
        return { success: false, error: 'API não encontrada' }
      }
      
      return { success: true, credentials }
    } catch (error) {
      logger.error('[Levas] Erro ao obter API da leva:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Obter sessões que estão em levas
  ipcMain.handle('obter-sessoes-em-levas', async () => {
    try {
      const data = lerLevas()
      
      // Obter todas as sessões que estão em levas
      const sessoesEmLevas = new Set()
      data.levas.forEach(leva => {
        leva.sessoes.forEach(sessao => sessoesEmLevas.add(sessao))
      })
      
      return { success: true, sessoesEmLevas: Array.from(sessoesEmLevas) }
    } catch (error) {
      logger.error('[Levas] Erro ao obter sessões em levas:', error.message)
      return { success: false, error: error.message }
    }
  })

  // Verificar se API está em uso por alguma leva
  ipcMain.handle('verificar-api-em-uso', async (event, apiId) => {
    try {
      const data = lerLevas()
      const levaComApi = data.levas.find(l => l.apiId === apiId)
      
      if (levaComApi) {
        return { 
          emUso: true, 
          usadaPor: levaComApi.nome 
        }
      }
      
      return { emUso: false, usadaPor: null }
    } catch (error) {
      logger.error('[Levas] Erro ao verificar API em uso:', error.message)
      return { emUso: false, usadaPor: null }
    }
  })

  logger.log('✅ Handlers de Levas registrados')
}



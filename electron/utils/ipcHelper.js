/**
 * Helper para handlers IPC
 * 
 * Fornece wrappers e utilitários para simplificar e padronizar handlers IPC.
 */

import { ipcMain } from 'electron'
import { logger } from './logger.js'

/**
 * Cria um handler IPC com tratamento de erro automático
 * @param {string} channel - Nome do canal IPC
 * @param {Function} handler - Função handler (event, ...args) => Promise<any>
 * @param {Object} options - Opções adicionais
 * @param {string} options.category - Categoria para logging
 * @param {boolean} options.logArgs - Se deve logar argumentos (default: false)
 */
export function createHandler(channel, handler, options = {}) {
  const { category = 'IPC', logArgs = false } = options

  ipcMain.handle(channel, async (event, ...args) => {
    const startTime = Date.now()
    
    try {
      if (logArgs) {
        logger.log(`[${category}] ${channel} chamado com:`, JSON.stringify(args).slice(0, 200))
      } else {
        logger.log(`[${category}] ${channel} chamado`)
      }

      const result = await handler(event, ...args)
      
      const elapsed = Date.now() - startTime
      logger.log(`[${category}] ${channel} concluído em ${elapsed}ms`)
      
      return result
    } catch (error) {
      const elapsed = Date.now() - startTime
      logger.error(`[${category}] ${channel} falhou após ${elapsed}ms:`, error.message)
      
      // Retornar objeto de erro padronizado
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
    }
  })
}

/**
 * Cria múltiplos handlers de uma vez
 * @param {Object} handlers - Objeto { channel: handler }
 * @param {Object} options - Opções comuns para todos os handlers
 */
export function createHandlers(handlers, options = {}) {
  for (const [channel, handler] of Object.entries(handlers)) {
    createHandler(channel, handler, options)
  }
}

/**
 * Wrapper para operações que retornam sucesso/erro
 * @param {Function} operation - Operação async a executar
 * @param {Object} options - Opções
 */
export async function wrapOperation(operation, options = {}) {
  const { 
    successMessage = 'Operação concluída',
    includeData = true 
  } = options

  try {
    const data = await operation()
    
    const result = {
      success: true,
      message: successMessage,
    }
    
    if (includeData && data !== undefined) {
      result.data = data
    }
    
    return result
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
    }
  }
}

/**
 * Serializa dados para IPC (evita erros de clonagem)
 * @param {any} data - Dados a serializar
 * @returns {any} - Dados serializados
 */
export function serializeForIPC(data) {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'function') {
    return undefined
  }

  if (Array.isArray(data)) {
    return data.map(serializeForIPC).filter(item => item !== undefined)
  }

  if (typeof data === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(data)) {
      const serialized = serializeForIPC(value)
      if (serialized !== undefined) {
        result[key] = serialized
      }
    }
    return result
  }

  // Tipos primitivos passam direto
  return data
}

/**
 * Valida parâmetros obrigatórios
 * @param {Object} params - Parâmetros recebidos
 * @param {string[]} required - Lista de parâmetros obrigatórios
 * @throws {Error} - Se algum parâmetro estiver faltando
 */
export function validateParams(params, required) {
  const missing = required.filter(param => {
    const value = params[param]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    throw new Error(`Parâmetros obrigatórios faltando: ${missing.join(', ')}`)
  }
}

/**
 * Executa operação com timeout
 * @param {Function} operation - Operação a executar
 * @param {number} timeoutMs - Timeout em milissegundos
 * @param {string} timeoutMessage - Mensagem de erro de timeout
 */
export async function withTimeout(operation, timeoutMs, timeoutMessage = 'Operação expirou') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  return Promise.race([operation(), timeoutPromise])
}

/**
 * Retry com backoff exponencial
 * @param {Function} operation - Operação a executar
 * @param {Object} options - Opções de retry
 */
export async function withRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options

  let lastError
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      logger.warn(`[IPC] Tentativa ${attempt}/${maxRetries} falhou, tentando novamente em ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}

export default {
  createHandler,
  createHandlers,
  wrapOperation,
  serializeForIPC,
  validateParams,
  withTimeout,
  withRetry,
}



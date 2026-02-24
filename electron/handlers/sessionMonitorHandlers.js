/**
 * Handlers IPC para monitoramento automático de sessões e adição de listas
 */

import path from 'path'
import { ipcMain } from 'electron'
import { PATHS } from '../config/paths.js'

export function registerSessionMonitorHandlers() {
  console.log('📝 Registrando handlers de Session Monitor...')

  /**
   * Handler para verificar e adicionar listas automaticamente em uma sessão
   */
  ipcMain.handle('session-monitor-verificar-adicionar-listas', async (event, payload) => {
    const { accountId, listName, sessionId } = payload
    
    const logs = []
    const addLog = (level, message, data = null) => {
      const timestamp = new Date().toLocaleString('pt-BR')
      let logMessage = `[${timestamp}] [${level}] ${message}`
      if (data) {
        try {
          logMessage += ` ${typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}`
        } catch (e) {
          logMessage += ` ${String(data)}`
        }
      }
      logs.push(logMessage)
      if (level === 'ERROR') {
        console.error('[Session Monitor]', message, data || '')
      } else {
        console.log('[Session Monitor]', message, data || '')
      }
    }

    try {
      addLog('INFO', '[Session Monitor] Verificando e adicionando listas', { accountId, listName, sessionId })

      if (!accountId || !listName) {
        throw new Error('accountId e listName são obrigatórios')
      }

      // Importar módulo de verificação (CommonJS)
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      
      const sessionVerifierPath = path.join(PATHS.BASE, 'back', 'sessionMonitor', 'sessionVerifier.js')
      const sessionVerifierModule = require(sessionVerifierPath)
      const { verificarESAdicionarListas } = sessionVerifierModule

      // Preparar customPaths
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      // Obter API e proxy (rotação automática)
      const apiRotatorPath = path.join(PATHS.BASE, 'back', 'utils', 'apiRotator.js')
      const apiRotatorModule = require(apiRotatorPath)
      const { getNextApiCredentials } = apiRotatorModule
      
      const proxyManagerPath = path.join(PATHS.BASE, 'back', 'utils', 'proxyManager.js')
      const proxyManagerModule = require(proxyManagerPath)
      const { reservarProxy, liberarProxy } = proxyManagerModule

      const apiCredentials = getNextApiCredentials(customPaths)
      const proxyReservado = await reservarProxy(accountId, customPaths)

      addLog('INFO', '[Session Monitor] API e Proxy obtidos', {
        apiId: apiCredentials?.apiId,
        proxy: proxyReservado ? `${proxyReservado.endereco}:${proxyReservado.porta}` : 'Nenhum',
      })

      // Verificar e adicionar listas
      const result = await verificarESAdicionarListas(
        accountId,
        listName,
        customPaths,
        {
          apiCredentials,
          proxyReservado,
          workerId: null,
        }
      )

      // Liberar proxy
      if (proxyReservado) {
        try {
          await liberarProxy(accountId, customPaths)
        } catch (error) {
          // Ignorar erros ao liberar proxy
        }
      }

      addLog('INFO', '[Session Monitor] Verificação concluída', result)

      return {
        success: result.sucesso || false,
        gruposAcima500: result.gruposAcima500 || 0,
        gruposVerificados: result.gruposVerificados || 0,
        botsAdicionados: result.botsAdicionados || 0,
        logs: logs.length > 0 ? logs : undefined,
      }
    } catch (error) {
      addLog('ERROR', '[Session Monitor] Erro', error.message)
      if (error.stack) {
        addLog('ERROR', '[Session Monitor] Stack trace', error.stack)
      }

      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        logs: logs.length > 0 ? logs : undefined,
      }
    }
  })
}


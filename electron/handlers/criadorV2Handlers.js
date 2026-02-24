/**
 * Handlers IPC para CriadorV2 - Versão Ruivo
 * 
 * Handlers disponíveis:
 * - criadorV2:getStatus - Obtém status do sistema
 * - criadorV2:getOpcoes - Obtém opções para o formulário
 * - criadorV2:getNichos - Lista nichos disponíveis
 * - criadorV2:getSessions - Lista sessões disponíveis
 * - criadorV2:getPendingSessions - Obtém sessões pendentes de lotes
 * - criadorV2:getLastCdNumber - Obtém último número CD
 * - criadorV2:createGroups - Cria grupos (versão Ruivo)
 */

import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Criar require para módulos CommonJS
const require = createRequire(import.meta.url)

let criadorModule = null
let currentVersion = null

// Função helper para detectar versão (tenta ler do localStorage através do processo)
function detectVersion() {
  if (currentVersion) return currentVersion
  
  // Por padrão, tentar Gabriel primeiro se o arquivo existe
  const gabrielPath = path.resolve(PATHS.BASE, 'back', 'criador-gabriel', 'criador.js')
  const ruivoPath = path.resolve(PATHS.BASE, 'back', 'criador', 'criadorV2.js')
  
  if (fs.existsSync(gabrielPath)) {
    currentVersion = 'gabriel'
  } else if (fs.existsSync(ruivoPath)) {
    currentVersion = 'ruivo'
  } else {
    currentVersion = 'ruivo' // Fallback para Ruivo
  }
  
  return currentVersion
}

function loadCriador() {
  if (criadorModule) return criadorModule
  
  const version = detectVersion()
  console.log('[CriadorV2 Handlers] Detectada versão:', version)
  
  try {
    let possiblePaths = []
    
    if (version === 'gabriel') {
      // Versão Gabriel: usar criador-gabriel/criador.js
      possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'back', 'criador-gabriel', 'criador.js'),
        path.resolve(PATHS.BASE, 'back', 'criador-gabriel', 'criador.js'),
        path.resolve(process.cwd(), 'back', 'criador-gabriel', 'criador.js'),
      ]
    } else {
      // Versão Ruivo: usar criador-ruivo/criador.js
      possiblePaths = [
        path.resolve(__dirname, '..', '..', '..', 'back', 'criador-ruivo', 'criador.js'),
        path.resolve(PATHS.BASE, 'back', 'criador-ruivo', 'criador.js'),
        path.resolve(process.cwd(), 'back', 'criador-ruivo', 'criador.js'),
      ]
    }
    
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          criadorModule = require(p)
          console.log('[CriadorV2 Handlers] ✅ Módulo carregado de:', p)
          return criadorModule
        }
      } catch (e) {
        console.log('[CriadorV2 Handlers] Tentando próximo caminho...', e.message)
      }
    }
    
    console.error('[CriadorV2 Handlers] ❌ Módulo não encontrado em nenhum caminho')
    return null
  } catch (error) {
    console.error('[CriadorV2 Handlers] ❌ Erro ao carregar módulo:', error)
    return null
  }
}

// Função para carregar especificamente o módulo Ruivo (para getStatus e getOpcoesFormulario)
function loadCriadorRuivo() {
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', '..', 'back', 'criador-ruivo', 'criador.js'),
    path.resolve(PATHS.BASE, 'back', 'criador-ruivo', 'criador.js'),
    path.resolve(process.cwd(), 'back', 'criador-ruivo', 'criador.js'),
  ]
  
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const ruivoModule = require(p)
        console.log('[CriadorV2 Handlers] ✅ Módulo Ruivo carregado de:', p)
        return ruivoModule
      }
    } catch (e) {
      console.log('[CriadorV2 Handlers] Tentando próximo caminho para Ruivo...', e.message)
    }
  }
  
  console.error('[CriadorV2 Handlers] ❌ Módulo Ruivo não encontrado')
  return null
}

export function registerCriadorV2Handlers() {
  console.log('[CriadorV2 Handlers] Registrando handlers...')
  
  // Handler: Obtém status do sistema
  // NOTA: getStatus() só existe no módulo Ruivo, então sempre usa Ruivo
  ipcMain.handle('criadorV2:getStatus', async () => {
    try {
      console.log('[CriadorV2 Handlers] getStatus (usando módulo Ruivo)')
      const criadorRuivo = loadCriadorRuivo()
      
      if (!criadorRuivo) {
        console.error('[CriadorV2 Handlers] ❌ Módulo criador-ruivo não disponível')
        return { success: false, error: 'Módulo criador-ruivo não disponível' }
      }
      
      if (typeof criadorRuivo.getStatus !== 'function') {
        console.error('[CriadorV2 Handlers] ❌ getStatus não está disponível no módulo Ruivo')
        return { success: false, error: 'getStatus não está disponível no módulo Ruivo' }
      }
      
      const status = await criadorRuivo.getStatus()
      console.log('[CriadorV2 Handlers] 📤 Status recebido do backend:')
      console.log('[CriadorV2 Handlers]   - blastsendConfigurado:', status.blastsendConfigurado)
      console.log('[CriadorV2 Handlers]   - proximoCd:', status.proximoCd)
      console.log('[CriadorV2 Handlers]   - temSessoesPendentes:', status.temSessoesPendentes)
      console.log('[CriadorV2 Handlers]   - sessoesPendentes:', status.sessoesPendentes)
      
      const result = { success: true, status }
      console.log('[CriadorV2 Handlers] ✅ Retornando para frontend:', JSON.stringify(result, null, 2))
      return result
    } catch (error) {
      console.error('[CriadorV2 Handlers] ❌ Erro em getStatus:', error)
      console.error('[CriadorV2 Handlers] Stack:', error.stack)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Obtém opções para o formulário
  // NOTA: getOpcoesFormulario() só existe no módulo Ruivo, então sempre usa Ruivo
  ipcMain.handle('criadorV2:getOpcoes', async () => {
    try {
      console.log('[CriadorV2 Handlers] getOpcoes (usando módulo Ruivo)')
      const criadorRuivo = loadCriadorRuivo()
      
      if (!criadorRuivo) {
        return { success: false, error: 'Módulo criador-ruivo não disponível' }
      }
      
      if (typeof criadorRuivo.getOpcoesFormulario !== 'function') {
        return { success: false, error: 'getOpcoesFormulario não está disponível no módulo Ruivo' }
      }
      
      const opcoes = criadorRuivo.getOpcoesFormulario()
      return { success: true, opcoes }
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em getOpcoes:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Lista nichos disponíveis (lê de banco/nichos/, mesmo local da aba Nichos)
  ipcMain.handle('criadorV2:getNichos', async () => {
    try {
      console.log('[CriadorV2 Handlers] getNichos')
      
      // Verificar se a pasta nichos existe
      if (!fs.existsSync(PATHS.NICHOS_DIR)) {
        console.log('[CriadorV2 Handlers] Pasta nichos não existe:', PATHS.NICHOS_DIR)
        return { success: true, nichos: [] }
      }
      
      // Ler nichos de banco/nichos/ (mesmo local da aba Nichos)
      const pastas = fs.readdirSync(PATHS.NICHOS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          id: dirent.name,
          nome: dirent.name,
        }))
      
      console.log(`[CriadorV2 Handlers] ${pastas.length} nichos encontrados em:`, PATHS.NICHOS_DIR)
      return { success: true, nichos: pastas }
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em getNichos:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Lista sessões disponíveis
  ipcMain.handle('criadorV2:getSessions', async () => {
    try {
      console.log('[CriadorV2 Handlers] getSessions')
      const criadorV2 = loadCriador()
      
      if (!criadorV2) {
        return { success: false, error: 'Módulo criadorV2 não disponível' }
      }
      
      const sessions = await criadorV2.getSessionsDisponiveis()
      return { success: true, sessions }
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em getSessions:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Obtém sessões pendentes de lotes
  ipcMain.handle('criadorV2:getPendingSessions', async () => {
    try {
      console.log('[CriadorV2 Handlers] getPendingSessions')
      const criadorV2 = loadCriador()
      
      if (!criadorV2) {
        return { success: false, error: 'Módulo criadorV2 não disponível' }
      }
      
      const pendentes = criadorV2.lotes.verificarSessoesPendentes()
      return { success: true, pendentes }
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em getPendingSessions:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Obtém último número CD
  ipcMain.handle('criadorV2:getLastCdNumber', async () => {
    try {
      console.log('[CriadorV2 Handlers] getLastCdNumber')
      const criadorV2 = loadCriador()
      
      if (!criadorV2) {
        return { success: false, error: 'Módulo criadorV2 não disponível' }
      }
      
      const lastCd = criadorV2.getLastCdNumber()
      return { success: true, lastCd, nextCd: lastCd + 1 }
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em getLastCdNumber:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Handler: Cria grupos (versão Ruivo)
  ipcMain.handle('criadorV2:createGroups', async (event, payload) => {
    try {
      console.log('[CriadorV2 Handlers] createGroups')
      console.log('[CriadorV2 Handlers] Payload:', JSON.stringify(payload, null, 2))
      
      const criadorV2 = loadCriador()
      
      if (!criadorV2) {
        return { success: false, error: 'Módulo criadorV2 não disponível' }
      }
      
      // Validar payload
      const validacao = criadorV2.validarConfiguracao(payload)
      if (!validacao.valid) {
        return { success: false, error: validacao.errors.join('; ') }
      }
      
      // Executar criação
      const resultado = await criadorV2.createGroupsV2(payload)
      return resultado
    } catch (error) {
      console.error('[CriadorV2 Handlers] Erro em createGroups:', error)
      return { success: false, error: error.message }
    }
  })
  
  console.log('[CriadorV2 Handlers] ✅ Handlers registrados')
}

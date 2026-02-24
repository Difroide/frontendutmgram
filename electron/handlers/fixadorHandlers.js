import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { getMainWindow } from '../window/windowManager.js'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'
import { getOperacaoAtual } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

function requireBackendModule(modulePath) {
  const BACK_DIR = path.join(PATHS.BASE, 'back')
  const fullPath = path.join(BACK_DIR, modulePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Módulo não encontrado: ${fullPath}`)
  }
  return require(fullPath)
}

function getCustomPaths() {
  const operacaoAtual = getOperacaoAtual()
  const rootDir = PATHS.BASE
  return {
    rootDir,
    accountsDir: PATHS.CONTAS_DIR,
    bancoDir: PATHS.BANCO_DIR,
    bancoPrincipalDir: path.join(rootDir, 'banco'),
  }
}

function getApiCredentials() {
  const customPaths = getCustomPaths()
  try {
    const { getNextApiCredentials } = requireBackendModule('utils/apiRotator.js')
    const creds = getNextApiCredentials(customPaths)
    if (creds) return { apiId: creds.apiId, apiHash: creds.apiHash }
  } catch (_) {}
  const apiPath = path.join(PATHS.BASE, 'banco', 'apis telegram', 'api.json')
  if (fs.existsSync(apiPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apiPath, 'utf-8'))
      const apis = data.apis || []
      const first = apis.find((a) => a.api_id && a.api_hash)
      if (first) return { apiId: first.api_id, apiHash: first.api_hash }
    } catch (_) {}
  }
  return null
}

export function registerFixadorHandlers() {
  console.log('📝 Registrando handlers do Fixador...')

  const mensagens = () => requireBackendModule('fixador/mensagens.js')
  const botsGrupos = () => requireBackendModule('fixador/botsGrupos.js')
  const disparador = () => requireBackendModule('fixador/disparador.js')
  const verificarTopicos = () => requireBackendModule('fixador/verificarTopicos.js')
  const config = () => requireBackendModule('fixador/config.js')
  const cicloScheduler = () => requireBackendModule('fixador/cicloScheduler.js')
  const startBot = () => requireBackendModule('fixador/startBot.js')
  const sincronizarMensagensBot = () => requireBackendModule('fixador/sincronizarMensagensBot.js')

  const variaveisTexto = () => requireBackendModule('fixador/variaveisTexto.js')
  const formatacaoTelegram = () => requireBackendModule('fixador/formatacaoTelegram.js')

  ipcMain.handle('fixador-listar-formatacoes', async () => {
    try {
      return formatacaoTelegram().listarFormatacoes()
    } catch (e) {
      console.error('[fixador] listar formatacoes:', e)
      return []
    }
  })

  ipcMain.handle('fixador-preparar-preview-html', async (event, texto) => {
    try {
      const { sintaxeParaHtml, temTagsHtml } = formatacaoTelegram()
      const html = temTagsHtml(texto) ? texto : sintaxeParaHtml(texto)
      return html || ''
    } catch (e) {
      return texto || ''
    }
  })

  ipcMain.handle('fixador-listar-mensagens', async () => {
    try {
      const { bancoDir } = getCustomPaths()
      return mensagens().listar(bancoDir)
    } catch (e) {
      console.error('[fixador] listar mensagens:', e)
      return []
    }
  })

  ipcMain.handle('fixador-listar-variaveis-texto', async () => {
    try {
      return variaveisTexto().listarVariaveis()
    } catch (e) {
      console.error('[fixador] listar variaveis texto:', e)
      return []
    }
  })

  ipcMain.handle('fixador-criar-mensagem', async (event, data) => {
    try {
      const { bancoDir } = getCustomPaths()
      return mensagens().criar(bancoDir, data)
    } catch (e) {
      console.error('[fixador] criar mensagem:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-atualizar-mensagem', async (event, id, updates) => {
    try {
      const { bancoDir } = getCustomPaths()
      return mensagens().atualizar(bancoDir, id, updates)
    } catch (e) {
      console.error('[fixador] atualizar mensagem:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-remover-mensagem', async (event, id) => {
    try {
      const { bancoDir } = getCustomPaths()
      return mensagens().remover(bancoDir, id)
    } catch (e) {
      console.error('[fixador] remover mensagem:', e)
      throw e
    }
  })

  const pastaFotosPadrao = path.join(PATHS.BASE, '..', 'FOTOS', 'FOTO DE GRUPO')
  ipcMain.handle('fixador-selecionar-foto', async () => {
    try {
      const mainWindow = getMainWindow()
      const defaultPath = fs.existsSync(pastaFotosPadrao) ? pastaFotosPadrao : undefined
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openFile'],
        title: 'Selecione uma imagem',
        defaultPath,
        filters: [
          { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      })
      if (result.canceled || !result.filePaths?.length) return null
      return result.filePaths[0]
    } catch (e) {
      console.error('[fixador] selecionar foto:', e)
      return null
    }
  })

  ipcMain.handle('fixador-listar-bots', async () => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().listarBots(bancoDir)
    } catch (e) {
      console.error('[fixador] listar bots:', e)
      return []
    }
  })

  ipcMain.handle('fixador-criar-bot', async (event, data) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().criarBot(bancoDir, data)
    } catch (e) {
      console.error('[fixador] criar bot:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-atualizar-bot', async (event, id, updates) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().atualizarBot(bancoDir, id, updates)
    } catch (e) {
      console.error('[fixador] atualizar bot:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-remover-bot', async (event, id) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().removerBot(bancoDir, id)
    } catch (e) {
      console.error('[fixador] remover bot:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-adicionar-grupo', async (event, botId, grupo) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().adicionarGrupo(bancoDir, botId, grupo)
    } catch (e) {
      console.error('[fixador] adicionar grupo:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-remover-grupo', async (event, botId, groupId, topicId) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().removerGrupo(bancoDir, botId, groupId, topicId)
    } catch (e) {
      console.error('[fixador] remover grupo:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-atualizar-grupo', async (event, botId, groupId, updates) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().atualizarGrupo(bancoDir, botId, groupId, updates)
    } catch (e) {
      console.error('[fixador] atualizar grupo:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-atualizar-topicos-grupo', async (event, botId, groupId, topicId) => {
    try {
      const { bancoDir } = getCustomPaths()
      return botsGrupos().atualizarTopicosGrupo(bancoDir, botId, groupId, topicId)
    } catch (e) {
      console.error('[fixador] atualizar topicos grupo:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-disparar', async () => {
    try {
      const customPaths = getCustomPaths()
      return disparador().disparar(customPaths)
    } catch (e) {
      console.error('[fixador] disparar:', e)
      return { enviados: 0, erros: [{ error: e.message || String(e) }] }
    }
  })

  ipcMain.handle('fixador-disparar-selecionado', async (event, botIds, mensagemId) => {
    try {
      const customPaths = getCustomPaths()
      if (mensagemId) {
        return cicloScheduler().executarDisparoManual(customPaths, botIds, mensagemId)
      }
      return disparador().dispararSelecionado(customPaths, botIds)
    } catch (e) {
      console.error('[fixador] disparar selecionado:', e)
      return { enviados: 0, erros: [{ error: e.message || String(e) }] }
    }
  })

  ipcMain.handle('fixador-verificar-topicos-grupo', async (event, accountId, groupLink) => {
    try {
      const accountIdStr = accountId != null ? String(accountId).trim() : ''
      const groupLinkStr = groupLink != null ? String(groupLink).trim() : ''
      if (!accountIdStr || !groupLinkStr) {
        return { topicos: [], isForum: false, error: 'Conta e link do grupo são obrigatórios.' }
      }
      const { accountsDir } = getCustomPaths()
      const creds = getApiCredentials()
      if (!creds) {
        return { topicos: [], isForum: false, error: 'Nenhuma API Telegram cadastrada. Configure em Configurações > API Telegram.' }
      }
      return verificarTopicos().verificarTopicosGrupo({
        accountId: accountIdStr,
        groupLink: groupLinkStr,
        accountsDir: accountsDir || '',
        apiId: creds.apiId,
        apiHash: creds.apiHash,
      })
    } catch (e) {
      console.error('[fixador] verificar topicos:', e)
      return { topicos: [], isForum: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle('fixador-get-status', async () => {
    try {
      const { bancoDir } = getCustomPaths()
      return { ativo: config().getAtivo(bancoDir) }
    } catch (e) {
      console.error('[fixador] get-status:', e)
      return { ativo: false }
    }
  })

  ipcMain.handle('fixador-ativar', async () => {
    try {
      const customPaths = getCustomPaths()
      const { bancoDir, accountsDir } = customPaths
      config().setAtivo(bancoDir, true)
      const apiCreds = getApiCredentials()
      if (apiCreds && accountsDir) {
        try {
          const res = await sincronizarMensagensBot().sincronizarMensagensBot(customPaths, apiCreds)
          if (res.atualizados > 0) {
            console.log(`[fixador] Sync: ${res.atualizados} lastMessageId(s) atualizado(s)`)
          }
        } catch (syncErr) {
          console.warn('[fixador] Sync mensagens (não crítico):', syncErr?.message || syncErr)
        }
      }
      cicloScheduler().iniciarCiclos(customPaths)
      startBot().iniciarListeners(bancoDir)
      return { success: true }
    } catch (e) {
      console.error('[fixador] ativar:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-desativar', async () => {
    try {
      const customPaths = getCustomPaths()
      const { bancoDir } = customPaths
      config().setAtivo(bancoDir, false)
      cicloScheduler().pararCiclos()
      startBot().pararListeners()
      return { success: true }
    } catch (e) {
      console.error('[fixador] desativar:', e)
      throw e
    }
  })

  ipcMain.handle('fixador-iniciar-ciclo-grupo', async (event, botId, groupId, topicId) => {
    try {
      const customPaths = getCustomPaths()
      cicloScheduler().adicionarCicloGrupo(customPaths, botId, groupId, topicId ?? null)
      return { success: true }
    } catch (e) {
      console.error('[fixador] iniciar-ciclo-grupo:', e)
      throw e
    }
  })
}

function isFixadorStandaloneRunning() {
  try {
    const lockPath = path.join(PATHS.BASE, 'fixador-standalone.lock')
    if (!fs.existsSync(lockPath)) return false
    const pid = parseInt(fs.readFileSync(lockPath, 'utf-8'), 10)
    if (!pid || pid === process.pid) return false
    try {
      process.kill(pid, 0)
      return true
    } catch (_) {
      try { fs.unlinkSync(lockPath) } catch (_) {}
      return false
    }
  } catch (_) {
    return false
  }
}

export function restoreFixadorSeAtivo() {
  try {
    if (isFixadorStandaloneRunning()) {
      console.log('[fixador] Fixador standalone está rodando – ignorando restore (evita duplicação)')
      return
    }
    const config = requireBackendModule('fixador/config.js')
    const cicloScheduler = requireBackendModule('fixador/cicloScheduler.js')
    const startBot = requireBackendModule('fixador/startBot.js')
    const sincronizarMensagensBot = requireBackendModule('fixador/sincronizarMensagensBot.js')
    const customPaths = getCustomPaths()
    const { bancoDir, accountsDir } = customPaths
    if (config.getAtivo(bancoDir)) {
      const apiCreds = getApiCredentials()
      if (apiCreds && accountsDir) {
        try {
          sincronizarMensagensBot.sincronizarMensagensBot(customPaths, apiCreds).then((res) => {
            if (res.atualizados > 0) {
              console.log(`[fixador] Sync: ${res.atualizados} lastMessageId(s) atualizado(s)`)
            }
          }).catch(() => {})
        } catch (_) {}
      }
      cicloScheduler.iniciarCiclos(customPaths)
      startBot.iniciarListeners(bancoDir)
      console.log('[fixador] Ciclos e listeners /start restaurados (sistema estava ativo)')
    }
  } catch (e) {
    console.warn('[fixador] Erro ao restaurar:', e.message)
  }
}

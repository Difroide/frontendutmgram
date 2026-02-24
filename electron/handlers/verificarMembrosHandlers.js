import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'
import { getOperacaoAtual } from '../config/paths.js'
import { obterBotsVendasParaVerificacao } from './botMidiaHandlers.js'

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

const VERIFICACAO_DIARIA_CONFIG_FILE = () => path.join(PATHS.BANCO_DIR, 'verificacao-membros-diaria.json')

export function getVerificacaoDiariaConfig() {
  try {
    const p = VERIFICACAO_DIARIA_CONFIG_FILE()
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8')
      const data = JSON.parse(content)
      return {
        enabled: !!data.enabled,
        lastRunDate: data.lastRunDate || null,
      }
    }
  } catch (err) {
    console.warn('[verificarMembros] Erro ao ler config diária:', err.message)
  }
  return { enabled: false, lastRunDate: null }
}

export function setVerificacaoDiariaConfig(updates) {
  try {
    const p = VERIFICACAO_DIARIA_CONFIG_FILE()
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const current = getVerificacaoDiariaConfig()
    const next = { ...current, ...updates }
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.warn('[verificarMembros] Erro ao salvar config diária:', err.message)
    return false
  }
}

const IGNORED_GROUPS_FILE = () => path.join(PATHS.BANCO_DIR, 'grupos-ignorados.json')

function getIgnoredGroups() {
  try {
    const p = IGNORED_GROUPS_FILE()
    if (fs.existsSync(p)) {
      return new Set(JSON.parse(fs.readFileSync(p, 'utf-8')))
    }
  } catch (err) {
    console.warn('[verificarMembros] Erro ao ler grupos ignorados:', err.message)
  }
  return new Set()
}

function addIgnoredGroup(link) {
  if (!link) return
  try {
    const p = IGNORED_GROUPS_FILE()
    const current = getIgnoredGroups()
    // Normalizar para garantir hits futuros
    const clean = link.replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^\/+/, '').trim()

    let changed = false
    if (!current.has(clean)) { current.add(clean); changed = true; }
    if (!current.has(`https://t.me/${clean}`)) { current.add(`https://t.me/${clean}`); changed = true; }

    if (changed) {
      fs.writeFileSync(p, JSON.stringify([...current], null, 2))
    }
  } catch (err) {
    console.warn('[verificarMembros] Erro ao salvar grupo ignorado:', err.message)
  }
}

export function registerVerificarMembrosHandlers() {
  console.log('📝 Registrando handlers de verificação de membros...')

  ipcMain.handle('verificar-membros-grupos', async (event, accountIds) => {
    try {
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return {
          success: false,
          error: 'Nenhuma conta selecionada',
          total: 0,
          atualizados: 0,
          erros: 0,
          results: [],
        }
      }

      const customPaths = getCustomPaths()
      const {
        obterGruposPorAccountIds,
        verificarMembrosGrupos,
        atualizarGruposNosArquivos,
        atualizarMembrosNosJsonsDasContas,
      } = requireBackendModule('utils/groupMembersScraper.js')

      const grupos = obterGruposPorAccountIds(accountIds, customPaths)

      if (grupos.length === 0) {
        return {
          success: true,
          total: 0,
          atualizados: 0,
          erros: 0,
          results: [],
          message: 'Nenhum grupo encontrado para as contas selecionadas',
        }
      }

      console.log(`[verificarMembros] Verificando ${grupos.length} grupos...`)

      const caidosProcessados = new Set()
      const results = await verificarMembrosGrupos(grupos, {
        maxBrowsers: 2,
        onProgress: (resultado) => {
          if (!resultado?.caido) return
          const key = `${resultado.accountId || ''}:${resultado.grupoId || ''}`
          if (caidosProcessados.has(key)) return
          caidosProcessados.add(key)
          // Remove imediatamente do sistema no momento da detecção.
          atualizarMembrosNosJsonsDasContas([resultado], customPaths)
        },
      })
      const onlineResults = results.filter(r => r.success && !r.caido)
      const atualizados = atualizarGruposNosArquivos(onlineResults, customPaths)
      atualizarMembrosNosJsonsDasContas(onlineResults, customPaths)
      const erros = results.filter(r => !r.success).length

      return {
        success: true,
        total: grupos.length,
        atualizados,
        erros,
        results,
      }
    } catch (error) {
      console.error('[verificarMembros] Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        total: 0,
        atualizados: 0,
        erros: 0,
        results: [],
      }
    }
  })

  ipcMain.handle('verificar-membros-contar-grupos', async (event, accountIds) => {
    try {
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return { success: true, total: 0 }
      }
      const customPaths = getCustomPaths()
      const { obterGruposPorAccountIds } = requireBackendModule('utils/groupMembersScraper.js')
      const grupos = obterGruposPorAccountIds(accountIds, customPaths)
      return { success: true, total: grupos.length }
    } catch (error) {
      return { success: false, total: 0, error: error.message }
    }
  })

  ipcMain.handle('verificar-membros-todos-grupos', async () => {
    try {
      const customPaths = getCustomPaths()
      const {
        obterTodosGrupos,
        verificarMembrosGrupos,
        atualizarGruposNosArquivos,
        atualizarMembrosNosJsonsDasContas,
      } = requireBackendModule('utils/groupMembersScraper.js')

      const grupos = obterTodosGrupos(customPaths)

      // Filtrar grupos ignorados/caídos
      const ignoredSet = getIgnoredGroups()
      const gruposFiltrados = grupos.filter(g => {
        const link = g.link || g.link_convite || ''
        if (!link) return true
        const cleanLink = link.replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^\/+/, '').trim()
        return !(ignoredSet.has(cleanLink) || ignoredSet.has(`https://t.me/${cleanLink}`))
      })

      if (gruposFiltrados.length === 0) {
        return {
          success: true,
          total: 0,
          atualizados: 0,
          caidos: 0,
          erros: 0,
          results: [],
          message: 'Nenhum grupo ativo encontrado no sistema',
        }
      }

      console.log(`[verificarMembros] Verificando ${gruposFiltrados.length} grupos (total: ${grupos.length}, ignorados: ${grupos.length - gruposFiltrados.length})...`)

      const caidosProcessados = new Set()
      const results = await verificarMembrosGrupos(gruposFiltrados, {
        maxBrowsers: 2,
        onProgress: (resultado) => {
          if (!resultado?.caido) return
          const key = `${resultado.accountId || ''}:${resultado.grupoId || ''}`
          if (caidosProcessados.has(key)) return
          caidosProcessados.add(key)
          // Remove imediatamente do sistema no momento da detecção.
          atualizarMembrosNosJsonsDasContas([resultado], customPaths)
        },
      })
      const onlineResults = results.filter(r => r.success && !r.caido)
      const atualizados = atualizarGruposNosArquivos(onlineResults, customPaths)
      atualizarMembrosNosJsonsDasContas(onlineResults, customPaths)
      const caidos = results.filter(r => r.caido).length
      const erros = results.filter(r => !r.success && !r.caido).length

      return {
        success: true,
        total: grupos.length,
        atualizados,
        caidos,
        erros,
        results,
      }
    } catch (error) {
      console.error('[verificarMembros] Erro ao verificar todos:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        total: 0,
        atualizados: 0,
        caidos: 0,
        erros: 0,
        results: [],
      }
    }
  })

  ipcMain.handle('verificar-membros-contar-todos-grupos', async () => {
    try {
      const customPaths = getCustomPaths()
      const { obterTodosGrupos } = requireBackendModule('utils/groupMembersScraper.js')
      const grupos = obterTodosGrupos(customPaths)
      return { success: true, total: grupos.length }
    } catch (error) {
      return { success: false, total: 0, error: error.message }
    }
  })

  ipcMain.handle('verificar-membros-diaria-get-config', async () => {
    return getVerificacaoDiariaConfig()
  })

  ipcMain.handle('verificar-membros-diaria-set-enabled', async (event, enabled) => {
    return setVerificacaoDiariaConfig({ enabled: !!enabled })
  })

  ipcMain.handle('verificar-membros-iniciar', async (event) => {
    const sender = event.sender
    const customPaths = getCustomPaths()
    const { obterTodosGrupos, verificarMembrosGruposDiario, verificarBotsVendas } = requireBackendModule('utils/groupMembersScraper.js')

    // Carregar Whitelist/Blacklist
    const ignoredSet = getIgnoredGroups()
    console.log(`[verificarMembros] Carregados ${ignoredSet.size} grupos na whitelist/blacklist.`)

    const grupos = obterTodosGrupos(customPaths)
    let bots = []
    try {
      bots = await obterBotsVendasParaVerificacao()
    } catch (e) {
      console.warn('[verificarMembros] Erro ao obter bots de vendas:', e?.message)
    }
    const totalGrupos = grupos.length
    const totalBots = bots.length

    console.log('[DEBUG-VERIFICADOR] Iniciar verificação de membros')
    console.log('[DEBUG-VERIFICADOR] CustomPaths (bancoDir):', customPaths.bancoDir)
    console.log(`[DEBUG-VERIFICADOR] Total grupos encontrados: ${totalGrupos}`)
    console.log(`[DEBUG-VERIFICADOR] Total bots encontrados: ${totalBots}`)

    const sendProgress = (gruposStats, botsStats, concluido = false) => {
      try {
        sender.send('verificacao-membros-progress', {
          grupos: gruposStats || { total: 0, verificados: 0, faltam: 0, online: 0, caidos: [] },
          bots: botsStats || { total: 0, verificados: 0, faltam: 0, online: 0, offline: [] },
          concluido,
          ultimaAtualizacao: Date.now(),
        })
      } catch (err) {
        console.warn('[verificarMembros] Erro ao enviar progresso:', err?.message)
      }
    }

    setImmediate(async () => {
      const gruposResult = { total: totalGrupos, verificados: 0, faltam: totalGrupos, online: 0, caidos: [] }
      const botsResult = { total: totalBots, verificados: 0, faltam: totalBots, online: 0, offline: [] }
      sendProgress(gruposResult, botsResult)

      const sendMerged = () => sendProgress(gruposResult, botsResult, false)

      try {
        const promises = []
        if (totalGrupos > 0) {
          promises.push(
            verificarMembrosGruposDiario(customPaths, {
              ignoredSet, // Passando o Set para filtrar
              onProgress: (resultado) => {
                // Se caiu, adiciona à blacklist imediatamente
                if (resultado?.caido && resultado.link_convite) {
                  addIgnoredGroup(resultado.link_convite)
                }
              },
              onProgressAggregate: (s) => {
                gruposResult.total = s.total
                gruposResult.verificados = s.verificados
                gruposResult.faltam = s.faltam
                gruposResult.online = s.online ?? 0
                if (Array.isArray(s.caidos)) gruposResult.caidos = s.caidos
                sendMerged()
              },
            }).then((r) => {
              gruposResult.verificados = r.processados
              gruposResult.faltam = r.total - r.processados
              gruposResult.online = r.online ?? 0
              sendMerged()
              return r
            })
          )
        }
        if (totalBots > 0) {
          promises.push(
            verificarBotsVendas(bots, {
              onProgressAggregate: (s) => {
                botsResult.total = s.total
                botsResult.verificados = s.verificados
                botsResult.faltam = s.faltam
                botsResult.online = s.online
                if (Array.isArray(s.offline)) botsResult.offline = s.offline
                sendMerged()
              },
              onLogOffline: (logData) => {
                try {
                  sender.send('verificacao-bot-log-offline', logData)
                } catch (err) {
                  console.warn('[verificarMembros] Erro ao enviar log offline:', err?.message)
                }
              },
            }).then((r) => {
              botsResult.verificados = r.verificados
              botsResult.faltam = 0
              botsResult.online = r.online
              sendMerged()
              return r
            })
          )
        }
        await Promise.all(promises)

        // Persistir dados de grupos (online/caídos) para o gráfico histórico
        try {
          const gruposOnline = gruposResult.online || 0
          const gruposCaidos = gruposResult.caidos?.length || 0
          const databasePath = path.join(PATHS.BASE, 'back', 'utils', 'database.js')
          const { saveGruposStats } = require(databasePath)
          const customPaths = { rootDir: PATHS.BASE, bancoDir: PATHS.BANCO_DIR }
          saveGruposStats(gruposOnline, 0, gruposCaidos, customPaths)
          console.log(`[verificarMembros] Dados salvos no histórico: ${gruposOnline} online, ${gruposCaidos} caídos`)
        } catch (dbErr) {
          console.warn('[verificarMembros] Erro ao salvar dados no histórico:', dbErr?.message)
        }
      } catch (err) {
        console.error('[verificarMembros] Erro na verificação:', err)
      }
      sendProgress(gruposResult, botsResult, true)
    })

    return { started: true, totalGrupos, totalBots }
  })
}

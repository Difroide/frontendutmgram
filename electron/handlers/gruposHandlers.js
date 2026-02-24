import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PATHS } from '../config/paths.js'

export function registerGruposHandlers() {
  // Remover handlers antigos se existirem (para evitar conflitos)
  try {
    ipcMain.removeHandler('adicionar-nomes-grupos')
    ipcMain.removeHandler('carregar-nomes-grupos')
    ipcMain.removeHandler('atualizar-nome-grupo')
    ipcMain.removeHandler('excluir-nomes-grupos')
    ipcMain.removeHandler('criar-grupos')
  } catch (error) {
    // Ignorar erros ao remover (pode não existir)
  }

  const NOMES_GRUPOS_DIR = path.join(PATHS.BANCO_DIR, 'nomes-grupos')
  const GRUPOS_FILE = path.join(NOMES_GRUPOS_DIR, 'grupos.json')
  const NOMES_FILE_LEGADO = path.join(NOMES_GRUPOS_DIR, 'nomes.json')

  function ensureDir() {
    if (!fs.existsSync(NOMES_GRUPOS_DIR)) {
      fs.mkdirSync(NOMES_GRUPOS_DIR, { recursive: true })
    }
  }

  function migrateNomesToGrupos() {
    if (fs.existsSync(GRUPOS_FILE)) return
    if (!fs.existsSync(NOMES_FILE_LEGADO)) return
    try {
      const data = fs.readFileSync(NOMES_FILE_LEGADO, 'utf-8')
      const nomesLegado = JSON.parse(data)
      const nomesArray = Array.isArray(nomesLegado) ? nomesLegado : []
      const now = new Date().toISOString()
      const grupoGeral = {
        id: 'geral-' + Date.now(),
        nome: 'Geral',
        nomes: nomesArray.map(n => ({
          id: n.id || Math.random().toString(36).substring(7) + Date.now().toString(36),
          nome: typeof n === 'string' ? n : n.nome,
          createdAt: n.createdAt || now,
          updatedAt: n.updatedAt
        })).filter(n => n.nome && n.nome.trim()),
        createdAt: now,
        updatedAt: now
      }
      ensureDir()
      fs.writeFileSync(GRUPOS_FILE, JSON.stringify([grupoGeral], null, 2), 'utf-8')
      console.log('[gruposHandlers] Migração: nomes.json -> grupos.json (grupo Geral)')
    } catch (err) {
      console.warn('[gruposHandlers] Erro na migração nomes -> grupos:', err.message)
    }
  }

  function readGrupos() {
    ensureDir()
    migrateNomesToGrupos()
    if (!fs.existsSync(GRUPOS_FILE)) return []
    try {
      const data = fs.readFileSync(GRUPOS_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.warn('[gruposHandlers] Erro ao ler grupos.json:', err.message)
      return []
    }
  }

  function writeGrupos(grupos) {
    ensureDir()
    fs.writeFileSync(GRUPOS_FILE, JSON.stringify(grupos, null, 2), 'utf-8')
  }

  function findGrupoGeral(grupos) {
    return grupos.find(g => g.nome === 'Geral') || grupos[0]
  }

  // --- Novos handlers: grupos de nomes ---
  ipcMain.handle('listar-grupos-nomes', async () => {
    try {
      const grupos = readGrupos()
      return grupos.map(g => ({
        id: g.id,
        nome: g.nome,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        totalNomes: (g.nomes && g.nomes.length) || 0
      }))
    } catch (error) {
      console.error('[gruposHandlers] listar-grupos-nomes:', error)
      return []
    }
  })

  ipcMain.handle('criar-grupo-nomes', async (event, nome) => {
    try {
      const grupos = readGrupos()
      const nomeTrim = (nome || '').trim()
      if (!nomeTrim) return { success: false, error: 'Nome do grupo é obrigatório' }
      if (grupos.some(g => g.nome.toLowerCase() === nomeTrim.toLowerCase())) {
        return { success: false, error: 'Já existe um grupo com este nome' }
      }
      const now = new Date().toISOString()
      const novo = {
        id: 'grupo-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
        nome: nomeTrim,
        nomes: [],
        createdAt: now,
        updatedAt: now
      }
      grupos.push(novo)
      writeGrupos(grupos)
      return { success: true, grupo: { id: novo.id, nome: novo.nome, createdAt: novo.createdAt, updatedAt: novo.updatedAt, totalNomes: 0 } }
    } catch (error) {
      console.error('[gruposHandlers] criar-grupo-nomes:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('atualizar-grupo-nomes', async (event, grupoId, novoNome) => {
    try {
      const grupos = readGrupos()
      const nomeTrim = (novoNome || '').trim()
      if (!nomeTrim) return { success: false, error: 'Nome do grupo é obrigatório' }
      const idx = grupos.findIndex(g => g.id === grupoId)
      if (idx === -1) return { success: false, error: 'Grupo não encontrado' }
      if (grupos.some(g => g.id !== grupoId && g.nome.toLowerCase() === nomeTrim.toLowerCase())) {
        return { success: false, error: 'Já existe um grupo com este nome' }
      }
      grupos[idx].nome = nomeTrim
      grupos[idx].updatedAt = new Date().toISOString()
      writeGrupos(grupos)
      return { success: true, grupo: { id: grupos[idx].id, nome: grupos[idx].nome, updatedAt: grupos[idx].updatedAt } }
    } catch (error) {
      console.error('[gruposHandlers] atualizar-grupo-nomes:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('excluir-grupo-nomes', async (event, grupoId) => {
    try {
      const grupos = readGrupos().filter(g => g.id !== grupoId)
      writeGrupos(grupos)
      return { success: true }
    } catch (error) {
      console.error('[gruposHandlers] excluir-grupo-nomes:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('carregar-nomes-do-grupo', async (event, grupoId) => {
    try {
      const grupos = readGrupos()
      const g = grupos.find(gr => gr.id === grupoId)
      if (!g) return []
      return (g.nomes || []).map(n => ({ id: n.id, nome: n.nome, createdAt: n.createdAt, updatedAt: n.updatedAt }))
    } catch (error) {
      console.error('[gruposHandlers] carregar-nomes-do-grupo:', error)
      return []
    }
  })

  ipcMain.handle('adicionar-nomes-ao-grupo', async (event, grupoId, nomes) => {
    try {
      const grupos = readGrupos()
      const g = grupos.find(gr => gr.id === grupoId)
      if (!g) return { success: false, error: 'Grupo não encontrado' }
      const existentes = new Set((g.nomes || []).map(n => n.nome.toLowerCase()))
      const novos = (nomes || [])
        .map(n => (typeof n === 'string' ? n : n.nome || '').trim())
        .filter(n => n.length > 0 && !existentes.has(n.toLowerCase()))
        .map(nome => {
          existentes.add(nome.toLowerCase())
          return {
            id: Math.random().toString(36).substring(7) + Date.now().toString(36),
            nome,
            createdAt: new Date().toISOString(),
            updatedAt: null
          }
        })
      g.nomes = g.nomes || []
      g.nomes.push(...novos)
      g.updatedAt = new Date().toISOString()
      writeGrupos(grupos)
      return { success: true, adicionados: novos.length }
    } catch (error) {
      console.error('[gruposHandlers] adicionar-nomes-ao-grupo:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('atualizar-nome-no-grupo', async (event, grupoId, nomeId, novoNome) => {
    try {
      const grupos = readGrupos()
      const g = grupos.find(gr => gr.id === grupoId)
      if (!g) return { success: false, error: 'Grupo não encontrado' }
      const nomes = g.nomes || []
      const idx = nomes.findIndex(n => n.id === nomeId)
      if (idx === -1) return { success: false, error: 'Nome não encontrado' }
      const nomeTrim = (novoNome || '').trim()
      if (!nomeTrim) return { success: false, error: 'Nome não pode ser vazio' }
      if (nomes.some(n => n.id !== nomeId && n.nome.toLowerCase() === nomeTrim.toLowerCase())) {
        return { success: false, error: 'Este nome já existe no grupo' }
      }
      nomes[idx].nome = nomeTrim
      nomes[idx].updatedAt = new Date().toISOString()
      g.updatedAt = nomes[idx].updatedAt
      writeGrupos(grupos)
      return { success: true, nome: nomes[idx] }
    } catch (error) {
      console.error('[gruposHandlers] atualizar-nome-no-grupo:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('excluir-nomes-do-grupo', async (event, grupoId, nomeIds) => {
    try {
      const grupos = readGrupos()
      const g = grupos.find(gr => gr.id === grupoId)
      if (!g) return { success: false, error: 'Grupo não encontrado' }
      const idsSet = new Set(nomeIds || [])
      const antes = (g.nomes || []).length
      g.nomes = (g.nomes || []).filter(n => !idsSet.has(n.id))
      g.updatedAt = new Date().toISOString()
      writeGrupos(grupos)
      return { success: true, excluidos: antes - g.nomes.length }
    } catch (error) {
      console.error('[gruposHandlers] excluir-nomes-do-grupo:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para adicionar nomes individuais de grupos (compatibilidade: opera no grupo Geral)
  ipcMain.handle('adicionar-nomes-grupos', async (event, nomes) => {
    try {
      const grupos = readGrupos()
      let geral = grupos.find(g => g.nome === 'Geral')
      if (!geral) {
        geral = { id: 'geral-' + Date.now(), nome: 'Geral', nomes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        grupos.push(geral)
      }
      const existentes = new Set((geral.nomes || []).map(n => n.nome.toLowerCase()))
      const novos = (nomes || []).map(nome => (typeof nome === 'string' ? nome : nome.nome || '').trim()).filter(nome => nome.length > 0 && !existentes.has(nome.toLowerCase())).map(nome => {
        existentes.add(nome.toLowerCase())
        return { id: Math.random().toString(36).substring(7) + Date.now().toString(36), nome, createdAt: new Date().toISOString(), updatedAt: null }
      })
      geral.nomes = geral.nomes || []
      geral.nomes.push(...novos)
      geral.updatedAt = new Date().toISOString()
      writeGrupos(grupos)
      console.log(`✅ ${novos.length} nome(s) adicionado(s) ao grupo Geral`)
      return { success: true, adicionados: novos.length }
    } catch (error) {
      console.error('Erro ao adicionar nomes de grupos:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar todos os nomes de grupos (compatibilidade: retorna nomes do grupo Geral)
  ipcMain.handle('carregar-nomes-grupos', async () => {
    try {
      const grupos = readGrupos()
      const geral = findGrupoGeral(grupos)
      const nomes = (geral && geral.nomes) ? geral.nomes.map(n => ({ id: n.id, nome: n.nome, createdAt: n.createdAt, updatedAt: n.updatedAt })) : []
      console.log(`✅ Carregados ${nomes.length} nomes do grupo Geral`)
      return nomes
    } catch (error) {
      console.error('Erro ao carregar nomes de grupos:', error)
      return []
    }
  })

  // Handler IPC para atualizar um nome individual (compatibilidade: busca nomeId em qualquer grupo, tipicamente Geral)
  ipcMain.handle('atualizar-nome-grupo', async (event, nomeId, novoNome) => {
    try {
      const grupos = readGrupos()
      for (const g of grupos) {
        const nomes = g.nomes || []
        const idx = nomes.findIndex(n => n.id === nomeId)
        if (idx !== -1) {
          const nomeTrim = (novoNome || '').trim()
          if (!nomeTrim) return { success: false, error: 'Nome não pode ser vazio' }
          if (nomes.some(n => n.id !== nomeId && n.nome.toLowerCase() === nomeTrim.toLowerCase())) {
            return { success: false, error: 'Este nome já existe' }
          }
          nomes[idx].nome = nomeTrim
          nomes[idx].updatedAt = new Date().toISOString()
          g.updatedAt = nomes[idx].updatedAt
          writeGrupos(grupos)
          return { success: true, nome: nomes[idx] }
        }
      }
      return { success: false, error: 'Nome não encontrado' }
    } catch (error) {
      console.error('Erro ao atualizar nome de grupo:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para excluir nomes individuais (compatibilidade: remove nomeIds de todos os grupos)
  ipcMain.handle('excluir-nomes-grupos', async (event, nomeIds) => {
    try {
      const grupos = readGrupos()
      const idsSet = new Set(nomeIds || [])
      let totalExcluidos = 0
      for (const g of grupos) {
        const antes = (g.nomes || []).length
        g.nomes = (g.nomes || []).filter(n => !idsSet.has(n.id))
        totalExcluidos += antes - g.nomes.length
        if (antes !== g.nomes.length) g.updatedAt = new Date().toISOString()
      }
      writeGrupos(grupos)
      console.log(`✅ ${totalExcluidos} nome(s) excluído(s)`)
      return { success: true, excluidos: totalExcluidos }
    } catch (error) {
      console.error('Erro ao excluir nomes de grupos:', error)
      return { success: false, error: error.message }
    }
  })

  // REMOVIDO: Handlers antigos do sistema de nichos (sistema foi removido)
  // Estes handlers foram removidos porque o sistema de nichos foi descontinuado
  // e estavam causando conflito com o novo sistema de nomes individuais

  // Handler IPC para criar grupos (com suporte a múltiplas sessões paralelas)
  console.log('[gruposHandlers] 📝 Registrando handler criar-grupos...')
  ipcMain.handle('criar-grupos', async (event, payload) => {
    console.log('[gruposHandlers] ✅ Handler criar-grupos chamado!')
    const logs = []
    const processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Função para adicionar log com timestamp
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
      // Também logar no console original
      if (level === 'ERROR') {
        console.error(message, data || '')
      } else {
        console.log(message, data || '')
      }
    }

    // Função para enviar progresso via IPC
    const sendProgress = (progress) => {
      try {
        event.sender.send('automacao-progresso', {
          processId,
          ...progress
        })
      } catch (error) {
        console.warn('[criar-grupos] Erro ao enviar progresso:', error.message)
      }
    }
    
    try {
      // IMPORTANTE: A validação de grupo base será feita DENTRO de createGroups.
      // As sessões usadas para criar bots (se criarBots estiver ativo) também participam da criação de grupos.
      
      // Validar accountIds ANTES de processar
      console.log('[Handler] 🔍 DEBUG - Payload recebido no handler:', {
        groupCount: payload.groupCount,
        accountIds: payload.accountIds,
        accountIdsType: typeof payload.accountIds,
        accountIdsIsArray: Array.isArray(payload.accountIds),
        accountIdsLength: Array.isArray(payload.accountIds) ? payload.accountIds.length : (payload.accountIds ? 'N/A (não é array)' : 'undefined'),
        accountIdsContent: payload.accountIds,
        bots: payload.bots,
        botsLength: Array.isArray(payload.bots) ? payload.bots.length : 0,
        criarBots: payload.criarBots,
        sessoesParalelas: payload.sessoesParalelas,
        payloadKeys: Object.keys(payload),
      })
      
      // Validação rigorosa
      if (!payload.accountIds) {
        const errorMsg = 'Nenhuma conta selecionada. accountIds não foi fornecido no payload.'
        console.error('[Handler] ❌ Erro:', errorMsg)
        console.error('[Handler] Payload completo:', JSON.stringify(payload, null, 2))
        addLog('ERROR', '[Criar Grupos Handler] Erro de validação', { error: errorMsg, payload: payload })
        throw new Error(errorMsg)
      }
      
      if (!Array.isArray(payload.accountIds)) {
        const errorMsg = `accountIds deve ser um array, mas recebeu: ${typeof payload.accountIds}`
        console.error('[Handler] ❌ Erro:', errorMsg)
        addLog('ERROR', '[Criar Grupos Handler] Erro de validação', { error: errorMsg, payload: payload })
        throw new Error(errorMsg)
      }
      
      if (payload.accountIds.length === 0) {
        const errorMsg = 'Nenhuma conta selecionada. O array de contas está vazio.'
        console.error('[Handler] ❌ Erro:', errorMsg)
        addLog('ERROR', '[Criar Grupos Handler] Erro de validação', { error: errorMsg, payload: payload })
        throw new Error(errorMsg)
      }

      // Obter número de sessões paralelas (padrão: 1)
      const sessoesParalelas = payload.sessoesParalelas || 1
      const maxSessoes = Math.min(sessoesParalelas, payload.accountIds.length)
      
      console.log('[Handler] ✅ Validação passada. accountIds válido:', {
        length: payload.accountIds.length,
        content: payload.accountIds,
        sessoesParalelas: maxSessoes
      })
      
      addLog('INFO', '[Criar Grupos Handler] Handler chamado', { 
        quantidadeGrupos: payload.groupCount,
        contas: payload.accountIds.length,
        bots: payload.bots?.length || 0,
        sessoesParalelas: maxSessoes
      })
      
      // Importar o módulo do backend (CommonJS) usando createRequire
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      
      // Importar funções de criar grupos
      const criadorPath = path.join(PATHS.BASE, 'back', 'criador', 'criador.js')
      const criadorModule = require(criadorPath)
      const { createGroups, createGroupsInAccount } = criadorModule
      
      // Importar WorkerPool com verificação defensiva
      let WorkerPool
      try {
        const workerPoolPath = path.join(PATHS.BASE, 'back', 'utils', 'workerPool.js')
        const workerPoolModule = require(workerPoolPath)
        
        // Verificação defensiva: garantir que WorkerPool existe
        if (!workerPoolModule || typeof workerPoolModule.WorkerPool !== 'function') {
          throw new Error('WorkerPool não é uma função válida')
        }
        
        WorkerPool = workerPoolModule.WorkerPool
      } catch (error) {
        console.warn('[criar-grupos] WorkerPool não encontrado, usando processamento sequencial:', error.message)
        WorkerPool = null
      }
      
      // Verificação adicional antes de usar
      if (WorkerPool === null || WorkerPool === undefined || typeof WorkerPool !== 'function') {
        console.error('[criar-grupos] ERRO: WorkerPool não está disponível')
        throw new Error('WorkerPool não está disponível. Não é possível processar em paralelo.')
      }
      
      addLog('INFO', '[Criar Grupos] Iniciando criação de grupos com processamento paralelo')
      
      // Preparar customPaths baseado na operação atual
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }
      
      addLog('INFO', '[Criar Grupos] Usando paths', customPaths)
      
      // Declarar variáveis para processar resultado
      let successCount = 0
      let errorCount = 0
      const errorsList = []
      const details = []
      
      // Criar função worker que será executada pela fila global
      const executeCreateGroups = async () => {
      // Sempre usar createGroups que gerencia toda a lógica (cria bots e grupos, carrega bots da categoria)
      // createGroups já tem lógica para carregar bots da categoria quando não há bots configurados
      console.log(`[criar-grupos] Usando createGroups (gerencia criação de bots, carregamento de bots da categoria e grupos)`)
      
        // Preparar payload completo para createGroups
        const createGroupsPayload = {
          ...payload,
          accountIds: payload.accountIds,
          groupCount: payload.groupCount,
          bots: payload.bots || [],
          criarBots: payload.criarBots || false,
          quantidadeBots: payload.quantidadeBots,
          botsDisparo: payload.botsDisparo || [],
          categoriaId: payload.categoriaId,
          grupoNomesId: payload.grupoNomesId || null,
          usarNomeSistema: payload.usarNomeSistema ?? true,
          nomeEspecifico: payload.nomeEspecifico || null,
          usarFotos: payload.usarFotos || false,
          descricaoGrupo: payload.descricaoGrupo || null,
          tipoGrupo: payload.tipoGrupo || 'privado',
          botsExtras: payload.botsExtras || [],
          memberProvider: payload.memberProvider || null,
          serviceId: payload.serviceId || null,
          memberQuantity: payload.memberQuantity || null,
          sessoesParalelas: maxSessoes, // Passar sessoesParalelas para createGroups usar WorkerPool
          proxyId: payload.proxyId || null, // Proxy específico (opcional)
        }
        
        return await createGroups(createGroupsPayload, customPaths)
      }
      
      try {
        // Importar fila global
        const { globalTaskQueue } = await import('../utils/globalTaskQueue.js')
        
        // Adicionar à fila global de tarefas críticas
        const result = await new Promise((resolve, reject) => {
          globalTaskQueue.enqueue({
            type: 'criar-grupos',
            processId,
            workerFunction: executeCreateGroups,
            sendProgress,
            maxWorkers: maxSessoes,
            taskData: {
              accountIds: payload.accountIds,
              groupCount: payload.groupCount,
              categoriaId: payload.categoriaId || null // Incluir categoriaId para rastreamento
            },
            onComplete: (result) => resolve(result),
            onError: reject
          })
          
          addLog('INFO', '[Criar Grupos] Operação adicionada à fila global de tarefas críticas')
          console.log(`[criar-grupos] 📊 Estatísticas da fila global:`, globalTaskQueue.getStats())
        })
        
        // Processar resultado
        // createGroups retorna: { success: number, errors: number, details: array, errorsList: array }
        if (result) {
          // success é o número de contas com sucesso
          if (typeof result.success === 'number') {
            successCount = result.success
          }
          
          // errors é o número de erros
          if (typeof result.errors === 'number') {
            errorCount = result.errors
          }
          
          // details contém os grupos criados por conta
          if (result.details && Array.isArray(result.details)) {
            details.push(...result.details)
            // Se successCount ainda for 0 mas temos details, contar os sucessos
            if (successCount === 0 && details.length > 0) {
              successCount = details.filter(d => d.success !== false).length
          }
        }
        
          // errorsList contém os erros detalhados
          if (result.errorsList && Array.isArray(result.errorsList)) {
          errorsList.push(...result.errorsList)
            // Se errorCount ainda for 0 mas temos errorsList, usar o tamanho
            if (errorCount === 0 && errorsList.length > 0) {
              errorCount = errorsList.length
            }
          }
        }
        
        addLog('INFO', '[Criar Grupos] Processamento concluído via createGroups', { 
          sucessos: successCount, 
          erros: errorCount,
          detailsCount: details.length,
          errorsListCount: errorsList.length
        })
        
        // Incrementar contador de grupos criados no banco de dados e atualizar grupos online
        try {
          const totalGruposCriados = details.reduce((sum, detail) => {
            if (detail.createdGroups && Array.isArray(detail.createdGroups)) {
              return sum + detail.createdGroups.length
            }
            return sum
          }, 0)
          
          if (totalGruposCriados > 0) {
            const databasePath = path.join(PATHS.BASE, 'back', 'utils', 'database.js')
            const databaseModule = require(databasePath)
            const customPaths = {
              rootDir: PATHS.BASE,
              bancoDir: PATHS.BANCO_DIR,
            }
            
            // Incrementar grupos criados
            databaseModule.incrementGruposCriados(totalGruposCriados, customPaths)
            
            // Atualizar grupos online (assumir que grupos criados estão online)
            // Obter grupos online atuais
            const todayStats = databaseModule.getTodayStats(customPaths)
            const gruposOnlineAtuais = todayStats.gruposOnline || 0
            const novosGruposOnline = gruposOnlineAtuais + totalGruposCriados
            
            // Salvar estatísticas atualizadas
            databaseModule.saveGruposStats(novosGruposOnline, totalGruposCriados, 0, customPaths)
            console.log(`[criar-grupos] ✅ ${totalGruposCriados} grupo(s) registrado(s) no banco de dados. Grupos online: ${novosGruposOnline}`)
          }
        } catch (dbError) {
          console.warn('[criar-grupos] Erro ao registrar grupos no banco de dados:', dbError.message)
        }
        
        return {
          success: successCount > 0,
          successCount,
          errorCount,
          details,
          errorsList,
          logs,
          processId
        }
      } catch (error) {
        addLog('ERROR', '[Criar Grupos] Erro ao criar grupos via createGroups', { error: error.message })
        errorCount = payload.accountIds?.length || 0
        errorsList.push({ error: error.message })
        
        // Retornar erro formatado em vez de lançar
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          successCount: 0,
          errorCount: errorCount,
          details: [],
          errorsList: errorsList,
          logs: logs.length > 0 ? logs : undefined,
          processId
        }
      }
    } catch (error) {
      addLog('ERROR', '[Criar Grupos] Erro fatal', error.message)
      if (error.stack) {
        addLog('ERROR', '[Criar Grupos] Stack trace', error.stack.split('\n').slice(0, 10).join('\n'))
      }
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        successCount: 0,
        errorCount: payload.accountIds?.length || 0,
        details: [],
        errorsList: [{ error: error.message || 'Erro desconhecido' }],
        logs: logs.length > 0 ? logs : undefined,
        processId
      }
    }
  })

  // Handler IPC para encher grupos sem membros
  ipcMain.handle('encher-grupos', async (event, payload) => {
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
        console.error(message, data || '')
      } else {
        console.log(message, data || '')
      }
    }
    
    // Wrapper para garantir que sempre retorna um objeto válido
    try {
      addLog('INFO', '[Encher Grupos Handler] Handler chamado', payload)
      
      const { accountIds } = payload

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada')
      }

      // Importar módulo do criador usando a mesma abordagem do handler de criar grupos
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const criadorPath = path.join(PATHS.BASE, 'back', 'criador', 'criador.js')
      const criadorModule = require(criadorPath)
      
      if (!criadorModule || typeof criadorModule.encherGruposSemMembros !== 'function') {
        throw new Error('Função encherGruposSemMembros não encontrada no módulo criador')
      }
      
      const { encherGruposSemMembros } = criadorModule

      addLog('INFO', '[Encher Grupos] Iniciando processo de encher grupos')

      // Preparar customPaths baseado na operação atual (igual ao criar grupos)
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'), // Pasta principal para APIs compartilhados
      }

      addLog('INFO', '[Encher Grupos] Usando paths', customPaths)

      const { painelSMM, codigoServico, quantidadeMembros } = payload

      if (!painelSMM || painelSMM === 'Nenhum') {
        throw new Error('Painel SMM não selecionado')
      }

      if (!codigoServico || !codigoServico.trim()) {
        throw new Error('Código do serviço não informado')
      }

      if (!quantidadeMembros || quantidadeMembros <= 0) {
        throw new Error('Quantidade de membros inválida')
      }

      addLog('INFO', '[Encher Grupos] Iniciando processo...', { 
        contas: accountIds.length,
        painelSMM,
        codigoServico,
        quantidadeMembros,
      })
      
      // Função para enviar progresso via IPC
      const sendProgress = (progressData) => {
        try {
          event.sender.send('encher-grupos-progresso', progressData)
        } catch (error) {
          console.warn('[Encher Grupos] Erro ao enviar progresso:', error.message)
        }
      }

      // Criar callback para monitoramento individual de grupos (para notificar quando sessão completa)
      const criarCallbackProgresso = (sessionId) => {
        return (progressData) => {
          // Enviar progresso quando um pedido individual atualizar
          if (progressData.sessaoCompleta) {
            // Sessão completa - notificar
            sendProgress({
              sessionId: progressData.sessionId || sessionId,
              sessaoCompleta: true,
              todosCompletos: true,
              totalPedidos: progressData.stats?.totalPedidos || progressData.totalPedidos || 0,
              pedidosCompletos: progressData.stats?.pedidosCompletos || progressData.pedidosCompletos || 0,
              mediaMembros: progressData.stats?.mediaMembros || progressData.mediaMembros || 0,
              finalizado: true,
            })
          } else if (progressData.stats) {
            // Atualização parcial da sessão
            sendProgress({
              sessionId: progressData.sessionId || sessionId,
              totalPedidos: progressData.stats.totalPedidos || 0,
              pedidosCompletos: progressData.stats.pedidosCompletos || 0,
              pedidosEmAndamento: progressData.stats.pedidosEmAndamento || 0,
              mediaMembros: progressData.stats.mediaMembros || 0,
              sessaoCompleta: false,
            })
          }
        }
      }

      // Armazenar sessionId para rastreamento
      let currentSessionId = null
      let progressCallback = null

      // Iniciar verificação periódica do progresso em background
      let progressCheckInterval = null
      
      // Função para verificar progresso dos grupos da sessão
      const verificarProgressoGrupos = async () => {
        try {
          // Se não temos sessionId ainda, tentar obter do resultado
          if (!currentSessionId && result && result.sessionId) {
            currentSessionId = result.sessionId
            addLog('INFO', `[Encher Grupos] SessionId obtido: ${currentSessionId}`)
          }
          
          // Se temos sessionId, verificar progresso da sessão
          if (currentSessionId) {
            const obterEstatisticasSessao = criadorModule.obterEstatisticasSessao
            const verificarSessaoCompleta = criadorModule.verificarSessaoCompleta
            
            if (typeof obterEstatisticasSessao === 'function' && typeof verificarSessaoCompleta === 'function') {
              const statsSessao = obterEstatisticasSessao(currentSessionId)
              const sessaoCompleta = verificarSessaoCompleta(currentSessionId)
              
              if (statsSessao) {
                sendProgress({
                  sessionId: currentSessionId,
                  totalPedidos: statsSessao.totalPedidos,
                  pedidosCompletos: statsSessao.pedidosCompletos,
                  pedidosEmAndamento: statsSessao.pedidosEmAndamento,
                  mediaMembros: statsSessao.mediaMembros,
                  sessaoCompleta: sessaoCompleta,
                  todosCompletos: sessaoCompleta,
                })
                
                // Se a sessão completa, parar verificação e enviar evento final
                if (sessaoCompleta) {
                  if (progressCheckInterval) {
                    clearInterval(progressCheckInterval)
                    progressCheckInterval = null
                  }
                  
                  sendProgress({
                    sessionId: currentSessionId,
                    sessaoCompleta: true,
                    todosCompletos: true,
                    totalPedidos: statsSessao.totalPedidos,
                    pedidosCompletos: statsSessao.pedidosCompletos,
                    mediaMembros: statsSessao.mediaMembros,
                    finalizado: true,
                  })
                  
                  addLog('INFO', `[Encher Grupos] 🎉 SESSÃO ${currentSessionId} COMPLETA! Todos os ${statsSessao.totalPedidos} pedidos foram finalizados!`, statsSessao)
                }
              }
            }
          } else {
            // Fallback: usar sistema antigo se não houver sessionId
            const obterEstatisticasMonitoramento = criadorModule.obterEstatisticasMonitoramento
            const verificarTodosGruposCompletos = criadorModule.verificarTodosGruposCompletos
            
            if (typeof obterEstatisticasMonitoramento === 'function' && typeof verificarTodosGruposCompletos === 'function') {
              const stats = obterEstatisticasMonitoramento()
              const todosCompletos = verificarTodosGruposCompletos()
              
              if (stats && stats.total > 0) {
                sendProgress({
                  total: stats.total,
                  completos: stats.completos,
                  emAndamento: stats.emAndamento,
                  mediaMembros: stats.mediaMembros,
                  todosCompletos: todosCompletos,
                })
                
                if (todosCompletos) {
                  if (progressCheckInterval) {
                    clearInterval(progressCheckInterval)
                    progressCheckInterval = null
                  }
                  
                  sendProgress({
                    todosCompletos: true,
                    total: stats.total,
                    completos: stats.completos,
                    mediaMembros: stats.mediaMembros,
                    finalizado: true,
                  })
                  
                  addLog('INFO', '[Encher Grupos] ✅ Todos os grupos completaram!', stats)
                }
              }
            }
          }
        } catch (error) {
          console.warn('[Encher Grupos] Erro ao verificar progresso:', error.message)
        }
      }
      
      // Iniciar verificação periódica (a cada 5 minutos)
      progressCheckInterval = setInterval(verificarProgressoGrupos, 300000) // 5 minutos = 300000 ms
      
      // Verificar após um delay inicial (para dar tempo dos grupos serem registrados)
      setTimeout(() => {
        verificarProgressoGrupos()
      }, 60000) // 1 minuto inicial, depois a cada 5 minutos
      
      const result = await encherGruposSemMembros(accountIds, {
        ...customPaths,
        memberProvider: painelSMM,
        serviceId: codigoServico,
        memberQuantity: quantidadeMembros,
      })

      addLog('INFO', '[Encher Grupos] Processamento concluído', result)
      
      // Obter sessionId do resultado para rastreamento
      if (result && result.sessionId) {
        currentSessionId = result.sessionId
        progressCallback = criarCallbackProgresso(currentSessionId)
        addLog('INFO', `[Encher Grupos] SessionId: ${currentSessionId}, Total de pedidos criados: ${result.gruposEnchidos || 0}`)
        
        // Atualizar sessão com callback (via módulo do criador se possível)
        // Nota: Os callbacks são definidos individualmente em cada monitorarProgressoGrupo
        // então precisamos atualizar via verificação periódica
      }
      
      // Continuar verificando progresso mesmo após retornar resultado inicial
      // O intervalo continuará rodando até todos os grupos da sessão completarem

      // Verificar se result existe e é um objeto válido
      if (!result || typeof result !== 'object') {
        throw new Error('Resultado inválido retornado pela função encherGruposSemMembros')
      }

      return {
        success: result.success || false,
        gruposEnchidos: result.gruposEnchidos || 0,
        gruposProcessados: result.gruposProcessados || 0,
        errors: result.errors || [],
        logs,
      }
    } catch (error) {
      addLog('ERROR', '[Encher Grupos] Erro fatal', error.message)
      addLog('ERROR', '[Encher Grupos] Stack trace', error.stack)
      
      // Garantir que sempre retorna um objeto válido
      const errorResponse = {
        success: false,
        error: error.message || 'Erro desconhecido',
        gruposEnchidos: 0,
        gruposProcessados: 0,
        errors: [],
        logs,
      }
      
      console.log('[Encher Grupos Handler] Retornando erro:', JSON.stringify(errorResponse, null, 2))
      return errorResponse
    }
  })

  // Handler IPC para escanear bots nos grupos
  ipcMain.handle('trocar-bots-escanear', async (event, accountIds) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const { scanGroupsForBots } = require(path.join(PATHS.BASE, 'back', 'trocar bots', 'trocarBot.js'))

      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      const result = await scanGroupsForBots(accountIds, customPaths)

      return {
        success: true,
        ...result,
      }
    } catch (error) {
      console.error('[Trocar Bots] Erro ao escanear:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  // Handler IPC para executar troca de bot
  ipcMain.handle('trocar-bots-executar', async (event, payload) => {
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
        console.error(message, data || '')
      } else {
        console.log(message, data || '')
      }
    }

    try {
      addLog('INFO', '[Gerenciar Bots Handler] Handler chamado', payload)
      
      const { accountIds, type, botsToRemove, botsToAdd, proxyId = null, maxSessoes = 3 } = payload

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada')
      }

      if (type !== 'adicionar-novo' && type !== 'trocar-antigo') {
        throw new Error(`Tipo de operação inválido: ${type}`)
      }

      // Validar baseado no tipo de operação
      if (type === 'adicionar-novo') {
        if (!botsToAdd || botsToAdd.length === 0) {
          throw new Error('É necessário pelo menos um bot para adicionar')
        }
        if (botsToAdd.length > 1) {
          throw new Error('Adicionar Bot Novo aceita apenas um bot por vez')
        }
      } else if (type === 'trocar-antigo') {
        if (!botsToRemove || botsToRemove.length === 0) {
          throw new Error('É necessário pelo menos um bot para remover')
        }
        if (!botsToAdd || botsToAdd.length === 0) {
          throw new Error('É necessário pelo menos um bot para adicionar')
        }
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const { adicionarBotNovo, trocarBotAntigo, limparBanidosTodasContas } = require(path.join(PATHS.BASE, 'back', 'trocar bots', 'trocarBot.js'))

      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      addLog('INFO', '[Gerenciar Bots] Iniciando operação...', {
        type,
        botsToRemove: botsToRemove || [],
        botsToAdd: botsToAdd || [],
        contas: accountIds.length,
        maxSessoes,
      })

      let result
      if (type === 'adicionar-novo') {
        result = await adicionarBotNovo(
          {
            accountIds,
            botNovo: botsToAdd[0].replace(/^@/, ''),
            proxyId,
            maxSessoes,
          },
          customPaths
        )
      } else {
        result = await trocarBotAntigo(
          {
            accountIds,
            botsToRemove: botsToRemove.map(b => b.replace(/^@/, '')),
            botsToAdd: botsToAdd.map(b => b.replace(/^@/, '')),
            proxyId,
            maxSessoes,
          },
          customPaths
        )
      }

      addLog('INFO', '[Gerenciar Bots] Processamento concluído', result)

      return {
        success: result.success > 0,
        successCount: result.success,
        errorCount: result.errors,
        botsRemovidos: result.botsRemovidos || 0,
        botsAdicionados: result.botsAdicionados || 0,
        details: result.details || [],
        errorsList: result.errorsList || [],
        logs,
      }
    } catch (error) {
      addLog('ERROR', '[Gerenciar Bots] Erro fatal', error.message)
      if (error.stack) {
        addLog('ERROR', '[Gerenciar Bots] Stack trace', error.stack.split('\n').slice(0, 10).join('\n'))
      }

      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        logs,
      }
    }
  })

  // Handler IPC para limpar usuários banidos de múltiplas contas
  ipcMain.handle('limpar-bots-banidos', async (event, payload) => {
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
        console.error(message, data || '')
      } else {
        console.log(message, data || '')
      }
    }

    try {
      addLog('INFO', '[Limpar Banidos Handler] Handler chamado', payload)
      
      const { accountIds, proxyId = null, maxSessoes = 3 } = payload || {}

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada')
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const { limparBanidosTodasContas } = require(path.join(PATHS.BASE, 'back', 'trocar bots', 'trocarBot.js'))

      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      addLog('INFO', '[Limpar Banidos] Iniciando operação...', {
        contas: accountIds.length,
        maxSessoes,
      })

      const result = await limparBanidosTodasContas(
        {
          accountIds,
          proxyId,
          maxSessoes,
        },
        customPaths
      )

      addLog('INFO', '[Limpar Banidos] Processamento concluído', result)

      return {
        success: result.success > 0,
        successCount: result.success,
        errorCount: result.errors,
        totalDesbanidos: result.totalDesbanidos || 0,
        totalGruposProcessados: result.totalGruposProcessados || 0,
        gruposComErro: result.gruposComErro || 0,
        details: result.details || [],
        errorsList: result.errorsList || [],
        logs,
      }
    } catch (error) {
      addLog('ERROR', '[Limpar Banidos] Erro fatal', error.message)
      if (error.stack) {
        addLog('ERROR', '[Limpar Banidos] Stack trace', error.stack.split('\n').slice(0, 10).join('\n'))
      }

      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        logs,
      }
    }
  })

  
  console.log('[gruposHandlers] ✅ Handler criar-grupos registrado com sucesso!')
  
  console.log('[gruposHandlers] ==========================================')
  console.log('[gruposHandlers] ✅ TODOS os handlers de grupos registrados!')
  console.log('[gruposHandlers] ==========================================')
}

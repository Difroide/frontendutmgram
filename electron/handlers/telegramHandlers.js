import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS, getOperacaoAtual } from '../config/paths.js'
import { validatePathInDirectory, validateTelegramNumber } from '../utils/pathValidator.js'
import { getMainWindow } from '../window/windowManager.js'
import { globalTaskQueue } from '../utils/globalTaskQueue.js'
import { baixarLinksMega } from '../utils/megaDownload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BACK_DIR = path.resolve(__dirname, '../../../back')
const require = createRequire(import.meta.url)

// Pasta temporária para download MEGA (dentro da operação); depois importamos para contas telegram e o usuário não vê isso
function getMegaTempDir() {
  const operacaoDir = path.dirname(PATHS.CONTAS_DIR)
  const tempDir = path.join(operacaoDir, 'temp-mega-download')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  return tempDir
}

// Sistema de fila específico para adicionar listas (usa WorkerPool interno)
// Integrado com a fila global de tarefas críticas
const globalAddListsQueue = {
  pool: null,
  isProcessing: false,
  pendingTasks: [],
  maxWorkers: 1,
  sendProgressCallbacks: new Map(), // Map<processId, sendProgress function>

  // Inicializar pool se necessário
  initializePool(maxWorkers) {
    if (!this.pool || this.maxWorkers !== maxWorkers) {
      try {
        const workerPoolModule = require(path.join(PATHS.BASE, 'back', 'utils', 'workerPool.js'))
        if (!workerPoolModule || typeof workerPoolModule.WorkerPool !== 'function') {
          throw new Error('WorkerPool não é uma função válida')
        }
        const { WorkerPool } = workerPoolModule
        this.pool = new WorkerPool(maxWorkers)
        this.maxWorkers = maxWorkers
        console.log(`[Fila Global] WorkerPool inicializado/reinicializado com ${maxWorkers} worker(s)`)
      } catch (error) {
        console.error('[Fila Global] Erro ao inicializar WorkerPool:', error.message)
        this.pool = null
        throw error
      }
    }
  },

  // Adicionar tarefas à fila
  enqueueTasks(tasks) {
    this.pendingTasks.push(...tasks)
    console.log(`[Fila Global] ${tasks.length} tarefa(s) adicionada(s) à fila. Total na fila: ${this.pendingTasks.length}`)
  },

  // Registrar callback de progresso
  registerProgressCallback(processId, sendProgress) {
    this.sendProgressCallbacks.set(processId, sendProgress)
  },

  // Processar fila
  async processQueue(workerFunction) {
    // Se já estiver processando, apenas adicionar tarefas à fila e retornar
    if (this.isProcessing) {
      console.log(`[Fila Global] Já está processando. Tarefas serão processadas quando a fila atual terminar.`)
      return
    }

    this.isProcessing = true

    try {
      // Adicionar todas as tarefas pendentes ao pool
      while (this.pendingTasks.length > 0) {
        const task = this.pendingTasks.shift()
        this.pool.enqueue(task)
      }

      console.log(`[Fila Global] Iniciando processamento de ${this.pool.queue.length} tarefa(s)`)

      // Processar fila
      await this.pool.processQueue(workerFunction, (progress) => {
        // Enviar progresso para todos os callbacks registrados
        this.sendProgressCallbacks.forEach((sendProgress, processId) => {
          try {
            sendProgress({
              ...progress,
              processId
            })
          } catch (error) {
            console.warn(`[Fila Global] Erro ao enviar progresso para ${processId}:`, error.message)
          }
        })
      })

      console.log(`[Fila Global] Processamento concluído`)
    } finally {
      this.isProcessing = false
      // Se houver mais tarefas pendentes, processar novamente
      if (this.pendingTasks.length > 0) {
        console.log(`[Fila Global] Há ${this.pendingTasks.length} tarefa(s) pendente(s), processando...`)
        // Processar em background (não bloquear)
        setImmediate(() => this.processQueue(workerFunction))
      }
    }
  },

  // Obter estatísticas
  getStats() {
    return {
      queueLength: this.pendingTasks.length + (this.pool ? this.pool.queue.length : 0),
      activeWorkers: this.pool ? this.pool.activeWorkers.size : 0,
      isProcessing: this.isProcessing,
      maxWorkers: this.maxWorkers
    }
  },

  // Limpar callback de progresso
  unregisterProgressCallback(processId) {
    this.sendProgressCallbacks.delete(processId)
  }
}

// Função auxiliar para carregar módulo do backend
function requireBackendModule(modulePath) {
  const fullPath = path.join(BACK_DIR, modulePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Módulo não encontrado: ${fullPath}`)
  }
  return require(fullPath)
}

// Função auxiliar para requerer módulos do backend (CommonJS)
function requireBackendCommonJS(modulePath) {
  return require(modulePath)
}

// Função auxiliar para salvar bots encontrados na verificação na aba de Bots de Mídia
async function salvarBotsEncontradosNaVerificacao(botsFatherBots, accountId, categoriaId = null) {
  if (!Array.isArray(botsFatherBots) || botsFatherBots.length === 0) {
    return { success: true, savedCount: 0 }
  }

  // Filtrar apenas bots com token válido
  const botsComToken = botsFatherBots.filter(bot => bot.token && typeof bot.token === 'string')

  if (botsComToken.length === 0) {
    console.log(`[salvarBotsEncontrados] Nenhum bot com token válido para salvar da conta ${accountId}`)
    return { success: true, savedCount: 0 }
  }

  console.log(`[salvarBotsEncontrados] 🤖 Salvando ${botsComToken.length} bot(s) encontrado(s) na conta ${accountId}`)

  let savedCount = 0
  const errors = []

  try {
    // Determinar categoria de destino
    const categoriaIdFinal = categoriaId || 'Bots Encontrados'
    const categoriasDir = path.join(PATHS.BANCO_DIR, 'categorias')
    const categoriaPath = path.join(categoriasDir, categoriaIdFinal)
    const botsFilePath = path.join(categoriaPath, 'bots.json')

    // Criar pasta da categoria se não existir
    if (!fs.existsSync(categoriaPath)) {
      fs.mkdirSync(categoriaPath, { recursive: true })
      // Criar metadata básica
      const metadataPath = path.join(categoriaPath, 'metadata.json')
      const metadata = {
        nome: categoriaIdFinal === 'Bots Encontrados' ? 'Bots Encontrados' : categoriaIdFinal,
        descricao: 'Bots encontrados automaticamente pela verificação de contas',
        createdAt: new Date().toISOString(),
        rodando: false,
      }
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
      console.log(`[salvarBotsEncontrados] ✅ Categoria "${categoriaIdFinal}" criada`)
    }

    // Ler bots existentes
    let botsCategoria = []
    if (fs.existsSync(botsFilePath)) {
      try {
        const content = fs.readFileSync(botsFilePath, 'utf-8')
        botsCategoria = JSON.parse(content)
        if (!Array.isArray(botsCategoria)) {
          botsCategoria = []
        }
      } catch (error) {
        console.warn(`[salvarBotsEncontrados] Erro ao ler bots existentes: ${error.message}`)
        botsCategoria = []
      }
    }

    // Adicionar cada bot
    for (const bot of botsComToken) {
      try {
        // Verificar se já existe (por token)
        const botExistente = botsCategoria.find(b => b.token === bot.token || b.bot_token === bot.token)

        if (!botExistente) {
          const novoBot = {
            nome: bot.name || bot.username || 'Bot sem nome',
            token: bot.token,
            username: bot.username || null,
            tipoBot: 'disparo',
            sessaoOrigem: accountId, // Registrar de qual conta veio
            createdAt: new Date().toISOString(),
          }

          botsCategoria.push(novoBot)
          savedCount++
          console.log(`[salvarBotsEncontrados] ✅ Bot "${novoBot.nome}" salvo (token: ${bot.token.substring(0, 15)}...)`)
        } else {
          console.log(`[salvarBotsEncontrados] ⚠️ Bot com token ${bot.token.substring(0, 15)}... já existe`)
        }
      } catch (botError) {
        errors.push({ bot: bot.name, error: botError.message })
      }
    }

    // Salvar arquivo de bots atualizado
    if (savedCount > 0) {
      fs.writeFileSync(botsFilePath, JSON.stringify(botsCategoria, null, 2), 'utf-8')
      console.log(`[salvarBotsEncontrados] 💾 ${savedCount} bot(s) salvo(s) na categoria "${categoriaIdFinal}"`)
    }

    return { success: true, savedCount, errors: errors.length > 0 ? errors : undefined }
  } catch (error) {
    console.error(`[salvarBotsEncontrados] ❌ Erro ao salvar bots:`, error.message)
    return { success: false, error: error.message, savedCount }
  }
}

export function registerTelegramHandlers() {
  console.log('📝 Registrando handlers do Telegram...')
  ipcMain.handle('get-telegram-contas', async () => {
    try {
      // OTIMIZADO: Uso de fs.promises e carregamento em paralelo
      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        console.log('❌ Pasta "contas telegram" não encontrada')
        return []
      }

      // Leitura assíncrona do diretório
      const dirents = await fs.promises.readdir(PATHS.CONTAS_DIR, { withFileTypes: true })

      const pastas = dirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      // Carregar tags do sistema manual (sessions_tags.json) UMA VEZ
      let tagsManual = {}
      try {
        const TAGS_FILE = path.join(PATHS.BASE, 'sessions_tags.json')
        if (fs.existsSync(TAGS_FILE)) {
          const tagsContent = await fs.promises.readFile(TAGS_FILE, 'utf-8')
          tagsManual = JSON.parse(tagsContent)
        }
      } catch (error) {
        console.warn('[telegramHandlers] Aviso: não foi possível carregar tags manuais:', error.message)
      }

      // Função auxiliar para normalizar path
      const normalizePath = (p) => {
        if (!p) return ''
        const normalized = path.normalize(p)
        return path.isAbsolute(normalized) ? normalized : path.resolve(normalized)
      }

      // Acumular estatísticas de bots para resumo
      let totalContasComBots = 0
      let totalBotsEncontrados = 0

      // Processar em lotes de 25 para evitar picos de memória e I/O
      const BATCH_SIZE = 25
      const processConta = async (numero) => {
        const pastaPath = path.join(PATHS.CONTAS_DIR, numero)
        const sessionFile = path.join(pastaPath, `${numero}.session`)
        const tdataPath = path.join(pastaPath, 'tdata')

        let hasSession = false
        try {
          await fs.promises.access(sessionFile)
          hasSession = true
        } catch (e) { }

        if (!hasSession) return null

        let hasTdata = false
        try {
          const stats = await fs.promises.stat(tdataPath)
          hasTdata = stats.isDirectory()
        } catch (e) { }

        // Dados da conta padrão
        const conta = {
          id: 0, // Será ajustado depois
          numero: numero,
          grupos: 0,
          tags: [],
          pastaPath: pastaPath,
          botsMidiaAdmin: [],
          gruposDetalhes: [],
          categoriaId: undefined,
          sessaoCompleta: hasTdata,
          ultimoUso: undefined,
          sessaoAlerta: false,
        }

        // Ler JSON da conta
        const jsonPath = path.join(pastaPath, `${numero}.json`)

        try {
          // Tentar ler JSON se existir
          const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8').catch(() => null)

          if (jsonContent) {
            const accountData = JSON.parse(jsonContent)

            conta.grupos = accountData.quantidade_grupos ?? (accountData.grupos?.length ?? 0)
            conta.sessaoAlerta = accountData.sessaoAlerta === true
            conta.tags = Array.isArray(accountData.tags) ? accountData.tags : []
            conta.categoriaId = accountData.categoriaId || undefined
            conta.ultimoUso = accountData.ultimoUso || undefined

            if (Array.isArray(accountData.grupos)) {
              const botsSet = new Set()

              accountData.grupos.forEach((grupo) => {
                if (Array.isArray(grupo.bots_midia_admin) && grupo.bots_midia_admin.length > 0) {
                  grupo.bots_midia_admin.forEach(bot => {
                    if (bot && typeof bot === 'string') {
                      const botNormalizado = bot.replace(/^@/, '').toLowerCase().trim()
                      if (botNormalizado) botsSet.add(botNormalizado)
                    }
                  })
                }
                if (grupo.bot_midia_admin && typeof grupo.bot_midia_admin === 'string') {
                  const botNormalizado = grupo.bot_midia_admin.replace(/^@/, '').toLowerCase().trim()
                  if (botNormalizado) botsSet.add(botNormalizado)
                }

                conta.gruposDetalhes.push({
                  nome: grupo.nome || 'Sem nome',
                  membros: grupo.membros || 0,
                  id: grupo.id,
                  link_convite: grupo.link_convite,
                  categoriaId: grupo.categoriaId || undefined,
                  listas_adicionadas: Array.isArray(grupo.listas_adicionadas) ? grupo.listas_adicionadas : [],
                  caido: grupo.caido === true,
                })
              })

              conta.botsMidiaAdmin = Array.from(botsSet)
              if (conta.botsMidiaAdmin.length > 0) {
                // Estatísticas globais (note: variáveis locais da função externa, cuidado com concorrência se fosse crítico, mas aqui ok)
              }
            }
          }
        } catch (error) {
          // Erro ao processar JSON
        }

        // Processar tags manuais
        try {
          const sessionFileNormalized = normalizePath(sessionFile)
          const sessionFileAbsolute = path.resolve(sessionFile)

          let tagManual = null

          tagManual = tagsManual[sessionFileNormalized] ||
            tagsManual[sessionFileAbsolute] ||
            tagsManual[sessionFile] ||
            tagsManual[path.normalize(sessionFile)]

          if (!tagManual) {
            const sessionFileName = numero
            for (const [key, value] of Object.entries(tagsManual)) {
              const keyNormalized = normalizePath(key)
              if (key.includes(sessionFileName) ||
                keyNormalized.includes(sessionFileName) ||
                path.basename(key, '.session') === sessionFileName ||
                path.basename(keyNormalized, '.session') === sessionFileName) {
                tagManual = value
                break
              }
            }
          }

          if (tagManual && tagManual.trim()) {
            if (!conta.tags.includes(tagManual.trim())) {
              conta.tags.push(tagManual.trim())
            }
          }
        } catch (error) { }

        // Normalizar tags
        conta.tags = conta.tags.map(tag => {
          if (tag === 'com grupos') return 'Com grupos'
          if (tag === 'sem grupos') return 'Sem grupos'
          if (tag === 'sem listas') return 'Sem lista'
          return tag
        }).filter((tag, idx, self) => self.indexOf(tag) === idx)

        return conta
      }

      const contasRaw = []
      for (let i = 0; i < pastas.length; i += BATCH_SIZE) {
        const batch = pastas.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(batch.map(processConta))
        contasRaw.push(...batchResults)
      }
      const contas = contasRaw
        .filter(conta => conta !== null)
        .map((conta, index) => {
          conta.id = index + 1
          return conta
        })

      return contas
    } catch (error) {
      console.error('❌ Erro ao ler contas do Telegram:', error)
      return []
    }
  })

  ipcMain.handle('executar-telegram', async (event, pastaPath) => {
    try {
      // Validar que o caminho está dentro de CONTAS_DIR (segurança)
      if (!validatePathInDirectory(pastaPath, PATHS.CONTAS_DIR)) {
        throw new Error('Caminho inválido: fora do diretório de contas')
      }

      const telegramExePath = path.join(pastaPath, 'telegram.exe')

      if (!fs.existsSync(telegramExePath)) {
        throw new Error('telegram.exe não encontrado na pasta')
      }

      // Extrair número da conta do caminho
      const numero = path.basename(pastaPath)
      if (validateTelegramNumber(numero)) {
        // Atualizar último uso da conta
        const accountPath = path.join(PATHS.CONTAS_DIR, numero)
        const jsonPath = path.join(accountPath, `${numero}.json`)
        if (fs.existsSync(jsonPath)) {
          try {
            const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
            accountData.ultimoUso = new Date().toISOString()
            fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
            console.log(`[executar-telegram] ✅ Último uso atualizado para conta ${numero}`)
          } catch (error) {
            console.warn(`[executar-telegram] Erro ao atualizar último uso:`, error.message)
          }
        }
      }

      // Executa o telegram.exe na pasta específica
      // Nota: Mantemos detached: true porque o Telegram Desktop deve continuar rodando
      // independente do app Electron, então não rastreamos este processo
      spawn(telegramExePath, [], {
        cwd: pastaPath,
        detached: true,
        stdio: 'ignore',
      }).unref()

      return { success: true }
    } catch (error) {
      console.error('Erro ao executar Telegram:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('excluir-numero', async (event, numero) => {
    try {
      // Validar que o número contém apenas dígitos (segurança)
      if (!validateTelegramNumber(numero)) {
        throw new Error('Número de conta inválido')
      }

      const pastaPath = path.join(PATHS.CONTAS_DIR, numero)

      // Validar que o caminho está dentro de CONTAS_DIR (segurança)
      if (!validatePathInDirectory(pastaPath, PATHS.CONTAS_DIR)) {
        throw new Error('Caminho inválido: fora do diretório de contas')
      }

      if (!fs.existsSync(pastaPath)) {
        return { success: true, message: 'Pasta já não existe' }
      }

      // Usar função robusta de exclusão com retry
      const deleteUtils = requireBackendCommonJS(path.join(PATHS.BASE, 'back', 'utils', 'deleteUtils.js'))
      const result = await deleteUtils.safeDelete(pastaPath, {
        maxRetries: 10, // Mais tentativas para contas
        delayMs: 1000,  // Aguardar 1s entre tentativas
        force: true
      })

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir pasta')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir número:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('verificar-contas', async (event, accountIds, optionsOrTipo = 'basic', sessoesParalelas = 1, proxyId = null) => {
    const logs = []

    // Função para adicionar log com timestamp
    const addLog = (level, message, data = null, workerId = null) => {
      const timestamp = new Date().toLocaleString('pt-BR')
      const workerPrefix = workerId !== null ? `[Worker ${workerId}]` : ''
      let logMessage = `[${timestamp}] [${level}] ${workerPrefix} ${message}`
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
        console.error(workerPrefix, message, data || '')
      } else {
        console.log(workerPrefix, message, data || '')
      }
    }

    try {
      // Determinar se é array de opções ou tipo antigo (compatibilidade retroativa)
      let verificationOptions = []
      let tipo = null

      if (Array.isArray(optionsOrTipo)) {
        // Novo formato: array de opções
        verificationOptions = optionsOrTipo
        addLog('INFO', '[Verificar Contas Handler] Handler chamado com opções personalizadas', { accountIds, options: verificationOptions, sessoesParalelas })
        addLog('INFO', `[Verificar Contas] Iniciando verificação PERSONALIZADA de contas`, { count: accountIds.length, options: verificationOptions.length, sessoesParalelas })
      } else {
        // Formato antigo: tipo 'basic' ou 'advanced' (compatibilidade)
        tipo = optionsOrTipo
        if (tipo === 'advanced') {
          verificationOptions = ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots', 'checkGroupsOnline', 'detectSpam', 'detectFrozen', 'testChannel', 'testCreateChannel', 'checkBotFatherBots']
        } else {
          verificationOptions = ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots', 'checkGroupsOnline']
        }
        addLog('INFO', '[Verificar Contas Handler] Handler chamado (formato antigo)', { accountIds, tipo, sessoesParalelas })
        addLog('INFO', `[Verificar Contas] Iniciando verificação ${tipo === 'advanced' ? 'COMPLETA' : 'BÁSICA'} de contas`, { count: accountIds.length, sessoesParalelas })
      }

      const normalizeOptions = (options) => {
        const normalized = new Set(options)
        if (normalized.has('configurarContaNova')) {
          return ['configurarContaNova']
        }
        if (normalized.has('syncGroups')) {
          normalized.delete('syncGroups')
          normalized.add('listGroups')
          normalized.add('updateMembers')
          normalized.add('updateBots')
          normalized.add('checkGroupsOnline')
        }
        if (normalized.has('verifyForUse')) {
          normalized.delete('verifyForUse')
          normalized.add('detectBannedFrozen')
          normalized.add('detectFrozen')
          normalized.add('detectSpam')
          normalized.add('testChannel')
          normalized.add('testCreateChannel')
          normalized.add('checkBotFatherBots')
        }
        if (normalized.has('checkGroupsOnline')) {
          normalized.add('listGroups')
        }
        return Array.from(normalized)
      }

      verificationOptions = normalizeOptions(verificationOptions)

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada')
      }

      if (verificationOptions.length === 0) {
        throw new Error('Nenhuma opção de verificação selecionada')
      }

      // Validar que todos os IDs são números válidos
      for (const accountId of accountIds) {
        if (!validateTelegramNumber(accountId)) {
          throw new Error(`ID de conta inválido: ${accountId}`)
        }
      }

      // Validar sessoesParalelas
      const maxWorkers = Math.max(1, Math.min(sessoesParalelas || 1, accountIds.length))

      // Determinar quais verificadores usar baseado nas opções
      const needsContaNova = verificationOptions.includes('configurarContaNova')
      const needsBasic = !needsContaNova && verificationOptions.some(opt => ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots', 'checkGroupsOnline'].includes(opt))
      const needsAdvanced = !needsContaNova && verificationOptions.some(opt => ['detectSpam', 'detectFrozen', 'testChannel', 'checkBotFatherBots'].includes(opt))
      const needsGroupOnline = verificationOptions.includes('checkGroupsOnline')

      let verifyAccountBasic = null
      let verifyAccountAdvanced = null
      let configurarContaNovaFn = null

      if (needsContaNova) {
        const configuradorPath = path.join(BACK_DIR, 'verificador', 'configuradorContaNova.js')
        const configuradorModule = require(configuradorPath)
        configurarContaNovaFn = configuradorModule.configurarContaNova
      }

      if (needsBasic) {
        const verificadorPath = path.join(BACK_DIR, 'verificador', 'verificadorcontas.js')
        const verificadorModule = require(verificadorPath)
        verifyAccountBasic = verificadorModule.verifyAccount
      }

      if (needsAdvanced) {
        const verificadorAvancadoPath = path.join(BACK_DIR, 'verificador', 'verificadorAvancado.js')
        const verificadorAvancadoModule = require(verificadorAvancadoPath)
        verifyAccountAdvanced = verificadorAvancadoModule.verifyAccountAdvanced
      }

      // Obter paths baseados na operação atual
      // Nota: APIs sempre vêm da pasta principal (compartilhadas)
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR, // Para nichos, listas, etc
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'), // Para APIs (sempre da pasta principal)
        rootDir: PATHS.BASE,
      }

      addLog('INFO', '[Verificar Contas] Usando paths', customPaths)

      // Importar WorkerPool com verificação defensiva
      let WorkerPool
      try {
        const workerPoolModule = require(path.join(BACK_DIR, 'utils', 'workerPool.js'))
        if (!workerPoolModule || typeof workerPoolModule.WorkerPool !== 'function') {
          throw new Error('WorkerPool não é uma função válida')
        }
        WorkerPool = workerPoolModule.WorkerPool
      } catch (error) {
        console.error('[Verificar Contas] Erro ao carregar WorkerPool:', error.message)
        throw new Error('WorkerPool não está disponível. Não é possível processar em paralelo.')
      }

      const results = []
      const errors = []

      // Função para enviar progresso detalhado
      const sendProgress = (progressData) => {
        try {
          event.sender.send('verificar-contas-progress', {
            ...progressData,
          })
        } catch (error) {
          console.warn('[Verificar Contas] Erro ao enviar progresso:', error.message)
        }
      }

      // Criar função worker que será executada pela fila global
      const executeVerifyAccounts = async () => {
        // Usar WorkerPool para processamento paralelo com rotação de API e proxy
        const workerPool = new WorkerPool(maxWorkers)

        // Adicionar todas as contas à fila
        accountIds.forEach((accountId, index) => {
          workerPool.enqueue({
            accountId,
            taskId: `verify-${accountId}-${index}`,
            customPaths,
            verifyFunctionType: tipo,
          })
        })

        addLog('INFO', `[Verificar Contas] Iniciando WorkerPool com ${maxWorkers} worker(s)`)

        // Processar fila com WorkerPool
        // O WorkerPool já faz rotação de API e proxy, passando apiCredentials e proxyReservado para cada worker
        return await workerPool.processQueue(async (task) => {
          // Extrair dados do task, incluindo apiCredentials e proxyReservado do WorkerPool
          const { accountId: rawAccountId, workerId, customPaths: taskCustomPaths, apiCredentials, proxyReservado } = task

          // Garantir que accountId seja string válida
          const accountId = String(rawAccountId || '').trim()

          if (!accountId || !/^\d+$/.test(accountId)) {
            throw new Error(`AccountId inválido recebido: ${rawAccountId} (tipo: ${typeof rawAccountId})`)
          }

          // Removido: criação de API integrada (disponível apenas na aba Criar API)
          let apiCreationPromise = null
          if (false) { // Desabilitado
            const accountIdStr = String(accountId).trim()

            // Delay distribuído entre workers para evitar cliques simultâneos no botão
            // IMPORTANTE: Cada worker precisa ter delay suficiente para não clicar ao mesmo tempo
            const delayBase = 5000 // 5 segundos base (aumentado)
            const delayRandom = Math.random() * 5000 // 0-5 segundos aleatório (aumentado)
            const delayWorker = workerId * 10000 // 10 segundos entre cada worker (aumentado significativamente)
            const totalDelay = delayBase + delayRandom + delayWorker

            console.log(`[Verificar Contas] Worker ${workerId} - Delay total: ${Math.round(totalDelay / 1000)}s antes de criar API`)

            apiCreationPromise = (async () => {
              try {
                await new Promise(resolve => setTimeout(resolve, totalDelay))

                addLog('INFO', `[Verificar Contas] Worker ${workerId} - Iniciando criação de API em paralelo para ${accountIdStr}...`, null, workerId)

                // Carregar módulo de criação de API
                const telegramApiCreatorPath = path.join(BACK_DIR, 'utils', 'telegramApiCreator.js')
                const { criarApiParaConta } = require(telegramApiCreatorPath)

                // Função local para salvar API diretamente (já temos PATHS importado)
                const saveApiToFile = async (apiId, apiHash, accountId = null) => {
                  try {
                    const apisFile = PATHS.APIS_TELEGRAM_FILE
                    let apis = []
                    if (fs.existsSync(apisFile)) {
                      const data = fs.readFileSync(apisFile, 'utf-8')
                      apis = JSON.parse(data).apis || []
                    }

                    // Verificar se já existe
                    const existingIndex = apis.findIndex(api => api.api_id === apiId && api.api_hash === apiHash)
                    if (existingIndex >= 0) {
                      // Se já existe e não tem accountId, atualizar
                      if (accountId && !apis[existingIndex].createdBy) {
                        apis[existingIndex].createdBy = accountId
                        fs.writeFileSync(apisFile, JSON.stringify({ apis }, null, 2), 'utf-8')
                      }
                      return { success: true, alreadyExists: true }
                    }

                    apis.push({
                      id: Date.now().toString(),
                      api_id: apiId,
                      api_hash: apiHash,
                      createdAt: new Date().toISOString(),
                      createdBy: accountId || null, // Adicionar informação de qual sessão criou
                    })

                    fs.writeFileSync(apisFile, JSON.stringify({ apis }, null, 2), 'utf-8')
                    return { success: true }
                  } catch (error) {
                    return { success: false, error: error.message }
                  }
                }

                // Criar API (com timeout aumentado - 5 minutos para dar tempo suficiente)
                // Cada worker usa API e proxy diferentes, então não é rate limit entre sessões
                // PASSAR PROXY para o Playwright usar
                console.log(`[Verificar Contas] Criando API para ${accountIdStr} com proxy:`, proxyReservado ? proxyReservado.server : 'nenhum')
                const apiResult = await Promise.race([
                  criarApiParaConta(accountIdStr, taskCustomPaths, null, proxyReservado || null),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout: A requisição está demorando muito (5 minutos)')), 300000) // 5 minutos
                  )
                ]).catch((timeoutError) => {
                  return {
                    success: false,
                    error: timeoutError.message || 'Timeout ao criar API - o site pode estar lento'
                  }
                })

                if (apiResult.success) {
                  // SALVAR API IMEDIATAMENTE quando criada com sucesso (incluindo accountId)
                  try {
                    await saveApiToFile(apiResult.apiId, apiResult.apiHash, accountIdStr)
                    addLog('INFO', `[Verificar Contas] ✅ API criada e SALVA para ${accountIdStr}: ${apiResult.apiId}`, null, workerId)
                  } catch (saveError) {
                    addLog('ERROR', `[Verificar Contas] ⚠️ API criada mas erro ao salvar: ${saveError.message}`, null, workerId)
                  }

                  return {
                    success: true,
                    apiId: apiResult.apiId,
                    apiHash: apiResult.apiHash,
                    saved: true
                  }
                } else {
                  const isTimeoutOrRateLimit = apiResult.error && (
                    apiResult.error.toLowerCase().includes('timeout') ||
                    apiResult.error.toLowerCase().includes('rate limit') ||
                    apiResult.error.toLowerCase().includes('não foi possível extrair')
                  )

                  addLog('WARN', `[Verificar Contas] ⚠️ Erro ao criar API para ${accountIdStr}: ${apiResult.error}`, null, workerId)

                  return {
                    success: false,
                    error: apiResult.error,
                    isTimeoutOrRateLimit
                  }
                }
              } catch (error) {
                addLog('ERROR', `[Verificar Contas] ⚠️ Erro inesperado ao criar API para ${accountId}: ${error.message}`, null, workerId)
                return {
                  success: false,
                  error: error.message
                }
              }
            })()
          }

          try {
            addLog('INFO', `[Verificar Contas] Verificando conta: ${accountId} (tipo original: ${typeof rawAccountId})`, null, workerId)

            if (needsContaNova && configurarContaNovaFn) {
              addLog('INFO', `[Verificar Contas] Executando Conta nova para ${accountId}`, null, workerId)
              const configResult = await configurarContaNovaFn(accountId, taskCustomPaths, {
                apiCredentials,
                proxyReservado,
                workerId,
              })
              return {
                accountId,
                success: configResult.success,
                configuracaoContaNova: true,
                nome: configResult.nome,
                sobrenome: configResult.sobrenome,
                username: configResult.username,
                erros: configResult.erros || [],
                workerId,
              }
            }

            // Executar verificações baseado nas opções selecionadas
            let finalResult = {
              accountId,
              success: true,
              groupsProcessed: 0,
              groupsRemoved: 0,
              groupsTotal: 0,
              groupsOnline: 0,
              groupsOffline: 0,
              botFatherBots: [],
              banned: false,
              frozen: false,
              restricted: false,
              spam: false,
              botfatherBlocked: false,
              status: null
            }

            // Executar verificação básica se necessário
            if (needsBasic && verifyAccountBasic) {
              addLog('INFO', `[Verificar Contas] Executando verificação básica para ${accountId}`, { options: verificationOptions.filter(opt => ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots'].includes(opt)) }, workerId)
              const basicResult = await verifyAccountBasic(accountId, taskCustomPaths, {
                apiCredentials,
                proxyReservado,
                workerId,
                options: verificationOptions.filter(opt => ['listGroups', 'updateMembers', 'detectBannedFrozen', 'updateBots'].includes(opt))
              })

              // Mesclar resultados
              if (basicResult.banned) finalResult.banned = true
              if (basicResult.frozen) finalResult.frozen = true
              if (basicResult.restricted) finalResult.restricted = true
              if (basicResult.groupsProcessed !== undefined) finalResult.groupsProcessed = basicResult.groupsProcessed
              if (basicResult.groupsRemoved !== undefined) finalResult.groupsRemoved = basicResult.groupsRemoved
              if (basicResult.status) finalResult.status = basicResult.status
            }

            // Executar verificação avançada se necessário (apenas se básica não detectou problemas)
            if (needsAdvanced && verifyAccountAdvanced && !finalResult.banned && !finalResult.frozen) {
              addLog('INFO', `[Verificar Contas] Executando verificação avançada para ${accountId}`, { options: verificationOptions.filter(opt => ['detectSpam', 'detectFrozen', 'testChannel', 'checkBotFatherBots'].includes(opt)) }, workerId)
              const advancedResult = await verifyAccountAdvanced(accountId, taskCustomPaths, {
                apiCredentials,
                proxyReservado,
                workerId,
                options: verificationOptions.filter(opt => ['detectSpam', 'detectFrozen', 'testChannel', 'checkBotFatherBots'].includes(opt))
              })

              // Mesclar resultados
              console.log(`[Verificar Contas] 📦 advancedResult para ${accountId}:`, {
                status: advancedResult.status,
                frozen: advancedResult.frozen,
                spam: advancedResult.spam,
                botfatherBlocked: advancedResult.botfatherBlocked,
                botFatherBots: advancedResult.botFatherBots,
                verificacao_avancada: advancedResult.verificacao_avancada
              })
              if (advancedResult.frozen) finalResult.frozen = true
              if (advancedResult.spam) finalResult.spam = true
              if (advancedResult.botfatherBlocked) finalResult.botfatherBlocked = true
              if (advancedResult.status) finalResult.status = advancedResult.status
              // Tentar pegar botFatherBots de múltiplas fontes possíveis
              const bots = advancedResult.botFatherBots || advancedResult.verificacao_avancada?.botFatherBots || []
              if (Array.isArray(bots) && bots.length > 0) {
                finalResult.botFatherBots = bots
                console.log(`[Verificar Contas] ✅ Bots encontrados na verificação avançada:`, bots.length)
              }
            }

            if (needsGroupOnline && !finalResult.banned && !finalResult.frozen) {
              // Se listamos grupos via sessão, eles JÁ ESTÃO online - conseguimos acessar membros, bots e link
              // A verificação por bot (verificarGruposConta) é redundante e falha (chat not found)
              if (needsBasic && (finalResult.groupsProcessed ?? 0) > 0) {
                addLog('INFO', `[Verificar Contas] Grupos listados via sessão = online (${finalResult.groupsProcessed} acessados com sucesso)`, null, workerId)
                finalResult.groupsTotal = finalResult.groupsProcessed || 0
                finalResult.groupsOnline = finalResult.groupsProcessed || 0
                finalResult.groupsOffline = 0
              } else {
                try {
                  addLog('INFO', `[Verificar Contas] Verificando grupos online (sem listagem prévia) para ${accountId}`, null, workerId)
                  const verificarGruposModule = requireBackendModule('verificador grupos/verificarGruposOnline.js')
                  const { verificarGruposConta } = verificarGruposModule
                  const onlineResult = await verificarGruposConta(
                    accountId,
                    {
                      ...taskCustomPaths,
                      nichosDir: PATHS.NICHOS_DIR,
                      categoriasDir: path.join(PATHS.BANCO_DIR, 'categorias'),
                    },
                    { removeOffline: false }
                  )

                  if (onlineResult && onlineResult.success) {
                    finalResult.groupsTotal = onlineResult.total || 0
                    finalResult.groupsOnline = onlineResult.online || 0
                    finalResult.groupsOffline = onlineResult.offline || 0
                    finalResult.groupsRemoved = (finalResult.groupsRemoved || 0) + (onlineResult.groupsRemoved || 0)
                  } else if (onlineResult && onlineResult.error) {
                    finalResult.groupsOnlineError = onlineResult.error
                  }
                } catch (onlineError) {
                  addLog('WARN', `[Verificar Contas] Erro ao verificar grupos online para ${accountId}`, { error: onlineError.message }, workerId)
                  finalResult.groupsOnlineError = onlineError.message
                }
              }
            }

            const result = finalResult

            // Removido: aguardar criação de API (integrada removida)

            // Processar resultado
            if (result.banned) {
              return {
                accountId,
                success: true,
                groupsProcessed: 0,
                groupsRemoved: 0,
                banned: true,
                workerId,
              }
            } else if (result.frozen) {
              return {
                accountId,
                success: true,
                groupsProcessed: 0,
                groupsRemoved: 0,
                frozen: true,
                workerId,
              }
            } else {
              const verifyResult = {
                accountId,
                success: true,
                groupsProcessed: result.groupsProcessed || 0,
                groupsRemoved: result.groupsRemoved || 0,
                groupsTotal: result.groupsTotal || 0,
                groupsOnline: result.groupsOnline || 0,
                groupsOffline: result.groupsOffline || 0,
                botFatherBots: result.botFatherBots || [],
                status: result.status,
                botfatherBlocked: result.botfatherBlocked || false,
                restricted: result.restricted || false,
                workerId,
              }

              // Salvar bots encontrados na aba de Bots de Mídia (se houver bots com token)
              // Extrair bots de múltiplas fontes possíveis
              const allBots = result.botFatherBots || verifyResult.botFatherBots || []
              console.log(`[Verificar Contas] 🔍 Bots encontrados para conta ${accountId}:`, allBots.length)
              if (allBots.length > 0) {
                console.log(`[Verificar Contas] 📋 Detalhes dos bots:`, JSON.stringify(allBots, null, 2))
              }
              if (Array.isArray(allBots) && allBots.length > 0) {
                try {
                  const botsComToken = allBots.filter(bot => bot.token)
                  console.log(`[Verificar Contas] 🤖 Bots com token: ${botsComToken.length} de ${allBots.length}`)
                  if (botsComToken.length > 0) {
                    addLog('INFO', `[Verificar Contas] 🤖 Salvando ${botsComToken.length} bot(s) encontrado(s) na conta ${accountId}`, null, workerId)
                    const saveResult = await salvarBotsEncontradosNaVerificacao(allBots, accountId)
                    console.log(`[Verificar Contas] 💾 Resultado do salvamento:`, JSON.stringify(saveResult, null, 2))
                    if (saveResult.savedCount > 0) {
                      addLog('INFO', `[Verificar Contas] ✅ ${saveResult.savedCount} bot(s) salvo(s) na aba de Bots`, null, workerId)
                      verifyResult.botsSaved = saveResult.savedCount
                    }
                  } else {
                    console.log(`[Verificar Contas] ⚠️ Bots encontrados mas nenhum com token válido`)
                  }
                } catch (saveError) {
                  console.error(`[Verificar Contas] ❌ Erro ao salvar bots:`, saveError)
                  addLog('WARN', `[Verificar Contas] ⚠️ Erro ao salvar bots: ${saveError.message}`, null, workerId)
                }
              } else {
                console.log(`[Verificar Contas] ℹ️ Nenhum bot encontrado para conta ${accountId}`)
              }

              return verifyResult
            }
          } catch (error) {
            const errorMessage = error.message || 'Erro desconhecido'
            addLog('ERROR', `[Verificar Contas] Erro ao verificar conta ${accountId}`, { error: errorMessage }, workerId)

            return {
              accountId,
              success: false,
              error: errorMessage,
              workerId,
            }
          }
        }, (progress) => {
          // Calcular progresso detalhado
          const stats = workerPool.getStats()
          const completedCount = progress.completed || 0
          const total = accountIds.length

          sendProgress({
            current: completedCount,
            total,
            currentAccount: null, // WorkerPool não fornece conta atual específica
            activeWorkers: progress.active || stats.activeWorkers || 0,
            averageTime: progress.averageTime || stats.averageTimePerItem || 0,
            estimatedTimeRemaining: progress.estimatedTimeRemaining || stats.estimatedTimeRemaining || 0,
            queueLength: stats.queueLength || 0,
          })
        })

        // Processar resultados finais após o processamento da fila
        const completed = workerPool.completed || []
        for (const item of completed) {
          if (item.success === false) {
            errors.push({
              accountId: item.accountId,
              error: item.error || 'Erro desconhecido',
            })
            if (item.banned) {
              addLog('WARN', `[Verificar Contas] ⚠️ Conta ${item.accountId} está banida (tag adicionada)`, null, item.workerId)
            } else if (item.frozen) {
              addLog('WARN', `[Verificar Contas] ⚠️ Conta ${item.accountId} está congelada (tag adicionada)`, null, item.workerId)
            }
          } else {
            results.push({
              accountId: item.accountId,
              success: true,
              groupsProcessed: item.groupsProcessed || 0,
              groupsRemoved: item.groupsRemoved || 0,
              groupsTotal: item.groupsTotal || 0,
              groupsOnline: item.groupsOnline || 0,
              groupsOffline: item.groupsOffline || 0,
              botFatherBots: item.botFatherBots || [],
              banned: item.banned || false,
              frozen: item.frozen || false,
              botfatherBlocked: item.botfatherBlocked || false,
              restricted: item.restricted || false,
              status: item.status,
            })
            if (!item.banned && !item.frozen) {
              addLog('INFO', `[Verificar Contas] ✅ Conta ${item.accountId} verificada com sucesso`, null, item.workerId)
            }
          }
        }

        addLog('INFO', `[Verificar Contas] Processamento concluído`, {
          totalProcessed: results.length,
          totalErrors: errors.length
        })

        return {
          success: errors.length === 0,
          results,
          errors: errors.length > 0 ? errors : undefined,
          totalProcessed: results.length,
          totalErrors: errors.length,
          logs: logs.length > 0 ? logs : undefined,
        }
      }

      // Importar fila global
      const { globalTaskQueue } = await import('../utils/globalTaskQueue.js')

      // Adicionar à fila global de tarefas críticas
      const result = await new Promise((resolve, reject) => {
        globalTaskQueue.enqueue({
          type: 'verificar-contas',
          processId: `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workerFunction: executeVerifyAccounts,
          sendProgress,
          maxWorkers: maxWorkers,
          taskData: {
            accountIds,
            tipo
          },
          onComplete: (result) => resolve(result),
          onError: reject
        })

        addLog('INFO', '[Verificar Contas] Operação adicionada à fila global de tarefas críticas')
        console.log(`[verificar-contas] 📊 Estatísticas da fila global:`, globalTaskQueue.getStats())
      })

      return result
    } catch (error) {
      const errorMessage = error.message || 'Erro desconhecido'
      const errorStack = error.stack || ''
      addLog('ERROR', '[Verificar Contas] Erro geral', {
        error: errorMessage,
        stack: errorStack
      })
      return {
        success: false,
        error: errorMessage,
        logs: logs.length > 0 ? logs : undefined,
      }
    }
  })

  // Função auxiliar para encontrar pastas numéricas (compartilhada entre handlers)
  const encontrarPastasNumericas = (pastaAtual, nivel = 0) => {
    const pastasEncontradas = []

    try {
      if (nivel > 3) {
        return pastasEncontradas
      }

      const items = fs.readdirSync(pastaAtual, { withFileTypes: true })

      for (const item of items) {
        if (item.isDirectory()) {
          const itemPath = path.join(pastaAtual, item.name)

          if (validateTelegramNumber(item.name)) {
            pastasEncontradas.push({
              nome: item.name,
              caminho: itemPath,
              nivel: nivel
            })
          } else {
            if (nivel < 2) {
              const subPastas = encontrarPastasNumericas(itemPath, nivel + 1)
              pastasEncontradas.push(...subPastas)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[encontrarPastasNumericas] Erro ao ler pasta ${pastaAtual}:`, error.message)
    }

    return pastasEncontradas
  }

  /**
   * Encontra pastas que contêm .session (número no nome do arquivo).
   * Usado quando o MEGA baixa uma pasta com arquivos na raiz (ex.: 5571982590997.session) sem subpasta numérica.
   */
  function encontrarPastasPorSession(pastaAtual, nivel = 0) {
    const encontradas = []
    if (nivel > 3) return encontradas
    try {
      const items = fs.readdirSync(pastaAtual, { withFileTypes: true })
      for (const item of items) {
        const itemPath = path.join(pastaAtual, item.name)
        if (item.isFile() && item.name.endsWith('.session')) {
          const numero = path.basename(item.name, '.session')
          if (validateTelegramNumber(numero)) {
            const folderPath = path.dirname(itemPath)
            if (!encontradas.some((e) => e.nome === numero && e.caminho === folderPath)) {
              encontradas.push({ nome: numero, caminho: folderPath })
            }
          }
        } else if (item.isDirectory() && nivel < 3) {
          encontradas.push(...encontrarPastasPorSession(itemPath, nivel + 1))
        }
      }
    } catch (e) {
      console.warn('[importarContasDePasta] Erro ao buscar .session:', e.message)
    }
    return encontradas
  }

  /**
   * Importa contas a partir de uma pasta (ex.: após download MEGA).
   * Varre a pasta em busca de pastas numéricas; se não achar, busca pastas que tenham .session com número no nome.
   */
  function importarContasDePasta(pastaPath, tagSelecionada = null) {
    const pastasMovidas = []
    const erros = []

    if (!fs.existsSync(pastaPath)) {
      console.warn('[importarContasDePasta] Pasta não encontrada:', pastaPath)
      return { success: false, pastasMovidas: [], erros: ['Pasta não encontrada: ' + pastaPath] }
    }

    if (!fs.existsSync(PATHS.CONTAS_DIR)) {
      fs.mkdirSync(PATHS.CONTAS_DIR, { recursive: true })
    }

    let pastasParaImportar = encontrarPastasNumericas(pastaPath)
    let importarPorSession = false
    if (pastasParaImportar.length === 0) {
      pastasParaImportar = encontrarPastasPorSession(pastaPath)
      importarPorSession = pastasParaImportar.length > 0
      if (importarPorSession) {
        console.log(`[importarContasDePasta] Nenhuma pasta numérica; importando ${pastasParaImportar.length} conta(s) por .session`)
      }
    } else {
      console.log(`[importarContasDePasta] ${pastasParaImportar.length} pasta(s) numérica(s) encontrada(s)`)
    }

    for (const pastaInfo of pastasParaImportar) {
      try {
        const pastaDestino = path.join(PATHS.CONTAS_DIR, pastaInfo.nome)
        if (fs.existsSync(pastaDestino)) {
          erros.push(`Pasta "${pastaInfo.nome}" já existe em "contas telegram"`)
          continue
        }
        if (importarPorSession) {
          fs.mkdirSync(pastaDestino, { recursive: true })
          const sessionOrigem = path.join(pastaInfo.caminho, `${pastaInfo.nome}.session`)
          const sessionDestino = path.join(pastaDestino, `${pastaInfo.nome}.session`)
          if (fs.existsSync(sessionOrigem)) {
            fs.copyFileSync(sessionOrigem, sessionDestino)
          }
        } else {
          fs.renameSync(pastaInfo.caminho, pastaDestino)
        }
        const jsonData = {
          numero: pastaInfo.nome,
          quantidade_grupos: 0,
          grupos: [],
          frozen: false,
          tags: tagSelecionada ? [tagSelecionada] : [],
          pastaPath: `contas telegram/${pastaInfo.nome}`,
        }
        const jsonPath = path.join(pastaDestino, `${pastaInfo.nome}.json`)
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4), 'utf-8')
        pastasMovidas.push(pastaInfo.nome)
        console.log(`[importarContasDePasta] Importada: ${pastaInfo.nome}`)
      } catch (error) {
        erros.push(`Erro ao importar "${pastaInfo.nome}": ${error.message}`)
      }
    }

    return {
      success: pastasMovidas.length > 0,
      pastasMovidas,
      erros: erros.length > 0 ? erros : undefined,
    }
  }

  // Handler para buscar contas para importar (apenas encontra, não importa)
  ipcMain.handle('buscar-contas-para-importar', async () => {
    try {
      console.log('✅ Handler buscar-contas-para-importar chamado')
      const mainWindow = getMainWindow()

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections'],
        title: 'Selecione as pastas das contas do Telegram ou uma pasta com múltiplas contas',
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, error: 'Nenhuma pasta selecionada', contasEncontradas: [] }
      }

      const contasEncontradas = []
      const erros = []

      for (const pastaOrigem of result.filePaths) {
        try {
          const nomePasta = path.basename(pastaOrigem)

          if (validateTelegramNumber(nomePasta)) {
            const pastaDestino = path.join(PATHS.CONTAS_DIR, nomePasta)
            if (!fs.existsSync(pastaDestino)) {
              contasEncontradas.push(nomePasta)
            } else {
              erros.push(`Pasta "${nomePasta}" já existe em "contas telegram"`)
            }
          } else {
            const pastasNumericas = encontrarPastasNumericas(pastaOrigem)

            if (pastasNumericas.length === 0) {
              erros.push(`Nenhuma pasta numérica encontrada em "${nomePasta}"`)
              continue
            }

            for (const pastaInfo of pastasNumericas) {
              try {
                const pastaDestino = path.join(PATHS.CONTAS_DIR, pastaInfo.nome)

                if (!fs.existsSync(pastaDestino)) {
                  contasEncontradas.push(pastaInfo.nome)
                } else {
                  erros.push(`Pasta "${pastaInfo.nome}" já existe em "contas telegram"`)
                }
              } catch (error) {
                erros.push(`Erro ao processar pasta "${pastaInfo.nome}": ${error.message}`)
              }
            }
          }
        } catch (error) {
          erros.push(`Erro ao processar pasta "${path.basename(pastaOrigem)}": ${error.message}`)
        }
      }

      if (contasEncontradas.length === 0) {
        return {
          success: false,
          error: erros.length > 0 ? erros.join('; ') : 'Nenhuma conta encontrada para importar',
          contasEncontradas: [],
          erros: erros.length > 0 ? erros : undefined,
        }
      }

      return {
        success: true,
        contasEncontradas,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
      return { success: false, error: error.message, contasEncontradas: [] }
    }
  })

  // Handler para importar contas com tag opcional
  ipcMain.handle('importar-contas', async (event, contasParaImportar, tagSelecionada) => {
    try {
      console.log(`✅ Handler importar-contas chamado: ${contasParaImportar.length} conta(s), tag: ${tagSelecionada || 'nenhuma'}`)
      const mainWindow = getMainWindow()

      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        fs.mkdirSync(PATHS.CONTAS_DIR, { recursive: true })
      }

      // Pedir novamente as pastas (o usuário precisa selecionar de onde importar)
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections'],
        title: 'Selecione novamente as pastas das contas para importar',
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, error: 'Nenhuma pasta selecionada', pastasMovidas: [] }
      }

      const pastasMovidas = []
      const erros = []
      const contasParaImportarSet = new Set(contasParaImportar)
      const pastasOriginaisMap = new Map()

      // Mapear contas para importar com suas pastas originais
      for (const pastaOrigem of result.filePaths) {
        const nomePasta = path.basename(pastaOrigem)

        if (validateTelegramNumber(nomePasta) && contasParaImportarSet.has(nomePasta)) {
          pastasOriginaisMap.set(nomePasta, pastaOrigem)
        } else {
          const pastasNumericas = encontrarPastasNumericas(pastaOrigem)
          for (const pastaInfo of pastasNumericas) {
            if (contasParaImportarSet.has(pastaInfo.nome)) {
              pastasOriginaisMap.set(pastaInfo.nome, pastaInfo.caminho)
            }
          }
        }
      }

      // Importar cada conta
      for (const contaNome of contasParaImportar) {
        try {
          const pastaOrigem = pastasOriginaisMap.get(contaNome)

          if (!pastaOrigem) {
            erros.push(`Pasta original não encontrada para conta "${contaNome}"`)
            continue
          }

          const pastaDestino = path.join(PATHS.CONTAS_DIR, contaNome)

          if (fs.existsSync(pastaDestino)) {
            erros.push(`Pasta "${contaNome}" já existe em "contas telegram"`)
            continue
          }

          fs.renameSync(pastaOrigem, pastaDestino)

          const jsonData = {
            numero: contaNome,
            quantidade_grupos: 0,
            grupos: [],
            frozen: false,
            tags: tagSelecionada ? [tagSelecionada] : [],
            pastaPath: `contas telegram/${contaNome}`,
          }

          const jsonPath = path.join(pastaDestino, `${contaNome}.json`)
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4), 'utf-8')

          pastasMovidas.push(contaNome)
          console.log(`[importar-contas] ✅ Conta "${contaNome}" importada${tagSelecionada ? ` com tag "${tagSelecionada}"` : ''}`)
        } catch (error) {
          erros.push(`Erro ao importar conta "${contaNome}": ${error.message}`)
        }
      }

      if (pastasMovidas.length === 0) {
        return {
          success: false,
          error: erros.length > 0 ? erros.join('; ') : 'Nenhuma pasta foi movida',
          pastasMovidas: [],
          erros: erros.length > 0 ? erros : undefined,
        }
      }

      return {
        success: true,
        pastasMovidas,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao importar contas:', error)
      return { success: false, error: error.message, pastasMovidas: [] }
    }
  })

  // Transferir contas da operação atual para outra operação (mover pastas)
  ipcMain.handle('transferir-contas-entre-ops', async (event, accountNumeros, operacaoDestinoPath) => {
    try {
      if (!Array.isArray(accountNumeros) || accountNumeros.length === 0) {
        return { success: false, error: 'Nenhuma conta informada', transferidas: [], erros: [] }
      }
      if (!operacaoDestinoPath || typeof operacaoDestinoPath !== 'string') {
        return { success: false, error: 'Operação de destino inválida', transferidas: [], erros: [] }
      }

      const operacaoAtual = getOperacaoAtual()
      if (!operacaoAtual || !operacaoAtual.path) {
        return { success: false, error: 'Nenhuma operação atual definida', transferidas: [], erros: [] }
      }

      const contasTelegramDir = 'contas telegram'
      const destBaseDir = path.join(PATHS.OPERACOES_DIR, operacaoDestinoPath, contasTelegramDir)
      if (!fs.existsSync(destBaseDir)) {
        fs.mkdirSync(destBaseDir, { recursive: true })
      }

      const transferidas = []
      const erros = []

      for (const numero of accountNumeros) {
        const numeroStr = String(numero).trim()
        if (!numeroStr) continue

        const origemDir = path.join(PATHS.OPERACOES_DIR, operacaoAtual.path, contasTelegramDir, numeroStr)
        const destinoDir = path.join(destBaseDir, numeroStr)

        try {
          if (!fs.existsSync(origemDir)) {
            erros.push(`Conta "${numeroStr}": pasta não encontrada na operação atual`)
            continue
          }
          if (fs.existsSync(destinoDir)) {
            erros.push(`Conta "${numeroStr}": já existe na operação de destino`)
            continue
          }

          fs.cpSync(origemDir, destinoDir, { recursive: true })
          fs.rmSync(origemDir, { recursive: true })
          transferidas.push(numeroStr)
          console.log(`[transferir-contas-entre-ops] ✅ Conta "${numeroStr}" transferida para ${operacaoDestinoPath}`)
        } catch (err) {
          erros.push(`Conta "${numeroStr}": ${err.message}`)
          console.error(`[transferir-contas-entre-ops] Erro ao transferir "${numeroStr}":`, err.message)
        }
      }

      const success = transferidas.length > 0
      return {
        success,
        transferidas,
        erros: erros.length > 0 ? erros : undefined,
        error: !success && erros.length > 0 ? erros.join('; ') : undefined,
      }
    } catch (error) {
      console.error('Erro ao transferir contas entre operações:', error)
      return { success: false, error: error.message, transferidas: [], erros: [] }
    }
  })

  ipcMain.handle('adicionar-contas', async () => {
    try {
      console.log('✅ Handler adicionar-contas chamado')
      const mainWindow = getMainWindow()

      // Abre o seletor de pastas do Windows permitindo múltiplas seleções
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections'],
        title: 'Selecione as pastas das contas do Telegram ou uma pasta com múltiplas contas',
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, error: 'Nenhuma pasta selecionada' }
      }

      // Garante que a pasta de contas existe
      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        fs.mkdirSync(PATHS.CONTAS_DIR, { recursive: true })
      }

      const pastasMovidas = []
      const erros = []

      // Função recursiva para encontrar todas as pastas numéricas
      const encontrarPastasNumericas = (pastaAtual, nivel = 0) => {
        const pastasEncontradas = []

        try {
          // Limitar profundidade para evitar loops infinitos (máximo 3 níveis)
          if (nivel > 3) {
            return pastasEncontradas
          }

          const items = fs.readdirSync(pastaAtual, { withFileTypes: true })

          for (const item of items) {
            if (item.isDirectory()) {
              const itemPath = path.join(pastaAtual, item.name)

              // Se o nome é numérico, adiciona à lista
              if (validateTelegramNumber(item.name)) {
                pastasEncontradas.push({
                  nome: item.name,
                  caminho: itemPath,
                  nivel: nivel
                })
              } else {
                // Se não é numérico, busca recursivamente dentro (mas só até 2 níveis de profundidade)
                if (nivel < 2) {
                  const subPastas = encontrarPastasNumericas(itemPath, nivel + 1)
                  pastasEncontradas.push(...subPastas)
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[adicionar-contas] Erro ao ler pasta ${pastaAtual}:`, error.message)
        }

        return pastasEncontradas
      }

      // Processa cada pasta selecionada
      for (const pastaOrigem of result.filePaths) {
        try {
          const nomePasta = path.basename(pastaOrigem)

          // Verifica se a pasta selecionada é uma pasta numérica (conta individual)
          if (validateTelegramNumber(nomePasta)) {
            // Processa como pasta individual
            const pastaDestino = path.join(PATHS.CONTAS_DIR, nomePasta)

            // Verifica se a pasta já existe no destino
            if (fs.existsSync(pastaDestino)) {
              erros.push(`Pasta "${nomePasta}" já existe em "contas telegram"`)
              continue
            }

            // Move a pasta para o destino
            fs.renameSync(pastaOrigem, pastaDestino)

            // Cria o JSON dentro da pasta movida
            const jsonData = {
              numero: nomePasta,
              quantidade_grupos: 0,
              grupos: [],
              frozen: false,
              tags: [],
              pastaPath: `contas telegram/${nomePasta}`,
            }

            const jsonPath = path.join(pastaDestino, `${nomePasta}.json`)
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4), 'utf-8')

            pastasMovidas.push(nomePasta)
          } else {
            // Pasta não é numérica, buscar pastas numéricas dentro dela
            console.log(`[adicionar-contas] Pasta "${nomePasta}" não é numérica, buscando pastas numéricas dentro...`)
            const pastasNumericas = encontrarPastasNumericas(pastaOrigem)

            if (pastasNumericas.length === 0) {
              erros.push(`Nenhuma pasta numérica encontrada em "${nomePasta}"`)
              continue
            }

            console.log(`[adicionar-contas] Encontradas ${pastasNumericas.length} pasta(s) numérica(s) em "${nomePasta}"`)

            // Processa cada pasta numérica encontrada
            for (const pastaInfo of pastasNumericas) {
              try {
                const pastaDestino = path.join(PATHS.CONTAS_DIR, pastaInfo.nome)

                // Verifica se a pasta já existe no destino
                if (fs.existsSync(pastaDestino)) {
                  erros.push(`Pasta "${pastaInfo.nome}" já existe em "contas telegram"`)
                  continue
                }

                // Move a pasta para o destino
                fs.renameSync(pastaInfo.caminho, pastaDestino)

                // Cria o JSON dentro da pasta movida
                const jsonData = {
                  numero: pastaInfo.nome,
                  quantidade_grupos: 0,
                  grupos: [],
                  frozen: false,
                  tags: [],
                  pastaPath: `contas telegram/${pastaInfo.nome}`,
                }

                const jsonPath = path.join(pastaDestino, `${pastaInfo.nome}.json`)
                fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4), 'utf-8')

                pastasMovidas.push(pastaInfo.nome)
              } catch (error) {
                erros.push(`Erro ao processar pasta "${pastaInfo.nome}": ${error.message}`)
              }
            }
          }
        } catch (error) {
          erros.push(`Erro ao processar pasta "${path.basename(pastaOrigem)}": ${error.message}`)
        }
      }

      if (pastasMovidas.length === 0) {
        return {
          success: false,
          error: erros.length > 0 ? erros.join('; ') : 'Nenhuma pasta foi movida',
        }
      }

      return {
        success: true,
        pastasMovidas,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao adicionar contas:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para baixar links MEGA para pasta (padrão: C:\Users\Samuel\Downloads\numeros). Não importa no sistema.
  ipcMain.handle('baixar-links-mega', async (event, payload) => {
    try {
      const { urls = [], adicionarExtras } = payload || {}
      const listaLinks = Array.isArray(urls) ? urls : [urls].filter(Boolean)
      const normalized = listaLinks
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => u && (u.includes('mega.nz') || u.includes('mega.co.nz')))

      if (normalized.length === 0) {
        return { success: false, error: 'Nenhum link MEGA.nz válido informado', erros: [] }
      }

      const downloadResult = await baixarLinksMega(normalized, { adicionarExtras: !!adicionarExtras })
      const downloadOk = downloadResult.sucesso > 0 || downloadResult.erros.length < normalized.length
      return {
        success: downloadOk,
        sucesso: downloadResult.sucesso,
        erros: downloadResult.erros.length > 0 ? downloadResult.erros.map((e) => `${e.url}: ${e.message}`) : undefined,
        error: downloadResult.erros.length === normalized.length ? 'Todos os downloads falharam' : undefined,
      }
    } catch (error) {
      console.error('[baixar-links-mega] Erro:', error)
      return { success: false, error: error.message, erros: [] }
    }
  })

  // Handler para executar varredura de Telegram e módulos
  ipcMain.handle('executar-varredura-telegram-modulos', async () => {
    try {
      console.log('[executar-varredura-telegram-modulos] Iniciando varredura...')

      const { varreduraTelegramModulos } = requireBackendModule('utils/varreduraTelegramModulos.js')

      const result = await varreduraTelegramModulos(PATHS.CONTAS_DIR)

      return {
        success: true,
        contasProcessadas: result.contasProcessadas,
        contasComTelegramCopiado: result.contasComTelegramCopiado,
        contasComModulosCopiados: result.contasComModulosCopiados,
        erros: result.erros,
      }
    } catch (error) {
      console.error('[executar-varredura-telegram-modulos] Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  ipcMain.handle('get-detalhes-conta', async (event, numero) => {
    try {
      console.log(`[get-detalhes-conta] Buscando detalhes da conta: ${numero}`)

      if (!validateTelegramNumber(numero)) {
        return { success: false, error: 'Número inválido' }
      }

      const contaPath = path.join(PATHS.CONTAS_DIR, numero)
      const jsonPath = path.join(contaPath, `${numero}.json`)

      if (!fs.existsSync(jsonPath)) {
        return { success: false, error: 'Arquivo JSON da conta não encontrado' }
      }

      const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
      const detalhes = JSON.parse(jsonContent)

      // Garantir que grupos é sempre um array
      if (!Array.isArray(detalhes.grupos)) {
        detalhes.grupos = []
      }

      // quantidade_grupos = grupos online (exclui caídos). Só definir se ausente (fallback para compatibilidade)
      if (detalhes.quantidade_grupos == null) {
        detalhes.quantidade_grupos = detalhes.grupos.filter(g => g.caido !== true).length
      }

      // Garantir que tags é sempre um array
      if (!Array.isArray(detalhes.tags)) {
        detalhes.tags = []
      }

      console.log(`[get-detalhes-conta] Detalhes carregados com sucesso para conta ${numero}`)
      console.log(`[get-detalhes-conta] - Quantidade de grupos: ${detalhes.quantidade_grupos}`)
      console.log(`[get-detalhes-conta] - Grupos array length: ${detalhes.grupos.length}`)
      console.log(`[get-detalhes-conta] - Tags: ${detalhes.tags.join(', ') || 'Nenhuma'}`)
      return { success: true, detalhes }
    } catch (error) {
      console.error('Erro ao buscar detalhes da conta:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ Handlers do Telegram registrados com sucesso')
  // Handler para adicionar listas de bots
  ipcMain.handle('adicionar-listas', async (event, payload) => {
    const processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Função para enviar progresso via IPC
    const sendProgress = (progress) => {
      try {
        event.sender.send('automacao-progresso', {
          processId,
          ...progress
        })
      } catch (error) {
        console.warn('[adicionar-listas] Erro ao enviar progresso:', error.message)
      }
    }

    try {
      console.log('[Adicionar Listas Handler] Handler chamado, payload:', payload)

      const { accountIds, listNames, sessoesParalelas } = payload

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Nenhuma conta selecionada')
      }

      // Verificar se alguma conta selecionada é grupo base
      const grupoBaseUtils = requireBackendCommonJS(path.join(PATHS.BASE, 'back', 'utils', 'grupoBaseUtils.js'))
      const contasGrupoBase = grupoBaseUtils.verificarContasGrupoBase(accountIds, {
        accountsDir: PATHS.CONTAS_DIR
      })

      if (contasGrupoBase.length > 0) {
        const nomesGrupos = contasGrupoBase.map(c => c.nome).join(', ')
        const mensagem = `⚠️ ATENÇÃO: ${contasGrupoBase.length} conta(s) selecionada(s) está(ão) marcada(s) como GRUPO BASE:\n\n${contasGrupoBase.map(c => `- ${c.accountId}: ${c.nome}`).join('\n')}\n\nSessões de grupo base NÃO devem ser usadas para adicionar listas.\n\nDeseja continuar mesmo assim?`

        // Retornar erro que será tratado no frontend para mostrar pop-up
        return {
          success: false,
          error: 'CONTAS_GRUPO_BASE',
          contasGrupoBase: contasGrupoBase,
          mensagem: mensagem
        }
      }

      // Suportar tanto listName (antigo) quanto listNames (novo)
      let listasParaProcessar = []
      let quantidadePrioritarias = 0

      if (listNames && Array.isArray(listNames) && listNames.length > 0) {
        listasParaProcessar = listNames
      } else if (payload.listName && typeof payload.listName === 'string') {
        listasParaProcessar = [payload.listName]
      } else {
        // Se não fornecido, carregar todas as listas e ordenar (prioritárias primeiro)
        try {
          // Carregar configuração de quantidade de listas prioritárias
          try {
            const configPath = path.join(PATHS.BASE, 'config', 'listas-config.json')
            if (fs.existsSync(configPath)) {
              const configData = fs.readFileSync(configPath, 'utf-8')
              const config = JSON.parse(configData)
              quantidadePrioritarias = config.quantidadeListasPrioritariasPorGrupo || 0
              console.log(`[adicionar-listas] Quantidade de listas prioritárias configurada: ${quantidadePrioritarias}`)
            }
          } catch (configError) {
            console.warn('[adicionar-listas] Erro ao carregar configuração de listas prioritárias, usando todas:', configError.message)
          }

          // Carregar listas diretamente do diretório
          const listasDir = path.join(PATHS.BASE, 'banco', 'listas')
          const todasListas = []

          if (fs.existsSync(listasDir)) {
            const arquivos = fs.readdirSync(listasDir).filter(arquivo => arquivo.endsWith('.json'))
            for (const arquivo of arquivos) {
              try {
                const arquivoPath = path.join(listasDir, arquivo)
                const data = fs.readFileSync(arquivoPath, 'utf-8')
                const lista = JSON.parse(data)
                todasListas.push(lista)
              } catch (error) {
                console.warn(`[adicionar-listas] Erro ao ler arquivo ${arquivo}:`, error.message)
              }
            }
          }

          if (todasListas.length === 0) {
            throw new Error('Nenhuma lista encontrada no diretório')
          }

          // Separar prioritárias e normais
          const listasPrioritarias = todasListas.filter(l => l.prioritaria === true).map(l => l.listName)
          const listasNormais = todasListas.filter(l => !l.prioritaria).map(l => l.listName)

          // Se quantidadePrioritarias > 0, processar apenas X prioritárias primeiro, depois as outras
          if (quantidadePrioritarias > 0 && listasPrioritarias.length > 0) {
            // Embaralhar listas prioritárias para variar
            const prioritariaEmbaralhada = [...listasPrioritarias].sort(() => Math.random() - 0.5)

            // Pegar quantidade configurada (ou todas se houver menos)
            const quantidade = Math.min(quantidadePrioritarias, prioritariaEmbaralhada.length)
            const listasPrioritariasEscolhidas = prioritariaEmbaralhada.slice(0, quantidade)
            const listasPrioritariasRestantes = prioritariaEmbaralhada.slice(quantidade)

            // Ordenar: X prioritárias escolhidas primeiro, depois normais, depois restantes prioritárias
            listasParaProcessar = [...listasPrioritariasEscolhidas, ...listasNormais, ...listasPrioritariasRestantes]

            console.log(`[adicionar-listas] Carregadas ${listasPrioritarias.length} lista(s) prioritária(s) e ${listasNormais.length} lista(s) normal(is)`)
            console.log(`[adicionar-listas] Processando primeiro ${quantidade} lista(s) prioritária(s), depois ${listasNormais.length} normal(is), depois ${listasPrioritariasRestantes.length} prioritária(s) restante(s)`)
          } else {
            // Se não configurado ou sem prioritárias, processar todas na ordem normal
            listasParaProcessar = [...listasPrioritarias, ...listasNormais]
            console.log(`[adicionar-listas] Carregadas ${listasPrioritarias.length} lista(s) prioritária(s) e ${listasNormais.length} lista(s) normal(is)`)
          }
        } catch (error) {
          console.warn('[adicionar-listas] Erro ao carregar listas automaticamente:', error.message)
          throw new Error('Nenhuma lista fornecida e não foi possível carregar listas automaticamente')
        }
      }

      if (listasParaProcessar.length === 0) {
        throw new Error('Nenhuma lista para processar')
      }

      console.log(`[adicionar-listas] Processando ${listasParaProcessar.length} lista(s): ${listasParaProcessar.join(', ')}`)

      // Obter número de sessões paralelas (padrão: 1)
      const maxSessoes = Math.min(sessoesParalelas || 1, accountIds.length)

      // Importar o módulo addListBots
      const addListBotsPath = path.join(BACK_DIR, 'adicionar listas', 'addListBots.js')

      let addAllListsBotsToAccount
      try {
        // Limpar cache do módulo para garantir que estamos usando a versão mais recente
        if (fs.existsSync(addListBotsPath)) {
          try {
            const resolvedPath = require.resolve(addListBotsPath)
            if (require.cache && require.cache[resolvedPath]) {
              delete require.cache[resolvedPath]
            }
          } catch (cacheError) {
            console.warn('[Adicionar Listas] Erro ao limpar cache (continuando mesmo assim):', cacheError.message)
          }
        }

        const addListBotsModule = require(addListBotsPath)
        addAllListsBotsToAccount = addListBotsModule.addAllListsBotsToAccount

        if (typeof addAllListsBotsToAccount !== 'function') {
          throw new Error(`addAllListsBotsToAccount não é uma função. Tipo: ${typeof addAllListsBotsToAccount}`)
        }
      } catch (requireError) {
        console.error('[Adicionar Listas] Erro ao importar módulo addListBots:', requireError)
        console.error('[Adicionar Listas] Stack:', requireError.stack)
        throw new Error(`Erro ao carregar módulo addListBots: ${requireError.message}`)
      }

      // Importar getAccountGroups
      const { getAccountGroups } = require(path.join(BACK_DIR, 'verificador', 'verificadorcontas.js'))

      // Obter paths baseados na operação atual
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      console.log('[Adicionar Listas] Usando paths:', customPaths)
      console.log('[Adicionar Listas] Listas para processar:', listasParaProcessar)
      console.log('[Adicionar Listas] Contas:', accountIds)
      console.log('[Adicionar Listas] Sessões paralelas:', maxSessoes)

      // Importar WorkerPool se disponível com verificação defensiva
      let WorkerPool = null
      try {
        const workerPoolPath = path.join(PATHS.BASE, 'back', 'utils', 'workerPool.js')
        const workerPoolModule = require(workerPoolPath)

        // Verificação defensiva
        if (!workerPoolModule || typeof workerPoolModule.WorkerPool !== 'function') {
          throw new Error('WorkerPool não é uma função válida')
        }

        WorkerPool = workerPoolModule.WorkerPool
        console.log('[Adicionar Listas] ✅ WorkerPool carregado com sucesso')
      } catch (error) {
        console.warn('[adicionar-listas] WorkerPool não encontrado, usando processamento sequencial:', error.message)
        WorkerPool = null
      }

      // Verificação adicional antes de usar
      if (WorkerPool === null || WorkerPool === undefined || typeof WorkerPool !== 'function') {
        if (maxSessoes > 1) {
          console.warn('[adicionar-listas] WorkerPool não disponível, forçando processamento sequencial')
        }
      }

      // Calcular total de tarefas: uma tarefa por conta (cada conta processa todas as listas de uma vez)
      const totalTarefasComListas = accountIds.length
      let completedCount = 0
      let successCount = 0
      let errorCount = 0
      const errorsList = []
      const details = []
      const times = []
      let totalBotsAdded = 0

      // Enviar progresso inicial
      sendProgress({
        completed: 0,
        total: totalTarefasComListas,
        message: `Iniciando adição de bots... (${accountIds.length} conta(s), ${listasParaProcessar.length} lista(s) por conta)`,
        activeWorkers: 0,
        averageTime: 0,
        estimatedTimeRemaining: 0
      })

      // Se WorkerPool estiver disponível e maxSessoes > 1, usar processamento paralelo
      if (WorkerPool && maxSessoes > 1) {
        console.log(`[adicionar-listas] ✅ Usando processamento paralelo com ${maxSessoes} workers`)

        // Preparar tarefas: uma tarefa por conta (cada conta processa TODAS as listas de uma vez)
        const tasks = []
        for (const accountId of accountIds) {
          tasks.push({
            taskId: `${accountId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            accountId,
            listNames: listasParaProcessar, // Todas as listas de uma vez
            customPaths,
            processId, // Incluir processId para rastreamento
            proxyId: payload.proxyId || null, // Proxy específico (opcional)
          })
        }

        // Criar função worker que será executada pela fila global
        const executeAddLists = async () => {
          // Inicializar pool específico para esta operação
          globalAddListsQueue.initializePool(maxSessoes)
          globalAddListsQueue.registerProgressCallback(processId, sendProgress)

          // Adicionar tarefas ao pool interno
          globalAddListsQueue.enqueueTasks(tasks)

          console.log(`[adicionar-listas] ✅ ${totalTarefasComListas} tarefa(s) adicionada(s) ao WorkerPool interno`)

          // Processar fila interna (WorkerPool gerencia workers paralelos)
          await globalAddListsQueue.processQueue(
            async (task) => {
              const taskStartTime = Date.now()
              let queueStats = globalAddListsQueue.getStats() // Declarar uma vez no início

              // Removido: criação de API integrada (disponível apenas na aba Criar API)
              let apiCreationPromise = null
              if (false) { // Desabilitado
                const accountIdStr = String(task.accountId || '').trim()

                // Delay distribuído entre workers para evitar cliques simultâneos
                // IMPORTANTE: Cada worker precisa ter delay suficiente para não clicar ao mesmo tempo
                const delayBase = 5000 // 5 segundos base
                const delayRandom = Math.random() * 5000 // 0-5 segundos aleatório
                const delayWorker = (task.workerId || 0) * 10000 // 10 segundos entre cada worker
                const totalDelay = delayBase + delayRandom + delayWorker

                console.log(`[Adicionar Listas] Worker ${task.workerId || 0} - Delay total: ${Math.round(totalDelay / 1000)}s antes de criar API`)

                apiCreationPromise = (async () => {
                  try {
                    await new Promise(resolve => setTimeout(resolve, totalDelay))

                    console.log(`[Adicionar Listas] Iniciando criação de API em paralelo para ${accountIdStr}...`)

                    // Carregar módulo de criação de API
                    const telegramApiCreatorPath = path.join(BACK_DIR, 'utils', 'telegramApiCreator.js')
                    const { criarApiParaConta } = require(telegramApiCreatorPath)

                    // Função local para salvar API
                    const saveApiToFile = async (apiId, apiHash, accountId) => {
                      try {
                        const apisFile = PATHS.APIS_TELEGRAM_FILE
                        let apis = []
                        if (fs.existsSync(apisFile)) {
                          const data = fs.readFileSync(apisFile, 'utf-8')
                          apis = JSON.parse(data).apis || []
                        }

                        const existingIndex = apis.findIndex(api => api.api_id === apiId && api.api_hash === apiHash)
                        if (existingIndex >= 0) {
                          if (accountId && !apis[existingIndex].createdBy) {
                            apis[existingIndex].createdBy = accountId
                            fs.writeFileSync(apisFile, JSON.stringify({ apis }, null, 2), 'utf-8')
                          }
                          return { success: true, alreadyExists: true }
                        }

                        apis.push({
                          id: Date.now().toString(),
                          api_id: apiId,
                          api_hash: apiHash,
                          createdAt: new Date().toISOString(),
                          createdBy: accountId || null,
                        })

                        fs.writeFileSync(apisFile, JSON.stringify({ apis }, null, 2), 'utf-8')
                        return { success: true }
                      } catch (error) {
                        return { success: false, error: error.message }
                      }
                    }

                    // Criar API (com timeout aumentado - 5 minutos)
                    // Cada worker usa API e proxy diferentes, então não é rate limit entre sessões
                    // PASSAR PROXY para o Playwright usar (já vem no formato correto do WorkerPool)
                    const taskProxyReservado = task.proxyReservado || null;

                    console.log(`[Adicionar Listas] Iniciando criação de API para ${accountIdStr} (worker ${task.workerId || 0})`)
                    if (taskProxyReservado) {
                      const proxyStr = taskProxyReservado.server || `${taskProxyReservado.host}:${taskProxyReservado.port}`;
                      console.log(`[Adicionar Listas] Usando proxy: ${proxyStr}`)
                    } else {
                      console.log(`[Adicionar Listas] ⚠️ Nenhum proxy disponível para esta tarefa`)
                    }

                    const apiResult = await Promise.race([
                      criarApiParaConta(accountIdStr, task.customPaths || {}, null, taskProxyReservado),
                      new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout: A requisição está demorando muito (5 minutos)')), 300000) // 5 minutos
                      )
                    ]).catch((timeoutError) => {
                      console.error(`[Adicionar Listas] Timeout ao criar API para ${accountIdStr}:`, timeoutError.message)
                      return {
                        success: false,
                        error: timeoutError.message || 'Timeout ao criar API - o site pode estar lento'
                      }
                    })

                    if (apiResult.success) {
                      try {
                        await saveApiToFile(apiResult.apiId, apiResult.apiHash, accountIdStr)
                        console.log(`[Adicionar Listas] ✅ API criada e SALVA para ${accountIdStr}: ${apiResult.apiId}`)
                      } catch (saveError) {
                        console.error(`[Adicionar Listas] ⚠️ API criada mas erro ao salvar: ${saveError.message}`)
                      }

                      return {
                        success: true,
                        apiId: apiResult.apiId,
                        apiHash: apiResult.apiHash,
                        saved: true
                      }
                    } else {
                      console.warn(`[Adicionar Listas] ⚠️ Erro ao criar API para ${accountIdStr}: ${apiResult.error}`)
                      return {
                        success: false,
                        error: apiResult.error
                      }
                    }
                  } catch (error) {
                    console.error(`[Adicionar Listas] ⚠️ Erro inesperado ao criar API para ${accountIdStr}: ${error.message}`)
                    return {
                      success: false,
                      error: error.message
                    }
                  }
                })()
              }

              try {
                // Enviar progresso antes de iniciar (usar stats da fila global)
                sendProgress({
                  completed: completedCount,
                  total: totalTarefasComListas,
                  message: `Processando conta ${task.accountId} (${task.listNames.length} lista(s))...`,
                  activeWorkers: queueStats.activeWorkers,
                  averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
                  estimatedTimeRemaining: globalAddListsQueue.pool ? globalAddListsQueue.pool.calculateEstimatedTime() : 0,
                  currentTask: `Conta: ${task.accountId}, Listas: ${task.listNames.join(', ')}`
                })

                // Buscar grupos da conta
                const accountGroups = await getAccountGroups(task.accountId, task.customPaths || {})

                if (!accountGroups || accountGroups.length === 0) {
                  throw new Error('Conta não possui grupos')
                }

                // Processar conta com TODAS as listas de uma vez (login uma vez, adiciona todas as listas)
                const result = await addAllListsBotsToAccount(
                  task.accountId,
                  accountGroups,
                  task.listNames, // Todas as listas de uma vez
                  {
                    ...task.customPaths,
                    apiCredentials: task.apiCredentials,
                    proxyReservado: task.proxyReservado,
                    proxyId: task.proxyId || null, // Proxy específico (opcional)
                  },
                  task.workerId !== undefined ? task.workerId + 1 : undefined // workerId começa em 0, mas queremos mostrar 1, 2, 3...
                )

                // Removido: aguardar criação de API (integrada removida)

                const elapsedTime = Date.now() - taskStartTime
                times.push(elapsedTime)
                completedCount++
                successCount++

                if (result.botsAdded) {
                  totalBotsAdded += result.botsAdded
                }

                // Removido: resultado de API (funcionalidade removida)
                const detailResult = { accountId: task.accountId, ...result }
                details.push(detailResult)

                const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
                const remaining = totalTarefasComListas - completedCount
                const estimatedTime = remaining > 0 && averageTime > 0
                  ? Math.ceil((remaining / maxSessoes) * averageTime)
                  : 0

                // Atualizar queueStats antes de enviar progresso
                queueStats = globalAddListsQueue.getStats()
                sendProgress({
                  completed: completedCount,
                  total: totalTarefasComListas,
                  message: `Processando... (${completedCount}/${totalTarefasComListas})`,
                  activeWorkers: queueStats.activeWorkers,
                  averageTime: averageTime,
                  estimatedTimeRemaining: estimatedTime,
                  currentTask: `Conta: ${task.accountId}, Listas: ${task.listNames.join(', ')}`,
                  errors: errorCount
                })

                return { success: true, result, accountId: task.accountId }
              } catch (error) {
                errorCount++

                // Verificar se é erro de flood wait (já foi marcado com tag FLOODWAIT no addAllListsBotsToAccount)
                const isFloodWaitError = error.name === 'FloodWaitAccountError' ||
                  error.message?.includes('FloodWait') ||
                  error.message?.includes('flood wait')

                const errorMessage = isFloodWaitError
                  ? `FloodWait detectado - conta ${task.accountId} marcada com tag FLOODWAIT e pulada`
                  : (error.message || 'Erro desconhecido')

                if (isFloodWaitError) {
                  console.log(`[adicionar-listas] ⚠️ Conta ${task.accountId} teve flood wait. Tag FLOODWAIT já foi adicionada. Pulando para próxima conta...`)
                }

                errorsList.push({
                  accountId: task.accountId,
                  error: errorMessage
                })
                completedCount++

                const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
                const remaining = totalTarefasComListas - completedCount
                const estimatedTime = remaining > 0 && averageTime > 0
                  ? Math.ceil((remaining / maxSessoes) * averageTime)
                  : 0

                // Atualizar queueStats antes de enviar progresso
                queueStats = globalAddListsQueue.getStats()
                sendProgress({
                  completed: completedCount,
                  total: totalTarefasComListas,
                  message: isFloodWaitError ? `Conta ${task.accountId} teve flood wait (pulada)` : `Erro na conta ${task.accountId}`,
                  activeWorkers: queueStats.activeWorkers,
                  averageTime: averageTime,
                  estimatedTimeRemaining: estimatedTime,
                  currentTask: isFloodWaitError ? `Conta: ${task.accountId} (flood wait - pulada)` : `Conta: ${task.accountId} (erro)`,
                  errors: errorCount
                })

                return { success: false, error: errorMessage, accountId: task.accountId }
              }
            }
          )

          // Limpar callback de progresso quando terminar
          globalAddListsQueue.unregisterProgressCallback(processId)
        }

        // Adicionar à fila global de tarefas críticas
        // Isso garante que esta operação aguarde outras operações críticas terminarem
        await new Promise((resolve, reject) => {
          globalTaskQueue.enqueue({
            type: 'adicionar-listas',
            processId,
            workerFunction: executeAddLists,
            sendProgress,
            maxWorkers: maxSessoes,
            taskData: {
              accountIds,
              listasParaProcessar,
              totalTarefasComListas
            },
            onComplete: resolve,
            onError: reject
          })

          console.log(`[adicionar-listas] ✅ Operação adicionada à fila global de tarefas críticas`)
          console.log(`[adicionar-listas] 📊 Estatísticas da fila global:`, globalTaskQueue.getStats())
        })

        console.log(`[adicionar-listas] ✅ Operação adicionada à fila global de tarefas críticas`)
        console.log(`[adicionar-listas] 📊 Estatísticas da fila global:`, globalTaskQueue.getStats())

        // Aguardar processamento pela fila global (pode aguardar outras operações)
        // A fila global processará quando for a vez desta operação
        await new Promise((resolve) => {
          // A fila global processará automaticamente
          // Aguardar até que a tarefa seja processada
          const checkInterval = setInterval(() => {
            const stats = globalTaskQueue.getStats()
            if (!stats.isProcessing || stats.currentProcessId !== processId) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)

          // Timeout de segurança (não deve acontecer, mas previne travamento)
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve()
          }, 3600000) // 1 hora máximo
        })
      } else {
        // Processamento sequencial
        console.log(`[adicionar-listas] Usando processamento sequencial (workers: ${maxSessoes})`)

        // Processar cada conta (cada conta processa TODAS as listas de uma vez)
        for (let i = 0; i < accountIds.length; i++) {
          const accountId = accountIds[i]
          const taskStartTime = Date.now()

          try {
            sendProgress({
              completed: completedCount,
              total: totalTarefasComListas,
              message: `Processando conta ${accountId} (${listasParaProcessar.length} lista(s))...`,
              activeWorkers: 1,
              averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
              estimatedTimeRemaining: 0,
              currentTask: `Conta: ${accountId}, Listas: ${listasParaProcessar.join(', ')}`
            })

            // Buscar grupos da conta
            const accountGroups = await getAccountGroups(accountId, customPaths || {})

            if (!accountGroups || accountGroups.length === 0) {
              throw new Error('Conta não possui grupos')
            }

            // Processar conta com TODAS as listas de uma vez (login uma vez, adiciona todas as listas)
            const result = await addAllListsBotsToAccount(accountId, accountGroups, listasParaProcessar, customPaths)

            const elapsedTime = Date.now() - taskStartTime
            times.push(elapsedTime)
            completedCount++
            successCount++

            if (result.botsAdded) {
              totalBotsAdded += result.botsAdded
            }
            details.push({ accountId, listas: listasParaProcessar, ...result })

            const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
            const remaining = totalTarefasComListas - completedCount
            const estimatedTime = remaining > 0 && averageTime > 0
              ? Math.ceil(remaining * averageTime)
              : 0

            sendProgress({
              completed: completedCount,
              total: totalTarefasComListas,
              message: `Processando... (${completedCount}/${totalTarefasComListas})`,
              activeWorkers: 1,
              averageTime: averageTime,
              estimatedTimeRemaining: estimatedTime,
              currentTask: `Conta: ${accountId}, Listas: ${listasParaProcessar.join(', ')}`,
              errors: errorCount
            })
          } catch (error) {
            errorCount++

            // Verificar se é erro de flood wait (já foi marcado com tag FLOODWAIT no addAllListsBotsToAccount)
            const isFloodWaitError = error.name === 'FloodWaitAccountError' ||
              error.message?.includes('FloodWait') ||
              error.message?.includes('flood wait')

            const errorMessage = isFloodWaitError
              ? `FloodWait detectado - conta ${accountId} marcada com tag FLOODWAIT e pulada`
              : (error.message || 'Erro desconhecido')

            if (isFloodWaitError) {
              console.log(`[adicionar-listas] ⚠️ Conta ${accountId} teve flood wait. Tag FLOODWAIT já foi adicionada. Pulando para próxima conta...`)
            }

            errorsList.push({
              accountId,
              error: errorMessage
            })
            completedCount++

            const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
            const remaining = totalTarefasComListas - completedCount
            const estimatedTime = remaining > 0 && averageTime > 0
              ? Math.ceil(remaining * averageTime)
              : 0

            sendProgress({
              completed: completedCount,
              total: totalTarefasComListas,
              message: isFloodWaitError ? `Conta ${accountId} teve flood wait (pulada)` : `Erro na conta ${accountId}`,
              activeWorkers: 1,
              averageTime: averageTime,
              estimatedTimeRemaining: estimatedTime,
              currentTask: isFloodWaitError ? `Conta: ${accountId} (flood wait - pulada)` : `Conta: ${accountId} (erro)`,
              errors: errorCount
            })
          }
        }
      }

      // Enviar progresso final
      sendProgress({
        completed: totalTarefasComListas,
        total: totalTarefasComListas,
        message: 'Concluído!',
        activeWorkers: 0,
        averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        estimatedTimeRemaining: 0
      })

      console.log('[Adicionar Listas] ✅ Resultado completo')
      console.log('[Adicionar Listas] Total de bots adicionados:', totalBotsAdded)
      console.log('[Adicionar Listas] Contas processadas:', successCount)
      console.log('[Adicionar Listas] Erros:', errorCount)

      // Retornar resultado completo
      return {
        success: successCount > 0 || totalBotsAdded > 0,
        totalBotsAdded: totalBotsAdded,
        details: details,
        errorsList: errorsList,
        errors: errorCount,
        successCount: successCount,
        error: errorsList.length > 0
          ? `${errorsList.length} erro(s) encontrado(s)`
          : null,
        processId
      }
    } catch (error) {
      console.error('[Adicionar Listas] ❌ Erro:', error)

      // Enviar progresso de erro
      sendProgress({
        completed: 0,
        total: 0,
        message: `Erro: ${error.message || 'Erro desconhecido'}`,
        activeWorkers: 0,
        error: error.message || 'Erro desconhecido'
      })

      return {
        success: false,
        error: error.message || 'Erro ao adicionar listas',
        processId
      }
    }
  })

  // Handler para alterar categoria em massa
  ipcMain.handle('alterar-categoria-em-massa', async (event, accountIds, categoriaId) => {
    try {
      console.log(`[Alterar Categoria em Massa] Alterando categoria de ${accountIds.length} conta(s) para categoria ${categoriaId}`)

      const results = {
        success: 0,
        errors: 0,
        errorsList: [],
      }

      for (const accountId of accountIds) {
        try {
          const accountPath = path.join(PATHS.CONTAS_DIR, accountId)
          const jsonPath = path.join(accountPath, `${accountId}.json`)

          if (!fs.existsSync(jsonPath)) {
            results.errors++
            results.errorsList.push({ accountId, error: 'Conta não encontrada' })
            continue
          }

          const content = fs.readFileSync(jsonPath, 'utf-8')
          const accountData = JSON.parse(content)

          // Atualizar categoria (null para remover categoria)
          accountData.categoriaId = categoriaId || null

          fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
          results.success++
          console.log(`[Alterar Categoria em Massa] ✅ Categoria alterada para conta ${accountId}`)
        } catch (error) {
          results.errors++
          results.errorsList.push({ accountId, error: error.message })
          console.error(`[Alterar Categoria em Massa] ❌ Erro ao alterar categoria da conta ${accountId}:`, error.message)
        }
      }

      return {
        success: results.success > 0,
        successCount: results.success,
        errorCount: results.errors,
        errorsList: results.errorsList,
      }
    } catch (error) {
      console.error('[Alterar Categoria em Massa] ❌ Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro ao alterar categorias',
      }
    }
  })

  // Handler para alterar tags em massa
  ipcMain.handle('alterar-tags-em-massa', async (event, accountIds, tagsParaAdicionar, tagsParaRemover) => {
    try {
      console.log(`[Alterar Tags em Massa] Alterando tags de ${accountIds.length} conta(s)`)
      console.log(`[Alterar Tags em Massa] Tags para adicionar:`, tagsParaAdicionar)
      console.log(`[Alterar Tags em Massa] Tags para remover:`, tagsParaRemover)

      const results = {
        success: 0,
        errors: 0,
        errorsList: [],
      }

      for (const accountId of accountIds) {
        try {
          const accountPath = path.join(PATHS.CONTAS_DIR, accountId)
          const jsonPath = path.join(accountPath, `${accountId}.json`)

          if (!fs.existsSync(jsonPath)) {
            results.errors++
            results.errorsList.push({ accountId, error: 'Conta não encontrada' })
            continue
          }

          const content = fs.readFileSync(jsonPath, 'utf-8')
          const accountData = JSON.parse(content)

          // Garantir que tags é um array
          if (!Array.isArray(accountData.tags)) {
            accountData.tags = []
          }

          // Remover tags
          if (tagsParaRemover && tagsParaRemover.length > 0) {
            accountData.tags = accountData.tags.filter(tag => !tagsParaRemover.includes(tag))
          }

          // Adicionar tags (sem duplicatas)
          if (tagsParaAdicionar && tagsParaAdicionar.length > 0) {
            for (const tag of tagsParaAdicionar) {
              if (!accountData.tags.includes(tag)) {
                accountData.tags.push(tag)
              }
            }
          }

          fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
          results.success++
          console.log(`[Alterar Tags em Massa] ✅ Tags alteradas para conta ${accountId}`)
        } catch (error) {
          results.errors++
          results.errorsList.push({ accountId, error: error.message })
          console.error(`[Alterar Tags em Massa] ❌ Erro ao alterar tags da conta ${accountId}:`, error.message)
        }
      }

      return {
        success: results.success > 0,
        successCount: results.success,
        errorCount: results.errors,
        errorsList: results.errorsList,
      }
    } catch (error) {
      console.error('[Alterar Tags em Massa] ❌ Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro ao alterar tags',
      }
    }
  })

  // Handler IPC para criar bot via BotFather
  ipcMain.handle('criar-bot-telegram', async (event, accountId, botName, botUsername, fotoBase64, proxyId = null) => {
    try {
      console.log(`[criar-bot-telegram] Criando bot ${botName} (@${botUsername}) para conta ${accountId}`)

      if (!accountId || !botName || !botUsername) {
        return { success: false, error: 'ID da conta, nome do bot e @ do bot são obrigatórios' }
      }

      // Importar função createBotViaBotFather do backend
      const criadorModule = requireBackendModule('criador/criador.js')
      const { createBotViaBotFather } = criadorModule

      if (!createBotViaBotFather) {
        throw new Error('Função createBotViaBotFather não encontrada no módulo criador')
      }

      // Preparar customPaths
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      // Criar bot via BotFather
      // proxyId já é um parâmetro direto da função, não precisa de payload
      const result = await createBotViaBotFather(accountId, botName, botUsername, fotoBase64, customPaths, proxyId)

      if (!result.success || !result.token) {
        return { success: false, error: result.error || 'Erro ao criar bot' }
      }

      console.log(`[criar-bot-telegram] Bot criado com sucesso, token: ${result.token.substring(0, 10)}...`)

      // IMPORTANTE: Salvar token de forma segura (sempre, mesmo sem categoria)
      try {
        const criadorModule = requireBackendModule('criador/criador.js')
        const { salvarTokenBotSeguro } = criadorModule

        if (salvarTokenBotSeguro) {
          await salvarTokenBotSeguro(
            botName,
            result.token,
            botUsername,
            null, // Sem categoria (será salvo no backup global)
            customPaths
          )
          console.log(`[criar-bot-telegram] ✅ Token salvo com segurança`)
        }
      } catch (tokenSaveError) {
        console.warn(`[criar-bot-telegram] ⚠️ Erro ao salvar token (continuando):`, tokenSaveError.message)
      }

      // IMPORTANTE: Adicionar tag de bot de disparo e @ do bot (sem categoria = tag normal)
      try {
        const criadorModule = requireBackendModule('criador/criador.js')
        const { markAccountAsBotDisparo } = criadorModule

        if (markAccountAsBotDisparo) {
          // Sem categoria, então usar tag normal de bot de disparo, mas incluir @ do bot
          markAccountAsBotDisparo(accountId, null, customPaths.accountsDir, botUsername)
          console.log(`[criar-bot-telegram] ✅ Tag de bot de disparo e @ do bot aplicadas à conta ${accountId}`)
        }
      } catch (tagError) {
        console.warn(`[criar-bot-telegram] ⚠️ Erro ao aplicar tag (continuando):`, tagError.message)
      }

      // Adicionar bot à verificação de bots de mídia
      // Criar bot na pasta de bots de mídia (usar primeiro nicho disponível ou criar um padrão)
      try {
        const nichosDir = PATHS.NICHOS_DIR
        if (fs.existsSync(nichosDir)) {
          const nichos = fs.readdirSync(nichosDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)

          // Usar primeiro nicho disponível, ou criar um nicho padrão "Bots Criados"
          let nichoId = nichos.length > 0 ? nichos[0] : 'Bots Criados'

          // Criar nicho padrão se não existir
          if (nichos.length === 0) {
            const nichoPath = path.join(nichosDir, nichoId)
            if (!fs.existsSync(nichoPath)) {
              fs.mkdirSync(nichoPath, { recursive: true })
              console.log(`[criar-bot-telegram] Nicho padrão "${nichoId}" criado`)
            }
          }

          const pastaNichoPath = path.join(nichosDir, nichoId)
          const nomeArquivo = botName.replace(/[<>:"/\\|?*]/g, '_') + '.json'
          const arquivoPath = path.join(pastaNichoPath, nomeArquivo)

          // Verificar se o arquivo já existe
          if (!fs.existsSync(arquivoPath)) {
            const botData = {
              bot_nome: botName,
              bot_token: result.token,
              bot_username: botUsername,
              createdAt: new Date().toISOString(),
              contas: [],
            }

            fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
            console.log(`[criar-bot-telegram] ✅ Bot adicionado à verificação de bots de mídia: ${arquivoPath}`)
          } else {
            console.warn(`[criar-bot-telegram] ⚠️ Arquivo de bot já existe, atualizando token...`)
            const botData = JSON.parse(fs.readFileSync(arquivoPath, 'utf-8'))
            botData.bot_token = result.token
            botData.bot_username = botUsername
            if (!botData.createdAt && !botData.created_at) {
              botData.createdAt = new Date().toISOString()
            }
            fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
          }
        }
      } catch (botMidiaError) {
        console.warn(`[criar-bot-telegram] ⚠️ Erro ao adicionar bot à verificação de mídia (continuando):`, botMidiaError.message)
        // Não falhar se não conseguir adicionar à verificação
      }

      return {
        success: true,
        token: result.token,
        username: result.username,
        name: result.name,
      }
    } catch (error) {
      console.error('[criar-bot-telegram] Erro ao criar bot:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao criar bot',
      }
    }
  })

  // Handler IPC para verificar status dos grupos (online/offline)
  ipcMain.handle('verificar-grupos-online', async (event, accountIds) => {
    try {
      console.log(`[verificar-grupos-online] Verificando grupos de ${accountIds.length} conta(s)...`)

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return { success: false, error: 'Nenhuma conta fornecida' }
      }

      // Importar módulo de verificação de grupos
      const verificarGruposPath = path.join(BACK_DIR, 'verificador grupos', 'verificarGruposOnline.js')
      const verificarGruposModule = requireBackendModule('verificador grupos/verificarGruposOnline.js')
      const { verificarGruposConta } = verificarGruposModule

      if (!verificarGruposConta) {
        throw new Error('Função verificarGruposConta não encontrada')
      }

      // Preparar customPaths
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        nichosDir: PATHS.NICHOS_DIR,
        categoriasDir: path.join(PATHS.BANCO_DIR, 'categorias'),
      }

      const resultados = []
      let totalGrupos = 0
      let gruposOnline = 0
      let gruposOffline = 0

      // Verificar grupos de cada conta
      for (const accountId of accountIds) {
        try {
          console.log(`[verificar-grupos-online] Verificando grupos da conta ${accountId}...`)
          const resultado = await verificarGruposConta(accountId, customPaths, { removeOffline: true })

          if (resultado.success) {
            resultados.push({
              accountId,
              ...resultado,
            })
            totalGrupos += resultado.total || 0
            gruposOnline += resultado.online || 0
            gruposOffline += resultado.offline || 0
          } else {
            resultados.push({
              accountId,
              success: false,
              error: resultado.error,
              grupos: [],
            })
          }
        } catch (error) {
          console.error(`[verificar-grupos-online] Erro ao verificar conta ${accountId}:`, error)
          resultados.push({
            accountId,
            success: false,
            error: error.message,
            grupos: [],
          })
        }

        // Delay entre contas
        if (accountIds.indexOf(accountId) < accountIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Salvar estatísticas de grupos online no banco de dados
      try {
        const databasePath = path.join(PATHS.BASE, 'back', 'utils', 'database.js')
        const databaseModule = require(databasePath)
        const customPaths = {
          rootDir: PATHS.BASE,
          bancoDir: PATHS.BANCO_DIR,
        }

        // Obter estatísticas do dia anterior para calcular diferença
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

        const allStats = databaseModule.getStatsLastDays(2, customPaths)
        const yesterdayStats = allStats.find(s => s.date === yesterdayStr)
        const gruposOnlineOntem = yesterdayStats?.gruposOnline || gruposOnline

        // Calcular grupos criados e caídos hoje
        const gruposCriadosHoje = gruposOnline > gruposOnlineOntem ? gruposOnline - gruposOnlineOntem : 0
        const gruposCaidosHoje = gruposOnline < gruposOnlineOntem ? gruposOnlineOntem - gruposOnline : 0

        databaseModule.saveGruposStats(gruposOnline, gruposCriadosHoje, gruposCaidosHoje, customPaths)
        console.log(`[verificar-grupos-online] ✅ Estatísticas de grupos salvas: ${gruposOnline} online, +${gruposCriadosHoje} criados, -${gruposCaidosHoje} caídos`)
      } catch (dbError) {
        console.warn('[verificar-grupos-online] Erro ao salvar estatísticas de grupos:', dbError.message)
      }

      return {
        success: true,
        resultados,
        resumo: {
          totalContas: accountIds.length,
          totalGrupos,
          gruposOnline,
          gruposOffline,
        },
      }
    } catch (error) {
      console.error('[verificar-grupos-online] Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao verificar grupos',
      }
    }
  })

  // Handler IPC para verificar grupos usando um bot específico
  ipcMain.handle('verificar-grupos-por-bot', async (event, botToken, botUsername) => {
    try {
      console.log(`[verificar-grupos-por-bot] Verificando grupos usando bot @${botUsername}...`)

      if (!botToken || !botUsername) {
        return { success: false, error: 'Token e username do bot são obrigatórios' }
      }

      // Importar módulo de verificação de grupos
      const verificarGruposModule = requireBackendModule('verificador grupos/verificarGruposOnline.js')
      const { verificarGruposPorBot } = verificarGruposModule

      if (!verificarGruposPorBot) {
        throw new Error('Função verificarGruposPorBot não encontrada')
      }

      // Preparar customPaths
      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        nichosDir: PATHS.NICHOS_DIR,
        categoriasDir: path.join(PATHS.BANCO_DIR, 'categorias'),
      }

      // Verificar grupos usando o bot específico
      const resultado = await verificarGruposPorBot(botToken, botUsername, customPaths)

      if (resultado.success) {
        console.log(`[verificar-grupos-por-bot] Resultado completo:`, resultado)

        return {
          success: true,
          resumo: {
            totalGrupos: resultado.total || 0,
            gruposOnline: resultado.online || 0,
            gruposOffline: resultado.offline || 0,
          },
          grupos: resultado.grupos || [],
          gruposEncontrados: resultado.gruposEncontrados || resultado.total || 0,
          message: resultado.message,
        }
      } else {
        return {
          success: false,
          error: resultado.error || 'Erro desconhecido ao verificar grupos',
        }
      }
    } catch (error) {
      console.error('[verificar-grupos-por-bot] Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao verificar grupos',
      }
    }
  })

  // Handler para buscar sessões .session recursivamente
  ipcMain.handle('buscar-sessoes-recursivamente', async (event, pastaOrigem) => {
    try {
      console.log(`✅ Handler buscar-sessoes-recursivamente chamado: ${pastaOrigem}`)

      if (!fs.existsSync(pastaOrigem)) {
        return { success: false, error: 'Pasta não encontrada', sessoes: [] }
      }

      const sessoes = []
      const erros = []

      // Função recursiva para encontrar todos os arquivos .session
      const encontrarSessoes = (pastaAtual) => {
        try {
          const items = fs.readdirSync(pastaAtual, { withFileTypes: true })

          for (const item of items) {
            const itemPath = path.join(pastaAtual, item.name)

            try {
              if (item.isFile() && item.name.endsWith('.session')) {
                // Encontrou um arquivo .session
                const numero = item.name.replace('.session', '')

                // Validar se o nome do arquivo é um número válido
                if (validateTelegramNumber(numero)) {
                  const pastaDestino = path.join(PATHS.CONTAS_DIR, numero)

                  // Verificar se já existe no destino
                  if (!fs.existsSync(pastaDestino)) {
                    sessoes.push({
                      path: itemPath,
                      name: item.name,
                      folder: path.dirname(itemPath),
                      numero: numero,
                    })
                  } else {
                    erros.push(`Sessão "${numero}" já existe em "contas telegram"`)
                  }
                }
              } else if (item.isDirectory()) {
                // Buscar recursivamente em subpastas
                encontrarSessoes(itemPath)
              }
            } catch (error) {
              console.warn(`[buscar-sessoes] Erro ao processar item ${itemPath}:`, error.message)
            }
          }
        } catch (error) {
          console.warn(`[buscar-sessoes] Erro ao ler pasta ${pastaAtual}:`, error.message)
        }
      }

      encontrarSessoes(pastaOrigem)

      if (sessoes.length === 0 && erros.length === 0) {
        return {
          success: false,
          error: 'Nenhuma sessão .session válida encontrada',
          sessoes: [],
        }
      }

      return {
        success: true,
        sessoes,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
      return { success: false, error: error.message, sessoes: [] }
    }
  })

  // Handler para importar sessões .session
  ipcMain.handle('importar-sessoes', async (event, sessionPaths, tagSelecionada) => {
    // Importar tagManager (CommonJS)
    const { manageInitialTags } = requireBackendCommonJS(path.join(PATHS.BASE, 'back', 'utils', 'tagManager.js'))
    try {
      console.log(`✅ Handler importar-sessoes chamado: ${sessionPaths.length} sessão(ões), tag: ${tagSelecionada || 'nenhuma'}`)

      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        fs.mkdirSync(PATHS.CONTAS_DIR, { recursive: true })
      }

      const contasImportadas = []
      const erros = []

      for (const sessionPath of sessionPaths) {
        try {
          if (!fs.existsSync(sessionPath)) {
            erros.push(`Arquivo não encontrado: ${sessionPath}`)
            continue
          }

          const fileName = path.basename(sessionPath)
          const numero = fileName.replace('.session', '')

          if (!validateTelegramNumber(numero)) {
            erros.push(`Nome de arquivo inválido: ${fileName}`)
            continue
          }

          const pastaDestino = path.join(PATHS.CONTAS_DIR, numero)

          if (fs.existsSync(pastaDestino)) {
            erros.push(`Conta "${numero}" já existe`)
            continue
          }

          // Criar pasta da conta
          fs.mkdirSync(pastaDestino, { recursive: true })

          // Mover arquivo .session para a pasta de números da operação (como no portátil)
          const sessionDestino = path.join(pastaDestino, fileName)
          try {
            fs.renameSync(sessionPath, sessionDestino)
          } catch (renameErr) {
            // Se rename falhar (ex: origem e destino em drives diferentes no Windows), copiar e remover original
            fs.copyFileSync(sessionPath, sessionDestino)
            fs.unlinkSync(sessionPath)
          }

          // Criar JSON básico da conta com tags iniciais inteligentes
          const tagsIniciais = manageInitialTags(tagSelecionada ? [tagSelecionada] : []);
          const jsonData = {
            numero: numero,
            quantidade_grupos: 0,
            grupos: [],
            frozen: false,
            tags: tagsIniciais,
            pastaPath: `contas telegram/${numero}`,
          }

          const jsonPath = path.join(pastaDestino, `${numero}.json`)
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')

          contasImportadas.push(numero)
          console.log(`[importar-sessoes] ✅ Sessão "${numero}" importada${tagSelecionada ? ` com tag "${tagSelecionada}"` : ''}`)
        } catch (error) {
          erros.push(`Erro ao importar ${sessionPath}: ${error.message}`)
        }
      }

      if (contasImportadas.length === 0) {
        return {
          success: false,
          error: erros.length > 0 ? erros.join('; ') : 'Nenhuma sessão foi importada',
          contasImportadas: [],
          erros: erros.length > 0 ? erros : undefined,
        }
      }

      return {
        success: true,
        contasImportadas,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao importar sessões:', error)
      return { success: false, error: error.message, contasImportadas: [] }
    }
  })

  // Handler para importar pasta portátil (número completo)
  ipcMain.handle('importar-pasta-portatil', async (event, pastaOrigem, tagSelecionada) => {
    // Importar tagManager (CommonJS)
    const { manageInitialTags } = requireBackendCommonJS(path.join(PATHS.BASE, 'back', 'utils', 'tagManager.js'))
    try {
      console.log(`✅ Handler importar-pasta-portatil chamado: ${pastaOrigem}, tag: ${tagSelecionada || 'nenhuma'}`)

      if (!fs.existsSync(pastaOrigem)) {
        return { success: false, error: 'Pasta não encontrada', contasImportadas: [] }
      }

      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        fs.mkdirSync(PATHS.CONTAS_DIR, { recursive: true })
      }

      const nomePasta = path.basename(pastaOrigem)
      const contasImportadas = []
      const erros = []

      // Verificar se é uma pasta numérica (conta individual)
      if (validateTelegramNumber(nomePasta)) {
        const pastaDestino = path.join(PATHS.CONTAS_DIR, nomePasta)

        if (fs.existsSync(pastaDestino)) {
          return {
            success: false,
            error: `Conta "${nomePasta}" já existe`,
            contasImportadas: [],
          }
        }

        // Mover pasta completa
        fs.renameSync(pastaOrigem, pastaDestino)

        // Criar/atualizar JSON
        const jsonPath = path.join(pastaDestino, `${nomePasta}.json`)
        if (!fs.existsSync(jsonPath)) {
          // Criar JSON com tags iniciais inteligentes
          const tagsIniciais = manageInitialTags(tagSelecionada ? [tagSelecionada] : []);
          const jsonData = {
            numero: nomePasta,
            quantidade_grupos: 0,
            grupos: [],
            frozen: false,
            tags: tagsIniciais,
            pastaPath: `contas telegram/${nomePasta}`,
          }
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
        } else {
          // If JSON exists, update tags inteligentemente
          const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
          const existingTags = Array.isArray(accountData.tags) ? accountData.tags : []
          // Adicionar tag selecionada se houver, depois aplicar lógica inicial
          const tagsComTagSelecionada = tagSelecionada && !existingTags.includes(tagSelecionada)
            ? [...existingTags, tagSelecionada]
            : existingTags
          accountData.tags = manageInitialTags(tagsComTagSelecionada)
          fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
        }

        contasImportadas.push(nomePasta)
      } else {
        // Buscar pastas numéricas dentro da pasta selecionada
        const encontrarPastasNumericas = (pastaAtual) => {
          const pastasEncontradas = []

          try {
            const items = fs.readdirSync(pastaAtual, { withFileTypes: true })

            for (const item of items) {
              if (item.isDirectory()) {
                const itemPath = path.join(pastaAtual, item.name)

                if (validateTelegramNumber(item.name)) {
                  pastasEncontradas.push({
                    nome: item.name,
                    caminho: itemPath,
                  })
                } else {
                  // Buscar recursivamente
                  const subPastas = encontrarPastasNumericas(itemPath)
                  pastasEncontradas.push(...subPastas)
                }
              }
            }
          } catch (error) {
            console.warn(`[importar-pasta-portatil] Erro ao ler pasta ${pastaAtual}:`, error.message)
          }

          return pastasEncontradas
        }

        const pastasNumericas = encontrarPastasNumericas(pastaOrigem)

        if (pastasNumericas.length === 0) {
          return {
            success: false,
            error: 'Nenhuma pasta numérica encontrada',
            contasImportadas: [],
          }
        }

        // Importar cada pasta encontrada
        for (const pastaInfo of pastasNumericas) {
          try {
            const pastaDestino = path.join(PATHS.CONTAS_DIR, pastaInfo.nome)

            if (fs.existsSync(pastaDestino)) {
              erros.push(`Conta "${pastaInfo.nome}" já existe`)
              continue
            }

            fs.renameSync(pastaInfo.caminho, pastaDestino)

            const jsonPath = path.join(pastaDestino, `${pastaInfo.nome}.json`)
            if (!fs.existsSync(jsonPath)) {
              // Criar JSON com tags iniciais inteligentes
              const tagsIniciais = manageInitialTags(tagSelecionada ? [tagSelecionada] : []);
              const jsonData = {
                numero: pastaInfo.nome,
                quantidade_grupos: 0,
                grupos: [],
                frozen: false,
                tags: tagsIniciais,
                pastaPath: `contas telegram/${pastaInfo.nome}`,
              }
              fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
            } else {
              // If JSON exists, update tags inteligentemente
              const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
              const existingTags = Array.isArray(accountData.tags) ? accountData.tags : []
              // Adicionar tag selecionada se houver, depois aplicar lógica inicial
              const tagsComTagSelecionada = tagSelecionada && !existingTags.includes(tagSelecionada)
                ? [...existingTags, tagSelecionada]
                : existingTags
              accountData.tags = manageInitialTags(tagsComTagSelecionada)
              fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
            }

            contasImportadas.push(pastaInfo.nome)
          } catch (error) {
            erros.push(`Erro ao importar "${pastaInfo.nome}": ${error.message}`)
          }
        }
      }

      if (contasImportadas.length === 0) {
        return {
          success: false,
          error: erros.length > 0 ? erros.join('; ') : 'Nenhuma conta foi importada',
          contasImportadas: [],
          erros: erros.length > 0 ? erros : undefined,
        }
      }

      return {
        success: true,
        contasImportadas,
        erros: erros.length > 0 ? erros : undefined,
      }
    } catch (error) {
      console.error('Erro ao importar pasta portátil:', error)
      return { success: false, error: error.message, contasImportadas: [] }
    }
  })

  // Handler para obter estatísticas de bots de listas em grupos
  ipcMain.handle('get-estatisticas-bots-listas', async () => {
    try {
      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        return {
          success: false,
          error: 'Pasta de contas não encontrada',
          bots: []
        }
      }

      // Mapa para armazenar estatísticas: botUsername -> { grupos: [], totalGrupos: 0 }
      const botsEstatisticas = new Map()

      // Ler todas as pastas de contas
      const pastas = fs.readdirSync(PATHS.CONTAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      // Processar cada conta
      for (const numero of pastas) {
        const accountPath = path.join(PATHS.CONTAS_DIR, numero)
        const jsonPath = path.join(accountPath, `${numero}.json`)

        if (!fs.existsSync(jsonPath)) {
          continue
        }

        try {
          const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

          if (!Array.isArray(accountData.grupos)) {
            continue
          }

          // Processar cada grupo da conta
          accountData.grupos.forEach((grupo) => {
            // Função auxiliar para processar bot
            const processarBot = (botUsername, tipoBot) => {
              if (!botUsername || typeof botUsername !== 'string') {
                return
              }

              // Normalizar username (remover @ e converter para lowercase)
              const botNormalizado = botUsername.replace(/^@/, '').toLowerCase().trim()

              if (!botNormalizado) {
                return
              }

              // Inicializar entrada se não existir
              if (!botsEstatisticas.has(botNormalizado)) {
                botsEstatisticas.set(botNormalizado, {
                  botUsername: botNormalizado,
                  tipos: new Set(), // Tipos de bot (lista, midia)
                  grupos: [],
                  totalGrupos: 0,
                  contas: new Set()
                })
              }

              const estatistica = botsEstatisticas.get(botNormalizado)

              // Adicionar tipo do bot
              estatistica.tipos.add(tipoBot)

              // Adicionar informação do grupo
              estatistica.grupos.push({
                grupoId: grupo.id,
                grupoNome: grupo.nome || 'Sem nome',
                contaNumero: numero,
                membros: grupo.membros || 0,
                linkConvite: grupo.link_convite || null,
                tipoBot: tipoBot
              })

              // Marcar conta como tendo esse bot
              estatistica.contas.add(numero)
            }

            // Verificar campo bots_lista_admin (array de bots de listas)
            if (Array.isArray(grupo.bots_lista_admin) && grupo.bots_lista_admin.length > 0) {
              grupo.bots_lista_admin.forEach(botUsername => {
                processarBot(botUsername, 'lista')
              })
            }

            // Verificar campo bots_midia_admin (array de bots de mídia)
            if (Array.isArray(grupo.bots_midia_admin) && grupo.bots_midia_admin.length > 0) {
              grupo.bots_midia_admin.forEach(botUsername => {
                processarBot(botUsername, 'midia')
              })
            }

            // Verificar campo bot_midia_admin (string - compatibilidade)
            if (grupo.bot_midia_admin && typeof grupo.bot_midia_admin === 'string') {
              processarBot(grupo.bot_midia_admin, 'midia')
            }
          })
        } catch (error) {
          console.warn(`[get-estatisticas-bots-listas] Erro ao processar conta ${numero}:`, error.message)
          continue
        }
      }

      // Converter Map para array e calcular totais
      const resultado = Array.from(botsEstatisticas.values()).map(estatistica => {
        // Calcular total de grupos
        estatistica.totalGrupos = estatistica.grupos.length
        // Converter Set de contas para array
        estatistica.totalContas = estatistica.contas.size
        estatistica.contas = Array.from(estatistica.contas)
        // Converter Set de tipos para array
        estatistica.tipos = Array.from(estatistica.tipos)
        return estatistica
      })

      // Ordenar por total de grupos (maior primeiro)
      resultado.sort((a, b) => b.totalGrupos - a.totalGrupos)

      return {
        success: true,
        bots: resultado,
        totalBots: resultado.length,
        totalGrupos: resultado.reduce((sum, bot) => sum + bot.totalGrupos, 0)
      }
    } catch (error) {
      console.error('[get-estatisticas-bots-listas] Erro:', error)
      return {
        success: false,
        error: error.message,
        bots: []
      }
    }
  })

  // Handler para remover bot de todos os grupos
  ipcMain.handle('remover-bot-todos-grupos', async (event, botUsername) => {
    try {
      if (!botUsername || typeof botUsername !== 'string') {
        return {
          success: false,
          error: 'Username do bot não fornecido'
        }
      }

      // Normalizar username
      const botNormalizado = botUsername.replace(/^@/, '').toLowerCase().trim()

      if (!fs.existsSync(PATHS.CONTAS_DIR)) {
        return {
          success: false,
          error: 'Pasta de contas não encontrada'
        }
      }

      let totalContasAtualizadas = 0
      let totalGruposAtualizados = 0
      const erros = []

      // Ler todas as pastas de contas
      const pastas = fs.readdirSync(PATHS.CONTAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      // Processar cada conta
      for (const numero of pastas) {
        const accountPath = path.join(PATHS.CONTAS_DIR, numero)
        const jsonPath = path.join(accountPath, `${numero}.json`)

        if (!fs.existsSync(jsonPath)) {
          continue
        }

        try {
          const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

          if (!Array.isArray(accountData.grupos)) {
            continue
          }

          let contaAtualizada = false

          // Processar cada grupo da conta
          accountData.grupos.forEach((grupo) => {
            let grupoAtualizado = false

            // Remover de bots_lista_admin
            if (Array.isArray(grupo.bots_lista_admin)) {
              const antes = grupo.bots_lista_admin.length
              grupo.bots_lista_admin = grupo.bots_lista_admin.filter(bot => {
                const botNormalizadoItem = bot.replace(/^@/, '').toLowerCase().trim()
                return botNormalizadoItem !== botNormalizado
              })
              if (grupo.bots_lista_admin.length < antes) {
                grupoAtualizado = true
                totalGruposAtualizados++
              }
            }

            // Remover de bots_midia_admin
            if (Array.isArray(grupo.bots_midia_admin)) {
              const antes = grupo.bots_midia_admin.length
              grupo.bots_midia_admin = grupo.bots_midia_admin.filter(bot => {
                const botNormalizadoItem = bot.replace(/^@/, '').toLowerCase().trim()
                return botNormalizadoItem !== botNormalizado
              })
              if (grupo.bots_midia_admin.length < antes) {
                grupoAtualizado = true
                totalGruposAtualizados++
              }
            }

            // Remover de bot_midia_admin (string - compatibilidade)
            if (grupo.bot_midia_admin && typeof grupo.bot_midia_admin === 'string') {
              const botNormalizadoItem = grupo.bot_midia_admin.replace(/^@/, '').toLowerCase().trim()
              if (botNormalizadoItem === botNormalizado) {
                grupo.bot_midia_admin = ''
                grupoAtualizado = true
                totalGruposAtualizados++
              }
            }

            if (grupoAtualizado) {
              contaAtualizada = true
            }
          })

          // Salvar arquivo se houve alterações
          if (contaAtualizada) {
            fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
            totalContasAtualizadas++
          }
        } catch (error) {
          console.error(`[remover-bot-todos-grupos] Erro ao processar conta ${numero}:`, error.message)
          erros.push({
            conta: numero,
            error: error.message
          })
        }
      }

      return {
        success: true,
        botUsername: botNormalizado,
        totalContasAtualizadas,
        totalGruposAtualizados,
        erros: erros.length > 0 ? erros : undefined
      }
    } catch (error) {
      console.error('[remover-bot-todos-grupos] Erro:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Handler para remover bot fisicamente de todos os grupos (com múltiplas sessões)
  ipcMain.handle('remover-bot-todos-grupos-fisico', async (event, options = {}) => {
    try {
      const { botUsername, maxSessoes = 3, proxyId = null } = options

      if (!botUsername || typeof botUsername !== 'string') {
        return {
          success: false,
          error: 'Username do bot não fornecido'
        }
      }

      // Carregar módulo
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const { removerBotTodosGrupos } = require(path.join(PATHS.BASE, 'back', 'gerenciar bots', 'removerBotTodosGrupos.js'))

      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      const resultado = await removerBotTodosGrupos({
        botUsername,
        maxSessoes,
        proxyId,
      }, customPaths)

      return resultado
    } catch (error) {
      console.error('[remover-bot-todos-grupos-fisico] Erro:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      }
    }
  })

  console.log('📋 Handlers registrados: get-telegram-contas, executar-telegram, excluir-numero, verificar-contas, adicionar-contas, get-detalhes-conta, adicionar-listas, alterar-categoria-em-massa, alterar-tags-em-massa, criar-bot-telegram, verificar-grupos-online, verificar-grupos-por-bot, buscar-sessoes-recursivamente, importar-sessoes, importar-pasta-portatil, get-estatisticas-bots-listas, remover-bot-todos-grupos, remover-bot-todos-grupos-fisico')
}


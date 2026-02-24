import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'
import { getOperacaoAtual } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Função para requerer módulos do backend (CommonJS)
function requireBackendModule(modulePath) {
  const BACK_DIR = path.join(PATHS.BASE, 'back')
  const fullPath = path.join(BACK_DIR, modulePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Módulo não encontrado: ${fullPath}`)
  }
  return require(fullPath)
}

// Estado global para gerenciar progresso
let creationProgress = {
  isRunning: false,
  currentAccount: null,
  processed: 0,
  total: 0,
  results: [],
  canceled: false,
}

/**
 * Obter caminhos customizados baseados na operação atual
 */
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

/**
 * Adicionar tag "API" à conta que criou a API
 * @param {string} accountId - ID da conta (número)
 */
function adicionarTagApiNaConta(accountId) {
  try {
    if (!accountId) {
      console.warn('[apiAutoCreator] accountId não fornecido, pulando adição de tag')
      return
    }

    const accountPath = path.join(PATHS.CONTAS_DIR, accountId)
    const jsonPath = path.join(accountPath, `${accountId}.json`)

    // Verificar se o arquivo JSON da conta existe
    if (!fs.existsSync(jsonPath)) {
      console.warn(`[apiAutoCreator] Arquivo JSON da conta não encontrado: ${jsonPath}`)
      return
    }

    // Ler dados da conta
    const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    // Garantir que tags é um array
    if (!Array.isArray(accountData.tags)) {
      accountData.tags = []
    }

    // Adicionar tag "API" se não existir
    if (!accountData.tags.includes('API')) {
      accountData.tags.push('API')
      console.log(`[apiAutoCreator] ✅ Tag "API" adicionada à conta ${accountId}`)

      // Salvar JSON atualizado
      fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
    } else {
      console.log(`[apiAutoCreator] Tag "API" já existe na conta ${accountId}`)
    }
  } catch (error) {
    console.error(`[apiAutoCreator] Erro ao adicionar tag "API" à conta ${accountId}:`, error.message)
    // Não lançar erro - apenas logar, pois a API já foi salva com sucesso
  }
}

/**
 * Salvar API usando o handler existente
 * Exportada para uso em outros handlers
 * @param {string} apiId - ID da API
 * @param {string} apiHash - Hash da API
 * @param {string|null} accountId - ID da conta que criou a API (opcional)
 */
export async function saveApiToFile(apiId, apiHash, accountId = null) {
  try {
    // Verificar se a pasta existe, se não, criar
    if (!fs.existsSync(PATHS.APIS_TELEGRAM_DIR)) {
      fs.mkdirSync(PATHS.APIS_TELEGRAM_DIR, { recursive: true })
    }

    // Ler o arquivo se existir, senão criar estrutura inicial
    let apis = []
    if (fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
      try {
        const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
        const json = JSON.parse(data)
        apis = json.apis || []
      } catch (error) {
        console.warn('[apiAutoCreator] Erro ao ler api.json, criando novo:', error)
        apis = []
      }
    }

    // Verificar se API já existe
    const existingIndex = apis.findIndex(api => api.api_id === apiId && api.api_hash === apiHash)
    if (existingIndex >= 0) {
      // Se já existe e não tem accountId mas agora temos, atualizar
      if (accountId && !apis[existingIndex].createdBy) {
        apis[existingIndex].createdBy = accountId
        fs.writeFileSync(PATHS.APIS_TELEGRAM_FILE, JSON.stringify({ apis }, null, 2), 'utf-8')
      }
      console.log(`[apiAutoCreator] API já existe: ${apiId}`)
      
      // Adicionar tag mesmo se API já existia (para garantir que a tag está presente)
      if (accountId) {
        adicionarTagApiNaConta(accountId)
      }
      
      return { success: true, alreadyExists: true }
    }

    // Adicionar nova API
    const novaApi = {
      id: Date.now().toString(),
      api_id: apiId,
      api_hash: apiHash,
      createdAt: new Date().toISOString(),
      createdBy: accountId || null, // Adicionar informação de qual sessão criou
    }

    apis.push(novaApi)

    // Salvar no arquivo
    const data = {
      apis: apis,
    }

    fs.writeFileSync(PATHS.APIS_TELEGRAM_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`[apiAutoCreator] API salva: ${apiId}`)

    // Adicionar tag "API" à conta que criou a API
    if (accountId) {
      adicionarTagApiNaConta(accountId)
    }

    return { success: true, api: novaApi }
  } catch (error) {
    console.error('[apiAutoCreator] Erro ao salvar API:', error)
    return { success: false, error: error.message }
  }
}

export function registerApiAutoCreatorHandlers() {
  console.log('📝 Registrando handlers de criação automática de API...')

  // Handler para criar uma API para uma conta específica
  ipcMain.handle('criar-api-automatica', async (event, accountId, appName = null) => {
    try {
      console.log(`[apiAutoCreator] Handler criar-api-automatica chamado: accountId=${accountId}, appName=${appName}`)

      if (!accountId) {
        return {
          success: false,
          error: 'ID da conta não fornecido',
          accountId: null,
        }
      }

      // Validar formato do accountId
      if (!/^\d+$/.test(accountId)) {
        return {
          success: false,
          error: 'ID da conta inválido. Deve ser um número.',
          accountId,
        }
      }

      // Carregar módulo de criação
      const { criarApiParaConta } = requireBackendModule('utils/telegramApiCreator.js')

      // Obter paths customizados
      const customPaths = getCustomPaths()

      // Criar API
      const result = await criarApiParaConta(accountId, customPaths, appName)

      if (result.success && result.apiId && result.apiHash) {
        // Salvar automaticamente no arquivo (incluindo accountId)
        const saveResult = await saveApiToFile(result.apiId, result.apiHash, accountId)
        
        if (saveResult.success) {
          return {
            success: true,
            apiId: result.apiId,
            apiHash: result.apiHash,
            accountId,
            appName: result.appName || appName,
            message: result.message || 'API criada e salva com sucesso',
          }
        } else {
          return {
            success: true,
            apiId: result.apiId,
            apiHash: result.apiHash,
            accountId,
            warning: 'API criada mas houve erro ao salvar: ' + saveResult.error,
          }
        }
      }

      return {
        success: false,
        error: result.error || 'Erro desconhecido ao criar API',
        accountId,
      }
    } catch (error) {
      console.error('[apiAutoCreator] Erro no handler criar-api-automatica:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        accountId: accountId || null,
      }
    }
  })

  // Handler para criar APIs em lote
  ipcMain.handle('criar-apis-em-lote', async (event, options = {}) => {
    try {
      const { accountIds = [], delayBetweenAccounts = 5000, appName = null } = options

      console.log(`[apiAutoCreator] Handler criar-apis-em-lote chamado: ${accountIds.length} contas`)

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return {
          success: false,
          error: 'Lista de contas vazia ou inválida',
          results: [],
        }
      }

      // Resetar estado de progresso
      creationProgress = {
        isRunning: true,
        currentAccount: null,
        processed: 0,
        total: accountIds.length,
        results: [],
        canceled: false,
      }

      // Carregar módulo
      const { criarApiParaConta } = requireBackendModule('utils/telegramApiCreator.js')
      const customPaths = getCustomPaths()

      const results = []

      // Processar cada conta
      for (let i = 0; i < accountIds.length; i++) {
        const accountId = accountIds[i]

        // Verificar se foi cancelado
        if (creationProgress.canceled) {
          console.log('[apiAutoCreator] Processo cancelado pelo usuário')
          creationProgress.isRunning = false
          return {
            success: false,
            canceled: true,
            error: 'Processo cancelado pelo usuário',
            results,
            processed: i,
            total: accountIds.length,
          }
        }

        // Atualizar progresso
        creationProgress.currentAccount = accountId
        creationProgress.processed = i

        try {
          console.log(`[apiAutoCreator] Processando conta ${i + 1}/${accountIds.length}: ${accountId}`)

          // Criar API
          const result = await criarApiParaConta(accountId, customPaths, appName)

          if (result.success && result.apiId && result.apiHash) {
            // Salvar automaticamente (incluindo accountId)
            const saveResult = await saveApiToFile(result.apiId, result.apiHash, accountId)

            const finalResult = {
              success: true,
              accountId,
              apiId: result.apiId,
              apiHash: result.apiHash,
              appName: result.appName || appName,
              message: saveResult.success ? 'API criada e salva' : 'API criada mas erro ao salvar',
            }

            results.push(finalResult)
            creationProgress.results.push(finalResult)
          } else {
            const errorResult = {
              success: false,
              accountId,
              error: result.error || 'Erro desconhecido',
            }

            results.push(errorResult)
            creationProgress.results.push(errorResult)
          }
        } catch (error) {
          console.error(`[apiAutoCreator] Erro ao processar conta ${accountId}:`, error)
          
          const errorResult = {
            success: false,
            accountId,
            error: error.message || 'Erro desconhecido',
          }

          results.push(errorResult)
          creationProgress.results.push(errorResult)
        }

        // Delay entre contas (exceto na última)
        if (i < accountIds.length - 1 && !creationProgress.canceled) {
          const delay = delayBetweenAccounts + Math.floor(Math.random() * 3000) // Adicionar variação
          console.log(`[apiAutoCreator] Aguardando ${delay}ms antes da próxima conta...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        // Atualizar contador processado
        creationProgress.processed = i + 1
      }

      // Finalizar
      creationProgress.isRunning = false
      creationProgress.currentAccount = null

      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      console.log(`[apiAutoCreator] Processo finalizado: ${successCount} sucesso(s), ${errorCount} erro(s)`)

      return {
        success: true,
        results,
        summary: {
          total: accountIds.length,
          success: successCount,
          errors: errorCount,
        },
      }
    } catch (error) {
      console.error('[apiAutoCreator] Erro no handler criar-apis-em-lote:', error)
      creationProgress.isRunning = false

      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        results: creationProgress.results,
      }
    }
  })

  // Handler para verificar progresso
  ipcMain.handle('verificar-progresso', async () => {
    return {
      isRunning: creationProgress.isRunning,
      currentAccount: creationProgress.currentAccount,
      processed: creationProgress.processed,
      total: creationProgress.total,
      results: creationProgress.results,
    }
  })

  // Handler para cancelar criação
  ipcMain.handle('cancelar-criacao', async () => {
    console.log('[apiAutoCreator] Cancelamento solicitado')
    creationProgress.canceled = true
    
    return {
      success: true,
      message: 'Cancelamento solicitado. Processo será interrompido após a conta atual.',
    }
  })
}


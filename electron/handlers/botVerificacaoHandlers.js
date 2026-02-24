import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Função para obter diretório de bots de verificação
function getBotsVerificacaoDir() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const botsDir = path.join(bancoDir, 'bots_verificacao')
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true })
    }
    return botsDir
  } catch (error) {
    const basePath = PATHS.BASE
    const fallbackPath = path.join(basePath, 'banco', 'bots_verificacao')
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true })
    }
    return fallbackPath
  }
}

// Função para obter arquivo de cache de verificação de grupos
function getGruposVerificacaoCachePath() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const cachePath = path.join(bancoDir, 'grupos_verificacao_cache.json')
    return cachePath
  } catch (error) {
    const basePath = PATHS.BASE
    return path.join(basePath, 'banco', 'grupos_verificacao_cache.json')
  }
}

// Função para obter arquivo de fila de verificação
function getFilaVerificacaoPath() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const filaPath = path.join(bancoDir, 'fila_verificacao.json')
    return filaPath
  } catch (error) {
    const basePath = PATHS.BASE
    return path.join(basePath, 'banco', 'fila_verificacao.json')
  }
}

// Carregar cache de verificação de grupos
function carregarCacheGrupos() {
  const cachePath = getGruposVerificacaoCachePath()
  if (!fs.existsSync(cachePath)) {
    return {}
  }
  try {
    const content = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('[botVerificacao] Erro ao carregar cache de grupos:', error.message)
    return {}
  }
}

// Salvar cache de verificação de grupos
function salvarCacheGrupos(cache) {
  const cachePath = getGruposVerificacaoCachePath()
  try {
    const cacheDir = path.dirname(cachePath)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
  } catch (error) {
    console.error('[botVerificacao] Erro ao salvar cache de grupos:', error.message)
  }
}

// Carregar fila de verificação
function carregarFilaVerificacao() {
  const filaPath = getFilaVerificacaoPath()
  if (!fs.existsSync(filaPath)) {
    return []
  }
  try {
    const content = fs.readFileSync(filaPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('[botVerificacao] Erro ao carregar fila:', error.message)
    return []
  }
}

// Salvar fila de verificação
function salvarFilaVerificacao(fila) {
  const filaPath = getFilaVerificacaoPath()
  try {
    const filaDir = path.dirname(filaPath)
    if (!fs.existsSync(filaDir)) {
      fs.mkdirSync(filaDir, { recursive: true })
    }
    fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2), 'utf-8')
  } catch (error) {
    console.error('[botVerificacao] Erro ao salvar fila:', error.message)
  }
}

// Verificar se grupo precisa ser verificado (última verificação há mais de 3 dias)
function precisaVerificarGrupo(grupoId, ultimaVerificacao) {
  if (!ultimaVerificacao) {
    return true // Nunca foi verificado
  }
  const agora = new Date().getTime()
  const ultimaVerificacaoTime = new Date(ultimaVerificacao).getTime()
  const diasPassados = (agora - ultimaVerificacaoTime) / (1000 * 60 * 60 * 24) // Converter para dias
  return diasPassados >= 3 // Verificar se passou 3 dias
}

// Função auxiliar para extrair string session (usando sql.js como no criador.js)
async function extractStringSession(sessionFile) {
  try {
    // Usar createRequire para importar módulo CommonJS
    const require = createRequire(import.meta.url)
    const initSqlJs = require('sql.js')
    
    // Inicializar SQL.js
    const SQL = await initSqlJs({
      locateFile: (file) => {
        // Tentar encontrar sql.js em node_modules
        const possiblePaths = [
          path.join(__dirname, '../../../node_modules/sql.js/dist', file),
          path.join(__dirname, '../../../front/node_modules/sql.js/dist', file),
          path.join(process.cwd(), 'node_modules/sql.js/dist', file),
        ]
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            return possiblePath
          }
        }
        return file
      }
    })
    
    const fileBuffer = fs.readFileSync(sessionFile)
    const sessionDb = new SQL.Database(fileBuffer)
    const query = sessionDb.exec(
      'SELECT dc_id, server_address, port, auth_key FROM sessions ORDER BY dc_id LIMIT 1;'
    )
    
    if (!query.length || !query[0].values.length) {
      sessionDb.close()
      throw new Error('Sessão inválida ou vazia.')
    }

    const [dcId, serverAddress, port, authKey] = query[0].values[0]
    if (!dcId || !serverAddress || !port || !authKey) {
      sessionDb.close()
      throw new Error('Dados incompletos na sessão.')
    }

    // Montar sessão no formato correto
    const dcBuffer = Buffer.from([Number(dcId)])
    const addressBuffer = Buffer.from(String(serverAddress))
    const addressLengthBuffer = Buffer.alloc(2)
    addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
    const portBuffer = Buffer.alloc(2)
    portBuffer.writeInt16BE(Number(port), 0)
    const authKeyBuffer = Buffer.from(authKey)

    const payload = Buffer.concat([dcBuffer, addressLengthBuffer, addressBuffer, portBuffer, authKeyBuffer])
    const stringSession = `1${payload.toString('base64')}`
    
    sessionDb.close()
    return stringSession
  } catch (error) {
    console.error('[botVerificacao] Erro ao extrair sessão:', error)
    throw error
  }
}

// Função para criar bot usando sessão (via API do Telegram)
async function criarBotComSessao(accountId, botName) {
  try {
    const require = createRequire(import.meta.url)
    const { TelegramClient } = require('telegram')
    const { StringSession } = require('telegram/sessions')
    
    // Carregar sessão da conta
    const accountsDirToUse = PATHS.CONTAS_DIR
    const accountPath = path.join(accountsDirToUse, accountId)
    const sessionFile = path.join(accountPath, `${accountId}.session`)
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error('Arquivo de sessão não encontrado')
    }

    // Resolver credenciais
    let apiId = process.env.TELEGRAM_API_ID
    let apiHash = process.env.TELEGRAM_API_HASH
    
    if (!apiId || !apiHash) {
      // Tentar obter do metadata da conta
      const metadataPath = path.join(accountPath, `${accountId}.json`)
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
        apiId = metadata.app_id
        apiHash = metadata.app_hash
      }
      
      if (!apiId || !apiHash) {
        throw new Error('TELEGRAM_API_ID e TELEGRAM_API_HASH não encontrados')
      }
    }

    const stringSession = await extractStringSession(sessionFile)
    const session = new StringSession(stringSession)
    
    const client = new TelegramClient(session, Number(apiId), apiHash, {
      connectionRetries: 5,
      receiveUpdates: false
    })

    await client.connect()
    
    if (!await client.checkAuthorization()) {
      await client.disconnect()
      throw new Error('Sessão não autorizada')
    }

    // Enviar comando /newbot para BotFather
    const botFather = await client.getEntity('BotFather')
    await client.sendMessage(botFather, { message: '/newbot' })
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Enviar nome do bot
    await client.sendMessage(botFather, { message: botName })
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Enviar username do bot (gerar aleatório)
    const botUsername = `${botName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
    await client.sendMessage(botFather, { message: botUsername })
    
    // Aguardar resposta do BotFather
    await new Promise(resolve => setTimeout(resolve, 3000))
    const messages = await client.getMessages(botFather, { limit: 5 })
    
    let botToken = null
    for (const msg of messages) {
      const text = msg.message || ''
      if (text.includes('Use this token to access the HTTP API:')) {
        const tokenMatch = text.match(/(\d+:[A-Za-z0-9_-]+)/)
        if (tokenMatch) {
          botToken = tokenMatch[1]
          break
        }
      }
    }

    await client.disconnect()

    if (!botToken) {
      throw new Error('Não foi possível obter token do bot do BotFather. Verifique as mensagens mais recentes.')
    }

    return {
      token: botToken,
      username: botUsername
    }
  } catch (error) {
    console.error('[botVerificacao] Erro ao criar bot:', error)
    throw error
  }
}

// Verificar grupo usando bot token
async function verificarGrupo(botToken, chatId) {
  try {
    const https = require('https')
    
    return new Promise((resolve) => {
      // Verificar se grupo existe e obter informações
      const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`
      
      const request = https.get(url, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            
            if (json.ok && json.result) {
              const chat = json.result
              
              // Obter contagem de membros
              const membersUrl = `https://api.telegram.org/bot${botToken}/getChatMembersCount?chat_id=${chatId}`
              
              https.get(membersUrl, (membersRes) => {
                let membersData = ''
                
                membersRes.on('data', (chunk) => {
                  membersData += chunk
                })
                
                membersRes.on('end', () => {
                  try {
                    const membersJson = JSON.parse(membersData)
                    const memberCount = membersJson.ok ? membersJson.result : 0
                    
                    resolve({
                      success: true,
                      online: true,
                      chatId: chatId,
                      title: chat.title || 'Sem título',
                      memberCount: memberCount,
                      type: chat.type
                    })
                  } catch (error) {
                    resolve({
                      success: true,
                      online: true,
                      chatId: chatId,
                      title: chat.title || 'Sem título',
                      memberCount: 0,
                      error: 'Erro ao obter contagem de membros'
                    })
                  }
                })
              }).on('error', (error) => {
                resolve({
                  success: true,
                  online: true,
                  chatId: chatId,
                  title: chat.title || 'Sem título',
                  memberCount: 0,
                  error: error.message
                })
              })
            } else {
              resolve({
                success: false,
                online: false,
                chatId: chatId,
                error: json.description || 'Grupo não encontrado ou bot não tem acesso'
              })
            }
          } catch (error) {
            resolve({
              success: false,
              online: false,
              chatId: chatId,
              error: 'Erro ao processar resposta'
            })
          }
        })
      })

      request.on('error', (error) => {
        resolve({
          success: false,
          online: false,
          chatId: chatId,
          error: error.message
        })
      })

      request.setTimeout(10000, () => {
        request.destroy()
        resolve({
          success: false,
          online: false,
          chatId: chatId,
          error: 'Timeout na requisição'
        })
      })
    })
  } catch (error) {
    return {
      success: false,
      online: false,
      chatId: chatId,
      error: error.message
    }
  }
}

// Variável para controlar processamento da fila
let processandoFila = false
let intervaloProcessamento = null

export function registerBotVerificacaoHandlers() {
  console.log('📝 Registrando handlers de bots de verificação...')

  // Handler para criar bot de verificação
  ipcMain.handle('criar-bot-verificacao', async (event, accountId, botName) => {
    try {
      console.log(`[botVerificacao] Criando bot de verificação para conta ${accountId}`)
      
      if (!accountId || !botName) {
        return { success: false, error: 'ID da conta e nome do bot são obrigatórios' }
      }

      // Criar bot usando sessão
      const botData = await criarBotComSessao(accountId, botName)
      
      // Salvar bot de verificação
      const botsDir = getBotsVerificacaoDir()
      const botId = `bot_${Date.now()}`
      const botPath = path.join(botsDir, `${botId}.json`)
      
      const botInfo = {
        id: botId,
        accountId: accountId,
        nome: botName,
        token: botData.token,
        username: botData.username,
        createdAt: new Date().toISOString(),
        ativo: true
      }
      
      fs.writeFileSync(botPath, JSON.stringify(botInfo, null, 2), 'utf-8')
      console.log(`[botVerificacao] Bot criado e salvo: ${botId}`)
      
      return { success: true, bot: botInfo }
    } catch (error) {
      console.error('[botVerificacao] Erro ao criar bot:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para listar bots de verificação
  ipcMain.handle('listar-bots-verificacao', async () => {
    try {
      const botsDir = getBotsVerificacaoDir()
      const files = fs.readdirSync(botsDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      
      const bots = []
      for (const file of files) {
        try {
          const filePath = path.join(botsDir, file.name)
          const content = fs.readFileSync(filePath, 'utf-8')
          const bot = JSON.parse(content)
          bots.push(bot)
        } catch (error) {
          console.warn(`[botVerificacao] Erro ao ler bot ${file.name}:`, error.message)
        }
      }
      
      return { success: true, bots: bots }
    } catch (error) {
      console.error('[botVerificacao] Erro ao listar bots:', error)
      return { success: false, error: error.message, bots: [] }
    }
  })

  // Handler para adicionar grupo à fila de verificação
  ipcMain.handle('adicionar-grupo-verificacao', async (event, grupoData) => {
    try {
      const { chatId, botToken, accountId } = grupoData
      
      if (!chatId || !botToken) {
        return { success: false, error: 'chatId e botToken são obrigatórios' }
      }

      const fila = carregarFilaVerificacao()
      
      // Verificar se já existe na fila
      const existe = fila.some(item => item.chatId === chatId)
      if (existe) {
        return { success: true, message: 'Grupo já está na fila' }
      }

      fila.push({
        chatId,
        botToken,
        accountId,
        adicionadoEm: new Date().toISOString(),
        prioridade: 0
      })

      salvarFilaVerificacao(fila)
      console.log(`[botVerificacao] Grupo ${chatId} adicionado à fila`)
      
      // Iniciar processamento se não estiver rodando
      iniciarProcessamentoFila()
      
      return { success: true }
    } catch (error) {
      console.error('[botVerificacao] Erro ao adicionar grupo:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para verificar grupo manualmente
  ipcMain.handle('verificar-grupo-manual', async (event, chatId, botToken) => {
    try {
      console.log(`[botVerificacao] Verificando grupo manualmente: ${chatId}`)
      
      const resultado = await verificarGrupo(botToken, chatId)
      
      // Atualizar cache
      const cache = carregarCacheGrupos()
      cache[chatId] = {
        ...resultado,
        ultimaVerificacao: new Date().toISOString()
      }
      salvarCacheGrupos(cache)
      
      return { success: true, resultado }
    } catch (error) {
      console.error('[botVerificacao] Erro ao verificar grupo:', error)
      return { success: false, error: error.message }
    }
  })

  // Função para processar fila de verificação
  async function processarFilaVerificacao() {
    if (processandoFila) {
      return
    }

    processandoFila = true
    
    try {
      const fila = carregarFilaVerificacao()
      const cache = carregarCacheGrupos()
      
      if (fila.length === 0) {
        processandoFila = false
        return
      }

      // Pegar primeiro item da fila
      const item = fila.shift()
      
      console.log(`[botVerificacao] Processando grupo ${item.chatId} da fila`)
      
      // Verificar grupo
      const resultado = await verificarGrupo(item.botToken, item.chatId)
      
      // Atualizar cache
      cache[item.chatId] = {
        ...resultado,
        ultimaVerificacao: new Date().toISOString(),
        botToken: item.botToken
      }
      salvarCacheGrupos(cache)
      
      // Salvar fila atualizada
      salvarFilaVerificacao(fila)
      
      console.log(`[botVerificacao] Grupo ${item.chatId} verificado: ${resultado.online ? 'Online' : 'Offline'}, ${resultado.memberCount || 0} membros`)
      
    } catch (error) {
      console.error('[botVerificacao] Erro ao processar fila:', error)
    }
    
    processandoFila = false
  }

  // Função para iniciar processamento periódico da fila
  function iniciarProcessamentoFila() {
    if (intervaloProcessamento) {
      return // Já está rodando
    }

    console.log('[botVerificacao] Iniciando processamento da fila (a cada 2 minutos)')
    
    // Processar imediatamente
    processarFilaVerificacao()
    
    // Processar a cada 2 minutos
    intervaloProcessamento = setInterval(() => {
      processarFilaVerificacao()
    }, 2 * 60 * 1000) // 2 minutos
  }

  // Handler para iniciar/parar processamento
  ipcMain.handle('controlar-processamento-verificacao', async (event, iniciar) => {
    if (iniciar) {
      iniciarProcessamentoFila()
      return { success: true, message: 'Processamento iniciado' }
    } else {
      if (intervaloProcessamento) {
        clearInterval(intervaloProcessamento)
        intervaloProcessamento = null
        return { success: true, message: 'Processamento parado' }
      }
    }
  })

  // Handler para obter status de grupos (com cache)
  ipcMain.handle('obter-status-grupos', async (event, chatIds) => {
    try {
      const cache = carregarCacheGrupos()
      const fila = carregarFilaVerificacao()
      const resultados = []
      
      for (const chatId of chatIds) {
        const cacheEntry = cache[chatId]
        
        if (cacheEntry && !precisaVerificarGrupo(chatId, cacheEntry.ultimaVerificacao)) {
          // Usar cache (verificado há menos de 3 dias)
          resultados.push({
            chatId,
            ...cacheEntry,
            cache: true
          })
        } else {
          // Adicionar à fila se não está na fila e precisa verificar
          const naFila = fila.some(item => item.chatId === chatId)
          if (!naFila && cacheEntry) {
            // Adicionar à fila usando botToken do cache
            const botToken = cacheEntry.botToken
            if (botToken) {
              fila.push({
                chatId,
                botToken,
                adicionadoEm: new Date().toISOString(),
                prioridade: 1 // Prioridade menor para verificação automática
              })
            }
          }
          
          // Retornar dados do cache mesmo se expirado (melhor que nada)
          resultados.push({
            chatId,
            ...cacheEntry,
            cache: true,
            expirado: true
          })
        }
      }
      
      if (fila.length > 0) {
        salvarFilaVerificacao(fila)
        iniciarProcessamentoFila()
      }
      
      return { success: true, resultados }
    } catch (error) {
      console.error('[botVerificacao] Erro ao obter status:', error)
      return { success: false, error: error.message }
    }
  })

  // Iniciar processamento ao carregar
  iniciarProcessamentoFila()
}


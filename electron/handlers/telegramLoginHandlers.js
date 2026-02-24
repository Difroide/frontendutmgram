import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BACK_DIR = path.resolve(__dirname, '../../../back')
const require = createRequire(import.meta.url)

// Estado do login em andamento (por sessão de login)
const loginSessions = new Map()

/**
 * Gera um ID único para a sessão de login
 */
function generateLoginId() {
  return `login_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Obter customPaths para usar com apiRotator e proxyManager
 */
function getCustomPaths() {
  return {
    rootDir: PATHS.BASE,
    bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
    accountsDir: PATHS.CONTAS_DIR,
  }
}

/**
 * Buscar senha 2FA no arquivo dentro da pasta do número
 * Procura por: 2fa, 2fa.txt, 2factor, 2factor.txt, password.txt
 */
function buscar2FADaPasta(phoneNumber) {
  try {
    // Remover o + do número para encontrar a pasta
    const accountNumber = phoneNumber.replace(/^\+/, '')
    const accountDir = path.join(PATHS.CONTAS_DIR, accountNumber)
    
    if (!fs.existsSync(accountDir)) {
      console.log(`[TelegramLogin] Pasta da conta não encontrada: ${accountDir}`)
      return null
    }
    
    // Lista de possíveis nomes de arquivo para a senha 2FA
    const possibleFiles = [
      '2fa',
      '2fa.txt',
      '2factor',
      '2factor.txt',
      'password.txt',
      'senha.txt',
      'senha2fa.txt',
    ]
    
    for (const filename of possibleFiles) {
      const filePath = path.join(accountDir, filename)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8').trim()
        if (content) {
          console.log(`[TelegramLogin] ✅ Senha 2FA encontrada em: ${filename}`)
          return content
        }
      }
    }
    
    console.log(`[TelegramLogin] Nenhum arquivo de 2FA encontrado na pasta: ${accountDir}`)
    return null
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao buscar 2FA da pasta:`, error.message)
    return null
  }
}

/**
 * Limpa uma sessão de login
 */
async function cleanupLoginSession(loginId) {
  const session = loginSessions.get(loginId)
  if (session) {
    try {
      if (session.client && session.client.connected) {
        await session.client.disconnect()
        console.log(`[TelegramLogin] Cliente desconectado para sessão ${loginId}`)
      }
      // Liberar conexão da API
      if (session.apiRelease && typeof session.apiRelease === 'function') {
        session.apiRelease()
        console.log(`[TelegramLogin] Conexão da API liberada`)
      }
      // Liberar proxy se foi reservado
      if (session.proxyReservado) {
        try {
          const proxyManager = require(path.join(BACK_DIR, 'utils', 'proxyManager.js'))
          await proxyManager.liberarProxy(session.proxyReservado.id, session.connectionId)
          console.log(`[TelegramLogin] Proxy liberado`)
        } catch (e) {
          console.warn(`[TelegramLogin] Erro ao liberar proxy: ${e.message}`)
        }
      }
    } catch (error) {
      console.warn(`[TelegramLogin] Erro ao desconectar cliente: ${error.message}`)
    }
    loginSessions.delete(loginId)
  }
}

/**
 * Salvar sessão e criar arquivos da conta
 */
async function saveAccountSession(client, phoneNumber) {
  // Obter informações do usuário
  const me = await client.getMe()
  console.log(`[TelegramLogin] Usuário: ${me.phone} (ID: ${me.id})`)
  
  // Obter StringSession para salvar
  const stringSession = client.session.save()
  
  // Carregar módulo para salvar sessão
  const { saveStringSessionToFile } = require(path.join(BACK_DIR, 'utils', 'telegramApiCreator.js'))
  
  // Determinar número para o nome da pasta (usar o número sem o +)
  const accountNumber = phoneNumber.replace(/^\+/, '')
  const accountDir = path.join(PATHS.CONTAS_DIR, accountNumber)
  const sessionFilePath = path.join(accountDir, `${accountNumber}.session`)
  
  // Criar diretório da conta
  if (!fs.existsSync(accountDir)) {
    fs.mkdirSync(accountDir, { recursive: true })
  }
  
  // Salvar arquivo .session
  await saveStringSessionToFile(stringSession, sessionFilePath)
  console.log(`[TelegramLogin] Sessão salva em: ${sessionFilePath}`)
  
  // Criar arquivo JSON com informações da conta
  const jsonData = {
    numero: accountNumber,
    quantidade_grupos: 0,
    grupos: [],
    frozen: false,
    tags: [],
    pastaPath: `contas telegram/${accountNumber}`,
    criadoEm: new Date().toISOString(),
    userId: me.id.toString(),
    firstName: me.firstName || '',
    lastName: me.lastName || '',
    username: me.username || '',
  }
  
  const jsonFilePath = path.join(accountDir, `${accountNumber}.json`)
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8')
  console.log(`[TelegramLogin] JSON salvo em: ${jsonFilePath}`)
  
  return {
    accountNumber,
    userId: me.id.toString(),
    firstName: me.firstName || '',
    lastName: me.lastName || '',
    username: me.username || '',
  }
}

/**
 * Handler: Enviar código de verificação para o número
 */
ipcMain.handle('telegram-login-send-code', async (event, phoneNumber) => {
  console.log(`[TelegramLogin] Iniciando login para: ${phoneNumber}`)
  
  try {
    // Validar número de telefone
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Número de telefone inválido')
    }
    
    // Normalizar número (remover espaços, garantir +)
    let normalizedPhone = phoneNumber.trim().replace(/\s+/g, '')
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone
    }
    
    // Validar formato básico
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      throw new Error('Formato de número inválido. Use o formato internacional (ex: +5511999999999)')
    }
    
    // Carregar módulos necessários
    const { TelegramClient } = require('telegram')
    const { StringSession } = require('telegram/sessions')
    const apiRotator = require(path.join(BACK_DIR, 'utils', 'apiRotator.js'))
    const proxyManager = require(path.join(BACK_DIR, 'utils', 'proxyManager.js'))
    
    const customPaths = getCustomPaths()
    
    // Obter credenciais da API usando o apiRotator
    console.log(`[TelegramLogin] Obtendo credenciais da API...`)
    const credentials = apiRotator.getNextApiCredentials(customPaths)
    
    if (!credentials || !credentials.apiId || !credentials.apiHash) {
      throw new Error('Não foi possível obter credenciais da API. Configure as APIs primeiro em Configurações > APIs Telegram.')
    }
    
    console.log(`[TelegramLogin] Usando API: ${credentials.apiId}`)
    
    // Tentar obter proxy usando o proxyManager
    let proxyReservado = null
    let proxyConfig = undefined
    let connectionId = generateLoginId()
    
    try {
      console.log(`[TelegramLogin] Verificando proxy disponível...`)
      const reserva = await proxyManager.reservarProxy(connectionId, customPaths)
      
      if (reserva && reserva.proxy) {
        proxyReservado = reserva.proxy
        proxyConfig = proxyManager.convertProxyToTelegramFormat(proxyReservado)
        console.log(`[TelegramLogin] Proxy reservado: ${proxyReservado.host}:${proxyReservado.port}`)
      } else {
        console.log(`[TelegramLogin] Nenhum proxy disponível, continuando sem proxy`)
      }
    } catch (proxyError) {
      console.warn(`[TelegramLogin] Erro ao obter proxy: ${proxyError.message}. Continuando sem proxy.`)
    }
    
    // Criar cliente com sessão vazia (novo login)
    const clientOptions = {
      connectionRetries: 5,
      timeout: 30,
    }
    
    // Adicionar proxy se disponível
    if (proxyConfig) {
      clientOptions.proxy = proxyConfig
    }
    
    console.log(`[TelegramLogin] Criando cliente Telegram...`)
    const client = new TelegramClient(
      new StringSession(''),
      credentials.apiId,
      credentials.apiHash,
      clientOptions
    )
    
    // Conectar ao Telegram
    console.log(`[TelegramLogin] Conectando ao Telegram...`)
    await client.connect()
    console.log(`[TelegramLogin] Conectado!`)
    
    // Enviar código de verificação
    console.log(`[TelegramLogin] Enviando código para ${normalizedPhone}...`)
    const result = await client.sendCode(
      { apiId: credentials.apiId, apiHash: credentials.apiHash },
      normalizedPhone
    )
    
    console.log(`[TelegramLogin] Código enviado! phoneCodeHash: ${result.phoneCodeHash.substring(0, 10)}...`)
    
    // Gerar ID da sessão de login
    const loginId = generateLoginId()
    
    // Armazenar estado da sessão (MANTER O CLIENTE CONECTADO!)
    loginSessions.set(loginId, {
      client, // Manter cliente conectado para usar depois
      phoneNumber: normalizedPhone,
      phoneCodeHash: result.phoneCodeHash,
      apiId: credentials.apiId,
      apiHash: credentials.apiHash,
      apiRelease: credentials.release,
      proxyReservado,
      connectionId,
      createdAt: Date.now(),
      needs2FA: false,
    })
    
    // Limpar sessão após 10 minutos se não for usada
    setTimeout(() => {
      if (loginSessions.has(loginId)) {
        console.log(`[TelegramLogin] Sessão ${loginId} expirou após 10 minutos`)
        cleanupLoginSession(loginId)
      }
    }, 10 * 60 * 1000)
    
    return {
      success: true,
      loginId,
      phoneNumber: normalizedPhone,
      phoneCodeHash: result.phoneCodeHash,
      message: 'Código enviado com sucesso! Verifique seu Telegram.',
    }
    
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao enviar código:`, error.message)
    
    // Tratar erros específicos do Telegram
    let errorMessage = error.message
    
    if (error.errorMessage) {
      switch (error.errorMessage) {
        case 'PHONE_NUMBER_INVALID':
          errorMessage = 'Número de telefone inválido'
          break
        case 'PHONE_NUMBER_BANNED':
          errorMessage = 'Este número está banido do Telegram'
          break
        case 'PHONE_NUMBER_FLOOD':
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente'
          break
        case 'PHONE_PASSWORD_FLOOD':
          errorMessage = 'Muitas tentativas de senha. Aguarde e tente novamente'
          break
        case 'API_ID_INVALID':
          errorMessage = 'Credenciais da API inválidas. Verifique as configurações'
          break
        default:
          errorMessage = error.errorMessage
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
})

/**
 * Handler: Verificar código de verificação
 */
ipcMain.handle('telegram-login-verify-code', async (event, loginId, phoneCode) => {
  console.log(`[TelegramLogin] Verificando código para sessão: ${loginId}`)
  
  try {
    // Obter sessão de login
    const session = loginSessions.get(loginId)
    if (!session) {
      throw new Error('Sessão de login expirada ou inválida. Inicie o processo novamente.')
    }
    
    // Validar código
    if (!phoneCode || typeof phoneCode !== 'string') {
      throw new Error('Código de verificação inválido')
    }
    
    const normalizedCode = phoneCode.trim().replace(/\s+/g, '')
    
    // Verificar se cliente ainda está conectado
    if (!session.client.connected) {
      console.log(`[TelegramLogin] Cliente desconectado, reconectando...`)
      await session.client.connect()
    }
    
    console.log(`[TelegramLogin] Tentando fazer login com código...`)
    
    // Carregar Api do gramJS
    const { Api } = require('telegram')
    
    try {
      // Usar client.invoke com Api.auth.SignIn (método correto do gramJS)
      const result = await session.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: session.phoneNumber,
          phoneCodeHash: session.phoneCodeHash,
          phoneCode: normalizedCode,
        })
      )
      
      console.log(`[TelegramLogin] Login bem sucedido!`)
      
      // Salvar sessão e criar arquivos
      const accountInfo = await saveAccountSession(session.client, session.phoneNumber)
      
      // Desconectar cliente e limpar recursos
      await session.client.disconnect()
      
      // Liberar conexão da API
      if (session.apiRelease && typeof session.apiRelease === 'function') {
        session.apiRelease()
      }
      
      // Liberar proxy
      if (session.proxyReservado) {
        try {
          const proxyManager = require(path.join(BACK_DIR, 'utils', 'proxyManager.js'))
          await proxyManager.liberarProxy(session.proxyReservado.id, session.connectionId)
        } catch (e) {
          console.warn(`[TelegramLogin] Erro ao liberar proxy: ${e.message}`)
        }
      }
      
      // Limpar sessão de login
      loginSessions.delete(loginId)
      
      return {
        success: true,
        ...accountInfo,
        message: 'Login realizado com sucesso! Conta adicionada.',
      }
      
    } catch (signInError) {
      console.log(`[TelegramLogin] Erro no signIn:`, signInError.errorMessage || signInError.message)
      
      // Verificar se precisa de senha 2FA
      if (signInError.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        console.log(`[TelegramLogin] Senha 2FA necessária`)
        
        // Tentar buscar senha 2FA automaticamente da pasta do número
        const senha2FA = buscar2FADaPasta(session.phoneNumber)
        
        if (senha2FA) {
          console.log(`[TelegramLogin] 🔐 Tentando login automático com 2FA encontrada na pasta...`)
          
          try {
            // Carregar módulos necessários para 2FA
            const { Api } = require('telegram')
            const { computeCheck } = require('telegram/Password')
            
            // Obter informações de senha do Telegram
            const passwordInfo = await session.client.invoke(new Api.account.GetPassword())
            
            // Computar hash da senha
            const passwordHash = await computeCheck(passwordInfo, senha2FA)
            
            // Fazer login com senha
            await session.client.invoke(
              new Api.auth.CheckPassword({
                password: passwordHash,
              })
            )
            
            console.log(`[TelegramLogin] ✅ Login com 2FA automático bem sucedido!`)
            
            // Salvar sessão e criar arquivos
            const accountInfo = await saveAccountSession(session.client, session.phoneNumber)
            
            // Desconectar cliente e limpar recursos
            await session.client.disconnect()
            
            // Liberar conexão da API
            if (session.apiRelease && typeof session.apiRelease === 'function') {
              session.apiRelease()
            }
            
            // Liberar proxy
            if (session.proxyReservado) {
              try {
                const proxyManager = require(path.join(BACK_DIR, 'utils', 'proxyManager.js'))
                await proxyManager.liberarProxy(session.proxyReservado.id, session.connectionId)
              } catch (e) {
                console.warn(`[TelegramLogin] Erro ao liberar proxy: ${e.message}`)
              }
            }
            
            // Limpar sessão de login
            loginSessions.delete(loginId)
            
            return {
              success: true,
              ...accountInfo,
              message: 'Login realizado com sucesso! (2FA automático)',
            }
            
          } catch (auto2FAError) {
            console.log(`[TelegramLogin] ⚠️ Erro no login automático com 2FA:`, auto2FAError.errorMessage || auto2FAError.message)
            // Se falhar, pedir para o usuário digitar manualmente
          }
        }
        
        // Se não encontrou 2FA ou falhou, pedir para o usuário digitar
        session.needs2FA = true
        
        return {
          success: false,
          needsPassword: true,
          loginId,
          message: senha2FA 
            ? 'Senha 2FA encontrada na pasta mas está incorreta. Digite a senha correta.'
            : 'Esta conta possui verificação em duas etapas. Digite sua senha.',
        }
      }
      
      // Outros erros
      throw signInError
    }
    
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao verificar código:`, error.message)
    
    let errorMessage = error.message
    
    if (error.errorMessage) {
      switch (error.errorMessage) {
        case 'PHONE_CODE_INVALID':
          errorMessage = 'Código de verificação inválido'
          break
        case 'PHONE_CODE_EXPIRED':
          errorMessage = 'Código expirado. Solicite um novo código'
          break
        case 'PHONE_CODE_EMPTY':
          errorMessage = 'Código não pode estar vazio'
          break
        case 'SESSION_PASSWORD_NEEDED':
          // Já tratado acima, mas por segurança
          return {
            success: false,
            needsPassword: true,
            loginId,
            message: 'Esta conta possui verificação em duas etapas. Digite sua senha.',
          }
        default:
          errorMessage = error.errorMessage
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
})

/**
 * Handler: Verificar senha 2FA
 */
ipcMain.handle('telegram-login-password', async (event, loginId, password) => {
  console.log(`[TelegramLogin] Verificando senha 2FA para sessão: ${loginId}`)
  
  try {
    // Obter sessão de login
    const session = loginSessions.get(loginId)
    if (!session) {
      throw new Error('Sessão de login expirada ou inválida. Inicie o processo novamente.')
    }
    
    if (!session.needs2FA) {
      throw new Error('Esta sessão não requer senha 2FA')
    }
    
    // Validar senha
    if (!password || typeof password !== 'string') {
      throw new Error('Senha inválida')
    }
    
    // Verificar se cliente ainda está conectado
    if (!session.client.connected) {
      console.log(`[TelegramLogin] Cliente desconectado, reconectando...`)
      await session.client.connect()
    }
    
    console.log(`[TelegramLogin] Tentando login com senha 2FA...`)
    
    // Carregar Api do gramJS
    const { Api, password: passwordModule } = require('telegram')
    
    // Obter informações de senha do Telegram
    const passwordInfo = await session.client.invoke(new Api.account.GetPassword())
    
    // Computar hash da senha usando o módulo de senha do gramJS
    const { computeCheck } = require('telegram/Password')
    const passwordHash = await computeCheck(passwordInfo, password)
    
    // Fazer login com senha
    const result = await session.client.invoke(
      new Api.auth.CheckPassword({
        password: passwordHash,
      })
    )
    
    console.log(`[TelegramLogin] Login com 2FA bem sucedido!`)
    
    // Salvar sessão e criar arquivos
    const accountInfo = await saveAccountSession(session.client, session.phoneNumber)
    
    // Desconectar cliente e limpar recursos
    await session.client.disconnect()
    
    // Liberar conexão da API
    if (session.apiRelease && typeof session.apiRelease === 'function') {
      session.apiRelease()
    }
    
    // Liberar proxy
    if (session.proxyReservado) {
      try {
        const proxyManager = require(path.join(BACK_DIR, 'utils', 'proxyManager.js'))
        await proxyManager.liberarProxy(session.proxyReservado.id, session.connectionId)
      } catch (e) {
        console.warn(`[TelegramLogin] Erro ao liberar proxy: ${e.message}`)
      }
    }
    
    // Limpar sessão de login
    loginSessions.delete(loginId)
    
    return {
      success: true,
      ...accountInfo,
      message: 'Login realizado com sucesso! Conta adicionada.',
    }
    
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao verificar senha 2FA:`, error.message)
    
    let errorMessage = error.message
    
    if (error.errorMessage) {
      switch (error.errorMessage) {
        case 'PASSWORD_HASH_INVALID':
          errorMessage = 'Senha incorreta'
          break
        case 'SRP_PASSWORD_CHANGED':
          errorMessage = 'Senha foi alterada. Inicie o processo novamente'
          break
        default:
          errorMessage = error.errorMessage
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
})

/**
 * Handler: Cancelar login em andamento
 */
ipcMain.handle('telegram-login-cancel', async (event, loginId) => {
  console.log(`[TelegramLogin] Cancelando login para sessão: ${loginId}`)
  
  try {
    await cleanupLoginSession(loginId)
    
    return {
      success: true,
      message: 'Login cancelado',
    }
    
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao cancelar login:`, error.message)
    
    return {
      success: false,
      error: error.message,
    }
  }
})

/**
 * Handler: Adicionar tag à conta recém-criada
 */
ipcMain.handle('telegram-login-add-tag', async (event, accountNumber, tagName) => {
  console.log(`[TelegramLogin] Adicionando tag "${tagName}" à conta ${accountNumber}`)
  
  try {
    if (!accountNumber || !tagName) {
      throw new Error('Número da conta e nome da tag são obrigatórios')
    }
    
    const accountDir = path.join(PATHS.CONTAS_DIR, accountNumber)
    const jsonFilePath = path.join(accountDir, `${accountNumber}.json`)
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error('Conta não encontrada')
    }
    
    // Ler JSON da conta
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'))
    
    // Adicionar tag se não existir
    if (!jsonData.tags) {
      jsonData.tags = []
    }
    
    if (!jsonData.tags.includes(tagName)) {
      jsonData.tags.push(tagName)
    }
    
    // Salvar JSON atualizado
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8')
    
    console.log(`[TelegramLogin] Tag "${tagName}" adicionada à conta ${accountNumber}`)
    
    return {
      success: true,
      tags: jsonData.tags,
    }
    
  } catch (error) {
    console.error(`[TelegramLogin] Erro ao adicionar tag:`, error.message)
    
    return {
      success: false,
      error: error.message,
    }
  }
})

console.log('[TelegramLogin] ✅ Handlers de login registrados')

export default {}

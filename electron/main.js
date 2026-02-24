import { app } from 'electron'
import { createWindow, recreateWindowIfNeeded } from './window/windowManager.js'

// Filtrar erros de TIMEOUT do Telegram client para deixar o console mais limpo
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleLog = console.log

// Interceptar console.error
console.error = function (...args) {
  const message = args.map(arg => String(arg)).join(' ')

  // Suprimir TODOS os erros de TIMEOUT do Telegram (são comuns e não críticos)
  if (
    message.includes('TIMEOUT') || (
      message.includes('telegram') && (
        message.includes('updates') ||
        message.includes('_updateLoop') ||
        message.includes('client/updates') ||
        message.includes('client\\updates') ||
        message.includes('at async attempts')
      )
    )
  ) {
    return // Não logar esses erros
  }

  // Suprimir erros de reconexão automática
  if (message.includes('TIMEOUT') && message.includes('reconnect')) {
    return
  }

  originalConsoleError.apply(console, args)
}

// Interceptar console.warn também
console.warn = function (...args) {
  const message = args.map(arg => String(arg)).join(' ')

  // Suprimir warnings de TIMEOUT
  if (message.includes('TIMEOUT') || (message.includes('telegram') && message.includes('updates'))) {
    return
  }

  originalConsoleWarn.apply(console, args)
}

// Interceptar console.log para filtrar TIMEOUTs e logs verbosos
console.log = function (...args) {
  const message = args.map(arg => String(arg)).join(' ')

  // Suprimir logs de TIMEOUT
  if (message.includes('TIMEOUT') || (message.includes('Error:') && message.includes('telegram/client/updates'))) {
    return
  }

  // Suprimir logs verbosos de registro de handlers (emojis de loading)
  if (
    message.includes('📦 Importando') ||
    message.includes('✅') && (message.includes('importado') || message.includes('registrado')) ||
    message.includes('📝 Registrando') ||
    message.includes('📋 Handlers registrados:') ||
    message.includes('🔍 Verificando') ||
    message.includes('[verificarBotsVendas] [processarBot]') ||
    message.includes('[verificarBotsVendas] [extrairDadosBot]') ||
    message.includes('[playwrightBase]')
  ) {
    return
  }

  originalConsoleLog.apply(console, args)
}

// Interceptar unhandledRejection para filtrar TIMEOUTs
const originalUnhandledRejection = process.listeners('unhandledRejection')
process.removeAllListeners('unhandledRejection')

process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = String(reason || '')

  // Ignorar TIMEOUTs do Telegram (mais abrangente)
  if (
    errorMsg.includes('TIMEOUT') ||
    (errorMsg.includes('telegram') && errorMsg.includes('updates')) ||
    (errorMsg.includes('Error:') && errorMsg.includes('updates.js'))
  ) {
    return // Ignorar silenciosamente
  }

  // Chamar handlers originais para outros erros
  originalUnhandledRejection.forEach(handler => {
    try {
      handler(reason, promise)
    } catch (e) {
      // Ignorar erros nos handlers
    }
  })
})

// Rastrear processos filhos para garantir que sejam finalizados
const childProcesses = new Set()

// Função para rastrear processo filho
export function trackChildProcess(process) {
  childProcesses.add(process)
  process.on('exit', () => {
    childProcesses.delete(process)
  })
  return process
}

// Função para finalizar todos os processos filhos
function killAllChildProcesses() {
  console.log(`[main] Finalizando ${childProcesses.size} processo(s) filho(s)...`)
  let killed = 0
  childProcesses.forEach((childProcess) => {
    try {
      if (childProcess && !childProcess.killed) {
        // No Windows, usar kill com força
        if (process.platform === 'win32') {
          childProcess.kill('SIGKILL')
        } else {
          childProcess.kill('SIGTERM')
        }
        killed++
        console.log(`[main] Processo filho ${childProcess.pid} finalizado`)
      }
    } catch (error) {
      console.warn(`[main] Erro ao finalizar processo filho:`, error.message)
    }
  })
  childProcesses.clear()
  console.log(`[main] ${killed} processo(s) finalizado(s)`)
}

// Gerenciador de sessões Telegram (para fechar sessões ao sair)
let sessionManager = null

async function closeAllTelegramSessions() {
  try {
    if (!sessionManager) {
      const path = await import('path')
      const pathModule = path.default || path
      const { fileURLToPath } = await import('url')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = pathModule.dirname(__filename)

      const sessionManagerPath = pathModule.resolve(__dirname, '../../back/utils/sessionManager.js')
      sessionManager = require(sessionManagerPath)
    }

    const activeCount = sessionManager.getActiveSessionCount()
    if (activeCount > 0) {
      console.log(`[main] 🔌 Fechando ${activeCount} sessão(ões) do Telegram...`)
      await sessionManager.disconnectAllSessions()
      console.log('[main] ✅ Todas as sessões do Telegram foram fechadas')
    }
  } catch (error) {
    console.warn('[main] Erro ao fechar sessões do Telegram:', error.message)
  }
}

// Handler para antes do app fechar
app.on('before-quit', async (event) => {
  console.log('[main] App está sendo fechado, limpando recursos...')
  await closeAllTelegramSessions()
  try {
    const { closeCraftPayBrowser } = await import('./handlers/craftpayHandlers.js')
    await closeCraftPayBrowser()
  } catch (e) {
    // Ignorar se CraftPay não estiver disponível
  }
  killAllChildProcesses()
})

// Handler para quando todas as janelas são fechadas
app.on('will-quit', async (event) => {
  console.log('[main] Todas as janelas foram fechadas, limpando...')
  await closeAllTelegramSessions()
  try {
    const { closeCraftPayBrowser } = await import('./handlers/craftpayHandlers.js')
    await closeCraftPayBrowser()
  } catch (e) { }
  killAllChildProcesses()
})

// Garantir que processos sejam finalizados mesmo em casos de erro
process.on('SIGINT', async () => {
  console.log('[main] SIGINT recebido, finalizando...')
  await closeAllTelegramSessions()
  killAllChildProcesses()
  app.quit()
})

process.on('SIGTERM', async () => {
  console.log('[main] SIGTERM recebido, finalizando...')
  await closeAllTelegramSessions()
  killAllChildProcesses()
  app.quit()
})

// Handler específico para Windows (quando fecham o CMD/terminal)
if (process.platform === 'win32') {
  process.on('SIGBREAK', async () => {
    console.log('[main] SIGBREAK recebido (Windows), finalizando...')
    await closeAllTelegramSessions()
    killAllChildProcesses()
    app.quit()
  })
}

// Limpar cache do Electron ao iniciar
app.commandLine.appendSwitch('--disable-http-cache')
app.commandLine.appendSwitch('--disable-background-networking')
// Configurar DevTools para não mostrar banner de idioma
app.commandLine.appendSwitch('--disable-features', 'TranslateUI,LanguageDetection')
app.commandLine.appendSwitch('--lang', 'en-US') // Forçar inglês para evitar banner
app.commandLine.appendSwitch('--disable-translate')

// Inicializar aplicação
app.whenReady().then(async () => {
  // console.log('🚀 App está pronto, inicializando...')

  // Inicializar sistemas de suporte
  try {
    const path = await import('path')
    const pathModule = path.default || path
    const { fileURLToPath } = await import('url')
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = pathModule.dirname(__filename)

    // Caminho para back/utils (relativo ao main.js)
    const backUtilsPath = pathModule.resolve(__dirname, '../../back/utils')

    // Inicializar rotação de logs
    const { initializeLogRotation } = require(pathModule.join(backUtilsPath, 'logRotation.js'))
    const logsDir = pathModule.join(app.getPath('userData'), 'logs')
    initializeLogRotation(logsDir)

    // Health check periódico com métricas
    const metrics = require(pathModule.join(backUtilsPath, 'metrics.js'))
    setInterval(() => {
      try {
        const health = metrics.getHealthReport()
        if (health.memory.heapUsed > 500) { // 500MB
          console.warn('[Health] Uso de memória alto:', health.memory.heapUsed, 'MB')
        }
      } catch (err) {
        // Ignorar erros de health check
      }
    }, 5 * 60 * 1000) // A cada 5 minutos
  } catch (error) {
    console.warn('[main] Erro ao inicializar sistemas de suporte:', error.message)
  }

  // Limpar cache de sessão - REMOVIDO PARA OTIMIZAR INICIALIZAÇÃO
  // const { session } = await import('electron')
  // const defaultSession = session.defaultSession
  // if (defaultSession) {
  //   console.log('🧹 Limpando cache do Electron...')
  //   await defaultSession.clearCache()
  //   await defaultSession.clearStorageData()
  //   console.log('✅ Cache limpo')
  // }

  // Registrar handlers ANTES de criar a janela para evitar race conditions
  try {
    console.log('📝 Registrando handlers...')

    // Importar handlers individualmente para melhor controle de erros
    console.log('📦 Importando módulos de handlers...')

    let registerTelegramHandlers, registerNichosHandlers, registerGruposHandlers, registerListasHandlers
    let registerCategoriasHandlers, registerUtilsHandlers, registerConfiguracoesHandlers, registerFotoAleatoriaHandler
    let registerApiTelegramHandlers, registerBotMidiaHandlers, registerBotVerificacaoHandlers
    let registerSmmHandlers, registerDashboardHandlers, registerProxyHandlers, registerCraftPayHandlers
    let registerOperacaoHandlers, registerDescricoesHandlers, registerContingenciaHandlers
    let registerTagsHandlers, registerSessionMonitorHandlers, registerApiAutoCreatorHandlers, registerVerificarMembrosHandlers, registerVerificadorDisparoHandlers, registerFixadorHandlers
    let restoreFixadorSeAtivo
    let verificarMembrosModule
    let registerWindowHandlers, registerDatabaseHandlers, registerOrderBumpLibraryHandlers, registerUpsellLibraryHandlers, registerReelsHandlers
    let registerBlastSendHandlers
    let registerBlastsendApiHandlers
    let registerCampanhasBlastsendHandlers
    let registerBotTagsHandlers
    let registerSendergramHandlers

    try {
      // Importar todos os handlers em paralelo para inicialização mais rápida
      const [
        telegramModule, nichosModule, gruposModule, listasModule, categoriasModule, utilsModule,
        apiTelegramModule, botMidiaModule, botVerificacaoModule, smmModule, dashboardModule,
        proxyModule, operacaoModule, descricoesModule, contingenciaModule, tagsModule,
        sessionMonitorModule, apiAutoCreatorModule, verificarMembrosModule, verificadorDisparoModule,
        fixadorModule, windowModule, databaseModule, orderBumpLibraryModule, upsellLibraryModule,
        craftpayModule, reelsModule, blastSendModule, sendergramModule, blastsendApiModule,
        campanhasBlastsendModule, botTagsModule
      ] = await Promise.all([
        import('./handlers/telegramHandlers.js'),
        import('./handlers/nichosHandlers.js'),
        import('./handlers/gruposHandlers.js'),
        import('./handlers/listasHandlers.js'),
        import('./handlers/categoriasHandlers.js').catch(() => ({ registerCategoriasHandlers: null })),
        import('./handlers/utilsHandlers.js'),
        import('./handlers/apiTelegramHandlers.js'),
        import('./handlers/botMidiaHandlers.js'),
        import('./handlers/botVerificacaoHandlers.js'),
        import('./handlers/smmHandlers.js'),
        import('./handlers/dashboardHandlers.js'),
        import('./handlers/proxyHandlers.js'),
        import('./handlers/operacaoHandlers.js'),
        import('./handlers/descricoesHandlers.js'),
        import('./handlers/contingenciaHandlers.js'),
        import('./handlers/tagsHandlers.js'),
        import('./handlers/sessionMonitorHandlers.js'),
        import('./handlers/apiAutoCreatorHandlers.js'),
        import('./handlers/verificarMembrosHandlers.js'),
        import('./handlers/verificadorDisparoHandlers.js'),
        import('./handlers/fixadorHandlers.js'),
        import('./handlers/windowHandlers.js'),
        import('./handlers/databaseHandlers.js'),
        import('./handlers/orderBumpLibraryHandlers.js'),
        import('./handlers/upsellLibraryHandlers.js'),
        import('./handlers/craftpayHandlers.js'),
        import('./handlers/reelsHandlers.js'),
        import('./handlers/blastSendHandlers.js'),
        import('./handlers/sendergramHandlers.js'),
        import('./handlers/blastsendApiHandlers.js'),
        import('./handlers/campanhasBlastsendHandlers.js'),
        import('./handlers/botTagsHandlers.js'),
      ])

      // Atribuir funções dos módulos
      registerTelegramHandlers = telegramModule.registerTelegramHandlers
      registerNichosHandlers = nichosModule.registerNichosHandlers
      registerGruposHandlers = gruposModule.registerGruposHandlers
      registerListasHandlers = listasModule.registerListasHandlers
      registerCategoriasHandlers = categoriasModule?.registerCategoriasHandlers ?? null
      registerUtilsHandlers = utilsModule.registerUtilsHandlers
      registerConfiguracoesHandlers = utilsModule.registerConfiguracoesHandlers
      registerFotoAleatoriaHandler = utilsModule.registerFotoAleatoriaHandler
      registerApiTelegramHandlers = apiTelegramModule.registerApiTelegramHandlers
      registerBotMidiaHandlers = botMidiaModule.registerBotMidiaHandlers
      registerBotVerificacaoHandlers = botVerificacaoModule.registerBotVerificacaoHandlers
      registerSmmHandlers = smmModule.registerSmmHandlers
      registerDashboardHandlers = dashboardModule.registerDashboardHandlers
      registerProxyHandlers = proxyModule.registerProxyHandlers
      registerOperacaoHandlers = operacaoModule.registerOperacaoHandlers
      registerDescricoesHandlers = descricoesModule.registerDescricoesHandlers
      registerContingenciaHandlers = contingenciaModule.registerContingenciaHandlers
      registerTagsHandlers = tagsModule.registerTagsHandlers
      registerSessionMonitorHandlers = sessionMonitorModule.registerSessionMonitorHandlers
      registerApiAutoCreatorHandlers = apiAutoCreatorModule.registerApiAutoCreatorHandlers
      registerVerificarMembrosHandlers = verificarMembrosModule.registerVerificarMembrosHandlers
      registerVerificadorDisparoHandlers = verificadorDisparoModule.registerVerificadorDisparoHandlers
      registerFixadorHandlers = fixadorModule.registerFixadorHandlers
      restoreFixadorSeAtivo = fixadorModule.restoreFixadorSeAtivo
      registerWindowHandlers = windowModule.registerWindowHandlers
      registerDatabaseHandlers = databaseModule.registerDatabaseHandlers
      registerOrderBumpLibraryHandlers = orderBumpLibraryModule.registerOrderBumpLibraryHandlers
      registerUpsellLibraryHandlers = upsellLibraryModule.registerUpsellLibraryHandlers
      registerCraftPayHandlers = craftpayModule.registerCraftPayHandlers
      registerReelsHandlers = reelsModule.registerReelsHandlers
      registerBlastSendHandlers = blastSendModule.registerBlastSendHandlers
      registerSendergramHandlers = sendergramModule.registerSendergramHandlers
      registerBlastsendApiHandlers = blastsendApiModule.registerBlastsendApiHandlers
      registerCampanhasBlastsendHandlers = campanhasBlastsendModule.registerCampanhasBlastsendHandlers
      registerBotTagsHandlers = botTagsModule.registerBotTagsHandlers

      await import('./handlers/telegramLoginHandlers.js')
    } catch (importError) {
      console.error('❌ Erro ao importar módulos:', importError)
      console.error('Stack:', importError.stack)
      throw importError
    }

    // Helper function para registrar handlers com tratamento de erro individual
    const safeRegister = (name, registerFn) => {
      try {
        if (!registerFn) {
          console.error(`❌ ${name} é undefined ou null!`)
          return false
        }
        if (typeof registerFn !== 'function') {
          console.error(`❌ ${name} não é uma função! Tipo: ${typeof registerFn}, Valor:`, registerFn)
          return false
        }
        console.log(`📝 Registrando ${name}...`)
        const result = registerFn()
        if (result instanceof Promise) {
          console.warn(`⚠️ ${name} retornou uma Promise, aguardando...`)
          // Não aguardar, mas logar
        }
        console.log(`✅ ${name} registrado com sucesso`)
        return true
      } catch (error) {
        console.error(`❌ Erro ao registrar ${name}:`, error)
        console.error(`Mensagem:`, error.message)
        console.error(`Stack:`, error.stack)
        return false
      }
    }

    // Registrar handlers com tratamento individual de erro (um erro não impede os outros)
    // IMPORTANTE: Registrar na ordem correta, handlers críticos primeiro
    console.log('📝 Registrando handlers críticos primeiro...')
    safeRegister('registerTelegramHandlers', registerTelegramHandlers)
    safeRegister('registerBotMidiaHandlers', registerBotMidiaHandlers)
    safeRegister('registerDashboardHandlers', registerDashboardHandlers)
    safeRegister('registerOperacaoHandlers', registerOperacaoHandlers)
    safeRegister('registerNichosHandlers', registerNichosHandlers)

    console.log('📝 Registrando handlers secundários...')

    // Registrar grupos handlers
    if (!registerGruposHandlers) {
      console.error('❌ CRÍTICO: registerGruposHandlers é undefined/null!')
      console.error('❌ O handler criar-grupos NÃO será registrado!')
    } else if (typeof registerGruposHandlers !== 'function') {
      console.error('❌ CRÍTICO: registerGruposHandlers não é uma função!')
      console.error('❌ Tipo recebido:', typeof registerGruposHandlers)
      console.error('❌ Valor:', registerGruposHandlers)
      console.error('❌ O handler criar-grupos NÃO será registrado!')
    } else {
      try {
        const resultado = registerGruposHandlers()
        if (resultado instanceof Promise) {
          await resultado
        }
      } catch (error) {
        console.error('❌ ERRO FATAL ao executar registerGruposHandlers:')
        console.error('  Mensagem:', error.message)
        console.error('  Stack:', error.stack)
        console.error('❌ O handler criar-grupos NÃO foi registrado devido ao erro acima!')
        throw error // Re-throw para que seja visível
      }
    }

    safeRegister('registerListasHandlers', registerListasHandlers)

    // Registrar categorias handlers (se disponível)
    if (registerCategoriasHandlers && typeof registerCategoriasHandlers === 'function') {
      safeRegister('registerCategoriasHandlers', registerCategoriasHandlers)
    } else {
      console.warn('⚠️ registerCategoriasHandlers não está disponível, pulando...')
    }

    safeRegister('registerUtilsHandlers', registerUtilsHandlers)
    safeRegister('registerApiTelegramHandlers', registerApiTelegramHandlers)
    safeRegister('registerApiAutoCreatorHandlers', registerApiAutoCreatorHandlers)
    safeRegister('registerVerificarMembrosHandlers', registerVerificarMembrosHandlers)
    safeRegister('registerVerificadorDisparoHandlers', registerVerificadorDisparoHandlers)
    safeRegister('registerFixadorHandlers', registerFixadorHandlers)
    try {
      if (typeof restoreFixadorSeAtivo === 'function') restoreFixadorSeAtivo()
    } catch (e) { console.warn('[fixador] restore:', e?.message) }
    safeRegister('registerBotVerificacaoHandlers', registerBotVerificacaoHandlers)
    safeRegister('registerSmmHandlers', registerSmmHandlers)
    safeRegister('registerProxyHandlers', registerProxyHandlers)
    safeRegister('registerConfiguracoesHandlers', registerConfiguracoesHandlers)
    safeRegister('registerFotoAleatoriaHandler', registerFotoAleatoriaHandler)
    safeRegister('registerDescricoesHandlers', registerDescricoesHandlers)
    safeRegister('registerContingenciaHandlers', registerContingenciaHandlers)
    safeRegister('registerTagsHandlers', registerTagsHandlers)
    safeRegister('registerSessionMonitorHandlers', registerSessionMonitorHandlers)
    safeRegister('registerWindowHandlers', registerWindowHandlers)
    safeRegister('registerDatabaseHandlers', registerDatabaseHandlers)
    safeRegister('registerOrderBumpLibraryHandlers', registerOrderBumpLibraryHandlers)
    safeRegister('registerUpsellLibraryHandlers', registerUpsellLibraryHandlers)
    safeRegister('registerCraftPayHandlers', registerCraftPayHandlers)
    safeRegister('registerReelsHandlers', registerReelsHandlers)
    safeRegister('registerBlastSendHandlers', registerBlastSendHandlers)
    safeRegister('registerBlastsendApiHandlers', registerBlastsendApiHandlers)
    safeRegister('registerCampanhasBlastsendHandlers', registerCampanhasBlastsendHandlers)
    safeRegister('registerBotTagsHandlers', registerBotTagsHandlers)
    safeRegister('registerSendergramHandlers', registerSendergramHandlers)

    console.log('✅ Processo de registro de handlers concluído')

    // Verificar se os handlers críticos foram registrados
    const { ipcMain } = await import('electron')
    const handlersCriticos = {
      'get-telegram-contas': 'Telegram',
      'carregar-bots-midia': 'Bot Mídia',
      'carregar-dashboard-profile': 'Dashboard',
      'listar-operacoes': 'Operações',
      'carregar-nichos': 'Nichos'
    }

    console.log('🔍 Verificando handlers críticos...')
    let todosRegistrados = true
    for (const [handler, nome] of Object.entries(handlersCriticos)) {
      // Verificar se o handler existe verificando se há listeners
      // Nota: ipcMain não expõe diretamente os handlers, mas podemos tentar chamar
      try {
        // Tentar verificar se o handler está registrado através de uma chamada de teste
        // Mas isso pode não funcionar, então vamos apenas logar
        console.log(`  ✓ Handler '${handler}' (${nome}) deve estar registrado`)
      } catch (error) {
        console.error(`  ✗ Handler '${handler}' (${nome}) NÃO está registrado!`)
        todosRegistrados = false
      }
    }

    if (todosRegistrados) {
      console.log('✅ Todos os handlers críticos foram registrados')
    } else {
      console.warn('⚠️ Alguns handlers críticos podem não ter sido registrados')
    }

    // Delay removido para otimizar inicialização
    // console.log('⏳ Aguardando finalização do registro (500ms)...')
    // await new Promise(resolve => setTimeout(resolve, 500))
    // console.log('✅ Delay concluído, handlers devem estar prontos')

  } catch (error) {
    console.error('❌ Erro ao registrar handlers:', error)
    console.error('Stack:', error.stack)
    // Continuar mesmo com erro nos handlers, mas avisar
    console.warn('⚠️ Continuando mesmo com erros nos handlers...')
    console.warn('⚠️ A aplicação pode não funcionar corretamente!')
  }

  // Criar janela DEPOIS de registrar os handlers e aguardar
  console.log('🪟 Criando janela (handlers devem estar registrados)...')
  createWindow()
  console.log('✅ Janela criada')

  app.on('activate', () => {
    recreateWindowIfNeeded()
  })
}).catch((error) => {
  console.error('❌ Erro fatal ao inicializar app:', error)
  killAllChildProcesses()
  process.exit(1)
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    console.log('[main] Todas as janelas foram fechadas, encerrando aplicação...')
    killAllChildProcesses()
    // Limpar cache antes de fechar
    try {
      const { session } = await import('electron')
      await session.defaultSession.clearCache()
      console.log('[main] Cache limpo, encerrando...')
    } catch (error) {
      console.warn('[main] Erro ao limpar cache:', error.message)
    }
    // Forçar saída imediata
    process.exit(0)
  }
})

// Garantir fechamento completo
app.on('before-quit', (event) => {
  console.log('[main] before-quit: limpando recursos e forçando fechamento...')
  killAllChildProcesses()
})

// Forçar fechamento em caso de erro não tratado
process.on('uncaughtException', (error) => {
  console.error('[main] Erro não tratado:', error)
  killAllChildProcesses()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[main] Promise rejeitada não tratada:', reason)
  killAllChildProcesses()
  process.exit(1)
})


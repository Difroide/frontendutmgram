import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import crypto from 'crypto'
import { PATHS } from '../config/paths.js'

// Função para gerar ID estável baseado no arquivoPath
function gerarIdEstavel(arquivoPath) {
  return crypto.createHash('md5').update(arquivoPath).digest('hex').substring(0, 16)
}

// Função para normalizar username (remove @ e converte para lowercase)
function normalizarUsername(username) {
  if (!username) return ''
  return username.replace(/^@/, '').toLowerCase().trim()
}

// Função para comparar usernames (com ou sem @)
function compararUsernames(username1, username2) {
  if (!username1 || !username2) return false
  return normalizarUsername(username1) === normalizarUsername(username2)
}

// Resolver createdAt com fallback para data do arquivo
function resolverCreatedAt(botData, arquivoPath) {
  const fromData = botData?.createdAt || botData?.created_at
  if (fromData) return fromData
  if (!arquivoPath) return new Date().toISOString()
  try {
    const stats = fs.statSync(arquivoPath)
    const fileDate = stats.birthtimeMs && stats.birthtimeMs > 0 ? stats.birthtimeMs : stats.mtimeMs
    return new Date(fileDate || Date.now()).toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

// Importar função de verificação de bots (CommonJS)
let verificarBotsPorSessao
function loadVerificadorBots() {
  try {
    if (!verificarBotsPorSessao) {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const require = createRequire(import.meta.url)
      const verificadorPath = path.join(__dirname, '../../../back/verificador bots/bots.js')
      console.log('[botMidia] Carregando verificador de bots de:', verificadorPath)

      if (!fs.existsSync(verificadorPath)) {
        console.error('[botMidia] Arquivo verificador não encontrado:', verificadorPath)
        return null
      }

      const verificadorModule = require(verificadorPath)
      verificarBotsPorSessao = verificadorModule.verificarBotsPorSessao

      if (!verificarBotsPorSessao) {
        console.error('[botMidia] Função verificarBotsPorSessao não encontrada no módulo')
        return null
      }

      console.log('[botMidia] Verificador de bots carregado com sucesso')
    }
    return verificarBotsPorSessao
  } catch (error) {
    console.error('[botMidia] Erro ao carregar verificador de bots:', error)
    console.error('[botMidia] Stack:', error.stack)
    return null
  }
}

// Função auxiliar para carregar bots sem verificação (para validações)
async function carregarBotsSemVerificacao() {
  const bots = []

  // Verificar se a pasta nichos existe
  if (!fs.existsSync(PATHS.NICHOS_DIR)) {
    return []
  }

  // Listar todas as pastas de nichos
  const pastasNichos = fs.readdirSync(PATHS.NICHOS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())

  // Para cada pasta de nicho, procurar arquivos JSON de bots
  for (const pastaNicho of pastasNichos) {
    const pastaNichoPath = path.join(PATHS.NICHOS_DIR, pastaNicho.name)

    // Listar arquivos JSON na pasta do nicho
    const arquivos = fs.readdirSync(pastaNichoPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))

    // Para cada arquivo JSON, ler e adicionar à lista
    for (const arquivo of arquivos) {
      try {
        const arquivoPath = path.join(pastaNichoPath, arquivo.name)
        const data = fs.readFileSync(arquivoPath, 'utf-8')
        const botData = JSON.parse(data)

        // Extrair informações do bot (aceitar diferentes formatos de campos)
        // Pode ser: bot_nome/bot_token OU nome/token
        const botNome = botData.bot_nome || botData.nome || botData.name || 'Bot sem nome'
        const botToken = botData.bot_token || botData.token

        // Requerer apenas o token (nome pode ser gerado depois)
        if (botToken && botToken.trim() !== '') {
          const idEstavel = gerarIdEstavel(arquivoPath)
          const createdAt = resolverCreatedAt(botData, arquivoPath)

          // Obter username (priorizar bot_username, depois username, depois bot_nome)
          let username = botData.bot_username || botData.username || ''

          // Se não tiver @, adicionar (normalizar)
          if (username && !username.startsWith('@')) {
            username = `@${username}`
          }

          bots.push({
            id: idEstavel,
            nome: botNome,
            token: botToken.trim(),
            username: username || undefined,
            nichoId: pastaNicho.name,
            nichoNome: pastaNicho.name,
            tipo: 'Instagram',
            tipoBot: botData.tipoBot || 'vendas', // Default: vendas
            status: 'Inativo',
            origem: 'nicho',
            categoriasVinculadas: botData.categoriasVinculadas || [],
            contas: botData.contas || [],
            arquivoPath: arquivoPath,
            createdAt, // ✅ Incluir data de criação estável
          })

          if (!botData.createdAt && !botData.created_at) {
            botData.createdAt = createdAt
            fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
          }
        } else {
          // Bot sem token válido - silencioso
        }
      } catch (error) {
        console.warn(`[botMidia] Erro ao ler arquivo de nicho ${arquivo.name}:`, error.message)
      }
    }
  }

  return bots
}

// Função para obter o diretório de categorias
function getCategoriasDir() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const categoriasDir = path.join(bancoDir, 'categorias')
    return categoriasDir
  } catch (error) {
    console.error('[botMidia] Erro ao resolver caminho de categorias:', error)
    // Fallback para estrutura padrão
    const basePath = PATHS.BASE
    const fallbackPath = path.join(basePath, 'banco', 'categorias')
    return fallbackPath
  }
}

// Função para obter o arquivo de cache de verificação
function getVerificacaoCachePath() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const cachePath = path.join(bancoDir, 'bot_verificacao_cache.json')
    return cachePath
  } catch (error) {
    const basePath = PATHS.BASE
    return path.join(basePath, 'banco', 'bot_verificacao_cache.json')
  }
}

// Função para carregar cache de verificação
function carregarCacheVerificacao() {
  const cachePath = getVerificacaoCachePath()
  if (!fs.existsSync(cachePath)) {
    return {}
  }
  try {
    const content = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('[botMidia] Erro ao carregar cache de verificação:', error.message)
    return {}
  }
}

// Função para salvar cache de verificação
function salvarCacheVerificacao(cache) {
  const cachePath = getVerificacaoCachePath()
  try {
    // Garantir que o diretório existe
    const cacheDir = path.dirname(cachePath)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
  } catch (error) {
    console.error('[botMidia] Erro ao salvar cache de verificação:', error.message)
  }
}

// Função para verificar se um bot precisa ser verificado (última verificação há mais de 24 horas)
function precisaVerificar(botId, ultimaVerificacao) {
  if (!ultimaVerificacao) {
    return true // Nunca foi verificado
  }
  const agora = new Date().getTime()
  const ultimaVerificacaoTime = new Date(ultimaVerificacao).getTime()
  const horasPassadas = (agora - ultimaVerificacaoTime) / (1000 * 60 * 60) // Converter para horas
  return horasPassadas >= 24 // Verificar se passou 24 horas
}

// Função auxiliar para carregar bots das categorias
async function carregarBotsCategorias() {
  const bots = []
  const CATEGORIAS_DIR = getCategoriasDir()

  if (!fs.existsSync(CATEGORIAS_DIR)) {
    return bots
  }

  try {
    const categorias = fs.readdirSync(CATEGORIAS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())

    for (const categoria of categorias) {
      const categoriaPath = path.join(CATEGORIAS_DIR, categoria.name)
      const botsFilePath = path.join(categoriaPath, 'bots.json')
      const metadataPath = path.join(categoriaPath, 'metadata.json')

      // Ler metadata para obter nome da categoria
      let categoriaNome = categoria.name
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          categoriaNome = metadata.nome || categoriaNome
        } catch (error) {
          console.warn(`[botMidia] Erro ao ler metadata da categoria ${categoria.name}:`, error.message)
        }
      }

      // Ler bots da categoria
      if (fs.existsSync(botsFilePath)) {
        try {
          const botsContent = fs.readFileSync(botsFilePath, 'utf-8')
          const botsCategoria = JSON.parse(botsContent)

          if (Array.isArray(botsCategoria)) {
            let altered = false
            // Para cada bot na categoria, criar uma entrada
            for (let idx = 0; idx < botsCategoria.length; idx++) {
              const botData = botsCategoria[idx]

              // Verificar se tem token (pode ser 'token' ou 'bot_token')
              const botToken = botData.token || botData.bot_token

              if (botToken) {
                // Gerar ID único baseado na categoria + token
                const botId = `categoria_${categoria.name}_${botToken.substring(0, 10)}`
                const createdAt = resolverCreatedAt(botData, botsFilePath)

                // Obter username (pode ser 'username' ou 'bot_username')
                let username = botData.username || botData.bot_username || ''
                if (username && !username.startsWith('@')) {
                  username = `@${username}`
                }

                // Usar nome do bot quando não tiver categoria, senão usar nome da categoria
                // O nome do bot será usado quando não houver categoria específica
                const nomeExibicao = botData.nome || categoriaNome;

                bots.push({
                  id: botId,
                  nome: nomeExibicao, // Nome do bot ou categoria
                  token: botToken,
                  username: username || undefined,
                  nichoId: undefined,
                  nichoNome: undefined,
                  categoriaId: categoria.name,
                  categoriaNome: categoriaNome,
                  tipo: 'Instagram',
                  tipoBot: botData.tipoBot || 'disparo', // Bots de categoria são por padrão de disparo
                  status: 'Inativo',
                  origem: 'categoria',
                  categoriasVinculadas: botData.categoriasVinculadas || [],
                  arquivoPath: botsFilePath, // Manter referência ao arquivo
                  createdAt, // ✅ Incluir data de criação estável
                })

                if (!botData.createdAt && !botData.created_at) {
                  botData.createdAt = createdAt
                  altered = true
                }
              }
            }

            if (altered) {
              fs.writeFileSync(botsFilePath, JSON.stringify(botsCategoria, null, 2), 'utf-8')
            }
          }
        } catch (error) {
          console.error(`[botMidia] Erro ao ler bots da categoria ${categoria.name}:`, error.message)
        }
      }
    }
  } catch (error) {
    console.warn('[botMidia] Erro ao carregar bots das categorias:', error.message)
  }

  return bots
}

// Função auxiliar para carregar bots do diretório bots_verificacao
async function carregarBotsVerificacao() {
  const bots = []

  try {
    const bancoDir = PATHS.BANCO_DIR
    const botsVerificacaoDir = path.join(bancoDir, 'bots_verificacao')

    if (fs.existsSync(botsVerificacaoDir)) {
      const arquivos = fs.readdirSync(botsVerificacaoDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))

      for (const arquivo of arquivos) {
        try {
          const arquivoPath = path.join(botsVerificacaoDir, arquivo.name)
          const data = fs.readFileSync(arquivoPath, 'utf-8')
          const botData = JSON.parse(data)

          // Verificar se tem token (pode ser 'token' ou 'bot_token')
          const botToken = botData.token || botData.bot_token
          const botNome = botData.nome || botData.bot_nome || botData.name || 'Bot sem nome'

          if (botToken) {
            const idEstavel = gerarIdEstavel(arquivoPath)
            const createdAt = resolverCreatedAt(botData, arquivoPath)

            // Obter username
            let username = botData.username || botData.bot_username || ''
            if (username && !username.startsWith('@')) {
              username = `@${username}`
            }

            bots.push({
              id: idEstavel,
              nome: botNome,
              token: botToken,
              username: username || undefined,
              nichoId: undefined,
              nichoNome: undefined,
              categoriaId: undefined,
              categoriaNome: undefined,
              tipo: 'Instagram',
              tipoBot: botData.tipoBot || 'vendas', // ✅ Incluir tipo do bot
              status: 'Inativo',
              origem: 'verificacao',
              categoriasVinculadas: botData.categoriasVinculadas || [],
              arquivoPath: arquivoPath,
              createdAt, // ✅ Incluir data de criação estável
            })

            if (!botData.createdAt && !botData.created_at) {
              botData.createdAt = createdAt
              fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
            }
          }
        } catch (error) {
          console.warn(`[botMidia] Erro ao ler bot de verificação ${arquivo.name}:`, error.message)
        }
      }
    }
  } catch (error) {
    console.warn('[botMidia] Erro ao carregar bots de verificação:', error.message)
  }

  return bots
}

// Função auxiliar para carregar todos os bots (nichos + categorias + verificacao) sem verificação
async function carregarTodosBotsSemVerificacao() {
  const bots = []

  // 1. Carregar bots dos nichos
  const botsNichos = await carregarBotsSemVerificacao()
  bots.push(...botsNichos)

  // 2. Carregar bots das categorias
  const botsCategorias = await carregarBotsCategorias()
  bots.push(...botsCategorias)

  // 3. Carregar bots do diretório bots_verificacao
  const botsVerificacao = await carregarBotsVerificacao()
  bots.push(...botsVerificacao)

  // Retornar TODOS os bots (incluindo os sem token) para exibição na interface
  // O filtro por token será feito apenas no handler de verificação
  return bots
}

/** Bots de vendas com link t.me para verificação (nome na página = online). Usa link cadastrado ou monta de username (sempre 1 @ na exibição, sem @@ na URL). */
export async function obterBotsVendasParaVerificacao() {
  const todos = await carregarTodosBotsSemVerificacao()
  return todos
    .filter(b => b.tipoBot === 'vendas' && b.username && String(b.username).trim() !== '')
    .map(b => {
      const userNorm = String(b.username).replace(/^@+/, '').trim()
      const linkCadastrado = b.link_convite || b.link
      let url = null
      if (linkCadastrado && typeof linkCadastrado === 'string' && linkCadastrado.includes('t.me/')) {
        const match = linkCadastrado.match(/t\.me\/([^/?#]+)/i)
        const path = match ? match[1].replace(/^@+/, '').trim() : ''
        if (path) url = 'https://t.me/' + path
      }
      if (!url && userNorm) url = 'https://t.me/' + userNorm
      return {
        id: b.id,
        nome: b.nome || 'Bot sem nome',
        username: userNorm ? '@' + userNorm : b.username,
        link_convite: url,
      }
    })
    .filter(b => b.link_convite)
}

export function registerBotMidiaHandlers() {
  // Handler IPC para salvar bot de mídia
  ipcMain.handle('salvar-bot-midia', async (event, botNome, botToken, nichoId, categoriaId) => {
    try {
      if (!botNome || !botToken) {
        return { success: false, error: 'Nome do bot e token são obrigatórios' }
      }

      // IMPORTANTE: Categoria agora é opcional - sempre salvar token de forma segura
      // Se não houver categoria, criar categoria padrão "Bots Sem Categoria"
      let categoriaIdFinal = categoriaId

      if (!categoriaIdFinal) {
        // Criar categoria padrão se não existir
        const categoriasDir = path.join(PATHS.BANCO_DIR, 'categorias')
        categoriaIdFinal = 'Bots Sem Categoria'
        const categoriaPath = path.join(categoriasDir, categoriaIdFinal)

        if (!fs.existsSync(categoriaPath)) {
          fs.mkdirSync(categoriaPath, { recursive: true })
          // Criar metadata básica
          const metadataPath = path.join(categoriaPath, 'metadata.json')
          const metadata = {
            nome: 'Bots Sem Categoria',
            descricao: 'Bots criados sem categoria específica',
            createdAt: new Date().toISOString(),
            rodando: false,
          }
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
          console.log(`[salvar-bot-midia] ✅ Categoria padrão "${categoriaIdFinal}" criada`)
        }
      }

      // Salvar bot na categoria
      if (categoriaId) {
        const categoriasDir = path.join(PATHS.BANCO_DIR, 'categorias')
        const categoriaPath = path.join(categoriasDir, categoriaId)
        const botsFilePath = path.join(categoriaPath, 'bots.json')

        if (!fs.existsSync(categoriaPath)) {
          return { success: false, error: `Categoria "${categoriaId}" não encontrada` }
        }

        // Ler bots existentes da categoria
        let botsCategoria = []
        if (fs.existsSync(botsFilePath)) {
          try {
            const content = fs.readFileSync(botsFilePath, 'utf-8')
            botsCategoria = JSON.parse(content)
            if (!Array.isArray(botsCategoria)) {
              botsCategoria = []
            }
          } catch (error) {
            console.warn(`Erro ao ler bots da categoria: ${error.message}`)
            botsCategoria = []
          }
        }

        // Verificar se já existe (por token)
        const botExistente = botsCategoria.find(b => b.token === botToken || b.bot_token === botToken)
        if (!botExistente) {
          // Adicionar bot à categoria
          const novoBot = {
            nome: botNome,
            token: botToken,
            username: null, // Será preenchido quando verificar
            createdAt: new Date().toISOString(),
          }

          botsCategoria.push(novoBot)

          fs.writeFileSync(botsFilePath, JSON.stringify(botsCategoria, null, 2), 'utf-8')
          console.log(`[salvar-bot-midia] ✅ Bot "${botNome}" adicionado à categoria ${categoriaIdFinal}`)
          console.log(`[salvar-bot-midia]    Token: ${botToken.substring(0, 10)}...`)
          console.log(`[salvar-bot-midia]    Total de bots na categoria: ${botsCategoria.length}`)
        } else {
          console.log(`[salvar-bot-midia] ⚠️ Bot com token ${botToken.substring(0, 10)}... já existe na categoria ${categoriaIdFinal}`)
        }
      }

      // IMPORTANTE: Sempre salvar token de forma segura (backup global)
      try {
        const { createRequire } = await import('module')
        const require = createRequire(import.meta.url)
        const criadorPath = path.join(PATHS.BASE, 'back', 'criador', 'criador.js')
        const { salvarTokenBotSeguro } = require(criadorPath)

        if (salvarTokenBotSeguro) {
          const customPaths = {
            bancoDir: PATHS.BANCO_DIR,
            accountsDir: PATHS.CONTAS_DIR,
            bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
          }

          await salvarTokenBotSeguro(
            botNome,
            botToken,
            null, // username será preenchido depois
            categoriaIdFinal,
            customPaths
          )
          console.log(`[salvar-bot-midia] ✅ Token salvo com segurança (backup global)`)
        }
      } catch (tokenSaveError) {
        console.warn(`[salvar-bot-midia] ⚠️ Erro ao salvar token de forma segura (continuando):`, tokenSaveError.message)
      }

      // Verificar se o token já existe em algum bot
      const todosBots = await carregarBotsSemVerificacao()
      const tokenDuplicado = todosBots.find(bot => bot.token === botToken)
      if (tokenDuplicado) {
        return {
          success: false,
          error: `Token já está em uso pelo bot "${tokenDuplicado.nome}"${tokenDuplicado.categoriaNome ? ` na categoria "${tokenDuplicado.categoriaNome}"` : ''}`
        }
      }

      return { success: true, path: 'categoria' }
    } catch (error) {
      console.error('Erro ao salvar bot de mídia:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para salvar bots encontrados na verificação automaticamente
  ipcMain.handle('salvar-bots-verificacao', async (event, botsEncontrados) => {
    try {
      if (!Array.isArray(botsEncontrados) || botsEncontrados.length === 0) {
        return { success: true, savedCount: 0 }
      }

      // Filtrar apenas bots com token válido
      const botsComToken = botsEncontrados.filter(bot => bot.token && typeof bot.token === 'string')

      if (botsComToken.length === 0) {
        console.log('[salvar-bots-verificacao] Nenhum bot com token válido para salvar')
        return { success: true, savedCount: 0 }
      }

      console.log(`[salvar-bots-verificacao] 🤖 Salvando ${botsComToken.length} bot(s) encontrado(s) automaticamente...`)

      let savedCount = 0
      const errors = []

      // Criar categoria "Bots Encontrados" se não existir
      const categoriaId = 'Bots Encontrados'
      const categoriasDir = path.join(PATHS.BANCO_DIR, 'categorias')
      const categoriaPath = path.join(categoriasDir, categoriaId)
      const botsFilePath = path.join(categoriaPath, 'bots.json')

      if (!fs.existsSync(categoriaPath)) {
        fs.mkdirSync(categoriaPath, { recursive: true })
        const metadataPath = path.join(categoriaPath, 'metadata.json')
        const metadata = {
          nome: 'Bots Encontrados',
          descricao: 'Bots encontrados automaticamente pela verificação de contas',
          createdAt: new Date().toISOString(),
          rodando: false,
        }
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
        console.log(`[salvar-bots-verificacao] ✅ Categoria "Bots Encontrados" criada`)
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
          console.warn(`[salvar-bots-verificacao] Erro ao ler bots existentes: ${error.message}`)
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
              sessaoOrigem: bot.accountId || null,
              createdAt: new Date().toISOString(),
            }

            botsCategoria.push(novoBot)
            savedCount++
            console.log(`[salvar-bots-verificacao] ✅ Bot "${novoBot.nome}" salvo (token: ${bot.token.substring(0, 15)}...)`)
          } else {
            console.log(`[salvar-bots-verificacao] ⚠️ Bot com token ${bot.token.substring(0, 15)}... já existe`)
          }
        } catch (botError) {
          errors.push({ bot: bot.name, error: botError.message })
        }
      }

      // Salvar arquivo de bots atualizado
      if (savedCount > 0) {
        fs.writeFileSync(botsFilePath, JSON.stringify(botsCategoria, null, 2), 'utf-8')
        console.log(`[salvar-bots-verificacao] 💾 ${savedCount} bot(s) salvo(s) na categoria "Bots Encontrados"`)
      }

      return { success: true, savedCount, errors: errors.length > 0 ? errors : undefined }
    } catch (error) {
      console.error('[salvar-bots-verificacao] Erro ao salvar bots:', error)
      return { success: false, error: error.message, savedCount: 0 }
    }
  })

  // Handler IPC para carregar todos os bots de mídia (sem verificação automática)
  ipcMain.handle('carregar-bots-midia', async () => {
    try {
      // Usar a função unificada que carrega TODOS os bots (nichos + categorias + verificacao)
      let bots = await carregarTodosBotsSemVerificacao()

      // Carregar cache de verificação
      const cache = carregarCacheVerificacao()

      // Aplicar status do cache nos bots e verificar apenas os que precisam
      const botsParaVerificar = []
      const agora = new Date().toISOString()

      for (const bot of bots) {
        const cacheEntry = cache[bot.id]

        if (cacheEntry && !precisaVerificar(bot.id, cacheEntry.ultimaVerificacao)) {
          // Usar status do cache (verificado há menos de 24h)
          bot.status = cacheEntry.status
          bot.statusDetalhe = cacheEntry.statusDetalhe
          bot.error = cacheEntry.error
          if (cacheEntry.username) {
            bot.username = cacheEntry.username
          }
        } else {
          // Precisa verificar (nunca foi verificado ou passou 24h)
          if (bot.tipoBot === 'vendas' && bot.username) {
            botsParaVerificar.push(bot)
          } else if (bot.tipoBot === 'vendas' && !bot.username) {
            bot.status = 'Inativo'
            bot.statusDetalhe = 'erro'
            bot.error = 'Bot sem @username'
          }
        }
      }

      // Verificação automática DESATIVADA: não rodar ao carregar a lista.
      // Use "Verificar bots" manualmente quando precisar.
      if (botsParaVerificar.length > 0) {
        for (const bot of botsParaVerificar) {
          const cacheEntry = cache[bot.id]
          if (cacheEntry) {
            // Usar cache expirado para exibição (último status conhecido)
            bot.status = cacheEntry.status
            bot.statusDetalhe = cacheEntry.statusDetalhe
            bot.error = cacheEntry.error
            if (cacheEntry.username) bot.username = cacheEntry.username
          } else {
            bot.status = 'Não verificado'
            bot.statusDetalhe = 'cache'
          }
        }
      }

      return bots
    } catch (error) {
      console.error('[botMidia] Erro ao carregar bots de mídia:', error)
      console.error('[botMidia] Stack:', error.stack)
      return []
    }
  })

  // Handler IPC para atualizar bot de mídia
  ipcMain.handle('atualizar-bot-midia', async (event, arquivoPath, botNome, botToken, botUsername) => {
    try {
      if (!fs.existsSync(arquivoPath)) {
        return { success: false, error: 'Arquivo do bot não encontrado' }
      }

      // Verificar se o token já existe em outro bot (se foi alterado)
      const todosBots = await carregarBotsSemVerificacao()
      const botAtual = todosBots.find(bot => bot.arquivoPath === arquivoPath)
      const tokenDuplicado = todosBots.find(bot =>
        bot.token === botToken && bot.arquivoPath !== arquivoPath
      )

      if (tokenDuplicado) {
        return {
          success: false,
          error: `Token já está em uso pelo bot "${tokenDuplicado.nome}" no nicho "${tokenDuplicado.nichoNome}"`
        }
      }

      // Ler o arquivo atual
      const data = fs.readFileSync(arquivoPath, 'utf-8')
      const botData = JSON.parse(data)

      // Atualizar dados
      botData.bot_nome = botNome
      botData.bot_token = botToken
      if (botUsername !== undefined) {
        botData.bot_username = botUsername || ''
      }

      // Salvar de volta
      fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
      console.log(`Bot atualizado em: ${arquivoPath}`)

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar bot de mídia:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para atualizar tipo do bot
  ipcMain.handle('atualizar-tipo-bot', async (event, arquivoPath, tipoBot) => {
    try {
      if (!fs.existsSync(arquivoPath)) {
        return { success: false, error: 'Arquivo do bot não encontrado' }
      }

      const data = fs.readFileSync(arquivoPath, 'utf-8')
      const botData = JSON.parse(data)
      botData.tipoBot = tipoBot
      fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
      console.log(`[botMidia] Tipo do bot atualizado para ${tipoBot} em: ${arquivoPath}`)

      return { success: true }
    } catch (error) {
      console.error('[botMidia] Erro ao atualizar tipo do bot:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para vincular categorias ao bot
  ipcMain.handle('vincular-categorias-bot', async (event, arquivoPath, categoriasIds) => {
    try {
      if (!fs.existsSync(arquivoPath)) {
        return { success: false, error: 'Arquivo do bot não encontrado' }
      }

      const data = fs.readFileSync(arquivoPath, 'utf-8')
      const botData = JSON.parse(data)
      botData.categoriasVinculadas = categoriasIds || []
      fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
      console.log(`[botMidia] Categorias vinculadas atualizadas em: ${arquivoPath}`)

      return { success: true }
    } catch (error) {
      console.error('[botMidia] Erro ao vincular categorias:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para atualizar bot completo (nome, token, username, tipoBot, categoriasVinculadas)
  ipcMain.handle('atualizar-bot-completo', async (event, arquivoPath, dados) => {
    try {
      if (!fs.existsSync(arquivoPath)) {
        return { success: false, error: 'Arquivo do bot não encontrado' }
      }

      // Verificar se o token já existe em outro bot (se foi alterado)
      if (dados.token) {
        const todosBots = await carregarBotsSemVerificacao()
        const tokenDuplicado = todosBots.find(bot =>
          bot.token === dados.token && bot.arquivoPath !== arquivoPath
        )

        if (tokenDuplicado) {
          return {
            success: false,
            error: `Token já está em uso pelo bot "${tokenDuplicado.nome}"`
          }
        }
      }

      const data = fs.readFileSync(arquivoPath, 'utf-8')
      const botData = JSON.parse(data)

      // Atualizar campos conforme fornecidos
      if (dados.nome !== undefined) {
        botData.bot_nome = dados.nome
        botData.nome = dados.nome
      }
      if (dados.token !== undefined) {
        botData.bot_token = dados.token
        botData.token = dados.token
      }
      if (dados.username !== undefined) {
        botData.bot_username = dados.username ? (dados.username.startsWith('@') ? dados.username : '@' + dados.username) : ''
        botData.username = botData.bot_username
      }
      if (dados.tipoBot !== undefined) {
        botData.tipoBot = dados.tipoBot
      }
      if (dados.categoriasVinculadas !== undefined) {
        botData.categoriasVinculadas = dados.categoriasVinculadas
      }

      fs.writeFileSync(arquivoPath, JSON.stringify(botData, null, 4), 'utf-8')
      console.log(`[botMidia] Bot atualizado (completo) em: ${arquivoPath}`)

      return { success: true }
    } catch (error) {
      console.error('[botMidia] Erro ao atualizar bot completo:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para excluir bot de mídia
  ipcMain.handle('excluir-bot-midia', async (event, arquivoPath) => {
    try {
      if (!fs.existsSync(arquivoPath)) {
        return { success: false, error: 'Arquivo do bot não encontrado' }
      }

      fs.unlinkSync(arquivoPath)
      console.log(`Bot excluído: ${arquivoPath}`)

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir bot de mídia:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('verificar-bots-midia', async () => {
    try {
      console.log('[botMidia] Iniciando verificação MANUAL (apenas START)...')

      let todosBots = await carregarTodosBotsSemVerificacao()
      const botsVendas = todosBots.filter(b => b.tipoBot === 'vendas')
      const botsComUsername = botsVendas
        .filter(b => b.username && b.username.trim() !== '')
        .map(b => ({ ...b, nome: b.nome || 'Bot sem nome' }))
      const botsSemUsername = botsVendas
        .filter(b => !b.username || !b.username.trim())
        .map(b => ({ ...b, nome: b.nome || 'Bot sem nome', status: 'Inativo', statusDetalhe: 'erro', error: 'Bot sem @username' }))

      if (botsComUsername.length === 0 && botsSemUsername.length === 0) {
        return { success: true, bots: [], message: 'Nenhum bot encontrado para verificar' }
      }

      const verificarFuncao = loadVerificadorBots()
      if (!verificarFuncao) {
        return { success: false, error: 'Função de verificação não disponível', bots: botsComUsername }
      }

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }

      const resultadosStart = await verificarFuncao(botsComUsername, customPaths, { responseTimeoutMs: 10000, pollIntervalMs: 1000 })

      const botsResultado = resultadosStart.map((bot) => ({
        ...bot,
        status: bot.status || 'Inativo',
        statusDetalhe: bot.status === 'Ativo' ? 'online' : (bot.error ? 'erro' : 'offline'),
      }))
      const ativos = botsResultado.filter(b => b.status === 'Ativo').length
      console.log(`[botMidia] Verificação concluída. ${ativos} ON, ${botsResultado.length - ativos} OFF.`)

      // Carregar e atualizar cache
      const cache = carregarCacheVerificacao()
      const agora = new Date().toISOString()

      // Atualizar username nos arquivos JSON e cache
      for (const bot of botsResultado) {
        // Atualizar cache
        cache[bot.id] = {
          status: bot.status,
          username: bot.username,
          statusDetalhe: bot.statusDetalhe,
          error: bot.error,
          ultimaVerificacao: agora
        }
      }

      // Salvar cache atualizado
      salvarCacheVerificacao(cache)

      return {
        success: true,
        bots: botsResultado,
        ativos: ativos,
        total: botsResultado.length,
        message: `${ativos} bot(s) ativo(s) de ${botsResultado.length} total`
      }
    } catch (error) {
      console.error('[botMidia] Erro ao verificar bots de mídia:', error)
      console.error('[botMidia] Stack:', error.stack)
      return {
        success: false,
        error: error.message || 'Erro ao verificar bots',
        bots: []
      }
    }
  })



  // NOVO: Handler para verificação diária automática de todos os bots
  ipcMain.handle('verificar-bots-diario', async () => {
    try {
      console.log('[botMidia] Iniciando verificação diária automática de bots...')

      // Carregar todos os bots (nichos + categorias)
      let bots = []

      if (fs.existsSync(PATHS.NICHOS_DIR)) {
        const botsNichos = await carregarBotsSemVerificacao()
        bots.push(...botsNichos)
      }

      const botsCategorias = await carregarBotsCategorias()
      bots.push(...botsCategorias)

      const botsVendas = bots.filter(b => b.tipoBot === 'vendas')
      const botsComUsername = botsVendas.filter(b => b.username && b.username.trim() !== '')
      const botsSemUsername = botsVendas
        .filter(b => !b.username || !b.username.trim())
        .map(b => ({
          ...b,
          status: 'Inativo',
          statusDetalhe: 'erro',
          error: 'Bot sem @username',
        }))

      console.log(`[botMidia] ${botsSemUsername.length} bot(s) sem @username na verificação diária`)

      if (botsComUsername.length === 0 && botsSemUsername.length === 0) {
        console.log('[botMidia] Nenhum bot encontrado para verificação diária')
        return { success: true, message: 'Nenhum bot encontrado', verificados: 0, ativos: 0 }
      }

      console.log(`[botMidia] Verificando ${botsComUsername.length} bot(s) na verificação diária...`)

      // Verificar todos os bots (ignorar cache para verificação diária)
      const verificarFuncao = loadVerificadorBots()
      if (!verificarFuncao) {
        return { success: false, error: 'Verificador de bots não disponível' }
      }

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }
      const botsVerificados = await verificarFuncao(botsComUsername, customPaths, {
        responseTimeoutMs: 10000,
        pollIntervalMs: 1000,
      })
      const botsResultado = [...botsVerificados, ...botsSemUsername]

      // Carregar e atualizar cache
      const cache = carregarCacheVerificacao()
      const agora = new Date().toISOString()
      const botsOffline = []

      for (const botVerificado of botsResultado) {
        const statusAnterior = cache[botVerificado.id]?.status

        // Detectar mudança de status
        if (statusAnterior === 'Ativo' && botVerificado.status === 'Inativo') {
          botsOffline.push({
            nome: botVerificado.nome || 'Bot sem nome',
            username: botVerificado.username || 'N/A',
            categoriaId: botVerificado.categoriaId,
            categoriaNome: botVerificado.categoriaNome,
            erro: botVerificado.error || 'Desconhecido',
            statusDetalhe: botVerificado.statusDetalhe || 'erro',
          })
        }

        // Atualizar cache
        cache[botVerificado.id] = {
          status: botVerificado.status,
          username: botVerificado.username,
          statusDetalhe: botVerificado.statusDetalhe,
          error: botVerificado.error,
          ultimaVerificacao: agora
        }
      }

      salvarCacheVerificacao(cache)

      const ativos = botsResultado.filter(b => b.status === 'Ativo').length
      console.log(`[botMidia] Verificação diária concluída. ${ativos} bot(s) ativo(s) de ${botsResultado.length} verificado(s)`)

      // Notificar sobre bots offline
      if (botsOffline.length > 0) {
        const mensagem = `⚠️ ${botsOffline.length} bot(s) ficaram OFFLINE:\n\n` +
          botsOffline.map(bot =>
            `• ${bot.nome}${bot.username !== 'N/A' ? ` (${bot.username})` : ''}${bot.categoriaNome ? ` [${bot.categoriaNome}]` : ''}`
          ).join('\n')

        // Enviar notificação
        BrowserWindow.getAllWindows().forEach(window => {
          if (window && !window.isDestroyed()) {
            window.webContents.send('bot-offline-notification', {
              bots: botsOffline,
              mensagem: mensagem,
              timestamp: agora
            })
          }
        })
      }

      return {
        success: true,
        verificados: botsResultado.length,
        ativos: ativos,
        inativos: botsResultado.length - ativos,
        botsOffline: botsOffline.length
      }

    } catch (error) {
      console.error('[botMidia] Erro na verificação diária:', error)
      return { success: false, error: error.message }
    }
  })


  // Handler IPC para verificar um bot individual (apenas START)
  ipcMain.handle('verificar-bot-individual', async (event, botId) => {
    try {
      console.log(`[botMidia] Verificando bot individual: ${botId}`)

      const todosBots = await carregarTodosBotsSemVerificacao()
      const bot = todosBots.find(b => b.id === botId || String(b.id) === String(botId))
      if (!bot || !bot.username?.trim()) {
        return { success: false, error: bot ? 'Bot sem @username' : 'Bot não encontrado' }
      }

      const customPaths = { accountsDir: PATHS.CONTAS_DIR, bancoDir: PATHS.BANCO_DIR, bancoPrincipalDir: path.join(PATHS.BASE, 'banco'), rootDir: PATHS.BASE }

      const verificarFuncao = loadVerificadorBots()
      if (!verificarFuncao) return { success: false, error: 'Função de verificação não disponível' }

      const resultadosStart = await verificarFuncao([bot], customPaths, { responseTimeoutMs: 10000, pollIntervalMs: 1000 })
      const botResultado = resultadosStart?.[0]
      if (!botResultado) return { success: false, error: 'Falha ao verificar bot' }

      const statusFinal = botResultado.status || 'Inativo'
      const statusDetalhe = statusFinal === 'Ativo' ? 'online' : (botResultado.error ? 'erro' : 'offline')

      const cache = carregarCacheVerificacao()
      cache[botId] = { status: statusFinal, username: botResultado.username, statusDetalhe, error: botResultado.error, ultimaVerificacao: new Date().toISOString() }
      salvarCacheVerificacao(cache)

      return { success: true, status: statusFinal, username: botResultado.username, statusDetalhe, error: botResultado.error }
    } catch (error) {
      console.error('[botMidia] Erro ao verificar bot individual:', error)
      return {
        success: false,
        error: error.message || 'Erro ao verificar bot'
      }
    }
  })


  // Handler IPC para sincronizar bots, categorias e grupos
  ipcMain.handle('sincronizar-bots-categorias-grupos', async () => {
    try {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const BACK_DIR = path.resolve(__dirname, '../../../back')
      const require = createRequire(import.meta.url)

      const sincronizadorPath = path.join(BACK_DIR, 'sincronizador', 'sincronizarBotsCategoriasGrupos.js')

      if (!fs.existsSync(sincronizadorPath)) {
        return { success: false, error: 'Módulo de sincronização não encontrado' }
      }

      const sincronizadorModule = require(sincronizadorPath)
      const { sincronizarBotsCategoriasGrupos } = sincronizadorModule

      if (!sincronizarBotsCategoriasGrupos) {
        return { success: false, error: 'Função de sincronização não encontrada' }
      }

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        categoriasDir: path.join(PATHS.BANCO_DIR, 'categorias'),
        nichosDir: PATHS.NICHOS_DIR,
      }

      const resultado = await sincronizarBotsCategoriasGrupos(customPaths)

      return resultado
    } catch (error) {
      console.error('[botMidia] Erro ao sincronizar:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao sincronizar',
      }
    }
  })
}


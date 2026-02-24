import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'
import { getMainWindow } from '../window/windowManager.js'

function getCategoriasDir() {
  try {
    const bancoDir = PATHS.BANCO_DIR
    const categoriasDir = path.join(bancoDir, 'categorias')
    return categoriasDir
  } catch (error) {
    console.error('[getCategoriasDir] Erro ao resolver caminho:', error)
    // Fallback para estrutura padrão
    const basePath = PATHS.BASE
    const fallbackPath = path.join(basePath, 'banco', 'categorias')
    return fallbackPath
  }
}

export function registerCategoriasHandlers() {
  console.log('📝 Registrando handlers de categorias...')
  
  // Handler IPC para carregar categorias
  ipcMain.handle('carregar-categorias', async () => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      // Verificar se a pasta categorias existe, se não, criar
      if (!fs.existsSync(CATEGORIAS_DIR)) {
        fs.mkdirSync(CATEGORIAS_DIR, { recursive: true })
        console.log('Pasta "categorias" criada em:', CATEGORIAS_DIR)
        return []
      }

      // Listar todas as pastas dentro de banco/categorias/
      const pastas = fs.readdirSync(CATEGORIAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const nomePasta = dirent.name
          const pastaPath = path.join(CATEGORIAS_DIR, nomePasta)
          
          // Ler metadata se existir
          const metadataPath = path.join(pastaPath, 'metadata.json')
          let metadata = {}
          
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
            } catch (error) {
              console.warn(`Erro ao ler metadata da categoria ${nomePasta}:`, error.message)
            }
          }
          
          // IMPORTANTE: Apenas o usuário pode marcar/desmarcar categorias como rodando
          // O status "rodando" vem APENAS do metadata.json, sem sincronização automática com a fila global
          const estaRodando = metadata.rodando === true
          
          return {
            id: nomePasta,
            nome: metadata.nome || nomePasta,
            descricao: metadata.descricao || '',
            rodando: estaRodando, // Apenas do metadata, sem sincronização automática
            createdAt: metadata.createdAt || fs.statSync(pastaPath).birthtime.toISOString(),
          }
        })

      // Carregar quantidade de bots e grupos para cada categoria
      const categoriasComBots = pastas.map(categoria => {
        const botsFilePath = path.join(CATEGORIAS_DIR, categoria.id, 'bots.json')
        const gruposFilePath = path.join(CATEGORIAS_DIR, categoria.id, 'grupos.json')
        let quantidadeBots = 0
        let quantidadeGrupos = 0
        if (fs.existsSync(botsFilePath)) {
          try {
            const botsContent = fs.readFileSync(botsFilePath, 'utf-8')
            const bots = JSON.parse(botsContent)
            if (Array.isArray(bots)) {
              quantidadeBots = bots.length
            }
          } catch (error) {
            console.warn(`Erro ao ler bots da categoria ${categoria.id}:`, error.message)
          }
        }
        if (fs.existsSync(gruposFilePath)) {
          try {
            const gruposContent = fs.readFileSync(gruposFilePath, 'utf-8')
            const grupos = JSON.parse(gruposContent)
            if (Array.isArray(grupos)) {
              quantidadeGrupos = grupos.length
            }
          } catch (error) {
            console.warn(`Erro ao ler grupos da categoria ${categoria.id}:`, error.message)
          }
        }
        return {
          ...categoria,
          quantidadeBots,
          quantidadeGrupos,
        }
      })

      // Log reduzido para melhor performance
      return categoriasComBots
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      return []
    }
  })

  // Handler IPC para carregar bots de uma categoria
  // OTIMIZADO: Logs reduzidos para melhor performance
  ipcMain.handle('carregar-bots-categoria', async (event, categoriaId) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const botsFilePath = path.join(categoriaPath, 'bots.json')
      
      if (!fs.existsSync(categoriaPath)) {
        return []
      }
      
      if (!fs.existsSync(botsFilePath)) {
        return []
      }
      
      try {
        const botsContent = fs.readFileSync(botsFilePath, 'utf-8')
        const bots = JSON.parse(botsContent)
        if (!Array.isArray(bots)) {
          return []
        }
        
        // OTIMIZADO: Normalizar campos (suportar tanto bot_token quanto token)
        const botsNormalizados = bots.map((bot) => ({
          nome: bot.nome,
          username: bot.username || bot.bot_username,
          token: bot.token || bot.bot_token,
          createdAt: bot.createdAt,
        }))
        
        return botsNormalizados
      } catch (error) {
        console.error(`Erro ao ler bots da categoria ${categoriaId}:`, error)
        return []
      }
    } catch (error) {
      console.error('Erro ao carregar bots da categoria:', error)
      return []
    }
  })

  // Handler IPC para criar categoria
  ipcMain.handle('criar-categoria', async (event, nome, descricao = '') => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      
      // Garantir que o diretório de categorias existe
      if (!fs.existsSync(CATEGORIAS_DIR)) {
        console.log(`[criar-categoria] Criando diretório de categorias: ${CATEGORIAS_DIR}`)
        fs.mkdirSync(CATEGORIAS_DIR, { recursive: true })
      }
      
      // Validar e limpar o nome
      if (!nome || typeof nome !== 'string') {
        throw new Error('Nome da categoria não pode estar vazio')
      }
      
      const nomeTrimmed = nome.trim()
      if (!nomeTrimmed) {
        throw new Error('Nome da categoria não pode estar vazio')
      }
      
      // Criar ID único para a pasta (usar timestamp + hash simples do nome)
      // Isso permite que o nome tenha qualquer caractere, mas a pasta tenha um nome válido
      const timestamp = Date.now()
      const nomeHash = Buffer.from(nomeTrimmed).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10)
      const categoriaId = `${timestamp}_${nomeHash}`

      // Usar o ID único como nome da pasta para evitar conflitos e permitir qualquer caractere no nome
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)

      if (fs.existsSync(categoriaPath)) {
        throw new Error(`Categoria já existe`)
      }

      // Criar pasta da categoria
      console.log(`[criar-categoria] Criando pasta da categoria: ${categoriaPath}`)
      fs.mkdirSync(categoriaPath, { recursive: true })
      
      // Criar pasta para nomes de grupos
      const nomesPath = path.join(categoriaPath, 'nomes')
      console.log(`[criar-categoria] Criando pasta de nomes: ${nomesPath}`)
      fs.mkdirSync(nomesPath, { recursive: true })
      
      // Criar arquivo de metadata com o nome original
      const metadata = {
        nome: nomeTrimmed, // Nome original completo
        descricao: descricao || '',
        createdAt: new Date().toISOString(),
        rodando: false, // Inicializar como não rodando
      }
      
      const metadataPath = path.join(categoriaPath, 'metadata.json')
      console.log(`[criar-categoria] Criando arquivo de metadata: ${metadataPath}`)
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

      console.log(`✅ Categoria "${nomeTrimmed}" criada com sucesso (ID: ${categoriaId})`)
      console.log(`[criar-categoria] Caminho completo: ${categoriaPath}`)
      
      return {
        id: categoriaId,
        nome: nomeTrimmed, // Retornar nome original
        descricao: descricao,
        createdAt: metadata.createdAt,
        rodando: false,
      }
    } catch (error) {
      console.error('[criar-categoria] ❌ Erro ao criar categoria:', error)
      console.error('[criar-categoria] Stack trace:', error.stack)
      throw error
    }
  })

  // Handler IPC para deletar categoria
  ipcMain.handle('deletar-categoria', async (event, categoriaId) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      
      if (!fs.existsSync(categoriaPath)) {
        throw new Error(`Categoria "${categoriaId}" não encontrada`)
      }

      // Deletar pasta da categoria
      fs.rmSync(categoriaPath, { recursive: true, force: true })
      
      console.log(`✅ Categoria "${categoriaId}" deletada com sucesso`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao deletar categoria:', error)
      throw error
    }
  })

  // Handler IPC para atualizar categoria
  ipcMain.handle('atualizar-categoria', async (event, categoriaId, updates) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      
      if (!fs.existsSync(categoriaPath)) {
        throw new Error(`Categoria "${categoriaId}" não encontrada`)
      }

      const metadataPath = path.join(categoriaPath, 'metadata.json')
      let metadata = {}
      
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
        } catch (error) {
          console.warn(`Erro ao ler metadata da categoria ${categoriaId}:`, error.message)
        }
      }

      const oldNome = (metadata.nome || '').trim()
      const newNome = (updates.nome || '').trim()
      const nomeAlterado = newNome && oldNome !== newNome

      // Log para debug
      if (updates.hasOwnProperty('rodando')) {
        console.log(`[atualizar-categoria] 🔄 Atualizando categoria ${categoriaId}: rodando = ${updates.rodando} (anterior: ${metadata.rodando})`)
      }

      // Se o nome foi alterado, propagar para grupos e bots
      if (nomeAlterado) {
        // Atualizar grupos.json - substituir nome antigo nos nomes dos grupos
        const gruposPath = path.join(categoriaPath, 'grupos.json')
        if (fs.existsSync(gruposPath)) {
          try {
            const grupos = JSON.parse(fs.readFileSync(gruposPath, 'utf-8'))
            if (Array.isArray(grupos)) {
              let alterados = 0
              for (const g of grupos) {
                if (g.nome && typeof g.nome === 'string') {
                  let novoNomeGrupo = g.nome
                  // Formato antigo: (NOME) NUMERO -> novo: NOME NUMERO
                  if (g.nome.startsWith(`(${oldNome})`)) {
                    const resto = g.nome.slice(`(${oldNome})`.length)
                    novoNomeGrupo = (newNome + resto).trim()
                  } else if (g.nome === oldNome) {
                    novoNomeGrupo = newNome
                  } else if (g.nome.startsWith(oldNome + ' ')) {
                    novoNomeGrupo = newNome + g.nome.slice(oldNome.length)
                  }
                  if (novoNomeGrupo !== g.nome) {
                    g.nome = novoNomeGrupo
                    alterados++
                  }
                }
              }
              if (alterados > 0) {
                fs.writeFileSync(gruposPath, JSON.stringify(grupos, null, 2), 'utf-8')
                console.log(`[atualizar-categoria] ✅ ${alterados} grupo(s) atualizado(s) com novo nome`)
              }
            }
          } catch (err) {
            console.warn(`[atualizar-categoria] Erro ao atualizar grupos:`, err.message)
          }
        }

        // Atualizar bots.json - definir nome de todos os bots como o nome da categoria
        const botsPath = path.join(categoriaPath, 'bots.json')
        if (fs.existsSync(botsPath)) {
          try {
            const bots = JSON.parse(fs.readFileSync(botsPath, 'utf-8'))
            if (Array.isArray(bots)) {
              let alterados = 0
              for (const b of bots) {
                b.nome = newNome
                b.name = newNome
                alterados++
              }
              if (alterados > 0) {
                fs.writeFileSync(botsPath, JSON.stringify(bots, null, 2), 'utf-8')
                console.log(`[atualizar-categoria] ✅ ${alterados} bot(s) atualizado(s) com novo nome`)
              }
            }
          } catch (err) {
            console.warn(`[atualizar-categoria] Erro ao atualizar bots:`, err.message)
          }
        }
      }

      // Atualizar metadata
      const updatedMetadata = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      
      fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2))
      
      console.log(`✅ Categoria "${categoriaId}" atualizada com sucesso`)
      return {
        id: categoriaId,
        ...updatedMetadata,
      }
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      throw error
    }
  })

  // Handler IPC para carregar nomes de grupos de uma categoria
  ipcMain.handle('carregar-nomes-categoria', async (event, categoriaId) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const nomesDir = path.join(CATEGORIAS_DIR, categoriaId, 'nomes')
      
      if (!fs.existsSync(nomesDir)) {
        return []
      }

      // Listar arquivos .txt na pasta nomes
      const arquivos = fs.readdirSync(nomesDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.txt'))
        .map(dirent => {
          const arquivoPath = path.join(nomesDir, dirent.name)
          const conteudo = fs.readFileSync(arquivoPath, 'utf-8')
          const nomes = conteudo.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
          
          return {
            id: dirent.name,
            nome: dirent.name.replace('.txt', ''),
            nomes: nomes,
            quantidade: nomes.length,
          }
        })

      return arquivos
    } catch (error) {
      console.error('Erro ao carregar nomes da categoria:', error)
      return []
    }
  })

  // Handler IPC para salvar nomes de grupos em uma categoria
  ipcMain.handle('salvar-nomes-categoria', async (event, categoriaId, nomeArquivo, nomes) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const nomesDir = path.join(CATEGORIAS_DIR, categoriaId, 'nomes')
      
      if (!fs.existsSync(nomesDir)) {
        fs.mkdirSync(nomesDir, { recursive: true })
      }
      
      const arquivoPath = path.join(nomesDir, `${nomeArquivo}.txt`)
      const conteudo = nomes.join('\n')
      
      fs.writeFileSync(arquivoPath, conteudo, 'utf-8')
      
      console.log(`✅ Nomes salvos em ${arquivoPath}`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar nomes da categoria:', error)
      throw error
    }
  })
  
  // Handler IPC para carregar grupos de uma categoria (do arquivo grupos.json)
  // OTIMIZADO: Retorna apenas campos essenciais para melhor performance
  ipcMain.handle('carregar-grupos-categoria', async (event, categoriaId) => {
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const gruposFilePath = path.join(categoriaPath, 'grupos.json')
      
      if (!fs.existsSync(categoriaPath)) {
        return []
      }
      
      if (!fs.existsSync(gruposFilePath)) {
        return []
      }
      
      try {
        const content = fs.readFileSync(gruposFilePath, 'utf-8')
        const grupos = JSON.parse(content)
        if (!Array.isArray(grupos)) {
          return []
        }
        
        // OTIMIZADO: Retornar apenas campos essenciais (id, nome, link_convite/link)
        // Removidos campos desnecessários: bot_midia_admin, bots_midia_admin, bots_lista_admin, membros, etc.
        const gruposOtimizados = grupos.map((grupo) => ({
          id: grupo.id,
          nome: grupo.nome,
          link_convite: grupo.link_convite || grupo.link,
          link: grupo.link || grupo.link_convite,
        }))
        
        return gruposOtimizados
      } catch (error) {
        console.error(`Erro ao ler grupos da categoria ${categoriaId}:`, error.message)
        return []
      }
    } catch (error) {
      console.error('Erro ao carregar grupos da categoria:', error)
      return []
    }
  })

  // Handler IPC para salvar bot manualmente na categoria
  ipcMain.handle('salvar-bot-categoria-manual', async (event, categoriaId, botData) => {
    console.log(`🔍 Handler salvar-bot-categoria-manual chamado para categoria: ${categoriaId}`)
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const botsFilePath = path.join(categoriaPath, 'bots.json')
      
      if (!fs.existsSync(categoriaPath)) {
        throw new Error(`Categoria ${categoriaId} não encontrada`)
      }
      
      // Ler bots existentes
      let botsExistentes = []
      if (fs.existsSync(botsFilePath)) {
        try {
          const content = fs.readFileSync(botsFilePath, 'utf-8')
          botsExistentes = JSON.parse(content)
          if (!Array.isArray(botsExistentes)) {
            botsExistentes = []
          }
        } catch (error) {
          console.warn(`Erro ao ler bots existentes: ${error.message}`)
          botsExistentes = []
        }
      }
      
      // Verificar se já existe (por username ou token)
      const botExistenteIndex = botsExistentes.findIndex(
        b => (b.username && botData.username && b.username === botData.username) ||
             (b.token && botData.token && b.token === botData.token)
      )
      
      const botParaSalvar = {
        nome: botData.nome || 'Bot sem nome',
        username: botData.username || null,
        token: botData.token || null,
        createdAt: botData.createdAt || new Date().toISOString(),
      }
      
      if (botExistenteIndex >= 0) {
        // Atualizar bot existente
        botsExistentes[botExistenteIndex] = {
          ...botsExistentes[botExistenteIndex],
          ...botParaSalvar,
        }
      } else {
        // Adicionar novo bot
        botsExistentes.push(botParaSalvar)
      }
      
      // Salvar
      fs.writeFileSync(botsFilePath, JSON.stringify(botsExistentes, null, 2), 'utf-8')
      console.log(`✅ Bot salvo na categoria ${categoriaId}`)
      
      // NOVO: Verificar automaticamente o bot se tiver token
      if (botParaSalvar.token) {
        try {
          // Importar função de verificação
          const { createRequire } = await import('module')
          const require = createRequire(import.meta.url)
          const verificadorPath = path.join(PATHS.BASE, 'back', 'verificador bots', 'bots.js')
          
          if (fs.existsSync(verificadorPath)) {
            const verificadorModule = require(verificadorPath)
            const { verificarTokenBot } = verificadorModule
            
            if (verificarTokenBot) {
              // Verificar o bot
              const resultado = await verificarTokenBot(botParaSalvar.token)
              console.log(`[categorias] Bot verificado automaticamente: ${resultado.status}`)
              
              // Atualizar username se obtido da verificação
              if (resultado.botInfo?.username && !botParaSalvar.username) {
                botParaSalvar.username = `@${resultado.botInfo.username}`
                // Atualizar no arquivo
                const botAtualizado = botsExistentes.find(b => 
                  (b.username && botParaSalvar.username && b.username === botParaSalvar.username) ||
                  (b.token && botParaSalvar.token && b.token === botParaSalvar.token)
                )
                if (botAtualizado) {
                  botAtualizado.username = botParaSalvar.username
                  fs.writeFileSync(botsFilePath, JSON.stringify(botsExistentes, null, 2), 'utf-8')
                }
              }
            }
          }
        } catch (error) {
          console.warn('[categorias] Erro ao verificar bot automaticamente:', error.message)
          // Não falhar o salvamento se a verificação falhar
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar bot na categoria:', error)
      throw error
    }
  })

  // Handler IPC para deletar bot da categoria
  ipcMain.handle('deletar-bot-categoria', async (event, categoriaId, botIndex) => {
    console.log(`🔍 Handler deletar-bot-categoria chamado para categoria: ${categoriaId}, índice: ${botIndex}`)
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const botsFilePath = path.join(categoriaPath, 'bots.json')
      
      if (!fs.existsSync(botsFilePath)) {
        throw new Error(`Arquivo de bots não encontrado para categoria ${categoriaId}`)
      }
      
      const content = fs.readFileSync(botsFilePath, 'utf-8')
      const bots = JSON.parse(content)
      if (!Array.isArray(bots)) {
        throw new Error('Formato inválido de bots')
      }
      
      if (botIndex < 0 || botIndex >= bots.length) {
        throw new Error('Índice de bot inválido')
      }
      
      bots.splice(botIndex, 1)
      fs.writeFileSync(botsFilePath, JSON.stringify(bots, null, 2), 'utf-8')
      console.log(`✅ Bot deletado da categoria ${categoriaId}`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao deletar bot da categoria:', error)
      throw error
    }
  })

  // Handler IPC para salvar grupo manualmente na categoria
  ipcMain.handle('salvar-grupo-categoria-manual', async (event, categoriaId, grupoData) => {
    console.log(`🔍 Handler salvar-grupo-categoria-manual chamado para categoria: ${categoriaId}`)
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const gruposFilePath = path.join(categoriaPath, 'grupos.json')
      
      if (!fs.existsSync(categoriaPath)) {
        throw new Error(`Categoria ${categoriaId} não encontrada`)
      }
      
      // Ler grupos existentes
      let gruposExistentes = []
      if (fs.existsSync(gruposFilePath)) {
        try {
          const content = fs.readFileSync(gruposFilePath, 'utf-8')
          gruposExistentes = JSON.parse(content)
          if (!Array.isArray(gruposExistentes)) {
            gruposExistentes = []
          }
        } catch (error) {
          console.warn(`Erro ao ler grupos existentes: ${error.message}`)
          gruposExistentes = []
        }
      }
      
      // Obter nome da categoria
      let categoriaNome = categoriaId
      const metadataPath = path.join(categoriaPath, 'metadata.json')
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          categoriaNome = metadata.nome || categoriaId
        } catch (error) {
          console.warn(`Erro ao ler metadata da categoria: ${error.message}`)
        }
      }
      
      // Contar grupos existentes para gerar número sequencial
      const quantidadeGruposExistentes = gruposExistentes.length
      const numeroGrupo = quantidadeGruposExistentes + 1
      
      // Gerar nome no formato: NOME DA CATEGORIA + NUMERO (ex: NOVINHAS (#19) 1)
      const nomeGrupo = `${categoriaNome} ${numeroGrupo}`
      
      // Verificar se já existe (por ID ou link)
      const grupoExistenteIndex = gruposExistentes.findIndex(
        g => (g.id && grupoData.id && String(g.id) === String(grupoData.id)) ||
             (g.link_convite && grupoData.link_convite && g.link_convite === grupoData.link_convite) ||
             (g.link && grupoData.link && g.link === grupoData.link)
      )
      
      const grupoParaSalvar = {
        id: grupoData.id || null,
        nome: nomeGrupo, // Formato: NOME_CATEGORIA NUMERO
        link_convite: grupoData.link_convite || grupoData.link || null,
        link: grupoData.link || grupoData.link_convite || null,
        username: grupoData.username || null,
        tipo: grupoData.tipo || 'privado',
        membros: grupoData.membros || 0,
        categoriaId: categoriaId,
        createdAt: grupoData.createdAt || new Date().toISOString(),
      }
      
      if (grupoExistenteIndex >= 0) {
        // Atualizar grupo existente
        gruposExistentes[grupoExistenteIndex] = {
          ...gruposExistentes[grupoExistenteIndex],
          ...grupoParaSalvar,
        }
      } else {
        // Adicionar novo grupo
        gruposExistentes.push(grupoParaSalvar)
      }
      
      // Salvar
      fs.writeFileSync(gruposFilePath, JSON.stringify(gruposExistentes, null, 2), 'utf-8')
      console.log(`✅ Grupo salvo na categoria ${categoriaId}`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar grupo na categoria:', error)
      throw error
    }
  })

  // Handler IPC para deletar grupo da categoria
  ipcMain.handle('deletar-grupo-categoria', async (event, categoriaId, grupoIndex) => {
    console.log(`🔍 Handler deletar-grupo-categoria chamado para categoria: ${categoriaId}, índice: ${grupoIndex}`)
    try {
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const gruposFilePath = path.join(categoriaPath, 'grupos.json')
      
      if (!fs.existsSync(gruposFilePath)) {
        throw new Error(`Arquivo de grupos não encontrado para categoria ${categoriaId}`)
      }
      
      const content = fs.readFileSync(gruposFilePath, 'utf-8')
      const grupos = JSON.parse(content)
      if (!Array.isArray(grupos)) {
        throw new Error('Formato inválido de grupos')
      }
      
      if (grupoIndex < 0 || grupoIndex >= grupos.length) {
        throw new Error('Índice de grupo inválido')
      }
      
      grupos.splice(grupoIndex, 1)
      fs.writeFileSync(gruposFilePath, JSON.stringify(grupos, null, 2), 'utf-8')
      console.log(`✅ Grupo deletado da categoria ${categoriaId}`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao deletar grupo da categoria:', error)
      throw error
    }
  })

  // Handler IPC para sincronizar grupos de uma categoria (mantido para compatibilidade)
  ipcMain.handle('sincronizar-grupos-categoria', async (event, categoriaId) => {
    try {
      console.log(`[categoriasHandlers] Sincronizando grupos da categoria: ${categoriaId}`)
      
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const syncPath = path.join(PATHS.BASE, 'back', 'criador', 'syncGruposCategoria.js')
      const { syncGroupsToCategory } = require(syncPath)
      
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }
      
      const result = syncGroupsToCategory(categoriaId, customPaths)
      
      return result
    } catch (error) {
      console.error('Erro ao sincronizar grupos da categoria:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  // Handler IPC para sincronizar TUDO de uma categoria (grupos + bots)
  ipcMain.handle('sincronizar-tudo-categoria', async (event, categoriaId) => {
    try {
      console.log(`[categoriasHandlers] Sincronizando TUDO da categoria: ${categoriaId}`)
      
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const syncTudoPath = path.join(PATHS.BASE, 'back', 'criador', 'syncTudoCategoria.js')
      const { syncTudoCategoria } = require(syncTudoPath)
      
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }
      
      const result = syncTudoCategoria(categoriaId, customPaths)
      
      return result
    } catch (error) {
      console.error('Erro ao sincronizar tudo da categoria:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  // Handler IPC para limpar duplicatas de grupos
  ipcMain.handle('limpar-duplicatas-grupos', async (event, tipo = 'tudo') => {
    try {
      console.log(`[categoriasHandlers] Limpando duplicatas de grupos: ${tipo}`)
      
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const limparPath = path.join(PATHS.BASE, 'back', 'criador', 'limparDuplicatasGrupos.js')
      const {
        limparDuplicatasCategoria,
        limparDuplicatasConta,
        limparDuplicatasTodasCategorias,
        limparDuplicatasTodasContas,
        limparDuplicatasTudo,
      } = require(limparPath)
      
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }
      
      let result
      if (tipo === 'tudo') {
        result = limparDuplicatasTudo(customPaths)
      } else if (tipo === 'categorias') {
        result = limparDuplicatasTodasCategorias(customPaths)
      } else if (tipo === 'contas') {
        result = limparDuplicatasTodasContas(customPaths)
      } else if (tipo.startsWith('categoria:')) {
        const categoriaId = tipo.replace('categoria:', '')
        result = limparDuplicatasCategoria(categoriaId, customPaths)
      } else if (tipo.startsWith('conta:')) {
        const accountId = tipo.replace('conta:', '')
        result = limparDuplicatasConta(accountId, customPaths)
      } else {
        return {
          success: false,
          error: 'Tipo inválido. Use: tudo, categorias, contas, categoria:ID ou conta:ID',
        }
      }
      
      return result
    } catch (error) {
      console.error('Erro ao limpar duplicatas de grupos:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  // Handler IPC para baixar notas da categoria
  ipcMain.handle('baixar-notas-categoria', async (event, categoriaId) => {
    try {
      console.log(`[categoriasHandlers] Baixando notas da categoria: ${categoriaId}`)
      
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const criadorPath = path.join(PATHS.BASE, 'back', 'criador', 'criador.js')
      const criadorModule = require(criadorPath)
      const { gerarArquivoNotasCategoria } = criadorModule
      
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }
      
      // Obter categoria para pegar o nome
      const CATEGORIAS_DIR = getCategoriasDir()
      const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
      const metadataPath = path.join(categoriaPath, 'metadata.json')
      
      let categoriaNome = categoriaId
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          categoriaNome = metadata.nome || categoriaId
        } catch (error) {
          console.warn(`[categoriasHandlers] Erro ao ler metadata: ${error.message}`)
        }
      }
      
      // Carregar bots da categoria
      const botsFilePath = path.join(categoriaPath, 'bots.json')
      let botsDisparo = []
      if (fs.existsSync(botsFilePath)) {
        try {
          const botsData = JSON.parse(fs.readFileSync(botsFilePath, 'utf-8'))
          if (Array.isArray(botsData)) {
            botsDisparo = botsData
          }
        } catch (error) {
          console.warn(`[categoriasHandlers] Erro ao ler bots: ${error.message}`)
        }
      }
      
      // Carregar grupos da categoria
      const gruposFilePath = path.join(categoriaPath, 'grupos.json')
      let gruposSalvos = []
      if (fs.existsSync(gruposFilePath)) {
        try {
          gruposSalvos = JSON.parse(fs.readFileSync(gruposFilePath, 'utf-8'))
          if (!Array.isArray(gruposSalvos)) {
            gruposSalvos = []
          }
        } catch (error) {
          console.warn(`[categoriasHandlers] Erro ao ler grupos: ${error.message}`)
        }
      }
      
      // Gerar conteúdo do arquivo
      const conteudo = gerarConteudoNotasCategoria(categoriaId, categoriaNome, gruposSalvos, botsDisparo)
      
      // Abrir diálogo para salvar arquivo
      const mainWindow = getMainWindow()
      const result = await dialog.showSaveDialog(mainWindow || undefined, {
        title: 'Salvar arquivo de notas',
        defaultPath: `${categoriaNome}.txt`,
        filters: [
          { name: 'Arquivos de Texto', extensions: ['txt'] },
          { name: 'Todos os arquivos', extensions: ['*'] }
        ]
      })
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Operação cancelada pelo usuário' }
      }
      
      // Salvar arquivo no local escolhido
      fs.writeFileSync(result.filePath, conteudo, 'utf-8')
      console.log(`[categoriasHandlers] ✅ Arquivo de notas salvo em: ${result.filePath}`)
      
      return { success: true, message: 'Arquivo de notas salvo com sucesso!', filePath: result.filePath }
    } catch (error) {
      console.error('Erro ao baixar notas da categoria:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })
  
  // Função auxiliar para gerar o conteúdo do arquivo de notas
  function gerarConteudoNotasCategoria(categoriaId, categoriaNome, gruposSalvos, botsDisparo) {
    // Extrair ID numérico da categoria (ex: "Vazados (#7)" -> "7")
    let categoriaIdNum = categoriaId
    const idMatch = categoriaId.match(/\(#(\d+)\)/)
    if (idMatch) {
      categoriaIdNum = idMatch[1]
    } else {
      // Tentar extrair número do final do ID
      const numMatch = categoriaId.match(/(\d+)$/)
      if (numMatch) {
        categoriaIdNum = numMatch[1]
      }
    }
    
    // Construir conteúdo do arquivo
    let conteudo = '=== BOTS DE DISPARO ===\n\n'
    
    // Adicionar bots de disparo
    if (botsDisparo && botsDisparo.length > 0) {
      // Filtrar bots que têm token (pode ser b.token ou b.bot_token)
      const botsComToken = botsDisparo.filter(b => {
        const token = b.token || b.bot_token
        return token && token.trim().length > 0
      })
      
      if (botsComToken.length > 0) {
        for (let i = 0; i < botsComToken.length; i++) {
          const bot = botsComToken[i]
          const token = bot.token || bot.bot_token || ''
          // Obter username (pode ser username, bot_username, ou botUsername)
          let username = bot.username || bot.bot_username || bot.botUsername || ''
          // Remover @ se existir (vai adicionar depois)
          if (username && username.startsWith('@')) {
            username = username.substring(1)
          }
          
          // Formato: disparo 1: username - token
          conteudo += `disparo ${i + 1}: ${username || '(sem username)'} - ${token}\n`
        }
      } else {
        conteudo += '(nenhum bot de disparo criado)\n'
      }
    } else {
      conteudo += '(nenhum bot de disparo criado)\n'
    }
    
    conteudo += '\n=== GRUPOS CRIADOS ===\n\n'
    
    // Adicionar grupos no formato: LINK - ID: ID_GRUPO
    if (gruposSalvos && gruposSalvos.length > 0) {
      for (let i = 0; i < gruposSalvos.length; i++) {
        const grupo = gruposSalvos[i]
        const grupoId = grupo.id || ''
        const grupoLink = grupo.link_convite || grupo.link || ''
        
        // Formato: https://t.me/... - ID: 123456789
        conteudo += `${grupoLink} - ID: ${grupoId}\n`
      }
    } else {
      conteudo += '(nenhum grupo criado)\n'
    }
    
    // Adicionar seção para criação de campanha (formato: NOME_CATEGORIA (#ID) NUMERO; -ID_GRUPO; LINK)
    conteudo += '\n=== FORMATO PARA CRIAÇÃO DE CAMPANHA ===\n\n'
    
    if (gruposSalvos && gruposSalvos.length > 0) {
      // Obter nome da categoria em maiúsculas para o formato de campanha
      const nomeCategoriaUpper = categoriaNome.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
      
      for (let i = 0; i < gruposSalvos.length; i++) {
        const grupo = gruposSalvos[i]
        const numero = i + 1
        let grupoId = grupo.id || ''
        const grupoLink = grupo.link_convite || grupo.link || ''
        
        // Formato: VAZADOS (#5) 1; -1003167421799; https://t.me/HTLLhHBr
        // O ID do grupo precisa ter o prefixo "-100" se for um grupo (não canal)
        let grupoIdFormatado = grupoId
        if (grupoId && !grupoId.startsWith('-')) {
          // Se o ID não começa com "-", adicionar "-100" para grupos
          grupoIdFormatado = `-100${grupoId}`
        }
        
        conteudo += `${nomeCategoriaUpper} (#${categoriaIdNum}) ${numero}; ${grupoIdFormatado}; ${grupoLink}\n`
      }
    } else {
      conteudo += '(nenhum grupo criado)\n'
    }
    
    return conteudo
  }
  
  // Handler IPC para verificar grupos sem listas e marcar contas
  ipcMain.handle('verificar-grupos-sem-listas', async (event, minBotsLista = 15) => {
    try {
      console.log(`[categoriasHandlers] Verificando grupos sem listas (mínimo: ${minBotsLista} bots)...`)
      
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const verificarPath = path.join(PATHS.BASE, 'back', 'criador', 'verificarGruposSemListas.js')
      const { verificarGruposSemListas, marcarContasSemListaUrgente } = require(verificarPath)
      
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        baseDir: PATHS.BASE,
      }
      
      // Primeiro verificar grupos sem listas
      const resultado = verificarGruposSemListas(customPaths, minBotsLista)
      
      // Depois marcar contas com tag "SEM LISTA-URGENTE" (apenas categorias rodando)
      const marcacao = marcarContasSemListaUrgente(customPaths, minBotsLista)
      
      return {
        success: true,
        verificacao: resultado,
        marcacao: marcacao
      }
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao verificar grupos sem listas:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      }
    }
  })

  // Handler IPC para analisar categorias (relatório grupos On + bot disparo online)
  ipcMain.handle('analisar-categorias-relatorio', async (event, customPathsOverrides = {}) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { analisarCategoriasCompleto } = require(analisarPath)
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
        ...customPathsOverrides,
      }
      const mainWindow = getMainWindow()
      const onProgress = (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('analisar-categorias-progress', data)
        }
      }
      return await analisarCategoriasCompleto(customPaths, { onProgress })
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao analisar categorias:', error)
      return { categorias: [], categoriasSemGrupos: [], categoriasComBotsOnlineSemGrupos: [], error: error.message }
    }
  })

  // Handler IPC para deletar categorias em massa
  ipcMain.handle('deletar-categorias-em-massa', async (event, categoriaIds) => {
    try {
      if (!Array.isArray(categoriaIds) || categoriaIds.length === 0) {
        return { success: false, error: 'Nenhuma categoria selecionada' }
      }
      const CATEGORIAS_DIR = getCategoriasDir()
      let deletados = 0
      for (const categoriaId of categoriaIds) {
        const categoriaPath = path.join(CATEGORIAS_DIR, categoriaId)
        if (fs.existsSync(categoriaPath)) {
          fs.rmSync(categoriaPath, { recursive: true, force: true })
          deletados++
        }
      }
      return { success: true, deletados }
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao deletar categorias:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para reutilizar bots de categorias (move para bots-reutilizados.json)
  ipcMain.handle('reutilizar-bots-categoria', async (event, categorias) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { reutilizarBotsDeCategorias } = require(analisarPath)
      const customPaths = {
        bancoDir: PATHS.BANCO_DIR,
        accountsDir: PATHS.CONTAS_DIR,
      }
      return reutilizarBotsDeCategorias(categorias, customPaths)
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao reutilizar bots:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar bots reutilizados
  ipcMain.handle('carregar-bots-reutilizados', async () => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { obterBotsReutilizados } = require(analisarPath)
      const customPaths = { bancoDir: PATHS.BANCO_DIR, accountsDir: PATHS.CONTAS_DIR }
      return obterBotsReutilizados(customPaths)
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao carregar bots reutilizados:', error)
      return []
    }
  })

  // Handler IPC para remover bot reutilizado
  ipcMain.handle('remover-bot-reutilizado', async (event, botId) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { removerBotReutilizado } = require(analisarPath)
      const customPaths = { bancoDir: PATHS.BANCO_DIR, accountsDir: PATHS.CONTAS_DIR }
      return removerBotReutilizado(botId, customPaths)
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao remover bot reutilizado:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para editar bot reutilizado
  ipcMain.handle('atualizar-bot-reutilizado', async (event, botId, data) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { atualizarBotReutilizado } = require(analisarPath)
      const customPaths = { bancoDir: PATHS.BANCO_DIR, accountsDir: PATHS.CONTAS_DIR }
      return atualizarBotReutilizado(botId, data, customPaths)
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao atualizar bot reutilizado:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para vincular bot reutilizado a uma categoria
  ipcMain.handle('vincular-bot-reutilizado-categoria', async (event, botId, categoriaId) => {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const analisarPath = path.join(PATHS.BASE, 'back', 'criador', 'analisarCategoriasRelatorio.js')
      const { vincularBotReutilizadoACategoria } = require(analisarPath)
      const customPaths = { bancoDir: PATHS.BANCO_DIR, accountsDir: PATHS.CONTAS_DIR }
      return vincularBotReutilizadoACategoria(botId, categoriaId, customPaths)
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao vincular bot:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para exportar dados de categorias (grupos TXT, bots JSON, links fornecedor)
  ipcMain.handle('exportar-dados-categorias', async (event, options) => {
    const {
      categoriaIds = [],
      exportarGrupos = false,
      exportarBots = false,
      exportarFornecedor = false,
      serviceId = '',
      memberCount = '600',
    } = options || {}

    const mainWindow = getMainWindow()
    const savedFiles = []
    const CATEGORIAS_DIR = getCategoriasDir()

    try {
      if (!categoriaIds.length) {
        return { success: false, error: 'Nenhuma categoria selecionada' }
      }
      if (!exportarGrupos && !exportarBots && !exportarFornecedor) {
        return { success: false, error: 'Selecione pelo menos um tipo de exportação' }
      }
      if (exportarFornecedor && (!serviceId || !serviceId.trim())) {
        return { success: false, error: 'ID do serviço é obrigatório para exportar link do fornecedor' }
      }

      const memberCountVal = (memberCount || '600').trim() || '600'

      const allCategorias = fs.readdirSync(CATEGORIAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const pastaPath = path.join(CATEGORIAS_DIR, dirent.name)
          const metadataPath = path.join(pastaPath, 'metadata.json')
          let metadata = {}
          if (fs.existsSync(metadataPath)) {
            try { metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) } catch (_) {}
          }
          return { id: dirent.name, nome: metadata.nome || dirent.name }
        })
      const categoriasMap = new Map(allCategorias.map(c => [c.id, c]))

      if (exportarGrupos) {
        const linhas = []
        for (const catId of categoriaIds) {
          const cat = categoriasMap.get(catId)
          const catNome = cat ? cat.nome : catId
          const gruposPath = path.join(CATEGORIAS_DIR, catId, 'grupos.json')
          if (!fs.existsSync(gruposPath)) continue
          try {
            const grupos = JSON.parse(fs.readFileSync(gruposPath, 'utf-8'))
            if (!Array.isArray(grupos)) continue
            grupos.forEach((g, i) => {
              // Sempre usar nome atual da categoria + número (evita nome desatualizado e formato (NOME) N)
              let nome = `${catNome.trim()} ${i + 1}`
              const id = g.id || ''
              const link = g.link_convite || g.link || ''
              if (id && link) linhas.push(`${nome};${id};${link}`)
            })
          } catch (_) {}
        }
        if (linhas.length > 0) {
          const hoje = new Date()
          const dia = String(hoje.getDate()).padStart(2, '0')
          const mes = String(hoje.getMonth() + 1).padStart(2, '0')
          const aleatorio = Math.floor(Math.random() * 90000) + 10000
          const result = await dialog.showSaveDialog(mainWindow || undefined, {
            title: 'Salvar grupos exportados',
            defaultPath: `GRUPOS-${dia}-${mes}-${aleatorio}.txt`,
            filters: [{ name: 'Arquivos de Texto', extensions: ['txt'] }, { name: 'Todos os arquivos', extensions: ['*'] }],
          })
          if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, linhas.join('\n'), 'utf-8')
            savedFiles.push(result.filePath)
          }
        }
      }

      if (exportarBots) {
        const seenTokens = new Set()
        const botsExport = []
        for (const catId of categoriaIds) {
          const cat = categoriasMap.get(catId)
          const catNome = cat ? cat.nome : catId
          const botsPath = path.join(CATEGORIAS_DIR, catId, 'bots.json')
          if (!fs.existsSync(botsPath)) continue
          try {
            const bots = JSON.parse(fs.readFileSync(botsPath, 'utf-8'))
            if (!Array.isArray(bots)) continue
            for (const b of bots) {
              const token = b.token || b.bot_token
              if (!token || seenTokens.has(token)) continue
              seenTokens.add(token)
              botsExport.push({ name: catNome.trim(), token })
            }
          } catch (_) {}
        }
        if (botsExport.length > 0) {
          const hoje = new Date()
          const dia = String(hoje.getDate()).padStart(2, '0')
          const mes = String(hoje.getMonth() + 1).padStart(2, '0')
          const aleatorio = Math.floor(Math.random() * 90000) + 10000
          const result = await dialog.showSaveDialog(mainWindow || undefined, {
            title: 'Salvar bots exportados',
            defaultPath: `BOTS-${dia}-${mes}-${aleatorio}.json`,
            filters: [{ name: 'Arquivos JSON', extensions: ['json'] }, { name: 'Todos os arquivos', extensions: ['*'] }],
          })
          if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, JSON.stringify(botsExport, null, 2), 'utf-8')
            savedFiles.push(result.filePath)
          }
        }
      }

      if (exportarFornecedor) {
        const linhasFornecedor = []
        for (const catId of categoriaIds) {
          const gruposPath = path.join(CATEGORIAS_DIR, catId, 'grupos.json')
          if (!fs.existsSync(gruposPath)) continue
          try {
            const grupos = JSON.parse(fs.readFileSync(gruposPath, 'utf-8'))
            if (!Array.isArray(grupos)) continue
            const linkRegex = /https?:\/\/t\.me\/\+?[a-zA-Z0-9_-]+/
            for (const g of grupos) {
              const link = (g.link_convite || g.link || '').trim()
              const linkMatch = link.match(linkRegex)
              const linkVal = linkMatch
                ? (link.startsWith('http') ? link : 'https://' + link)
                : (link.includes('t.me') ? (link.startsWith('http') ? link : 'https://' + link) : '')
              if (linkVal) {
                linhasFornecedor.push(`${serviceId.trim()} | ${linkVal} | ${memberCountVal}`)
              }
            }
          } catch (_) {}
        }
        if (linhasFornecedor.length > 0) {
          const result = await dialog.showSaveDialog(mainWindow || undefined, {
            title: 'Salvar links do fornecedor',
            defaultPath: `links_fornecedor_${serviceId.trim()}.txt`,
            filters: [{ name: 'Arquivos de Texto', extensions: ['txt'] }, { name: 'Todos os arquivos', extensions: ['*'] }],
          })
          if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, linhasFornecedor.join('\n'), 'utf-8')
            savedFiles.push(result.filePath)
          }
        }
      }

      return { success: true, savedFiles }
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao exportar dados:', error)
      return { success: false, error: error.message, savedFiles }
    }
  })

  // Obter links formatados para fornecedor (copiar, sem salvar arquivo)
  ipcMain.handle('obter-links-fornecedor-categorias', async (event, options) => {
    const { categoriaIds = [], serviceId = '', memberCount = '600' } = options || {}
    const CATEGORIAS_DIR = getCategoriasDir()
    try {
      if (!categoriaIds.length) return { success: false, error: 'Nenhuma categoria selecionada' }
      if (!serviceId || !serviceId.trim()) return { success: false, error: 'ID do serviço é obrigatório' }
      const memberCountVal = (memberCount || '600').trim() || '600'
      const linhasFornecedor = []
      const allCategorias = fs.readdirSync(CATEGORIAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
      const categoriasSet = new Set(allCategorias)
      const linkRegex = /https?:\/\/t\.me\/\+?[a-zA-Z0-9_-]+/
      for (const catId of categoriaIds) {
        if (!categoriasSet.has(catId)) continue
        const gruposPath = path.join(CATEGORIAS_DIR, catId, 'grupos.json')
        if (!fs.existsSync(gruposPath)) continue
        try {
          const grupos = JSON.parse(fs.readFileSync(gruposPath, 'utf-8'))
          if (!Array.isArray(grupos)) continue
          for (const g of grupos) {
            const link = (g.link_convite || g.link || '').trim()
            const linkMatch = link.match(linkRegex)
            const linkVal = linkMatch
              ? (link.startsWith('http') ? link : 'https://' + link)
              : (link.includes('t.me') ? (link.startsWith('http') ? link : 'https://' + link) : '')
            if (linkVal) linhasFornecedor.push(`${serviceId.trim()} | ${linkVal} | ${memberCountVal}`)
          }
        } catch (_) {}
      }
      if (linhasFornecedor.length === 0) return { success: false, error: 'Nenhum link encontrado nas categorias' }
      return { success: true, text: linhasFornecedor.join('\n') }
    } catch (error) {
      console.error('[categoriasHandlers] Erro ao obter links fornecedor:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ Handlers de categorias registrados com sucesso')
}


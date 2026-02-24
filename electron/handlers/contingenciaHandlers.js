import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

const TAGS_FILE = path.join(PATHS.BASE, 'sessions_tags.json')
const VIP_GROUPS_FILE = path.join(PATHS.BASE, 'sessions_vip_groups.json') // Grupos Base (contingência)
const GRUPOS_VIP_FILE = path.join(PATHS.BASE, 'sessions_grupos_vip.json') // Grupos VIP (clonador avançado)
const IGNORED_GROUPS_FILE = path.join(PATHS.BANCO_DIR, 'grupos-ignorados.json') // Grupos ignorados/caídos

/**
 * Carregar tags das sessões
 */
function loadTags() {
  if (fs.existsSync(TAGS_FILE)) {
    try {
      const content = fs.readFileSync(TAGS_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao ler tags:', error)
      return {}
    }
  }
  return {}
}

/**
 * Salvar tags das sessões
 */
function saveTags(tags) {
  try {
    fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('[contingenciaHandlers] Erro ao salvar tags:', error)
    return false
  }
}

/**
 * Carregar informações de GRUPOS BASE (contingência) das sessões
 */
function loadGruposBase() {
  if (fs.existsSync(VIP_GROUPS_FILE)) {
    try {
      const content = fs.readFileSync(VIP_GROUPS_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao ler grupos base:', error)
      return {}
    }
  }
  return {}
}

/**
 * Salvar informações de GRUPOS BASE (contingência) das sessões
 */
function saveGruposBase(gruposBase) {
  try {
    fs.writeFileSync(VIP_GROUPS_FILE, JSON.stringify(gruposBase, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('[contingenciaHandlers] Erro ao salvar grupos base:', error)
    return false
  }
}

/**
 * Carregar informações de GRUPOS VIP (clonador avançado)
 */
function loadGruposVip() {
  if (fs.existsSync(GRUPOS_VIP_FILE)) {
    try {
      const content = fs.readFileSync(GRUPOS_VIP_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao ler grupos VIP:', error)
      return {}
    }
  }
  return {}
}

/**
 * Salvar informações de GRUPOS VIP (clonador avançado)
 */
function saveGruposVip(gruposVip) {
  try {
    fs.writeFileSync(GRUPOS_VIP_FILE, JSON.stringify(gruposVip, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('[contingenciaHandlers] Erro ao salvar grupos VIP:', error)
    return false
  }
}

// Aliases para compatibilidade
const loadVipGroups = loadGruposBase
const saveVipGroups = saveGruposBase

/**
 * Normalizar caminho para evitar problemas com / vs \
 */
function normalizePath(filePath) {
  return path.normalize(path.resolve(filePath))
}

/**
 * Carregar grupos ignorados (blacklist/caídos)
 */
function loadIgnoredGroups() {
  if (fs.existsSync(IGNORED_GROUPS_FILE)) {
    try {
      const content = fs.readFileSync(IGNORED_GROUPS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return new Set(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao ler grupos ignorados:', error)
      return new Set()
    }
  }
  return new Set()
}

export function registerContingenciaHandlers() {
  console.log('📝 Registrando handlers de contingência...')

  // Handler para listar sessões disponíveis
  ipcMain.handle('contingencia-listar-sessoes', async (event, searchDir = null) => {
    try {
      const sessions = []
      const tagsSessoes = loadTags()

      // Diretórios para procurar sessões
      const searchDirs = []

      if (searchDir && fs.existsSync(searchDir)) {
        searchDirs.push(searchDir)
      }

      // Adicionar diretório de contas (principal fonte de sessões)
      if (PATHS.CONTAS_DIR && fs.existsSync(PATHS.CONTAS_DIR)) {
        searchDirs.push(PATHS.CONTAS_DIR)
      }

      // Adicionar diretório base como fallback
      if (PATHS.BASE) {
        searchDirs.push(PATHS.BASE)
      }

      const seenPaths = new Set()

      // Função para obter tags da conta a partir do caminho da sessão
      const getAccountTags = (sessionPath) => {
        try {
          // Extrair número da conta do caminho (formato: .../contas telegram/{numero}/{numero}.session)
          const match = sessionPath.match(/[\/\\](\d+)[\/\\]\1\.session$/)
          if (!match) return []

          const numeroConta = match[1]
          const contaDir = path.dirname(sessionPath)
          const jsonPath = path.join(contaDir, `${numeroConta}.json`)

          if (fs.existsSync(jsonPath)) {
            try {
              const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
              const accountData = JSON.parse(jsonContent)
              const tags = Array.isArray(accountData.tags) ? accountData.tags : []

              // Normalizar tags
              return tags.map(tag => {
                if (tag === 'com grupos') return 'Com grupos'
                if (tag === 'sem grupos') return 'Sem grupos'
                if (tag === 'sem listas') return 'Sem lista'
                return tag
              })
            } catch (error) {
              console.warn(`[contingenciaHandlers] Erro ao ler JSON da conta ${numeroConta}:`, error.message)
            }
          }
        } catch (error) {
          // Ignorar erro
        }
        return []
      }

      for (const baseDir of searchDirs) {
        if (!fs.existsSync(baseDir)) continue

        // Procurar recursivamente nas pastas das contas
        try {
          const walkDir = (dir, depth = 0) => {
            if (depth > 3) return // Máximo 3 níveis para encontrar sessões dentro de pastas de contas

            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true })

              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)

                if (entry.isDirectory()) {
                  // Continuar procurando em subdiretórios
                  walkDir(fullPath, depth + 1)
                } else if (entry.isFile() && entry.name.endsWith('.session')) {
                  const normalized = normalizePath(fullPath)

                  if (!seenPaths.has(normalized)) {
                    seenPaths.add(normalized)

                    // Obter tags da sessão (do sistema de tags manual)
                    const tagManual = tagsSessoes[normalized] || tagsSessoes[fullPath] || ''

                    // Obter tags da conta (Com grupos, Com listas, etc.)
                    const tagsConta = getAccountTags(fullPath)

                    // Combinar tags: manual primeiro, depois tags da conta
                    const todasTags = []
                    if (tagManual) {
                      todasTags.push(tagManual)
                    }
                    todasTags.push(...tagsConta)

                    // Remover duplicatas
                    const tagsUnicas = [...new Set(todasTags)]

                    sessions.push({
                      path: normalized,
                      name: entry.name,
                      tag: tagManual, // Tag manual (do sistema de tags)
                      tagsConta: tagsUnicas, // Todas as tags (manual + da conta)
                    })
                  }
                }
              }
            } catch (error) {
              // Ignorar erros de permissão
            }
          }

          walkDir(baseDir)
        } catch (error) {
          console.warn(`[contingenciaHandlers] Erro ao caminhar diretório ${baseDir}:`, error.message)
        }
      }

      // Ordenar: primeiro sessões com tag manual, depois por nome
      sessions.sort((a, b) => {
        if (a.tag && !b.tag) return -1
        if (!a.tag && b.tag) return 1
        return a.name.localeCompare(b.name)
      })

      console.log(`[contingenciaHandlers] Encontradas ${sessions.length} sessões`)
      return { success: true, sessions }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao listar sessões:', error)
      return { success: false, error: error.message, sessions: [] }
    }
  })

  // Handler para obter tag de uma sessão
  ipcMain.handle('contingencia-obter-tag', async (event, sessionPath) => {
    try {
      const tags = loadTags()
      const normalized = normalizePath(sessionPath)
      return { success: true, tag: tags[normalized] || tags[sessionPath] || '' }
    } catch (error) {
      return { success: false, error: error.message, tag: '' }
    }
  })

  // Handler para definir tag de uma sessão
  ipcMain.handle('contingencia-definir-tag', async (event, sessionPath, tag) => {
    try {
      const tags = loadTags()
      const normalized = normalizePath(sessionPath)

      if (tag && tag.trim()) {
        tags[normalized] = tag.trim()
        // Também salvar com path original para compatibilidade
        if (normalized !== sessionPath) {
          tags[sessionPath] = tag.trim()
        }
      } else {
        // Remover tag
        if (tags[normalized]) delete tags[normalized]
        if (tags[sessionPath]) delete tags[sessionPath]
      }

      saveTags(tags)
      console.log(`[contingenciaHandlers] Tag ${tag ? 'salva' : 'removida'} para sessão: ${path.basename(sessionPath)}`)

      // Também salvar a tag no JSON da conta correspondente (se existir)
      try {
        // Extrair número da conta do caminho da sessão
        const match = sessionPath.match(/[\/\\](\d+)[\/\\]\1\.session$/)
        if (match) {
          const numeroConta = match[1]
          const contaDir = path.dirname(sessionPath)
          const jsonPath = path.join(contaDir, `${numeroConta}.json`)

          if (fs.existsSync(jsonPath)) {
            const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
            const accountData = JSON.parse(jsonContent)

            // Garantir que tags é um array
            if (!Array.isArray(accountData.tags)) {
              accountData.tags = []
            }

            const tagValue = tag && tag.trim() ? tag.trim() : null

            if (tagValue) {
              // Adicionar tag se não existir
              if (!accountData.tags.includes(tagValue)) {
                accountData.tags.push(tagValue)
                console.log(`[contingenciaHandlers] Tag "${tagValue}" adicionada ao JSON da conta ${numeroConta}`)
              }
            } else {
              // Remover tag manual (mas manter outras tags)
              // Não removemos automaticamente, apenas adicionamos
              console.log(`[contingenciaHandlers] Tag removida do sistema, mas mantida no JSON da conta ${numeroConta}`)
            }

            // Remover duplicatas
            accountData.tags = [...new Set(accountData.tags)]

            // Salvar JSON atualizado
            fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
            console.log(`[contingenciaHandlers] ✅ JSON da conta ${numeroConta} atualizado com tag`)
          }
        }
      } catch (error) {
        // Não falhar se não conseguir atualizar o JSON da conta
        console.warn('[contingenciaHandlers] Aviso: não foi possível atualizar JSON da conta:', error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao definir tag:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para executar clonagem VIP
  ipcMain.handle('contingencia-clonar-vip', async (event, payload) => {
    try {
      const { sessionPath, sourceLink, proxy } = payload

      console.log('[contingenciaHandlers] Iniciando clonagem VIP...', { sessionPath, sourceLink })

      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      if (!sourceLink) {
        throw new Error('Link do grupo origem não fornecido')
      }

      // Importar módulo de clonagem VIP
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVip.js')

      // Verificar se o módulo existe, se não, criar
      if (!fs.existsSync(clonadorVipPath)) {
        console.log('[contingenciaHandlers] Módulo clonadorVip.js não encontrado, será criado automaticamente')
      }

      const { executarClonagemVIP } = require(clonadorVipPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        operacoesDir: PATHS.OPERACOES_DIR,
        rootDir: PATHS.BASE,
      }

      // Executar clonagem
      const result = await executarClonagemVIP({
        sessionPath,
        sourceLink,
        proxy,
      }, customPaths)

      // Se a clonagem foi bem-sucedida, marcar sessão como tendo grupo VIP
      if (result.success && result.groupLink) {
        const vipGroups = loadVipGroups()
        const normalized = normalizePath(sessionPath)

        // Verificar se já existe grupo base para esta sessão
        const grupoExistente = vipGroups[normalized] || vipGroups[sessionPath]
        const linksExistentes = grupoExistente?.mensagensLinks || []
        const novosLinks = result.mensagensLinks || []

        // Combinar links existentes com novos (evitar duplicatas)
        const todosLinks = [...linksExistentes]
        novosLinks.forEach(link => {
          if (!todosLinks.includes(link)) {
            todosLinks.push(link)
          }
        })

        // Extrair ID e accessHash do grupo se disponível no resultado
        vipGroups[normalized] = {
          sessionPath: normalized,
          sessionName: path.basename(sessionPath),
          groupLink: result.groupLink,
          grupoNome: result.grupoNome || grupoExistente?.grupoNome || '',
          dataCriacao: grupoExistente?.dataCriacao || new Date().toISOString(),
          grupoId: result.grupoId || grupoExistente?.grupoId || null,
          grupoAccessHash: result.grupoAccessHash || grupoExistente?.grupoAccessHash || null,
          mensagensLinks: todosLinks, // Salvar todos os links (existentes + novos)
        }

        // Também salvar com path original para compatibilidade
        if (normalized !== sessionPath) {
          vipGroups[sessionPath] = vipGroups[normalized]
        }

        saveVipGroups(vipGroups)
        console.log(`[contingenciaHandlers] ✅ Sessão marcada como tendo grupo VIP: ${path.basename(sessionPath)}`)
      }

      return { success: true, ...result }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao executar clonagem VIP:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para verificar se uma sessão tem grupo VIP
  ipcMain.handle('contingencia-verificar-vip', async (event, sessionPath) => {
    try {
      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)
      const vipInfo = vipGroups[normalized] || vipGroups[sessionPath]

      return {
        success: true,
        temVipGroup: !!vipInfo,
        info: vipInfo || null,
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao verificar VIP:', error)
      return { success: false, error: error.message, temVipGroup: false }
    }
  })

  // Handler para verificar múltiplas sessões de uma vez
  ipcMain.handle('contingencia-verificar-vips-lote', async (event, sessionPaths) => {
    try {
      const vipGroups = loadVipGroups()
      const resultados = {}

      for (const sessionPath of sessionPaths || []) {
        const normalized = normalizePath(sessionPath)
        const vipInfo = vipGroups[normalized] || vipGroups[sessionPath]
        resultados[sessionPath] = {
          temVipGroup: !!vipInfo,
          info: vipInfo || null,
        }
      }

      return { success: true, resultados }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao verificar VIPs em lote:', error)
      return { success: false, error: error.message, resultados: {} }
    }
  })

  // Handler para listar sessões com grupo base
  ipcMain.handle('contingencia-listar-sessoes-com-grupo-base', async (event) => {
    try {
      const vipGroups = loadVipGroups()
      const sessoes = Object.values(vipGroups).map(vipInfo => ({
        sessionPath: vipInfo.sessionPath,
        sessionName: vipInfo.sessionName,
        groupLink: vipInfo.groupLink,
        grupoNome: vipInfo.grupoNome || 'Grupo Base',
        dataCriacao: vipInfo.dataCriacao,
        grupoId: vipInfo.grupoId,
        grupoAccessHash: vipInfo.grupoAccessHash,
      }))

      return { success: true, sessoes }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao listar sessões com grupo base:', error)
      return { success: false, error: error.message, sessoes: [] }
    }
  })


  // Handler para listar todos os grupos do sistema (lendo dos arquivos JSON das contas)
  ipcMain.handle('contingencia-listar-todos-grupos', async (event) => {
    try {
      const accountsDir = PATHS.CONTAS_DIR

      if (!accountsDir || !fs.existsSync(accountsDir)) {
        console.warn('[contingenciaHandlers] Diretório de contas não encontrado:', accountsDir)
        return []
      }

      const grupos = []
      let gruposRemovidos = 0

      // Carregar lista de grupos ignorados/caídos
      const ignoredSet = loadIgnoredGroups()

      // Ler todos os diretórios de contas
      const accountDirs = fs.readdirSync(accountsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())

      for (const accountDir of accountDirs) {
        const accountId = accountDir.name
        const accountPath = path.join(accountsDir, accountId)
        const jsonPath = path.join(accountPath, `${accountId}.json`)
        const sessionPath = path.join(accountPath, `${accountId}.session`)

        if (fs.existsSync(jsonPath)) {
          try {
            const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

            // Verificar se a conta está indisponível (banida, congelada ou sem sessão)
            const tags = Array.isArray(accountData.tags) ? accountData.tags : []
            const isBanned = tags.some(tag =>
              typeof tag === 'string' && (
                tag.toLowerCase().includes('banida') ||
                tag.toLowerCase().includes('banned') ||
                tag.toLowerCase().includes('banido')
              )
            )

            const isFrozen = accountData.frozen === true || tags.some(tag =>
              typeof tag === 'string' && (
                tag.toLowerCase().includes('congelada') ||
                tag.toLowerCase().includes('frozen')
              )
            )

            // Verificar se a sessão existe (conta disponível)
            const hasSession = fs.existsSync(sessionPath)

            // Se a conta estiver banida, congelada ou sem sessão, não incluir seus grupos
            if (isBanned || isFrozen || !hasSession) {
              const motivo = isBanned ? 'banida' : isFrozen ? 'congelada' : 'sem sessão'
              const gruposConta = accountData.grupos && Array.isArray(accountData.grupos) ? accountData.grupos.length : 0
              if (gruposConta > 0) {
                gruposRemovidos += gruposConta
                console.log(`[contingenciaHandlers] ⚠️ Conta ${accountId} está ${motivo}, removendo ${gruposConta} grupo(s)`)
              }
              continue // Pular esta conta, não adicionar seus grupos
            }

            // Extrair grupos do JSON (apenas se a conta estiver disponível)
            if (accountData.grupos && Array.isArray(accountData.grupos)) {
              for (const grupo of accountData.grupos) {
                const link = grupo.link || grupo.link_convite || ''

                // Verificar se o link está na blacklist (ignorados)
                let isIgnored = false
                if (link) {
                  const cleanLink = link.replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^\/+/, '').trim()
                  isIgnored = ignoredSet.has(cleanLink) || ignoredSet.has(`https://t.me/${cleanLink}`)
                }

                grupos.push({
                  id: grupo.id || grupo.grupo_id || '',
                  nome: grupo.nome || grupo.titulo || 'Sem nome',
                  membros: grupo.membros || grupo.participantsCount || 0,
                  link: link,
                  contaId: accountId,
                  categoriaId: grupo.categoriaId || accountData.categoriaId || null, // Priorizar categoriaId do grupo, depois da conta
                  status: isIgnored ? 'off' : 'on', // Novo campo de status
                })
              }
            }
          } catch (error) {
            console.warn(`[contingenciaHandlers] Erro ao ler conta ${accountId}:`, error.message)
          }
        }
      }

      console.log(`[contingenciaHandlers] Encontrados ${grupos.length} grupo(s) no sistema (${gruposRemovidos} grupo(s) removidos de contas indisponíveis)`)
      return grupos
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao listar grupos:', error)
      return []
    }
  })

  // Handler para buscar grupos por nomes (extraídos de logs)
  // Busca EXATA: trim + normalize('NFC') em ambos. Sem normalização de emojis/acentos, sem busca parcial/keywords.
  ipcMain.handle('contingencia-buscar-grupos-por-nomes', async (event, nomesGrupos) => {
    try {
      if (!Array.isArray(nomesGrupos) || nomesGrupos.length === 0) {
        return []
      }

      const accountsDir = PATHS.CONTAS_DIR
      if (!accountsDir || !fs.existsSync(accountsDir)) {
        console.warn('[contingenciaHandlers] Diretório de contas não encontrado:', accountsDir)
        return []
      }

      const gruposEncontrados = []

      const normalizarParaComparacao = (s) => {
        if (s == null || typeof s !== 'string') return ''
        return s.trim().normalize('NFC')
      }

      const nomesParaBuscar = nomesGrupos.map(n => normalizarParaComparacao(n))

      const accountDirs = fs.readdirSync(accountsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())

      for (const accountDir of accountDirs) {
        const accountId = accountDir.name
        const accountPath = path.join(accountsDir, accountId)
        const jsonPath = path.join(accountPath, `${accountId}.json`)
        const sessionPath = path.join(accountPath, `${accountId}.session`)

        if (!fs.existsSync(jsonPath)) continue

        try {
          const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
          const tags = Array.isArray(accountData.tags) ? accountData.tags : []
          const isBanned = tags.some(tag =>
            typeof tag === 'string' && (
              tag.toLowerCase().includes('banida') ||
              tag.toLowerCase().includes('banned') ||
              tag.toLowerCase().includes('banido')
            )
          )
          const isFrozen = accountData.frozen === true || tags.some(tag =>
            typeof tag === 'string' && (
              tag.toLowerCase().includes('congelada') ||
              tag.toLowerCase().includes('frozen')
            )
          )
          const hasSession = fs.existsSync(sessionPath)
          if (isBanned || isFrozen || !hasSession) continue

          if (!accountData.grupos || !Array.isArray(accountData.grupos)) continue

          for (const grupo of accountData.grupos) {
            const nomeGrupo = grupo.nome || grupo.titulo || ''
            const nomeGrupoNorm = normalizarParaComparacao(nomeGrupo)

            const indiceEncontrado = nomesParaBuscar.findIndex(nomeBuscado => {
              if (!nomeBuscado && !nomeGrupoNorm) return true
              if (!nomeBuscado || !nomeGrupoNorm) return false
              return nomeBuscado === nomeGrupoNorm
            })

            if (indiceEncontrado >= 0) {
              gruposEncontrados.push({
                id: grupo.id || grupo.grupo_id || '',
                nome: nomeGrupo,
                membros: grupo.membros || grupo.participantsCount || 0,
                link: grupo.link || grupo.link_convite || '',
                contaId: accountId,
                categoriaId: grupo.categoriaId || accountData.categoriaId || null,
                nomeBuscado: nomesGrupos[indiceEncontrado],
              })
            }
          }
        } catch (err) {
          console.warn(`[contingenciaHandlers] Erro ao ler conta ${accountId}:`, err.message)
        }
      }

      return gruposEncontrados
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao buscar grupos por nomes:', error)
      return []
    }
  })

  // Handler para sincronizar categorias dos grupos existentes
  ipcMain.handle('contingencia-sincronizar-categorias-grupos', async (event) => {
    try {
      const accountsDir = PATHS.CONTAS_DIR

      if (!accountsDir || !fs.existsSync(accountsDir)) {
        console.warn('[contingenciaHandlers] Diretório de contas não encontrado:', accountsDir)
        return { success: false, error: 'Diretório de contas não encontrado', gruposAtualizados: 0 }
      }

      let gruposAtualizados = 0
      let contasAtualizadas = 0

      // Ler todos os diretórios de contas
      const accountDirs = fs.readdirSync(accountsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())

      for (const accountDir of accountDirs) {
        const accountId = accountDir.name
        const accountPath = path.join(accountsDir, accountId)
        const jsonPath = path.join(accountPath, `${accountId}.json`)

        if (fs.existsSync(jsonPath)) {
          try {
            const accountData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
            let accountDataChanged = false
            const categoriaIdConta = accountData.categoriaId || null

            // Extrair grupos do JSON
            if (accountData.grupos && Array.isArray(accountData.grupos)) {
              for (let i = 0; i < accountData.grupos.length; i++) {
                const grupo = accountData.grupos[i]
                const categoriaIdGrupo = grupo.categoriaId || null

                // Se o grupo tem categoriaId mas a conta não tem, atualizar a conta
                if (categoriaIdGrupo && !categoriaIdConta) {
                  accountData.categoriaId = categoriaIdGrupo
                  accountDataChanged = true
                  console.log(`[contingenciaHandlers] ✅ Categoria ${categoriaIdGrupo} copiada da conta para o grupo ${grupo.nome || grupo.id} na conta ${accountId}`)
                }

                // Se a conta tem categoriaId mas o grupo não tem, atualizar o grupo
                if (categoriaIdConta && !categoriaIdGrupo) {
                  accountData.grupos[i].categoriaId = categoriaIdConta
                  accountDataChanged = true
                  gruposAtualizados++
                  console.log(`[contingenciaHandlers] ✅ Categoria ${categoriaIdConta} copiada da conta para o grupo ${grupo.nome || grupo.id} na conta ${accountId}`)
                }
              }
            }

            // Salvar se houver mudanças
            if (accountDataChanged) {
              fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
              contasAtualizadas++
            }
          } catch (error) {
            console.warn(`[contingenciaHandlers] Erro ao processar conta ${accountId}:`, error.message)
          }
        }
      }

      console.log('[contingenciaHandlers] ✅ Sincronização de categorias concluída:', {
        gruposAtualizados,
        contasAtualizadas
      })

      return {
        success: true,
        gruposAtualizados,
        contasAtualizadas
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao sincronizar categorias:', error)
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        gruposAtualizados: 0,
        contasAtualizadas: 0
      }
    }
  })

  // Handler para obter links das mensagens de um grupo base
  ipcMain.handle('contingencia-obter-links-mensagens', async (event, sessionPath) => {
    try {
      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)
      const vipInfo = vipGroups[normalized] || vipGroups[sessionPath]

      if (!vipInfo) {
        return { success: false, error: 'Grupo base não encontrado', links: [] }
      }

      return {
        success: true,
        links: vipInfo.mensagensLinks || [],
        grupoNome: vipInfo.grupoNome || 'Grupo Base',
        groupLink: vipInfo.groupLink || '',
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao obter links das mensagens:', error)
      return { success: false, error: error.message, links: [] }
    }
  })

  // Handler para listar grupos VIPs (usa arquivo separado, filtra APENAS tipo 'vip')
  ipcMain.handle('contingencia-listar-grupos-vip', async (event) => {
    try {
      const gruposVip = loadGruposVip()

      // Filtrar APENAS grupos do tipo 'vip' (NÃO incluir grupos sem tipo)
      const grupos = Object.values(gruposVip)
        .filter(vipInfo => vipInfo.tipo === 'vip')
        .map(vipInfo => ({
          sessionPath: vipInfo.sessionPath,
          sessionName: vipInfo.sessionName,
          groupLink: vipInfo.groupLink,
          grupoNome: vipInfo.grupoNome || 'Grupo VIP',
          dataCriacao: vipInfo.dataCriacao,
          grupoId: vipInfo.grupoId,
          grupoAccessHash: vipInfo.grupoAccessHash,
          tag: vipInfo.tag || vipInfo.tagSessao || null,
          totalMensagens: vipInfo.mensagensLinks?.length || vipInfo.totalMensagens || 0,
          tipo: 'vip',
        }))

      return { success: true, grupos }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao listar grupos VIP:', error)
      return { success: false, error: error.message, grupos: [] }
    }
  })

  // Handler para remover grupo VIP (pelo grupoId)
  ipcMain.handle('contingencia-remover-grupo-vip', async (event, grupoId) => {
    try {
      if (!grupoId) {
        throw new Error('grupoId é obrigatório')
      }

      const gruposVip = loadGruposVip()

      // Remover por grupoId (chave direta)
      if (gruposVip[grupoId]) {
        delete gruposVip[grupoId]
        console.log(`[contingenciaHandlers] ✅ Grupo VIP removido: ${grupoId}`)
      } else {
        throw new Error('Grupo VIP não encontrado')
      }

      if (saveGruposVip(gruposVip)) {
        return { success: true }
      } else {
        throw new Error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao remover grupo VIP:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para editar grupo VIP (nome e tag)
  ipcMain.handle('contingencia-editar-grupo-vip', async (event, payload) => {
    try {
      const { grupoId, novoNome, novaTag } = payload

      if (!grupoId) {
        throw new Error('grupoId é obrigatório')
      }

      const gruposVip = loadGruposVip()

      // Atualizar por grupoId (chave direta)
      if (gruposVip[grupoId]) {
        if (novoNome !== undefined) {
          gruposVip[grupoId].grupoNome = novoNome
        }
        if (novaTag !== undefined) {
          gruposVip[grupoId].tag = novaTag || null
        }
        console.log(`[contingenciaHandlers] ✅ Grupo VIP atualizado: ${grupoId}`)
      } else {
        throw new Error('Grupo VIP não encontrado')
      }

      if (saveGruposVip(gruposVip)) {
        return { success: true }
      } else {
        throw new Error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao editar grupo VIP:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para transferir posse do grupo VIP
  ipcMain.handle('contingencia-transferir-posse-vip', async (event, payload) => {
    try {
      const { grupoId, sessionPath, novoDonoUsername } = payload

      if (!grupoId || !sessionPath || !novoDonoUsername) {
        throw new Error('grupoId, sessionPath e novoDonoUsername são obrigatórios')
      }

      console.log('[contingenciaHandlers] Transferindo posse do grupo VIP:', { grupoId, novoDonoUsername })

      // Verificar se a sessão existe
      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      // Importar módulos necessários
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      // Carregar módulos
      const initSqlJs = require('sql.js')
      const { TelegramClient, Api } = require('telegram')
      const { StringSession } = require('telegram/sessions')

      // Extrair string session
      const SQL = await initSqlJs({
        locateFile: (file) => {
          const frontPath = path.join(PATHS.BASE, 'front', 'node_modules', 'sql.js', 'dist', file)
          if (fs.existsSync(frontPath)) return frontPath
          return path.join(PATHS.BASE, 'node_modules', 'sql.js', 'dist', file)
        },
      })

      const fileBuffer = fs.readFileSync(sessionPath)
      const sessionDb = new SQL.Database(fileBuffer)
      const query = sessionDb.exec(
        'SELECT dc_id, server_address, port, auth_key FROM sessions ORDER BY dc_id LIMIT 1;'
      )

      if (!query.length || !query[0].values.length) {
        sessionDb.close()
        throw new Error('Sessão inválida ou vazia')
      }

      const [dcId, serverAddress, port, authKey] = query[0].values[0]
      const dcBuffer = Buffer.from([Number(dcId)])
      const addressBuffer = Buffer.from(String(serverAddress))
      const addressLengthBuffer = Buffer.alloc(2)
      addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
      const portBuffer = Buffer.alloc(2)
      portBuffer.writeInt16BE(Number(port), 0)
      const authKeyBuffer = Buffer.from(authKey)
      const payloadBuffer = Buffer.concat([dcBuffer, addressLengthBuffer, addressBuffer, portBuffer, authKeyBuffer])
      const stringSession = `1${payloadBuffer.toString('base64')}`
      sessionDb.close()

      // Obter credenciais da API
      const { getNextApiCredentials } = require(clonadorPath)
      const apiCredentials = getNextApiCredentials({ rootDir: PATHS.BASE })

      // Conectar ao Telegram
      const client = new TelegramClient(
        new StringSession(stringSession),
        apiCredentials.apiId,
        apiCredentials.apiHash,
        {
          connectionRetries: 5,
          useWSS: false,
        }
      )

      await client.connect()
      console.log('[contingenciaHandlers] ✅ Conectado ao Telegram')

      // Obter entidade do grupo
      // O ID do canal precisa ser negativo com prefixo -100 para ser resolvido corretamente
      let destEntity
      try {
        // Tentar primeiro com o ID como está
        destEntity = await client.getEntity(BigInt(grupoId))
      } catch (e1) {
        try {
          // Tentar com -100 prefix (formato de canal)
          const channelId = BigInt(`-100${grupoId}`)
          destEntity = await client.getEntity(channelId)
        } catch (e2) {
          try {
            // Tentar com ID negativo simples
            destEntity = await client.getEntity(BigInt(`-${grupoId}`))
          } catch (e3) {
            throw new Error(`Não foi possível encontrar o grupo com ID ${grupoId}`)
          }
        }
      }
      console.log(`[contingenciaHandlers] ✅ Grupo encontrado: ${destEntity.title}`)

      // Obter entidade do novo dono
      let novoDono
      const username = novoDonoUsername.replace('@', '').trim()
      try {
        novoDono = await client.getEntity(username)
        console.log(`[contingenciaHandlers] ✅ Usuário encontrado: ${novoDono.firstName || novoDono.username}`)
      } catch (e) {
        throw new Error(`Usuário @${username} não encontrado`)
      }

      // Converter para InputChannel e InputUser
      const inputChannel = new Api.InputChannel({
        channelId: destEntity.id,
        accessHash: destEntity.accessHash,
      })

      const inputUser = new Api.InputUser({
        userId: novoDono.id,
        accessHash: novoDono.accessHash,
      })

      // Buscar senha 2FA automaticamente da pasta do número
      // Extrair número da sessão (nome da pasta)
      const sessionDir = path.dirname(sessionPath)
      const accountNumber = path.basename(sessionDir)

      // Lista de possíveis nomes de arquivo para a senha 2FA
      const possibleFiles = ['2fa', '2fa.txt', '2factor', '2factor.txt', 'password.txt', 'senha.txt', 'senha2fa.txt']
      let senha2FA = null

      for (const filename of possibleFiles) {
        const filePath = path.join(sessionDir, filename)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8').trim()
          if (content) {
            senha2FA = content
            console.log(`[contingenciaHandlers] ✅ Senha 2FA encontrada em: ${filename}`)
            break
          }
        }
      }

      // Preparar password input
      let passwordInput

      if (senha2FA) {
        console.log(`[contingenciaHandlers] 🔐 Usando senha 2FA encontrada na pasta do número ${accountNumber}...`)

        // Obter informações de senha do Telegram
        const { computeCheck } = require('telegram/Password')
        const passwordInfo = await client.invoke(new Api.account.GetPassword())

        // Computar hash da senha
        passwordInput = await computeCheck(passwordInfo, senha2FA)
      } else {
        console.log(`[contingenciaHandlers] ⚠️ Nenhum arquivo 2FA encontrado na pasta ${sessionDir}`)
        console.log(`[contingenciaHandlers] Tentando transferir sem senha 2FA...`)
        passwordInput = new Api.InputCheckPasswordEmpty()
      }

      // Promover novo dono com todas as permissões (incluindo owner)
      try {
        await client.invoke(
          new Api.channels.EditCreator({
            channel: inputChannel,
            userId: inputUser,
            password: passwordInput,
          })
        )
      } catch (editError) {
        // Se falhar por falta de 2FA, informar ao usuário
        if (editError.errorMessage === 'PASSWORD_REQUIRED' || editError.errorMessage === 'PASSWORD_HASH_INVALID') {
          await client.disconnect()

          if (senha2FA) {
            return {
              success: false,
              error: `Senha 2FA encontrada no arquivo mas está incorreta. Verifique o arquivo na pasta: ${sessionDir}`,
            }
          } else {
            return {
              success: false,
              error: `Transferência de posse requer senha 2FA. Crie um arquivo "2fa" ou "2fa.txt" na pasta: ${sessionDir}`,
            }
          }
        }
        throw editError
      }

      console.log(`[contingenciaHandlers] ✅ Posse transferida para @${username}`)

      // Atualizar no banco de dados local
      const gruposVip = loadGruposVip()
      if (gruposVip[grupoId]) {
        gruposVip[grupoId].posseTransferida = true
        gruposVip[grupoId].novoDonoUsername = username
        gruposVip[grupoId].dataTransferencia = new Date().toISOString()
        saveGruposVip(gruposVip)
      }

      await client.disconnect()

      return {
        success: true,
        message: `Posse do grupo transferida para @${username}`,
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao transferir posse:', error)

      // Erros específicos do Telegram
      if (error.errorMessage === 'PASSWORD_REQUIRED' || error.message?.includes('PASSWORD_REQUIRED')) {
        return {
          success: false,
          error: 'Transferência de posse requer senha 2FA. Crie um arquivo "2fa" ou "2fa.txt" na pasta do número.',
        }
      }
      if (error.message?.includes('CHAT_ADMIN_REQUIRED')) {
        return {
          success: false,
          error: 'A sessão não tem permissão de admin no grupo.',
        }
      }
      if (error.message?.includes('USER_NOT_PARTICIPANT')) {
        return {
          success: false,
          error: 'O novo dono precisa ser membro do grupo primeiro.',
        }
      }

      return { success: false, error: error.message }
    }
  })

  // Handler para cadastrar grupo base manualmente
  ipcMain.handle('contingencia-cadastrar-grupo-base', async (event, payload) => {
    try {
      const { sessionPath, groupLink } = payload

      if (!sessionPath || !groupLink) {
        throw new Error('sessionPath e groupLink são obrigatórios')
      }

      console.log('[contingenciaHandlers] Cadastrando grupo base:', { sessionPath, groupLink })

      // Importar módulo de cadastrar grupo base
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const cadastrarGrupoBasePath = path.join(PATHS.BASE, 'back', 'contingencia', 'cadastrarGrupoBase.js')

      if (!fs.existsSync(cadastrarGrupoBasePath)) {
        throw new Error('Módulo cadastrarGrupoBase.js não encontrado')
      }

      const { cadastrarGrupoBase } = require(cadastrarGrupoBasePath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }

      const grupoInfo = await cadastrarGrupoBase(sessionPath, groupLink, customPaths)

      // Salvar no sessions_vip_groups.json
      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)

      vipGroups[normalized] = {
        sessionPath: normalized,
        sessionName: path.basename(sessionPath),
        groupLink: grupoInfo.groupLink,
        grupoNome: grupoInfo.grupoNome || 'Grupo Base',
        dataCriacao: new Date().toISOString(),
        grupoId: grupoInfo.grupoId,
        grupoAccessHash: grupoInfo.grupoAccessHash,
        mensagensLinks: [], // Vazio por enquanto
      }

      // Também salvar com path original para compatibilidade
      if (normalized !== sessionPath) {
        vipGroups[sessionPath] = vipGroups[normalized]
      }

      saveVipGroups(vipGroups)
      console.log(`[contingenciaHandlers] ✅ Grupo base cadastrado e salvo: ${grupoInfo.grupoNome}`)

      // Marcar sessão como GRUPO BASE e remover outras tags
      try {
        const accountId = path.basename(sessionPath, '.session')
        const accountPath = path.join(PATHS.CONTAS_DIR, accountId)
        const metadataPath = path.join(accountPath, `${accountId}.json`)

        if (fs.existsSync(metadataPath)) {
          const accountData = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

          // Remover todas as tags e adicionar apenas "GRUPO BASE"
          accountData.tags = ['GRUPO BASE']
          accountData.grupoBaseNome = grupoInfo.grupoNome
          accountData.grupoBaseLink = grupoInfo.groupLink
          accountData.grupoBaseId = grupoInfo.grupoId
          accountData.grupoBaseCadastradoEm = new Date().toISOString()

          fs.writeFileSync(metadataPath, JSON.stringify(accountData, null, 2), 'utf-8')
          console.log(`[contingenciaHandlers] ✅ Sessão ${accountId} marcada como GRUPO BASE`)
        }
      } catch (error) {
        console.warn('[contingenciaHandlers] Erro ao marcar sessão como GRUPO BASE:', error.message)
        // Não falhar o cadastro se não conseguir marcar a tag
      }

      return { success: true, grupoInfo }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao cadastrar grupo base:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para obter grupos de uma sessão (deprecated - manter por compatibilidade)
  ipcMain.handle('contingencia-obter-grupos-sessao', async (event, sessionPath) => {
    try {
      if (!sessionPath) {
        throw new Error('sessionPath é obrigatório')
      }

      console.log('[contingenciaHandlers] Obtendo grupos da sessão:', sessionPath)

      // Importar módulo de importar grupo base
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const importarGrupoBasePath = path.join(PATHS.BASE, 'back', 'contingencia', 'importarGrupoBase.js')

      if (!fs.existsSync(importarGrupoBasePath)) {
        throw new Error('Módulo importarGrupoBase.js não encontrado')
      }

      const { obterGruposDaSessao } = require(importarGrupoBasePath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }

      const grupos = await obterGruposDaSessao(sessionPath, customPaths)

      return { success: true, grupos }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao obter grupos da sessão:', error)
      return { success: false, error: error.message, grupos: [] }
    }
  })

  // Handler para importar grupo base de uma sessão
  ipcMain.handle('contingencia-importar-grupo-base', async (event, payload) => {
    try {
      const { sessionPath, grupoId, grupoAccessHash } = payload

      if (!sessionPath || !grupoId || !grupoAccessHash) {
        throw new Error('sessionPath, grupoId e grupoAccessHash são obrigatórios')
      }

      console.log('[contingenciaHandlers] Importando grupo base:', { sessionPath, grupoId })

      // Importar módulo de importar grupo base
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const importarGrupoBasePath = path.join(PATHS.BASE, 'back', 'contingencia', 'importarGrupoBase.js')

      if (!fs.existsSync(importarGrupoBasePath)) {
        throw new Error('Módulo importarGrupoBase.js não encontrado')
      }

      const { importarGrupoBase } = require(importarGrupoBasePath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }

      const grupoInfo = await importarGrupoBase(sessionPath, grupoId, grupoAccessHash, customPaths)

      // Salvar no sessions_vip_groups.json
      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)

      vipGroups[normalized] = {
        sessionPath: normalized,
        sessionName: path.basename(sessionPath),
        groupLink: grupoInfo.groupLink,
        grupoNome: grupoInfo.grupoNome || 'Grupo Base',
        dataCriacao: new Date().toISOString(),
        grupoId: grupoInfo.grupoId,
        grupoAccessHash: grupoInfo.grupoAccessHash,
        mensagensLinks: [], // Vazio por enquanto
      }

      // Também salvar com path original para compatibilidade
      if (normalized !== sessionPath) {
        vipGroups[sessionPath] = vipGroups[normalized]
      }

      saveVipGroups(vipGroups)
      console.log(`[contingenciaHandlers] ✅ Grupo base importado e salvo: ${grupoInfo.grupoNome}`)

      return { success: true, grupoInfo }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao importar grupo base:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para atualizar nome e tag de grupo VIP
  ipcMain.handle('contingencia-atualizar-grupo-vip', async (event, payload) => {
    try {
      const { sessionPath, grupoNome, tag } = payload

      if (!sessionPath) {
        throw new Error('sessionPath é obrigatório')
      }

      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)
      const vipInfo = vipGroups[normalized] || vipGroups[sessionPath]

      if (!vipInfo) {
        throw new Error('Grupo VIP não encontrado')
      }

      // Atualizar nome se fornecido
      if (grupoNome !== undefined && grupoNome !== null) {
        vipInfo.grupoNome = grupoNome
      }

      // Atualizar tag se fornecido (null para remover tag)
      if (tag !== undefined) {
        vipInfo.tag = tag || null
      }

      // Salvar
      const keyToUpdate = normalized in vipGroups ? normalized : sessionPath
      vipGroups[keyToUpdate] = vipInfo

      if (saveVipGroups(vipGroups)) {
        return { success: true }
      } else {
        throw new Error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao atualizar grupo VIP:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para deletar grupo base
  ipcMain.handle('contingencia-deletar-grupo-base', async (event, sessionPath) => {
    try {
      if (!sessionPath) {
        throw new Error('sessionPath é obrigatório')
      }

      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)

      // Verificar se existe
      if (!vipGroups[normalized] && !vipGroups[sessionPath]) {
        throw new Error('Grupo base não encontrado')
      }

      // Remover grupo base
      delete vipGroups[normalized]
      if (normalized !== sessionPath) {
        delete vipGroups[sessionPath]
      }

      // Salvar
      if (saveVipGroups(vipGroups)) {
        console.log(`[contingenciaHandlers] ✅ Grupo base deletado: ${path.basename(sessionPath)}`)

        // Remover tag GRUPO BASE da sessão se existir
        try {
          // Extrair accountId do sessionPath (pode ser caminho completo ou apenas o nome)
          let accountId = path.basename(sessionPath, '.session')

          // Se o sessionPath contém o caminho completo, extrair o ID corretamente
          if (sessionPath.includes(path.sep)) {
            accountId = path.basename(sessionPath, '.session')
          }

          console.log(`[contingenciaHandlers] Tentando remover tag da conta: ${accountId}`)

          // Tentar diferentes caminhos possíveis
          const possiblePaths = [
            path.join(PATHS.CONTAS_DIR, accountId, `${accountId}.json`),
            path.join(PATHS.CONTAS_DIR, `${accountId}.json`),
            path.join(PATHS.BASE, accountId, `${accountId}.json`),
            path.join(PATHS.BASE, `${accountId}.json`),
          ]

          let tagRemovida = false

          for (const metadataPath of possiblePaths) {
            if (fs.existsSync(metadataPath)) {
              console.log(`[contingenciaHandlers] Arquivo de metadata encontrado: ${metadataPath}`)
              const accountData = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

              if (accountData.tags && Array.isArray(accountData.tags)) {
                const tagsAntes = accountData.tags.length
                accountData.tags = accountData.tags.filter((tag) => {
                  // Remover tanto "GRUPO BASE" quanto variações possíveis
                  const tagUpper = String(tag).toUpperCase().trim()
                  return tagUpper !== 'GRUPO BASE' && tagUpper !== 'GRUPOBASE'
                })
                const tagsDepois = accountData.tags.length

                if (tagsAntes !== tagsDepois) {
                  fs.writeFileSync(metadataPath, JSON.stringify(accountData, null, 2), 'utf-8')
                  console.log(`[contingenciaHandlers] ✅ Tag GRUPO BASE removida da conta ${accountId} (${tagsAntes - tagsDepois} tag(s) removida(s))`)
                  tagRemovida = true
                  break
                } else {
                  console.log(`[contingenciaHandlers] ℹ️ Tag GRUPO BASE não encontrada na conta ${accountId}`)
                }
              } else {
                console.log(`[contingenciaHandlers] ℹ️ Conta ${accountId} não possui tags`)
              }
            }
          }

          if (!tagRemovida) {
            console.warn(`[contingenciaHandlers] ⚠️ Não foi possível encontrar o arquivo de metadata para ${accountId}`)
          }
        } catch (tagError) {
          console.error('[contingenciaHandlers] Erro ao remover tag da sessão:', tagError)
          // Não falhar a operação se apenas a remoção da tag falhar
        }

        return { success: true }
      } else {
        throw new Error('Erro ao salvar alterações')
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao deletar grupo base:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para apagar todos os grupos de múltiplas contas selecionadas
  // Conecta ao Telegram e SAI/DELETA os grupos onde a conta é admin/dono (não apenas metadata)
  // sessoesParalelas: número de contas processadas em paralelo
  ipcMain.handle('contingencia-apagar-grupos-contas', async (event, accountIds, sessoesParalelas = 5) => {
    try {
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return { success: false, processadas: 0, erros: [{ accountId: '', error: 'Nenhuma conta fornecida' }] }
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const apagarPath = path.join(PATHS.BASE, 'back', 'apagarGruposSessao.js')
      if (!fs.existsSync(apagarPath)) {
        throw new Error('Módulo apagarGruposSessao.js não encontrado')
      }

      const { apagarGruposContas } = require(apagarPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
      }

      const result = await apagarGruposContas(
        {
          accountIds,
          maxSessoes: Math.max(1, Math.min(sessoesParalelas || 5, accountIds.length)),
          proxyId: null,
        },
        customPaths
      )

      // Limpar grupos base e VIP dos arquivos globais para as contas processadas
      const vipGroups = loadVipGroups()
      const gruposVip = loadGruposVip()
      let vipGroupsChanged = false
      let gruposVipChanged = false

      for (const id of accountIds) {
        const accountPath = path.join(PATHS.CONTAS_DIR, String(id).trim())
        const sessionPath = path.join(accountPath, `${String(id).trim()}.session`)
        const normalized = normalizePath(sessionPath)

        if (vipGroups[normalized] || vipGroups[sessionPath]) {
          delete vipGroups[normalized]
          if (normalized !== sessionPath) delete vipGroups[sessionPath]
          vipGroupsChanged = true
        }

        const gruposVipToRemove = Object.keys(gruposVip).filter(grupoId => {
          const vipInfo = gruposVip[grupoId]
          const vipPath = vipInfo?.sessionPath ? normalizePath(vipInfo.sessionPath) : ''
          return vipPath === normalized
        })
        gruposVipToRemove.forEach(grupoId => {
          delete gruposVip[grupoId]
          gruposVipChanged = true
        })
      }

      if (vipGroupsChanged) saveVipGroups(vipGroups)
      if (gruposVipChanged) saveGruposVip(gruposVip)

      return {
        success: result.success,
        processadas: result.processadas ?? 0,
        ...(result.erros?.length > 0 && { erros: result.erros }),
      }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao apagar grupos das contas:', error)
      return {
        success: false,
        processadas: 0,
        erros: [{ accountId: '', error: error.message }],
      }
    }
  })

  // Handler para adicionar bots ao grupo base
  ipcMain.handle('contingencia-adicionar-bots-ao-grupo-base', async (event, payload) => {
    try {
      const { sessionPath, grupoLink, bots } = payload

      console.log('[contingenciaHandlers] Adicionando bots ao grupo base...', { sessionPath, grupoLink, bots })

      if (!sessionPath || !grupoLink || !bots || !Array.isArray(bots) || bots.length === 0) {
        throw new Error('Dados inválidos: sessionPath, grupoLink e bots são obrigatórios')
      }

      // Importar módulo de adicionar bots
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const adicionarBotsPath = path.join(PATHS.BASE, 'back', 'contingencia', 'adicionarBotsGrupoBase.js')

      // Verificar se o módulo existe
      if (!fs.existsSync(adicionarBotsPath)) {
        throw new Error('Módulo adicionarBotsGrupoBase.js não encontrado')
      }

      const { adicionarBotsAoGrupoBase } = require(adicionarBotsPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      // Obter informações do grupo VIP
      const vipGroups = loadVipGroups()
      const normalized = normalizePath(sessionPath)
      const vipInfo = vipGroups[normalized] || vipGroups[sessionPath]

      if (!vipInfo) {
        throw new Error('Grupo base não encontrado para esta sessão')
      }

      // Executar adição de bots
      const result = await adicionarBotsAoGrupoBase({
        sessionPath,
        grupoLink: vipInfo.groupLink,
        grupoId: vipInfo.grupoId,
        grupoAccessHash: vipInfo.grupoAccessHash,
        bots,
      }, customPaths)

      return result
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao adicionar bots ao grupo base:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para fazer backup de vídeos
  ipcMain.handle('video-backup', async (event, payload) => {
    const logs = []

    const addLog = (message, level = 'INFO') => {
      const timestamp = new Date().toISOString()
      const logMessage = `[${timestamp}] [${level}] ${message}`
      logs.push(logMessage)
      console.log(logMessage)

      // Enviar log para o frontend se automationId estiver presente
      if (payload.automationId) {
        event.sender.send('backup-videos-log', {
          automationId: payload.automationId,
          log: logMessage,
        })
      }
    }

    try {
      const { sessionPath, groupLink, destFolder, automationId } = payload

      if (!sessionPath || !groupLink || !destFolder) {
        throw new Error('Dados obrigatórios: sessionPath, groupLink e destFolder')
      }

      addLog('[Backup Vídeos Handler] Handler chamado', 'INFO')
      addLog(`[Backup Vídeos] Sessão: ${sessionPath}`, 'INFO')
      addLog(`[Backup Vídeos] Grupo: ${groupLink}`, 'INFO')
      addLog(`[Backup Vídeos] Pasta destino: ${destFolder}`, 'INFO')

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const videoBackupPath = path.join(PATHS.BASE, 'back', 'contingencia', 'videoBackup.js')

      if (!fs.existsSync(videoBackupPath)) {
        throw new Error('Módulo videoBackup.js não encontrado')
      }

      const { fazerBackupVideos } = require(videoBackupPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      // Callbacks para progresso e logs
      const onProgress = (progress) => {
        if (automationId) {
          event.sender.send('backup-videos-progress', {
            automationId,
            progress,
          })
        }
      }

      const onLog = (logMessage) => {
        // Filtrar logs binários ou inválidos
        if (typeof logMessage !== 'string') {
          return; // Ignorar logs não-texto
        }

        // Filtrar caracteres não-ASCII problemáticos
        const safeLog = logMessage.replace(/[^\x20-\x7E\n\r\t]/g, '');
        if (safeLog.trim().length === 0) {
          return; // Ignorar logs vazios após filtragem
        }

        logs.push(safeLog)
        if (automationId) {
          event.sender.send('backup-videos-log', {
            automationId,
            log: safeLog,
          })
        }
      }

      const result = await fazerBackupVideos({
        sessionPath,
        groupLink,
        destFolder,
        onProgress,
        onLog,
      }, customPaths)

      result.logs = logs
      return result
    } catch (error) {
      const errorMsg = error.message || 'Erro desconhecido'
      addLog(`[Backup Vídeos] Erro: ${errorMsg}`, 'ERROR')
      console.error('[contingenciaHandlers] Erro ao fazer backup de vídeos:', error)
      return { success: false, error: errorMsg, logs }
    }
  })

  // Handler para importar vídeos
  ipcMain.handle('video-import', async (event, payload) => {
    try {
      const { sessionPath, sourceFolder, nomeGrupo } = payload

      if (!sessionPath || !sourceFolder) {
        throw new Error('Dados obrigatórios: sessionPath e sourceFolder')
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const videoImportPath = path.join(PATHS.BASE, 'back', 'contingencia', 'videoImport.js')

      if (!fs.existsSync(videoImportPath)) {
        throw new Error('Módulo videoImport.js não encontrado')
      }

      const { importarVideos } = require(videoImportPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
      }

      const result = await importarVideos({
        sessionPath,
        sourceFolder,
        nomeGrupo,
      }, customPaths)

      return result
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao importar vídeos:', error)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // HANDLERS PARA CLONAGEM VIP AVANÇADA
  // ============================================

  // Handler para analisar grupo de origem (pré-análise)
  ipcMain.handle('contingencia-analisar-grupo', async (event, payload) => {
    try {
      const { sessionPath, sourceLink, contarMidias = false } = payload

      console.log('[contingenciaHandlers] Iniciando análise do grupo...', {
        sessionPath,
        sourceLink,
        contarMidias,
      })

      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      if (!sourceLink) {
        throw new Error('Link do grupo não fornecido')
      }

      // Importar módulo de clonagem VIP avançada
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorVipAvancadoPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      const { analisarGrupoOrigem } = require(clonadorVipAvancadoPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        operacoesDir: PATHS.OPERACOES_DIR,
        rootDir: PATHS.BASE,
      }

      // Callbacks para enviar progresso ao frontend
      const callbacks = {
        onProgress: (progress) => {
          event.sender.send('analise-grupo-progress', progress)
        },
        onLog: (logMessage) => {
          event.sender.send('analise-grupo-log', logMessage)
        },
      }

      // Executar análise (modo rápido por padrão, sem contar mídias)
      const result = await analisarGrupoOrigem({
        sessionPath,
        sourceLink,
        contarMidias,
      }, customPaths, callbacks)

      return result
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao analisar grupo:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para executar clonagem VIP avançada (com suporte a tópicos)
  // Suporta múltiplas clonagens simultâneas com identificação por operationId
  ipcMain.handle('contingencia-clonar-vip-avancado', async (event, payload) => {
    // Gerar ID único para esta operação (permite múltiplas clonagens simultâneas)
    const operationId = `clone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      const {
        sessionPath,
        sourceLink,
        proxy,
        clonarTopicos = true,
        nomeGrupoDestino = null,
        retomar = false,
        criarTopicosAuto = true,
        midiasPorTopico = 2000,
        tagSessao = null,
        grupoTemRestricao = false,
        topicosParaClonar = null,
      } = payload

      const sessionName = path.basename(sessionPath, '.session')

      console.log(`[contingenciaHandlers] [${operationId}] Iniciando clonagem VIP avançada...`, {
        sessionPath,
        sourceLink,
        clonarTopicos,
        criarTopicosAuto,
        midiasPorTopico,
        retomar,
        grupoTemRestricao,
        topicosParaClonar,
      })

      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      if (!sourceLink) {
        throw new Error('Link do grupo origem não fornecido')
      }

      // Importar módulo de clonagem VIP avançada
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorVipAvancadoPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      const { executarClonagemVIPAvancada } = require(clonadorVipAvancadoPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        operacoesDir: PATHS.OPERACOES_DIR,
        rootDir: PATHS.BASE,
      }

      // Callbacks para enviar progresso ao frontend
      // Incluir operationId em todos os eventos para suportar múltiplas clonagens simultâneas
      const callbacks = {
        onProgress: (progress) => {
          event.sender.send('clonagem-vip-avancada-progress', {
            operationId,
            sessionPath,
            sessionName,
            sourceLink,
            ...progress,
          })
        },
        onLog: (logMessage) => {
          event.sender.send('clonagem-vip-avancada-log', {
            operationId,
            sessionPath,
            sessionName,
            sourceLink,
            message: logMessage,
          })
        },
        // Callback chamado quando o grupo é criado (ANTES de clonar mensagens)
        onGroupCreated: (grupoInfo) => {
          console.log(`[contingenciaHandlers] [${operationId}] 🆕 Grupo VIP criado: ${grupoInfo.grupoNome}`)
          const gruposVip = loadGruposVip()

          // Salvar grupo imediatamente com tipo 'vip'
          gruposVip[grupoInfo.grupoId] = {
            sessionPath: normalizePath(sessionPath),
            sessionName: path.basename(sessionPath),
            groupLink: grupoInfo.groupLink,
            grupoNome: grupoInfo.grupoNome || '',
            dataCriacao: new Date().toISOString(),
            grupoId: grupoInfo.grupoId,
            grupoAccessHash: grupoInfo.grupoAccessHash,
            mensagensLinks: [],
            totalMensagens: 0,
            temTopicos: grupoInfo.temTopicos || false,
            topicosClonados: grupoInfo.topicosClonados || 0,
            tag: tagSessao || null,
            tipo: 'vip', // Diferencia de grupos base
            operationId, // ID da operação para tracking
          }

          saveGruposVip(gruposVip)
          console.log(`[contingenciaHandlers] [${operationId}] ✅ Grupo VIP registrado imediatamente: ${grupoInfo.grupoNome} (${grupoInfo.grupoId})`)

          // Notificar frontend que o grupo foi criado
          event.sender.send('grupo-vip-criado', { ...gruposVip[grupoInfo.grupoId], operationId })
        },
      }

      // Executar clonagem
      const result = await executarClonagemVIPAvancada({
        sessionPath,
        sourceLink,
        proxy,
        clonarTopicos,
        nomeGrupoDestino,
        retomar,
        criarTopicosAuto,
        midiasPorTopico,
        tagSessao,
        grupoTemRestricao,
        topicosParaClonar,
      }, customPaths, callbacks)

      // Se a clonagem teve sucesso, atualizar contagem de mensagens no grupo VIP já registrado
      if (result.success && result.grupoId) {
        const gruposVip = loadGruposVip()
        const grupoId = result.grupoId

        if (gruposVip[grupoId]) {
          // Atualizar links de mensagens
          const linksExistentes = gruposVip[grupoId].mensagensLinks || []
          const novosLinks = result.mensagensLinks || []

          const todosLinks = [...linksExistentes]
          novosLinks.forEach(link => {
            if (!todosLinks.includes(link)) {
              todosLinks.push(link)
            }
          })

          gruposVip[grupoId].mensagensLinks = todosLinks
          gruposVip[grupoId].totalMensagens = todosLinks.length
          gruposVip[grupoId].ultimaAtualizacao = new Date().toISOString()
          gruposVip[grupoId].tipo = 'vip' // Garantir que tem o tipo

          saveGruposVip(gruposVip)
          console.log(`[contingenciaHandlers] [${operationId}] ✅ Grupo VIP atualizado: ${gruposVip[grupoId].grupoNome} (${todosLinks.length} mídias)`)
        }
      }

      // Enviar evento de conclusão
      event.sender.send('clonagem-vip-avancada-complete', {
        operationId,
        sessionPath,
        sessionName,
        sourceLink,
        success: true,
        ...result,
      })

      return { success: true, operationId, ...result }
    } catch (error) {
      console.error(`[contingenciaHandlers] [${operationId}] Erro ao executar clonagem VIP avançada:`, error)

      // Enviar evento de erro
      event.sender.send('clonagem-vip-avancada-error', {
        operationId,
        sessionPath,
        sessionName,
        sourceLink,
        error: error.message,
      })

      return { success: false, operationId, error: error.message }
    }
  })

  // Handler para verificar se um grupo VIP de destino está acessível
  // Envia uma mensagem de teste e apaga para confirmar que pode adicionar mídias
  ipcMain.handle('contingencia-verificar-grupo-destino-vip', async (event, payload) => {
    try {
      const { sessionPath, grupoLink } = payload

      console.log('[contingenciaHandlers] Verificando grupo destino VIP:', { sessionPath, grupoLink })

      if (!sessionPath) {
        throw new Error('Caminho da sessão não fornecido')
      }

      if (!grupoLink) {
        throw new Error('Link do grupo não fornecido')
      }

      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      // Importar módulos necessários
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      // Carregar módulos
      const initSqlJs = require('sql.js')
      const { TelegramClient, Api } = require('telegram')
      const { StringSession } = require('telegram/sessions')
      const { getNextApiCredentials } = require(clonadorPath)

      // Extrair string session do arquivo SQLite
      const SQL = await initSqlJs({
        locateFile: (file) => {
          const frontPath = path.join(PATHS.BASE, 'front', 'node_modules', 'sql.js', 'dist', file)
          if (fs.existsSync(frontPath)) return frontPath
          return path.join(PATHS.BASE, 'node_modules', 'sql.js', 'dist', file)
        },
      })

      const fileBuffer = fs.readFileSync(sessionPath)
      const sessionDb = new SQL.Database(fileBuffer)
      const query = sessionDb.exec(
        'SELECT dc_id, server_address, port, auth_key FROM sessions ORDER BY dc_id LIMIT 1;'
      )

      if (!query.length || !query[0].values.length) {
        sessionDb.close()
        throw new Error('Sessão inválida ou vazia')
      }

      const [dcId, serverAddress, port, authKey] = query[0].values[0]
      const dcBuffer = Buffer.from([Number(dcId)])
      const addressBuffer = Buffer.from(String(serverAddress))
      const addressLengthBuffer = Buffer.alloc(2)
      addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
      const portBuffer = Buffer.alloc(2)
      portBuffer.writeInt16BE(Number(port), 0)
      const authKeyBuffer = Buffer.from(authKey)
      const payloadBuffer = Buffer.concat([dcBuffer, addressLengthBuffer, addressBuffer, portBuffer, authKeyBuffer])
      const stringSession = `1${payloadBuffer.toString('base64')}`
      sessionDb.close()

      // Obter credenciais da API
      const apiCredentials = getNextApiCredentials({ rootDir: PATHS.BASE })

      // Criar cliente
      const client = new TelegramClient(
        new StringSession(stringSession),
        apiCredentials.apiId,
        apiCredentials.apiHash,
        {
          connectionRetries: 3,
          timeout: 30000,
        }
      )

      await client.connect()

      try {
        // Resolver o grupo a partir do link
        let entity
        let grupoId
        let grupoAccessHash
        let grupoNome
        let jaEraMembro = false

        // Extrair identificador do link
        let identifier = grupoLink
        if (grupoLink.includes('t.me/')) {
          identifier = grupoLink.split('t.me/').pop()
          if (identifier.startsWith('+')) {
            // Link de convite privado
            const hash = identifier.slice(1)
            try {
              // Primeiro, verificar se já é membro tentando resolver diretamente
              try {
                // Tentar resolver pelo hash (se já for membro)
                const resolved = await client.invoke(new Api.messages.CheckChatInvite({ hash }))
                if (resolved.chat) {
                  entity = resolved.chat
                  grupoId = String(entity.id)
                  grupoAccessHash = String(entity.accessHash || '')
                  grupoNome = entity.title || 'Grupo'
                  jaEraMembro = true
                  console.log('[contingenciaHandlers] ✅ Já é membro do grupo')
                } else if (resolved.channel) {
                  entity = resolved.channel
                  grupoId = String(entity.id)
                  grupoAccessHash = String(entity.accessHash || '')
                  grupoNome = entity.title || 'Canal'
                  jaEraMembro = true
                  console.log('[contingenciaHandlers] ✅ Já é membro do canal')
                }
              } catch (checkError) {
                // Se não conseguir verificar, tentar entrar no grupo
                console.log('[contingenciaHandlers] 🔄 Conta não está no grupo, tentando entrar...')
                const joinResult = await client.invoke(new Api.messages.ImportChatInvite({ hash }))
                if (joinResult.chats && joinResult.chats.length > 0) {
                  entity = joinResult.chats[0]
                  grupoId = String(entity.id)
                  grupoAccessHash = String(entity.accessHash || '')
                  grupoNome = entity.title || 'Grupo'
                  console.log('[contingenciaHandlers] ✅ Entrou no grupo com sucesso')
                  // Aguardar um pouco para estabilizar
                  await new Promise(resolve => setTimeout(resolve, 2000))
                } else {
                  throw new Error('Não foi possível entrar no grupo')
                }
              }
            } catch (joinError) {
              throw new Error(`Não foi possível acessar o grupo: ${joinError.message}`)
            }
          } else {
            // Link público - tentar resolver diretamente
            try {
              entity = await client.getEntity(identifier)
              grupoId = String(entity.id)
              grupoAccessHash = String(entity.accessHash || '')
              grupoNome = entity.title || entity.username || 'Grupo'
              jaEraMembro = true
            } catch (resolveError) {
              throw new Error(`Não foi possível acessar o grupo: ${resolveError.message}`)
            }
          }
        } else {
          // Tentar resolver diretamente
          try {
            entity = await client.getEntity(grupoLink)
            grupoId = String(entity.id)
            grupoAccessHash = String(entity.accessHash || '')
            grupoNome = entity.title || 'Grupo'
            jaEraMembro = true
          } catch (resolveError) {
            throw new Error(`Não foi possível acessar o grupo: ${resolveError.message}`)
          }
        }

        if (!entity) {
          throw new Error('Não foi possível encontrar o grupo')
        }

        // Resolver novamente para garantir que temos a entidade completa
        try {
          entity = await client.getEntity(entity)
        } catch (e) {
          // Se falhar, usar a entidade que já temos
          console.warn('[contingenciaHandlers] Aviso ao re-resolver entidade:', e.message)
        }

        // Criar InputChannel para enviar mensagem
        const inputChannel = new Api.InputChannel({
          channelId: entity.id,
          accessHash: entity.accessHash,
        })

        // Enviar mensagem de teste
        const mensagemTeste = '🔍 Verificando acesso...'
        let sentMessage
        try {
          sentMessage = await client.sendMessage(inputChannel, { message: mensagemTeste })
        } catch (sendError) {
          // Se falhar, tentar com a entidade diretamente
          sentMessage = await client.sendMessage(entity, { message: mensagemTeste })
        }

        // Aguardar um momento
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Apagar mensagem de teste
        try {
          await client.deleteMessages(inputChannel, [sentMessage.id], { revoke: true })
        } catch (deleteError) {
          try {
            await client.deleteMessages(entity, [sentMessage.id], { revoke: true })
          } catch (deleteError2) {
            console.warn('[contingenciaHandlers] Não foi possível apagar mensagem de teste:', deleteError2.message)
          }
        }

        await client.disconnect()

        const mensagemStatus = jaEraMembro
          ? 'Grupo verificado com sucesso! A conta já estava no grupo.'
          : 'Grupo verificado com sucesso! A conta entrou no grupo automaticamente.'

        return {
          success: true,
          mensagem: mensagemStatus,
          grupoId,
          grupoAccessHash,
          grupoNome,
          jaEraMembro,
        }

      } catch (innerError) {
        await client.disconnect()
        throw innerError
      }

    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao verificar grupo destino VIP:', error)
      return {
        success: false,
        error: error.message || 'Erro ao verificar grupo'
      }
    }
  })

  // Handler para adicionar mídias a um grupo VIP existente
  // Suporta múltiplas operações simultâneas com identificação por operationId
  ipcMain.handle('contingencia-adicionar-midias-vip', async (event, payload) => {
    // Gerar ID único para esta operação
    const operationId = `add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      const {
        sessionPath,
        sourceLink,
        grupoDestinoId,
        grupoDestinoAccessHash,
        grupoDestinoLink, // Link de convite do grupo destino (fallback)
        proxy,
        clonarTopicos = true,
        criarTopicosAuto = true,
        midiasPorTopico = 2000,
        retomar = false,
        tagSessao = null,
        grupoTemRestricao = false,
        topicosParaClonar = null,
      } = payload

      const sessionName = path.basename(sessionPath, '.session')

      console.log(`[contingenciaHandlers] [${operationId}] Iniciando adição de mídias ao grupo existente...`, {
        sessionPath,
        sourceLink,
        grupoDestinoId,
        grupoTemRestricao,
        topicosParaClonar,
      })

      if (!fs.existsSync(sessionPath)) {
        throw new Error('Arquivo de sessão não encontrado')
      }

      if (!sourceLink) {
        throw new Error('Link do grupo origem não fornecido')
      }

      if (!grupoDestinoId) {
        throw new Error('ID do grupo destino não fornecido')
      }

      // Importar módulo de clonagem VIP avançada
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorVipAvancadoPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      const { adicionarMidiasAoGrupoExistente } = require(clonadorVipAvancadoPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        operacoesDir: PATHS.OPERACOES_DIR,
        rootDir: PATHS.BASE,
      }

      // Callbacks para enviar progresso ao frontend
      // Incluir operationId em todos os eventos para suportar múltiplas operações simultâneas
      const callbacks = {
        onProgress: (progress) => {
          event.sender.send('clonagem-vip-avancada-progress', {
            operationId,
            sessionPath,
            sessionName,
            sourceLink,
            grupoDestinoId,
            ...progress,
          })
        },
        onLog: (logMessage) => {
          event.sender.send('clonagem-vip-avancada-log', {
            operationId,
            sessionPath,
            sessionName,
            sourceLink,
            grupoDestinoId,
            message: logMessage,
          })
        },
      }

      const result = await adicionarMidiasAoGrupoExistente({
        sessionPath,
        sourceLink,
        grupoDestinoId,
        grupoDestinoAccessHash,
        grupoDestinoLink,
        proxy,
        clonarTopicos,
        criarTopicosAuto,
        midiasPorTopico,
        retomar,
        tagSessao,
        grupoTemRestricao,
        topicosParaClonar,
      }, customPaths, callbacks)

      // Atualizar contagem de mensagens no arquivo de grupos VIP
      if (result.success && result.totalMensagens > 0) {
        const gruposVip = loadGruposVip()

        if (gruposVip[grupoDestinoId]) {
          const linksExistentes = gruposVip[grupoDestinoId].mensagensLinks || []
          const novosLinks = result.mensagensLinks || []

          // Combinar links existentes com novos (evitar duplicatas)
          const todosLinks = [...linksExistentes]
          novosLinks.forEach(link => {
            if (!todosLinks.includes(link)) {
              todosLinks.push(link)
            }
          })

          gruposVip[grupoDestinoId].mensagensLinks = todosLinks
          gruposVip[grupoDestinoId].totalMensagens = todosLinks.length
          gruposVip[grupoDestinoId].ultimaAtualizacao = new Date().toISOString()
          saveGruposVip(gruposVip)
          console.log(`[contingenciaHandlers] [${operationId}] ✅ Grupo VIP atualizado: ${grupoDestinoId} (${result.totalMensagens} novas mídias)`)
        }
      }

      // Enviar evento de conclusão
      event.sender.send('clonagem-vip-avancada-complete', {
        operationId,
        sessionPath,
        sessionName,
        sourceLink,
        grupoDestinoId,
        success: true,
        ...result,
      })

      return { success: true, operationId, ...result }
    } catch (error) {
      console.error(`[contingenciaHandlers] [${operationId}] Erro ao adicionar mídias ao grupo:`, error)

      // Enviar evento de erro
      event.sender.send('clonagem-vip-avancada-error', {
        operationId,
        sessionPath,
        sessionName,
        sourceLink,
        grupoDestinoId,
        error: error.message,
      })

      return { success: false, operationId, error: error.message }
    }
  })

  // Handler para verificar se existe checkpoint de clonagem
  ipcMain.handle('contingencia-verificar-checkpoint', async (event, payload) => {
    try {
      const { sessionPath, sourceLink } = payload

      if (!sessionPath || !sourceLink) {
        throw new Error('sessionPath e sourceLink são obrigatórios')
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorVipAvancadoPath)) {
        return { success: true, existe: false }
      }

      const { verificarCheckpoint } = require(clonadorVipAvancadoPath)
      const checkpoint = verificarCheckpoint(sessionPath, sourceLink)

      return { success: true, ...checkpoint }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao verificar checkpoint:', error)
      return { success: false, error: error.message, existe: false }
    }
  })

  // Handler para remover checkpoint de clonagem
  ipcMain.handle('contingencia-remover-checkpoint', async (event, payload) => {
    try {
      const { sessionPath, sourceLink } = payload

      if (!sessionPath || !sourceLink) {
        throw new Error('sessionPath e sourceLink são obrigatórios')
      }

      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (fs.existsSync(clonadorVipAvancadoPath)) {
        const { removerCheckpoint } = require(clonadorVipAvancadoPath)
        removerCheckpoint(sessionPath, sourceLink)
      }

      return { success: true }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao remover checkpoint:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para adicionar admins ao grupo (sessões, bots e usuários)
  ipcMain.handle('contingencia-adicionar-admins', async (event, payload) => {
    try {
      const {
        ownerSessionPath,
        grupoId,
        grupoAccessHash,
        adminSessionPaths = [],
        botUsernames = [],
        userUsernames = [], // Novo campo para usuários
      } = payload

      console.log('[contingenciaHandlers] Adicionando admins ao grupo...', {
        ownerSessionPath,
        grupoId,
        adminSessionPaths: adminSessionPaths.length,
        botUsernames: botUsernames.length,
        userUsernames: userUsernames.length,
      })

      if (!ownerSessionPath || !grupoId || !grupoAccessHash) {
        throw new Error('ownerSessionPath, grupoId e grupoAccessHash são obrigatórios')
      }

      if (adminSessionPaths.length === 0 && botUsernames.length === 0 && userUsernames.length === 0) {
        throw new Error('Pelo menos uma sessão, bot ou usuário deve ser fornecido')
      }

      if (!fs.existsSync(ownerSessionPath)) {
        throw new Error('Arquivo de sessão do dono não encontrado')
      }

      // Importar módulo de adicionar admins
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const adicionarAdminsPath = path.join(PATHS.BASE, 'back', 'contingencia', 'adicionarAdminsGrupo.js')

      if (!fs.existsSync(adicionarAdminsPath)) {
        throw new Error('Módulo adicionarAdminsGrupo.js não encontrado')
      }

      const { adicionarMultiplosAdmins } = require(adicionarAdminsPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        rootDir: PATHS.BASE,
      }

      const result = await adicionarMultiplosAdmins({
        ownerSessionPath,
        grupoId,
        grupoAccessHash,
        adminSessionPaths,
        botUsernames,
        userUsernames, // Passar novo campo
      }, customPaths)

      return result
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao adicionar admins:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler para executar clonagem VIP com múltiplas sessões (distribuição por tópicos)
  ipcMain.handle('contingencia-clonar-vip-multi-sessao', async (event, payload) => {
    try {
      const {
        sessaoMaePath,
        sessoesAuxiliaresPaths = [],
        sourceLink,
        topicosParaClonar = [],
        topicosInfo = [],
        nomeGrupoDestino = null,
        grupoTemRestricao = false,
        clonarTopicos = true,
        tagSessao = null,
      } = payload

      console.log('[contingenciaHandlers] Iniciando clonagem VIP multi-sessão...', {
        sessaoMaePath,
        sessoesAuxiliares: sessoesAuxiliaresPaths.length,
        sourceLink,
        topicosParaClonar: topicosParaClonar.length,
        grupoTemRestricao,
        clonarTopicos,
      })

      if (!fs.existsSync(sessaoMaePath)) {
        throw new Error('Arquivo de sessão mãe não encontrado')
      }

      if (!sourceLink) {
        throw new Error('Link do grupo origem não fornecido')
      }

      // Validar sessões auxiliares
      for (const sessaoPath of sessoesAuxiliaresPaths) {
        if (!fs.existsSync(sessaoPath)) {
          throw new Error(`Sessão auxiliar não encontrada: ${path.basename(sessaoPath)}`)
        }
      }

      // Importar módulo de clonagem VIP avançada
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const clonadorVipAvancadoPath = path.join(PATHS.BASE, 'back', 'contingencia', 'clonadorVipAvancado.js')

      if (!fs.existsSync(clonadorVipAvancadoPath)) {
        throw new Error('Módulo clonadorVipAvancado.js não encontrado')
      }

      const { executarClonagemMultiSessaoTopicos } = require(clonadorVipAvancadoPath)

      const customPaths = {
        accountsDir: PATHS.CONTAS_DIR,
        bancoDir: PATHS.BANCO_DIR,
        bancoPrincipalDir: path.join(PATHS.BASE, 'banco'),
        operacoesDir: PATHS.OPERACOES_DIR,
        rootDir: PATHS.BASE,
      }

      // Callbacks para enviar progresso ao frontend
      const callbacks = {
        onProgress: (progress) => {
          event.sender.send('clonagem-multi-sessao-progress', progress)
        },
        onLog: (logMessage) => {
          event.sender.send('clonagem-multi-sessao-log', logMessage)
        },
        // Callback chamado quando o grupo é criado
        onGroupCreated: (grupoInfo) => {
          console.log(`[contingenciaHandlers] 🆕 Grupo VIP criado (multi-sessão): ${grupoInfo.grupoNome}`)
          const gruposVip = loadGruposVip()

          // Salvar grupo imediatamente
          gruposVip[grupoInfo.grupoId] = {
            sessionPath: normalizePath(sessaoMaePath),
            sessionName: path.basename(sessaoMaePath),
            groupLink: grupoInfo.groupLink,
            grupoNome: grupoInfo.grupoNome || '',
            dataCriacao: new Date().toISOString(),
            grupoId: grupoInfo.grupoId,
            grupoAccessHash: grupoInfo.grupoAccessHash,
            mensagensLinks: [],
            totalMensagens: 0,
            temTopicos: true,
            topicosClonados: 0,
            tag: tagSessao || null,
            tipo: 'vip',
            modoMultiSessao: true,
            sessoesUtilizadas: 1 + sessoesAuxiliaresPaths.length,
          }

          saveGruposVip(gruposVip)
          console.log(`[contingenciaHandlers] ✅ Grupo VIP (multi-sessão) registrado: ${grupoInfo.grupoNome}`)

          // Notificar frontend
          event.sender.send('grupo-vip-criado', gruposVip[grupoInfo.grupoId])
        },
      }

      // Executar clonagem multi-sessão
      const result = await executarClonagemMultiSessaoTopicos({
        sessaoMaePath,
        sessoesAuxiliaresPaths,
        sourceLink,
        topicosParaClonar,
        topicosInfo,
        nomeGrupoDestino,
        grupoTemRestricao,
        clonarTopicos,
      }, customPaths, callbacks)

      // Atualizar grupo se clonagem teve sucesso
      if (result.success && result.grupoId) {
        const gruposVip = loadGruposVip()
        const grupoId = result.grupoId

        if (gruposVip[grupoId]) {
          gruposVip[grupoId].totalMensagens = result.totalMensagens || 0
          gruposVip[grupoId].topicosClonados = result.topicosClonados || 0
          gruposVip[grupoId].ultimaAtualizacao = new Date().toISOString()
          gruposVip[grupoId].resultadosPorSessao = result.resultadosPorSessao || []

          saveGruposVip(gruposVip)
          console.log(`[contingenciaHandlers] ✅ Grupo VIP (multi-sessão) atualizado: ${result.totalMensagens} mídias`)
        }
      }

      return { success: true, ...result }
    } catch (error) {
      console.error('[contingenciaHandlers] Erro ao executar clonagem multi-sessão:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ Handlers de contingência registrados com sucesso')
}


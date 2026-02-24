import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

// Usar BANCO_DIR da operação atual para tags
const getTagsConfigFile = () => path.join(PATHS.BANCO_DIR, 'tags-config.json')

/**
 * Carregar configuração de tags
 */
function loadTagsConfig() {
  const TAGS_CONFIG_FILE = getTagsConfigFile()
  if (fs.existsSync(TAGS_CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(TAGS_CONFIG_FILE, 'utf-8')
      const config = JSON.parse(content)
      return ensureVerificadorTag(config)
    } catch (error) {
      console.error('[tagsHandlers] Erro ao ler tags config:', error)
      return { tags: [] }
    }
  }
  
  // Tags padrão do sistema
  return ensureVerificadorTag({
    tags: [
      {
        id: 'com-grupos',
        nome: 'Com grupos',
        cor: '#10b981', // green-500
        descricao: 'Conta possui grupos criados',
        isSystem: true,
      },
      {
        id: 'sem-grupos',
        nome: 'Sem grupos',
        cor: '#eab308', // yellow-500
        descricao: 'Conta não possui grupos',
        isSystem: true,
      },
      {
        id: 'com-lista',
        nome: 'Com lista',
        cor: '#059669', // emerald-600
        descricao: 'Todos os grupos têm bots de lista',
        isSystem: true,
      },
      {
        id: 'sem-lista',
        nome: 'Sem lista',
        cor: '#9333ea', // purple-600
        descricao: 'Alguns grupos não têm bots de lista',
        isSystem: true,
      },
      {
        id: 'congeladas',
        nome: 'Congeladas',
        cor: '#06b6d4', // cyan-500
        descricao: 'Conta congelada pelo Telegram',
        isSystem: true,
      },
      {
        id: 'banidas',
        nome: 'Banidas',
        cor: '#dc2626', // red-800
        descricao: 'Conta banida pelo Telegram',
        isSystem: true,
      },
      {
        id: 'usuario-restrito',
        nome: 'Usuário restrito',
        cor: '#dc2626', // red-600
        descricao: 'Usuário com restrições',
        isSystem: true,
      },
      {
        id: 'grupos-sem-membros',
        nome: 'Grupos sem membros',
        cor: '#ea580c', // orange-600
        descricao: 'Grupos criados mas sem membros',
        isSystem: true,
      },
      {
        id: 'sem-lista-urgente',
        nome: 'SEM LISTA-URGENTE',
        cor: '#dc2626', // red-600
        descricao: 'Conta de categoria rodando com grupos sem lista (< 15 bots)',
        isSystem: true,
      },
      {
        id: 'verificador',
        nome: 'Verificador',
        cor: '#22c55e', // green-500
        descricao: 'Sessão usada para verificar bots',
        isSystem: true,
      },
      {
        id: 'verificador-disparo',
        nome: 'Verificador disparo',
        cor: '#14b8a6', // teal-500
        descricao: 'Sessão usada no Dashboard para o verificador de disparo de mensagens por categoria',
        isSystem: true,
      },
      {
        id: 'verificador-bots',
        nome: 'Verificador Bots',
        cor: '#8b5cf6', // violet-600
        descricao: 'Sessão usada na aba Bots para verificação manual (START). Use contas diferentes do Verificador disparo.',
        isSystem: true,
      },
    ]
  })
}

const TAG_VERIFICADOR_DISPARO = 'Verificador disparo'
const TAG_VERIFICADOR_BOTS = 'Verificador Bots'
const TAG_VIP_VERIFICACAO = 'VIP VERIFICAÇÃO'

function ensureVerificadorTag(config) {
  const tags = Array.isArray(config?.tags) ? [...config.tags] : []
  let changed = false
  const hasVerificador = tags.some(tag => typeof tag?.nome === 'string' && tag.nome.toLowerCase() === 'verificador')
  if (!hasVerificador) {
    tags.push({
      id: 'verificador',
      nome: 'Verificador',
      cor: '#22c55e',
      descricao: 'Sessão usada para verificar bots',
      isSystem: true,
    })
    changed = true
  }
  const hasVerificadorDisparo = tags.some(tag => typeof tag?.nome === 'string' && tag.nome === TAG_VERIFICADOR_DISPARO)
  if (!hasVerificadorDisparo) {
    tags.push({
      id: 'verificador-disparo',
      nome: TAG_VERIFICADOR_DISPARO,
      cor: '#14b8a6',
      descricao: 'Sessão usada no Dashboard para o verificador de disparo de mensagens por categoria',
      isSystem: true,
    })
    changed = true
  }
  const hasVerificadorBots = tags.some(tag => typeof tag?.nome === 'string' && tag.nome === TAG_VERIFICADOR_BOTS)
  if (!hasVerificadorBots) {
    tags.push({
      id: 'verificador-bots',
      nome: TAG_VERIFICADOR_BOTS,
      cor: '#8b5cf6',
      descricao: 'Sessão usada na aba Bots para verificação manual de bots (START). Não use a mesma conta que Verificador disparo.',
      isSystem: true,
    })
    changed = true
  }
  const hasVipVerificacao = tags.some(tag => typeof tag?.nome === 'string' && tag.nome === TAG_VIP_VERIFICACAO)
  if (!hasVipVerificacao) {
    tags.push({
      id: 'vip-verificacao',
      nome: TAG_VIP_VERIFICACAO,
      cor: '#a855f7',
      descricao: 'Sessão reservada só para verificação (tópicos, grupos, etc.). Usada automaticamente.',
      isSystem: true,
    })
    changed = true
  }
  const updated = { ...config, tags }
  if (changed) {
    saveTagsConfig(updated)
  }
  return updated
}

/**
 * Salvar configuração de tags
 */
function saveTagsConfig(config) {
  try {
    const TAGS_CONFIG_FILE = getTagsConfigFile()
    // Criar diretório se não existir
    const bancoDir = path.dirname(TAGS_CONFIG_FILE)
    if (!fs.existsSync(bancoDir)) {
      fs.mkdirSync(bancoDir, { recursive: true })
    }
    
    fs.writeFileSync(TAGS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('[tagsHandlers] Erro ao salvar tags config:', error)
    return false
  }
}

/**
 * Gerar ID único para tag
 */
function generateTagId() {
  return `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function registerTagsHandlers() {
  console.log('📝 Registrando handlers de tags...')

  // Carregar todas as tags
  ipcMain.handle('tags-carregar-todas', async () => {
    try {
      const config = loadTagsConfig()
      return { success: true, tags: config.tags || [] }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao carregar tags:', error)
      return { success: false, error: error.message, tags: [] }
    }
  })

  // Criar nova tag
  ipcMain.handle('tags-criar', async (event, tagData) => {
    try {
      const config = loadTagsConfig()
      const tags = config.tags || []
      
      const novaTag = {
        id: generateTagId(),
        nome: tagData.nome || 'Nova Tag',
        cor: tagData.cor || '#6b7280',
        descricao: tagData.descricao || '',
        isSystem: false,
        createdAt: new Date().toISOString(),
      }
      
      tags.push(novaTag)
      config.tags = tags
      
      if (saveTagsConfig(config)) {
        return { success: true, tag: novaTag }
      } else {
        return { success: false, error: 'Erro ao salvar tag' }
      }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao criar tag:', error)
      return { success: false, error: error.message }
    }
  })

  // Atualizar tag
  ipcMain.handle('tags-atualizar', async (event, tagId, updates) => {
    try {
      const config = loadTagsConfig()
      const tags = config.tags || []
      
      const index = tags.findIndex(t => t.id === tagId)
      if (index === -1) {
        return { success: false, error: 'Tag não encontrada' }
      }
      
      // Não permitir editar tags do sistema (apenas nome, cor, descrição se permitido)
      if (tags[index].isSystem && updates.nome) {
        // Verificar se o nome está sendo mudado para algo diferente do original
        // Se for, criar uma nova tag ao invés de editar a do sistema
        if (updates.nome !== tags[index].nome) {
          // Criar nova tag
          const novaTag = {
            ...tags[index],
            id: generateTagId(),
            nome: updates.nome,
            cor: updates.cor !== undefined ? updates.cor : tags[index].cor,
            descricao: updates.descricao !== undefined ? updates.descricao : tags[index].descricao,
            isSystem: false,
          }
          tags.push(novaTag)
          config.tags = tags
          if (saveTagsConfig(config)) {
            return { success: true, tag: novaTag }
          }
        }
      }
      
      // Atualizar tag existente
      tags[index] = {
        ...tags[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      
      config.tags = tags
      
      if (saveTagsConfig(config)) {
        return { success: true, tag: tags[index] }
      } else {
        return { success: false, error: 'Erro ao salvar tag' }
      }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao atualizar tag:', error)
      return { success: false, error: error.message }
    }
  })

  // Deletar tag
  ipcMain.handle('tags-deletar', async (event, tagId) => {
    try {
      const config = loadTagsConfig()
      const tags = config.tags || []
      
      const tag = tags.find(t => t.id === tagId)
      if (!tag) {
        return { success: false, error: 'Tag não encontrada' }
      }
      
      // Não permitir deletar tags do sistema
      if (tag.isSystem) {
        return { success: false, error: 'Não é possível deletar tags do sistema' }
      }
      
      const filtered = tags.filter(t => t.id !== tagId)
      config.tags = filtered
      
      if (saveTagsConfig(config)) {
        // Remover tag de todas as contas que a possuem
        await removeTagFromAllAccounts(tag.nome)
        return { success: true }
      } else {
        return { success: false, error: 'Erro ao salvar' }
      }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao deletar tag:', error)
      return { success: false, error: error.message }
    }
  })

  // Função auxiliar para remover tag de todas as contas
  async function removeTagFromAllAccounts(tagName) {
    try {
      if (!PATHS.CONTAS_DIR || !fs.existsSync(PATHS.CONTAS_DIR)) {
        return
      }
      
      const pastas = fs.readdirSync(PATHS.CONTAS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
      
      for (const pasta of pastas) {
        const numero = pasta.name
        const jsonPath = path.join(PATHS.CONTAS_DIR, numero, `${numero}.json`)
        
        if (fs.existsSync(jsonPath)) {
          try {
            const content = fs.readFileSync(jsonPath, 'utf-8')
            const accountData = JSON.parse(content)
            
            if (Array.isArray(accountData.tags)) {
              accountData.tags = accountData.tags.filter(t => t !== tagName)
              fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
            }
          } catch (error) {
            // Ignorar erros de contas individuais
          }
        }
      }
    } catch (error) {
      console.warn('[tagsHandlers] Erro ao remover tag das contas:', error.message)
    }
  }

  // Adicionar tag a uma conta
  ipcMain.handle('tags-adicionar-conta', async (event, numeroConta, tagId) => {
    try {
      const config = loadTagsConfig()
      const tags = config.tags || []
      const tag = tags.find(t => t.id === tagId)
      
      if (!tag) {
        return { success: false, error: 'Tag não encontrada' }
      }
      
      const accountPath = path.join(PATHS.CONTAS_DIR, numeroConta)
      const jsonPath = path.join(accountPath, `${numeroConta}.json`)
      
      if (!fs.existsSync(jsonPath)) {
        return { success: false, error: 'Conta não encontrada' }
      }
      
      const content = fs.readFileSync(jsonPath, 'utf-8')
      const accountData = JSON.parse(content)
      
      if (!Array.isArray(accountData.tags)) {
        accountData.tags = []
      }
      
      // Adicionar tag se não existir
      if (!accountData.tags.includes(tag.nome)) {
        accountData.tags.push(tag.nome)
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
      
      return { success: true }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao adicionar tag à conta:', error)
      return { success: false, error: error.message }
    }
  })

  // Remover tag de uma conta
  ipcMain.handle('tags-remover-conta', async (event, numeroConta, tagId) => {
    try {
      const config = loadTagsConfig()
      const tags = config.tags || []
      const tag = tags.find(t => t.id === tagId)
      
      if (!tag) {
        return { success: false, error: 'Tag não encontrada' }
      }
      
      const accountPath = path.join(PATHS.CONTAS_DIR, numeroConta)
      const jsonPath = path.join(accountPath, `${numeroConta}.json`)
      
      if (!fs.existsSync(jsonPath)) {
        return { success: false, error: 'Conta não encontrada' }
      }
      
      const content = fs.readFileSync(jsonPath, 'utf-8')
      const accountData = JSON.parse(content)
      
      if (Array.isArray(accountData.tags)) {
        accountData.tags = accountData.tags.filter(t => t !== tag.nome)
        fs.writeFileSync(jsonPath, JSON.stringify(accountData, null, 2), 'utf-8')
      }
      
      return { success: true }
    } catch (error) {
      console.error('[tagsHandlers] Erro ao remover tag da conta:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ Handlers de tags registrados com sucesso')
}


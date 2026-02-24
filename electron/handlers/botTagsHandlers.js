import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

/**
 * Arquivo de configuração para tags de bots.
 * Armazena as tags disponíveis e a relação bot -> tags.
 */
const getBotTagsConfigFile = () => path.join(PATHS.BANCO_DIR, 'bot-tags-config.json')

/**
 * Carregar configuração de tags de bots
 * @returns {{ tags: Array<{id: string, nome: string, cor: string}>, botTags: Record<string, string[]> }}
 */
function loadBotTagsConfig() {
    const CONFIG_FILE = getBotTagsConfigFile()
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
            const config = JSON.parse(content)
            return {
                tags: Array.isArray(config.tags) ? config.tags : [],
                botTags: config.botTags || {},
            }
        } catch (error) {
            console.error('[botTagsHandlers] Erro ao ler bot-tags-config:', error)
            return { tags: [], botTags: {} }
        }
    }
    return { tags: [], botTags: {} }
}

/**
 * Salvar configuração de tags de bots
 * @param {{ tags: Array, botTags: Record<string, string[]> }} config
 * @returns {boolean}
 */
function saveBotTagsConfig(config) {
    try {
        const CONFIG_FILE = getBotTagsConfigFile()
        const dir = path.dirname(CONFIG_FILE)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
        return true
    } catch (error) {
        console.error('[botTagsHandlers] Erro ao salvar bot-tags-config:', error)
        return false
    }
}

/**
 * Gerar ID único para tag de bot
 */
function generateBotTagId() {
    return `btag-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
}

export function registerBotTagsHandlers() {
    console.log('[botTags] Registrando handlers de tags de bots...')

    // ═══════════════════════════════════════════════════
    // CRUD de Tags
    // ═══════════════════════════════════════════════════

    /** Carregar todas as tags de bots */
    ipcMain.handle('bot-tags-carregar', async () => {
        try {
            const config = loadBotTagsConfig()
            return { success: true, tags: config.tags }
        } catch (error) {
            console.error('[botTags] Erro ao carregar tags:', error)
            return { success: false, error: error.message, tags: [] }
        }
    })

    /** Criar uma nova tag de bot */
    ipcMain.handle('bot-tags-criar', async (event, tagData) => {
        try {
            const config = loadBotTagsConfig()

            // Verificar duplicata por nome
            const existe = config.tags.some(t => t.nome.toLowerCase() === (tagData.nome || '').toLowerCase())
            if (existe) {
                return { success: false, error: 'Já existe uma tag com esse nome' }
            }

            const novaTag = {
                id: generateBotTagId(),
                nome: tagData.nome || 'Nova Tag',
                cor: tagData.cor || '#6b7280',
                createdAt: new Date().toISOString(),
            }

            config.tags.push(novaTag)
            if (saveBotTagsConfig(config)) {
                console.log(`[botTags] ✅ Tag criada: "${novaTag.nome}"`)
                return { success: true, tag: novaTag }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao criar tag:', error)
            return { success: false, error: error.message }
        }
    })

    /** Deletar uma tag de bot e remover de todos os bots */
    ipcMain.handle('bot-tags-deletar', async (event, tagId) => {
        try {
            const config = loadBotTagsConfig()
            const tag = config.tags.find(t => t.id === tagId)
            if (!tag) return { success: false, error: 'Tag não encontrada' }

            // Remover tag da lista
            config.tags = config.tags.filter(t => t.id !== tagId)

            // Remover tag de todos os bots
            for (const botId of Object.keys(config.botTags)) {
                config.botTags[botId] = (config.botTags[botId] || []).filter(id => id !== tagId)
                if (config.botTags[botId].length === 0) {
                    delete config.botTags[botId]
                }
            }

            if (saveBotTagsConfig(config)) {
                console.log(`[botTags] ✅ Tag deletada: "${tag.nome}"`)
                return { success: true }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao deletar tag:', error)
            return { success: false, error: error.message }
        }
    })

    // ═══════════════════════════════════════════════════
    // Vincular / Desvincular Tags de Bots
    // ═══════════════════════════════════════════════════

    /** Adicionar tag a um bot */
    ipcMain.handle('bot-tags-adicionar-bot', async (event, botId, tagId) => {
        try {
            const config = loadBotTagsConfig()
            const tag = config.tags.find(t => t.id === tagId)
            if (!tag) return { success: false, error: 'Tag não encontrada' }

            if (!config.botTags[botId]) config.botTags[botId] = []
            if (!config.botTags[botId].includes(tagId)) {
                config.botTags[botId].push(tagId)
            }

            if (saveBotTagsConfig(config)) {
                return { success: true }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao adicionar tag ao bot:', error)
            return { success: false, error: error.message }
        }
    })

    /** Remover tag de um bot */
    ipcMain.handle('bot-tags-remover-bot', async (event, botId, tagId) => {
        try {
            const config = loadBotTagsConfig()
            if (!config.botTags[botId]) return { success: true }

            config.botTags[botId] = config.botTags[botId].filter(id => id !== tagId)
            if (config.botTags[botId].length === 0) delete config.botTags[botId]

            if (saveBotTagsConfig(config)) {
                return { success: true }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao remover tag do bot:', error)
            return { success: false, error: error.message }
        }
    })

    /** Carregar tags de um bot específico */
    ipcMain.handle('bot-tags-do-bot', async (event, botId) => {
        try {
            const config = loadBotTagsConfig()
            const tagIds = config.botTags[botId] || []
            const tags = config.tags.filter(t => tagIds.includes(t.id))
            return { success: true, tags }
        } catch (error) {
            console.error('[botTags] Erro ao carregar tags do bot:', error)
            return { success: false, error: error.message, tags: [] }
        }
    })

    /** Carregar mapa completo de botId -> tagIds */
    ipcMain.handle('bot-tags-mapa', async () => {
        try {
            const config = loadBotTagsConfig()
            return { success: true, botTags: config.botTags }
        } catch (error) {
            console.error('[botTags] Erro ao carregar mapa de tags:', error)
            return { success: false, error: error.message, botTags: {} }
        }
    })

    /** Adicionar tag a vários bots de uma vez (ação em massa) */
    ipcMain.handle('bot-tags-adicionar-massa', async (event, botIds, tagId) => {
        try {
            const config = loadBotTagsConfig()
            const tag = config.tags.find(t => t.id === tagId)
            if (!tag) return { success: false, error: 'Tag não encontrada' }

            let count = 0
            for (const botId of botIds) {
                if (!config.botTags[botId]) config.botTags[botId] = []
                if (!config.botTags[botId].includes(tagId)) {
                    config.botTags[botId].push(tagId)
                    count++
                }
            }

            if (saveBotTagsConfig(config)) {
                console.log(`[botTags] ✅ Tag "${tag.nome}" adicionada a ${count} bot(s) em massa`)
                return { success: true, count }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao adicionar tag em massa:', error)
            return { success: false, error: error.message }
        }
    })

    /** Remover tag de vários bots de uma vez (ação em massa) */
    ipcMain.handle('bot-tags-remover-massa', async (event, botIds, tagId) => {
        try {
            const config = loadBotTagsConfig()

            let count = 0
            for (const botId of botIds) {
                if (config.botTags[botId] && config.botTags[botId].includes(tagId)) {
                    config.botTags[botId] = config.botTags[botId].filter(id => id !== tagId)
                    if (config.botTags[botId].length === 0) delete config.botTags[botId]
                    count++
                }
            }

            if (saveBotTagsConfig(config)) {
                console.log(`[botTags] ✅ Tag removida de ${count} bot(s) em massa`)
                return { success: true, count }
            }
            return { success: false, error: 'Erro ao salvar' }
        } catch (error) {
            console.error('[botTags] Erro ao remover tag em massa:', error)
            return { success: false, error: error.message }
        }
    })

    console.log('[botTags] ✅ Handlers de tags de bots registrados')
}

import { BotMidia, BotMidiaFormData } from '@/types/BotMidia'
import { waitForElectronAPI } from '@/utils/waitForElectron'

export const botMidiaService = {
  async getAll(): Promise<BotMidia[]> {
    try {
      console.log('[botMidiaService] Aguardando electron API...')

      // Aguardar API do Electron estar disponível
      const isAvailable = await waitForElectronAPI('botMidia', 20, 200)

      if (!isAvailable || !window.electron?.botMidia) {
        console.warn('[botMidiaService] Electron API não disponível após tentativas')
        return []
      }

      console.log('[botMidiaService] Chamando carregarTodos...')
      const bots = await window.electron.botMidia.carregarTodos()
      console.log('[botMidiaService] Resposta recebida:', bots?.length || 0, 'bots')

      if (!bots || !Array.isArray(bots)) {
        console.warn('[botMidiaService] Resposta inválida:', bots)
        return []
      }

      const botsMapeados = bots.map((bot: any) => ({
        id: bot.id || bot.arquivoPath, // Usar arquivoPath como fallback para ID
        nome: bot.nome,
        token: bot.token,
        username: bot.username,
        statusDetalhe: bot.statusDetalhe,
        error: bot.error,
        createdAt: bot.createdAt,
        nichoId: bot.nichoId,
        nichoNome: bot.nichoNome,
        categoriaId: bot.categoriaId,
        categoriaNome: bot.categoriaNome,
        tipo: bot.tipo || 'Instagram',
        tipoBot: bot.tipoBot || (bot.origem === 'categoria' ? 'disparo' : 'vendas'), // Inferir tipo baseado na origem
        status: bot.status || 'Inativo',
        origem: bot.origem || 'nicho',
        categoriasVinculadas: bot.categoriasVinculadas || [],
        arquivoPath: bot.arquivoPath,
      }))

      console.log('[botMidiaService] Bots mapeados:', botsMapeados.length)
      return botsMapeados
    } catch (error) {
      console.error('[botMidiaService] Erro ao carregar bots de mídia:', error)
      if (error instanceof Error) {
        console.error('[botMidiaService] Stack:', error.stack)
      }
      return []
    }
  },

  async getById(_id: number): Promise<BotMidia> {
    throw new Error('Not implemented')
  },

  async create(data: BotMidiaFormData): Promise<BotMidia> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      if (!data.nome || !data.token) {
        throw new Error('Nome e token são obrigatórios')
      }

      // Verificar se o token já existe antes de salvar
      const todosBots = await this.getAll()
      const tokenDuplicado = todosBots.find(bot => bot.token === data.token)
      if (tokenDuplicado) {
        throw new Error(`Token já está em uso pelo bot "${tokenDuplicado.nome}" no nicho "${tokenDuplicado.nichoNome}"`)
      }

      // O método salvar espera: botNome, botToken, nichoId, categoriaId
      const result = await window.electron.botMidia.salvar(
        data.nome,
        data.token,
        null, // nichoId (não mais usado, mas mantido para compatibilidade)
        data.categoriaId || null
      )

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar bot')
      }

      // Retornar um objeto BotMidia básico
      return {
        id: Date.now(),
        nome: data.nome,
        token: data.token,
        nichoId: data.nichoId,
        nichoNome: data.nichoNome,
        categoriaId: data.categoriaId,
        categoriaNome: data.categoriaNome,
        tipo: data.tipo || 'Instagram',
        status: data.status || 'Inativo',
        arquivoPath: result.path,
      }
    } catch (error) {
      console.error('Erro ao criar bot de mídia:', error)
      throw error
    }
  },

  async update(id: number | string, data: Partial<BotMidiaFormData>): Promise<BotMidia> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      // Primeiro, carregar o bot para obter o arquivoPath
      const bots = await this.getAll()
      const bot = bots.find((b) => b.id === id)

      if (!bot || !bot.arquivoPath) {
        throw new Error('Bot não encontrado ou arquivoPath não disponível')
      }

      // Verificar se o token foi alterado e se já existe em outro bot
      if (data.token && data.token !== bot.token) {
        const tokenDuplicado = bots.find(b => b.token === data.token && b.id !== id)
        if (tokenDuplicado) {
          throw new Error(`Token já está em uso pelo bot "${tokenDuplicado.nome}" no nicho "${tokenDuplicado.nichoNome}"`)
        }
      }

      const result = await (window.electron.botMidia as any).atualizar(
        bot.arquivoPath,
        data.nome || bot.nome,
        data.token || bot.token,
        data.username !== undefined ? data.username : bot.username
      )

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar bot')
      }

      return {
        ...bot,
        nome: data.nome || bot.nome,
        token: data.token || bot.token,
      }
    } catch (error) {
      console.error('Erro ao atualizar bot de mídia:', error)
      throw error
    }
  },

  async delete(id: number | string): Promise<void> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      // Primeiro, carregar o bot para obter o arquivoPath
      const bots = await this.getAll()
      const bot = bots.find((b) => {
        // Comparar tanto por ID quanto por arquivoPath para garantir que encontramos o bot
        return b.id === id || b.id === String(id) || String(b.id) === String(id)
      })

      if (!bot) {
        // Tentar encontrar por arquivoPath se tiver sido passado como string
        const botPorPath = bots.find((b) => b.arquivoPath && b.arquivoPath.includes(String(id)))
        if (botPorPath && botPorPath.arquivoPath) {
          const result = await window.electron.botMidia.excluir(botPorPath.arquivoPath)
          if (!result.success) {
            throw new Error(result.error || 'Erro ao excluir bot')
          }
          return
        }
        throw new Error('Bot não encontrado')
      }

      if (!bot.arquivoPath) {
        throw new Error('ArquivoPath não disponível para este bot')
      }

      const result = await window.electron.botMidia.excluir(bot.arquivoPath)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir bot')
      }
    } catch (error) {
      console.error('Erro ao excluir bot de mídia:', error)
      throw error
    }
  },

  async verificar(): Promise<{ success: boolean; bots?: BotMidia[]; ativos?: number; total?: number; message?: string; error?: string }> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      const result = await (window.electron.botMidia as any).verificar()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao verificar bots')
      }

      // Mapear os bots verificados
      const botsMapeados = result.bots ? result.bots.map((bot: any) => ({
        id: bot.id || bot.arquivoPath,
        nome: bot.nome,
        token: bot.token,
        username: bot.username,
        statusDetalhe: bot.statusDetalhe,
        error: bot.error,
        nichoId: bot.nichoId,
        nichoNome: bot.nichoNome,
        categoriaId: bot.categoriaId,
        categoriaNome: bot.categoriaNome,
        tipo: bot.tipo || 'Instagram',
        tipoBot: bot.tipoBot || (bot.origem === 'categoria' ? 'disparo' : 'vendas'),
        status: bot.status || 'Inativo',
        origem: bot.origem || 'nicho',
        categoriasVinculadas: bot.categoriasVinculadas || [],
        arquivoPath: bot.arquivoPath,
      })) : []

      return {
        success: true,
        bots: botsMapeados,
        ativos: result.ativos,
        total: result.total,
        message: result.message,
      }
    } catch (error) {
      console.error('Erro ao verificar bots de mídia:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async verificarIndividual(botId: string | number, token: string): Promise<{ success: boolean; status?: string; username?: string; statusDetalhe?: string; error?: string }> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      const result = await (window.electron.botMidia as any).verificarIndividual(botId, token)

      return result
    } catch (error) {
      console.error('Erro ao verificar bot individual:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async sincronizar(): Promise<{ success: boolean; botsProcessados?: number; gruposLinkados?: number; categoriasProcessadas?: number; erros?: string[]; error?: string }> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      const result = await (window.electron.botMidia as any).sincronizar()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao sincronizar')
      }

      return result
    } catch (error) {
      console.error('Erro ao sincronizar bots, categorias e grupos:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async updateTipoBot(id: number | string, tipoBot: 'vendas' | 'disparo'): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      const bots = await this.getAll()
      const bot = bots.find((b) => b.id === id || String(b.id) === String(id))

      if (!bot || !bot.arquivoPath) {
        throw new Error('Bot não encontrado ou arquivoPath não disponível')
      }

      const result = await (window.electron.botMidia as any).atualizarTipoBot(bot.arquivoPath, tipoBot)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar tipo do bot')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar tipo do bot:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async updateBot(id: number | string, data: Partial<BotMidia>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electron?.botMidia) {
        throw new Error('Electron API não disponível')
      }

      const bots = await this.getAll()
      const bot = bots.find((b) => b.id === id || String(b.id) === String(id))

      if (!bot || !bot.arquivoPath) {
        throw new Error('Bot não encontrado ou arquivoPath não disponível')
      }

      const result = await (window.electron.botMidia as any).atualizarCompleto(bot.arquivoPath, {
        nome: data.nome || bot.nome,
        token: data.token || bot.token,
        username: data.username || bot.username,
        tipoBot: data.tipoBot || bot.tipoBot,
      })

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar bot')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar bot:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },
}

// ═══════════════════════════════════════════════════
// Serviço de Tags para Bots
// ═══════════════════════════════════════════════════

export interface BotTagData {
  id: string
  nome: string
  cor: string
  createdAt?: string
}

export const botTagsService = {
  /** Carregar todas as tags de bots */
  async carregar(): Promise<BotTagData[]> {
    try {
      if (!(window.electron as any)?.botTags) {
        console.warn('[botTagsService] botTags API não disponível')
        return []
      }
      const result = await (window.electron as any).botTags.carregar()
      return result.success ? result.tags : []
    } catch (error) {
      console.error('[botTagsService] Erro ao carregar tags:', error)
      return []
    }
  },

  /** Criar nova tag */
  async criar(nome: string, cor: string): Promise<{ success: boolean; tag?: BotTagData; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.criar({ nome, cor })
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao criar tag:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  /** Deletar tag */
  async deletar(tagId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.deletar(tagId)
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao deletar tag:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  /** Adicionar tag a um bot */
  async adicionarBot(botId: string, tagId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.adicionarBot(botId, tagId)
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao adicionar tag ao bot:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  /** Remover tag de um bot */
  async removerBot(botId: string, tagId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.removerBot(botId, tagId)
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao remover tag do bot:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  /** Carregar mapa completo botId -> tagIds */
  async mapa(): Promise<Record<string, string[]>> {
    try {
      const result = await (window.electron as any).botTags.mapa()
      return result.success ? result.botTags : {}
    } catch (error) {
      console.error('[botTagsService] Erro ao carregar mapa:', error)
      return {}
    }
  },

  /** Adicionar tag a vários bots */
  async adicionarMassa(botIds: string[], tagId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.adicionarMassa(botIds, tagId)
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao adicionar tag em massa:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  /** Remover tag de vários bots */
  async removerMassa(botIds: string[], tagId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const result = await (window.electron as any).botTags.removerMassa(botIds, tagId)
      return result
    } catch (error) {
      console.error('[botTagsService] Erro ao remover tag em massa:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },
}

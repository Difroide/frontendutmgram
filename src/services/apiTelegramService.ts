interface ApiTelegram {
  id: string
  api_id: string
  api_hash: string
  createdAt: string
}

interface SaveApiResponse {
  success: boolean
  api?: ApiTelegram
  error?: string
}

export const apiTelegramService = {
  async save(apiId: string, apiHash: string): Promise<SaveApiResponse> {
    try {
      if (window.electron?.apiTelegram) {
        const result = await window.electron.apiTelegram.salvar(apiId, apiHash)
        return result || { success: false, error: 'Erro ao salvar' }
      }
      return { success: false, error: 'Electron API não disponível' }
    } catch (error) {
      console.error('Erro ao salvar API Telegram:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },

  async getAll(): Promise<ApiTelegram[]> {
    try {
      if (window.electron?.apiTelegram) {
        const apis = await window.electron.apiTelegram.carregarTodas()
        return apis || []
      }
      return []
    } catch (error) {
      console.error('Erro ao carregar APIs Telegram:', error)
      return []
    }
  },

  async delete(apiId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (window.electron?.apiTelegram) {
        const result = await window.electron.apiTelegram.excluir(apiId)
        return result || { success: false, error: 'Erro ao excluir' }
      }
      return { success: false, error: 'Electron API não disponível' }
    } catch (error) {
      console.error('Erro ao excluir API Telegram:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  },
}


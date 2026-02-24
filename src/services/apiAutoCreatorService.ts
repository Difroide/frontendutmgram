interface CriarApiOptions {
  accountId: string
  appName?: string
}

interface CriarApiResult {
  success: boolean
  apiId?: string
  apiHash?: string
  error?: string
  accountId: string
  appName?: string
  message?: string
  warning?: string
}

interface CriarApisLoteOptions {
  accountIds: string[]
  delayBetweenAccounts?: number
  appName?: string
}

interface CriarApisLoteResult {
  success: boolean
  results?: CriarApiResult[]
  summary?: {
    total: number
    success: number
    errors: number
  }
  error?: string
  canceled?: boolean
  processed?: number
  total?: number
}

interface ProgressoResult {
  isRunning: boolean
  currentAccount: string | null
  processed: number
  total: number
  results: CriarApiResult[]
}

interface CancelarResult {
  success: boolean
  message: string
}

export const apiAutoCreatorService = {
  /**
   * Criar uma API automaticamente para uma conta específica
   */
  async criarApiAutomatica(options: CriarApiOptions): Promise<CriarApiResult> {
    try {
      if (window.electron?.apiAutoCreator) {
        const result = await window.electron.apiAutoCreator.criarApiAutomatica(
          options.accountId,
          options.appName || null
        )
        return result || {
          success: false,
          error: 'Erro ao criar API',
          accountId: options.accountId,
        }
      }
      return {
        success: false,
        error: 'Electron API não disponível',
        accountId: options.accountId,
      }
    } catch (error) {
      console.error('Erro ao criar API automaticamente:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        accountId: options.accountId,
      }
    }
  },

  /**
   * Criar APIs para múltiplas contas em lote
   */
  async criarApisEmLote(options: CriarApisLoteOptions): Promise<CriarApisLoteResult> {
    try {
      if (window.electron?.apiAutoCreator) {
        const result = await window.electron.apiAutoCreator.criarApisEmLote({
          accountIds: options.accountIds,
          delayBetweenAccounts: options.delayBetweenAccounts || 5000,
          appName: options.appName || null,
        })
        return result || {
          success: false,
          error: 'Erro ao criar APIs em lote',
          results: [],
        }
      }
      return {
        success: false,
        error: 'Electron API não disponível',
        results: [],
      }
    } catch (error) {
      console.error('Erro ao criar APIs em lote:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        results: [],
      }
    }
  },

  /**
   * Verificar progresso de criação em lote
   */
  async verificarProgresso(): Promise<ProgressoResult> {
    try {
      if (window.electron?.apiAutoCreator) {
        const result = await window.electron.apiAutoCreator.verificarProgresso()
        return result || {
          isRunning: false,
          currentAccount: null,
          processed: 0,
          total: 0,
          results: [],
        }
      }
      return {
        isRunning: false,
        currentAccount: null,
        processed: 0,
        total: 0,
        results: [],
      }
    } catch (error) {
      console.error('Erro ao verificar progresso:', error)
      return {
        isRunning: false,
        currentAccount: null,
        processed: 0,
        total: 0,
        results: [],
      }
    }
  },

  /**
   * Cancelar processo de criação em lote
   */
  async cancelarCriacao(): Promise<CancelarResult> {
    try {
      if (window.electron?.apiAutoCreator) {
        const result = await window.electron.apiAutoCreator.cancelarCriacao()
        return result || {
          success: false,
          message: 'Erro ao cancelar criação',
        }
      }
      return {
        success: false,
        message: 'Electron API não disponível',
      }
    } catch (error) {
      console.error('Erro ao cancelar criação:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },
}


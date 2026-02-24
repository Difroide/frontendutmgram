import { Conta, Bot } from '@/types/Conta'
import { waitForElectronAPI } from '@/utils/waitForElectron'

// Mock data de bots
export const mockBots: Bot[] = [
  { id: 1, name: 'Bot Instagram 1' },
  { id: 2, name: 'Bot Instagram 2' },
  { id: 3, name: 'Bot Twitter 1' },
  { id: 4, name: 'Bot Facebook 1' },
]

// Declaração do tipo para window.electron
declare global {
  interface Window {
    electron?: {
      telegram?: {
        getContas: () => Promise<Conta[]>
        executarTelegram: (pastaPath: string) => Promise<{ success: boolean; error?: string }>
        excluirNumero: (numero: string) => Promise<{ success: boolean; error?: string }>
        adicionarContas: () => Promise<{ success: boolean; pastasMovidas?: string[]; erros?: string[]; error?: string }>
        verificarContas: (accountIds: string[], tipo?: 'basic' | 'advanced', sessoesParalelas?: number) => Promise<{ success: boolean; results?: any[]; errors?: any[]; totalProcessed?: number; totalErrors?: number; error?: string; logs?: string[] }>
        onVerificarContasProgress: (callback: (data: { current: number; total: number; currentAccount?: string }) => void) => void
        removeVerificarContasProgress: () => void
        getDetalhesConta: (numero: string) => Promise<{ success: boolean; detalhes?: any; error?: string }>
        adicionarListas: (payload: { accountIds: string[]; listName: string }) => Promise<{ success: boolean; totalBotsAdded?: number; details?: any[]; errorsList?: any[]; error?: string }>
        buscarContasParaImportar: () => Promise<{ success: boolean; contasEncontradas?: string[]; error?: string; erros?: string[] }>
        importarContas: (contasParaImportar: string[], tagSelecionada: string | null) => Promise<{ success: boolean; pastasMovidas?: string[]; error?: string; erros?: string[] }>
        transferirContasEntreOps?: (accountNumeros: string[], operacaoDestinoPath: string) => Promise<{ success: boolean; transferidas?: string[]; erros?: string[]; error?: string }>
        buscarSessoesRecursivamente?: (pastaOrigem: string) => Promise<{
          success: boolean
          sessoes?: Array<{ path: string; name: string; folder: string; numero: string }>
          error?: string
        }>
        importarSessoes?: (sessionPaths: string[]) => Promise<{
          success: boolean
          contasImportadas?: string[]
          error?: string
          erros?: string[]
        }>
        importarPastaPortatil?: (pastaOrigem: string) => Promise<{
          success: boolean
          contasImportadas?: string[]
          error?: string
          erros?: string[]
        }>
        baixarLinksMega?: (payload: { urls: string[]; adicionarExtras?: boolean }) => Promise<{
          success: boolean
          sucesso?: number
          erros?: string[]
          error?: string
        }>
        getEstatisticasBotsListas?: () => Promise<{
          success: boolean
          bots?: Array<{
            botUsername: string
            tipos: string[]
            grupos: Array<{
              grupoId: string | number
              grupoNome: string
              contaNumero: string
              membros: number
              linkConvite: string | null
              tipoBot: string
            }>
            totalGrupos: number
            totalContas: number
            contas: string[]
          }>
          error?: string
        }>
        removerBotTodosGrupos?: (botUsername: string) => Promise<{
          success: boolean
          totalContasAtualizadas?: number
          totalGruposAtualizados?: number
          error?: string
        }>
      }
      criador?: {
        carregarNichos: () => Promise<Array<{ id: string; nome: string; createdAt: string }>>
        criarPastaNicho: (nomeNicho: string) => Promise<{ success: boolean; error?: string; message?: string; path?: string }>
        excluirPastaNicho: (nomeNicho: string) => Promise<{ success: boolean; error?: string }>
        salvarNomesGrupos: (nomeNicho: string, packName: string, nomes: string[]) => Promise<{ success: boolean; error?: string; pack?: any }>
        carregarNomesGrupos: (nomeNicho: string) => Promise<any[]>
        carregarTodosPacksNomes: () => Promise<Array<{ id: string; packName: string; nicheName: string; nomes: string[]; createdAt: string }>>
        excluirPackNomes: (nomeNicho: string, packId: string) => Promise<{ success: boolean; error?: string }>
        salvarListaBots: (listName: string, bots: string[]) => Promise<{ success: boolean; error?: string; lista?: any }>
        carregarTodasListas: () => Promise<Array<{ id: string; listName: string; bots: string[]; createdAt: string }>>
        excluirListaBots: (listName: string) => Promise<{ success: boolean; error?: string }>
        atualizarListaBots: (listNameAntigo: string, listNameNovo: string, bots: string[]) => Promise<{ success: boolean; error?: string; lista?: any }>
        carregarCategorias: () => Promise<Array<{ id: string; nome: string; descricao: string; createdAt: string }>>
        criarCategoria: (nome: string, descricao: string) => Promise<{ id: string; nome: string; descricao: string; createdAt: string }>
        deletarCategoria: (categoriaId: string) => Promise<{ success: boolean }>
        atualizarCategoria: (categoriaId: string, updates: { nome?: string; descricao?: string }) => Promise<{ id: string; nome: string; descricao: string; updatedAt: string }>
        carregarNomesCategoria: (categoriaId: string) => Promise<Array<{ id: string; nome: string; nomes: string[]; quantidade: number }>>
        salvarNomesCategoria: (categoriaId: string, nomeArquivo: string, nomes: string[]) => Promise<{ success: boolean }>
      }
      utils?: {
        openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
        saveSmmApiKey: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
        getSmmApiKey: (provider: string) => Promise<{ success: boolean; apiKey?: string | null; error?: string }>
        selecionarPasta?: () => Promise<string | null>
      }
      apiTelegram?: {
        salvar: (apiId: string, apiHash: string) => Promise<{ success: boolean; api?: any; error?: string }>
        carregarTodas: () => Promise<Array<{ id: string; api_id: string; api_hash: string; createdAt: string }>>
        excluir: (apiId: string) => Promise<{ success: boolean; error?: string }>
      }
      botMidia?: {
        salvar: (botNome: string, botToken: string, nichoId: string | null, categoriaId: string | null) => Promise<{ success: boolean; path?: string; error?: string }>
        carregarTodos: () => Promise<Array<{ id?: number; nome: string; token: string; nichoId: string; nichoNome: string; tipo?: string; status?: string; arquivoPath?: string }>>
        atualizar: (arquivoPath: string, botNome: string, botToken: string) => Promise<{ success: boolean; error?: string }>
        excluir: (arquivoPath: string) => Promise<{ success: boolean; error?: string }>
      }
      smm?: {
        verificarPaineis: () => Promise<Array<{ id: string; nome: string; apiKey: string }>>
        obterApiTelegramAtiva: () => Promise<{ id: string; api_id: string; api_hash: string; createdAt: string } | null>
      }
      grupos?: {
        trocarBots?: {
          executar: (payload: {
            accountIds: string[]
            type: string
            botsToRemove?: string[]
            botsToAdd: string[]
            proxyId?: string | null
            maxSessoes?: number
          }) => Promise<{
            success: boolean
            botsRemovidos?: number
            botsAdicionados?: number
            details?: Array<any>
            error?: string
          }>
        }
        criar: (payload: {
          bots: Array<{
            bot: { id: string; botId: string; botUsername?: string; name: string; nicheId: string }
            percentage: number | null
          }>
          groupCount: number
          accountIds: string[]
          autoDeleteTTL: number
          memberProvider?: string | null
          serviceId?: string | null
          memberQuantity?: number | null
          adminUsername?: string | null
        }) => Promise<{
          success: boolean
          successCount?: number
          errorCount?: number
          details?: Array<any>
          errorsList?: Array<{ accountId: string; error: string }>
          error?: string
        }>
      }
      dashboard?: {
        salvarProfile: (profile: { photo: string | null; name: string }) => Promise<{ success: boolean; error?: string }>
        carregarProfile: () => Promise<{ success: boolean; profile?: { photo: string | null; name: string }; error?: string }>
      }
      proxy?: {
        carregarTodos: () => Promise<Array<{ id: number; endereco: string; porta: number; tipo: string; usuario?: string; senha?: string; status: string; ultimaVerificacao?: string; createdAt?: string; updatedAt?: string }>>
        criar: (data: { endereco: string; porta: number; tipo: string; usuario?: string; senha?: string; status?: string }) => Promise<{ success: boolean; error?: string }>
        atualizar: (id: number, data: Partial<{ endereco: string; porta: number; tipo: string; usuario?: string; senha?: string; status: string; ultimaVerificacao?: string }>) => Promise<{ success: boolean; error?: string }>
        excluir: (id: number) => Promise<{ success: boolean; error?: string }>
        verificar: (id: number) => Promise<{ success: boolean; status?: string; error?: string }>
      }
      tags?: {
        carregarTodas: () => Promise<{ success: boolean; tags?: Array<{ id: string; nome: string; cor: string; descricao: string; isSystem?: boolean }>; error?: string }>
        criar: (tagData: { nome: string; cor: string; descricao: string }) => Promise<{ success: boolean; tag?: any; error?: string }>
        atualizar: (tagId: string, updates: { nome?: string; cor?: string; descricao?: string }) => Promise<{ success: boolean; tag?: any; error?: string }>
        deletar: (tagId: string) => Promise<{ success: boolean; error?: string }>
        adicionarConta: (numeroConta: string, tagId: string) => Promise<{ success: boolean; error?: string }>
        removerConta: (numeroConta: string, tagId: string) => Promise<{ success: boolean; error?: string }>
      }
      contingencia?: {
        listarSessoes: (searchDir: string | null) => Promise<{ success: boolean; sessions?: Array<{ path: string; name: string; tag?: string; tagsConta?: string[] }>; error?: string }>
        obterTag: (sessionPath: string) => Promise<{ success: boolean; tag?: string; error?: string }>
        definirTag: (sessionPath: string, tag: string) => Promise<{ success: boolean; error?: string }>
        clonarVIP: (payload: any) => Promise<any>
        verificarVIP: (sessionPath: string) => Promise<boolean>
        verificarVIPsLote: (sessionPaths: string[]) => Promise<Array<{ path: string; isVIP: boolean }>>
        listarTodosGrupos: () => Promise<Array<{ id: string | number; nome: string; membros: number; link: string; contaId: string }>>
      }
      operacoes?: {
        listar: () => Promise<Array<{ nome: string; path: string }>>
        criar: (nome: string) => Promise<{ nome: string; path: string }>
        setAtual: (operacao: { nome: string; path: string }) => Promise<void>
      }
    }
  }
}

export const contaService = {
  async getAll(): Promise<Conta[]> {
    try {
      // Aguardar API do Electron estar disponível
      const isAvailable = await waitForElectronAPI('telegram', 20, 200)
      
      if (isAvailable && window.electron?.telegram) {
        const contas = await window.electron.telegram.getContas()
        return contas
      }
      
      // Fallback se não estiver no Electron (após todas as tentativas)
      console.warn('Electron API não disponível após tentativas, retornando array vazio')
      return []
    } catch (error) {
      console.error('Erro ao carregar contas do Telegram:', error)
      return []
    }
  },

  async getBots(): Promise<Bot[]> {
    return mockBots
  },

  async executarTelegram(pastaPath: string): Promise<void> {
    try {
      if (window.electron?.telegram) {
        const result = await window.electron.telegram.executarTelegram(pastaPath)
        if (!result.success) {
          throw new Error(result.error || 'Erro ao executar Telegram')
        }
      } else {
        console.warn('Electron API não disponível')
      }
    } catch (error) {
      console.error('Erro ao executar Telegram:', error)
      throw error
    }
  },

  async excluirNumero(numero: string): Promise<void> {
    try {
      if (window.electron?.telegram) {
        const result = await window.electron.telegram.excluirNumero(numero)
        if (!result.success) {
          throw new Error(result.error || 'Erro ao excluir número')
        }
      } else {
        console.warn('Electron API não disponível')
      }
    } catch (error) {
      console.error('Erro ao excluir número:', error)
      throw error
    }
  },

  async buscarContasParaImportar(): Promise<{ contasEncontradas: string[]; erros?: string[] }> {
    try {
      if (window.electron?.telegram) {
        const result = await window.electron.telegram.buscarContasParaImportar()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao buscar contas')
        }
        return {
          contasEncontradas: result.contasEncontradas || [],
          erros: result.erros,
        }
      } else {
        console.warn('Electron API não disponível')
        throw new Error('Electron API não disponível')
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
      throw error
    }
  },

  async importarContas(contasParaImportar: string[], tagSelecionada: string | null): Promise<{ pastasMovidas: string[]; erros?: string[] }> {
    try {
      if (window.electron?.telegram) {
        const result = await window.electron.telegram.importarContas(contasParaImportar, tagSelecionada)
        if (!result.success) {
          throw new Error(result.error || 'Erro ao importar contas')
        }
        return {
          pastasMovidas: result.pastasMovidas || [],
          erros: result.erros,
        }
      } else {
        console.warn('Electron API não disponível')
        throw new Error('Electron API não disponível')
      }
    } catch (error) {
      console.error('Erro ao importar contas:', error)
      throw error
    }
  },

}

import type {
  VerificacaoDisparoResult,
  VerificacaoDisparoCategoriaResult,
  VerificacaoDisparoProgress,
} from '@/types/electron'

export const verificadorDisparoSessaoService = {
  async verificarDisparoSessao(accountId: string): Promise<VerificacaoDisparoResult> {
    const api = (window as any).electron?.verificadorDisparo
    if (!api?.verificarDisparoSessao) {
      return { success: false, resultados: [], error: 'API não disponível' }
    }
    const result = await api.verificarDisparoSessao(accountId)
    return result ?? { success: false, resultados: [], error: 'Sem resposta' }
  },

  verificarDisparoSessaoCategoria(
    accountId: string,
    categoriaId: string,
    botUsername: string
  ): Promise<VerificacaoDisparoCategoriaResult> {
    const api = (window as any).electron?.verificadorDisparo
    if (!api?.verificarDisparoSessaoCategoria) {
      return Promise.resolve({
        success: false,
        resultado: null,
        error: 'API não disponível',
      })
    }
    return api.verificarDisparoSessaoCategoria(accountId, categoriaId, botUsername)
  },

  onVerificacaoDisparoProgress(callback: (data: VerificacaoDisparoProgress) => void): void {
    const api = (window as any).electron?.verificadorDisparo
    api?.onVerificacaoDisparoProgress?.(callback)
  },

  removeVerificacaoDisparoProgress(): void {
    const api = (window as any).electron?.verificadorDisparo
    api?.removeVerificacaoDisparoProgress?.()
  },

  onVerificacaoDisparoResultadoCategoria(callback: (resultado: import('@/types/electron').ResultadoVerificacaoDisparoCompleto) => void): void {
    const api = (window as any).electron?.verificadorDisparo
    api?.onVerificacaoDisparoResultadoCategoria?.(callback)
  },

  removeVerificacaoDisparoResultadoCategoria(): void {
    const api = (window as any).electron?.verificadorDisparo
    api?.removeVerificacaoDisparoResultadoCategoria?.()
  },
}

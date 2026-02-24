import type { VerificarMembrosResult, VerificarTodosGruposResult } from '@/types/electron'

export const verificarMembrosService = {
  async verificarGrupos(accountIds: string[]): Promise<VerificarMembrosResult> {
    try {
      if (window.electron?.verificarMembros?.verificarGrupos) {
        const result = await window.electron.verificarMembros.verificarGrupos(accountIds)
        return result || {
          success: false,
          total: 0,
          atualizados: 0,
          erros: 0,
          results: [],
          error: 'Erro ao verificar membros',
        }
      }
      return {
        success: false,
        total: 0,
        atualizados: 0,
        erros: 0,
        results: [],
        error: 'Electron API não disponível',
      }
    } catch (error) {
      console.error('Erro ao verificar membros:', error)
      return {
        success: false,
        total: 0,
        atualizados: 0,
        erros: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async contarGrupos(accountIds: string[]): Promise<{ success: boolean; total: number; error?: string }> {
    try {
      if (window.electron?.verificarMembros?.contarGrupos) {
        const result = await window.electron.verificarMembros.contarGrupos(accountIds)
        return result || { success: false, total: 0 }
      }
      return { success: false, total: 0 }
    } catch (error) {
      return { success: false, total: 0, error: error instanceof Error ? error.message : 'Erro' }
    }
  },

  async verificarTodosGrupos(): Promise<VerificarTodosGruposResult> {
    try {
      if (window.electron?.verificarMembros?.verificarTodosGrupos) {
        const result = await window.electron.verificarMembros.verificarTodosGrupos()
        return result || {
          success: false,
          total: 0,
          atualizados: 0,
          caidos: 0,
          erros: 0,
          results: [],
          error: 'Erro ao verificar grupos',
        }
      }
      return {
        success: false,
        total: 0,
        atualizados: 0,
        caidos: 0,
        erros: 0,
        results: [],
        error: 'Electron API não disponível',
      }
    } catch (error) {
      console.error('Erro ao verificar todos os grupos:', error)
      return {
        success: false,
        total: 0,
        atualizados: 0,
        caidos: 0,
        erros: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  },

  async contarTodosGrupos(): Promise<{ success: boolean; total: number; error?: string }> {
    try {
      if (window.electron?.verificarMembros?.contarTodosGrupos) {
        const result = await window.electron.verificarMembros.contarTodosGrupos()
        return result || { success: false, total: 0 }
      }
      return { success: false, total: 0 }
    } catch (error) {
      return { success: false, total: 0, error: error instanceof Error ? error.message : 'Erro' }
    }
  },
}

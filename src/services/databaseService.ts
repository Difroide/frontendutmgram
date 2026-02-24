/**
 * Serviço para interagir com o banco de dados via Electron IPC
 */

interface TodayStats {
  gruposCriados: number
  automacoesExecutadas: number
  gruposCriadosPorHora: Record<number, number>
  automacoesExecutadasPorHora: Record<number, number>
  contasOnline?: number
  contasCaidas?: number
  gruposOnline?: number
  gruposCriadosHoje?: number
  gruposCaidosHoje?: number
}

interface DailyStats {
  date: string
  gruposCriados: number
  automacoesExecutadas: number
  contasOnline?: number
  contasCaidas?: number
  gruposOnline?: number
  gruposCriadosHoje?: number
  gruposCaidosHoje?: number
}

class DatabaseService {
  /**
   * Obter estatísticas do dia atual
   */
  async getTodayStats(): Promise<TodayStats> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.getTodayStats()
      if (result.success) {
        return result.data
      }
      throw new Error(result.error || 'Erro ao obter estatísticas')
    } catch (error) {
      console.error('[databaseService] Erro ao obter estatísticas do dia:', error)
      return {
        gruposCriados: 0,
        automacoesExecutadas: 0,
        gruposCriadosPorHora: {},
        automacoesExecutadasPorHora: {},
        contasOnline: 0,
        contasCaidas: 0,
      }
    }
  }

  /**
   * Incrementar contador de grupos criados
   */
  async incrementGruposCriados(count: number = 1): Promise<TodayStats> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.incrementGrupos(count)
      if (result.success) {
        return result.data
      }
      throw new Error(result.error || 'Erro ao incrementar grupos')
    } catch (error) {
      console.error('[databaseService] Erro ao incrementar grupos:', error)
      throw error
    }
  }

  /**
   * Incrementar contador de automações executadas
   */
  async incrementAutomacoesExecutadas(count: number = 1): Promise<TodayStats> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.incrementAutomacoes(count)
      if (result.success) {
        return result.data
      }
      throw new Error(result.error || 'Erro ao incrementar automações')
    } catch (error) {
      console.error('[databaseService] Erro ao incrementar automações:', error)
      throw error
    }
  }

  /**
   * Obter estatísticas dos últimos N dias
   */
  async getStatsLastDays(days: number = 7): Promise<DailyStats[]> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.getStatsLastDays(days)
      if (result.success) {
        return result.data
      }
      throw new Error(result.error || 'Erro ao obter estatísticas')
    } catch (error) {
      console.error('[databaseService] Erro ao obter estatísticas dos últimos dias:', error)
      return []
    }
  }

  /**
   * Salvar configuração
   */
  async saveConfig(key: string, value: any): Promise<boolean> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.saveConfig(key, value)
      return result.success
    } catch (error) {
      console.error('[databaseService] Erro ao salvar configuração:', error)
      return false
    }
  }

  /**
   * Obter configuração
   */
  async getConfig(key: string, defaultValue: any = null): Promise<any> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.getConfig(key, defaultValue)
      if (result.success) {
        return result.data
      }
      return defaultValue
    } catch (error) {
      console.error('[databaseService] Erro ao obter configuração:', error)
      return defaultValue
    }
  }

  /**
   * Obter todas as configurações
   */
  async getAllConfig(): Promise<Record<string, any>> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.getAllConfig()
      if (result.success) {
        return result.data
      }
      return {}
    } catch (error) {
      console.error('[databaseService] Erro ao obter todas as configurações:', error)
      return {}
    }
  }

  /**
   * Salvar estatísticas de contas
   */
  async saveAccountStats(contasOnline: number, contasCaidas: number): Promise<boolean> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.saveAccountStats(contasOnline, contasCaidas)
      return result.success
    } catch (error) {
      console.error('[databaseService] Erro ao salvar estatísticas de contas:', error)
      return false
    }
  }

  /**
   * Salvar estatísticas de grupos
   */
  async saveGruposStats(gruposOnline: number, gruposCriadosHoje: number = 0, gruposCaidosHoje: number = 0): Promise<boolean> {
    try {
      if (!(window as any).electron?.database) {
        throw new Error('API Electron não disponível')
      }

      const result = await (window as any).electron.database.saveGruposStats(gruposOnline, gruposCriadosHoje, gruposCaidosHoje)
      return result.success
    } catch (error) {
      console.error('[databaseService] Erro ao salvar estatísticas de grupos:', error)
      return false
    }
  }
}

export const databaseService = new DatabaseService()


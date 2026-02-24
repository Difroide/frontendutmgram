/**
 * Serviço de gerenciamento de logs do sistema
 * 
 * Armazena, filtra e permite exportar logs de todas as operações do sistema
 */

export type LogLevel = 'info' | 'warning' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string // Ex: 'criar-grupos', 'verificar-contas', 'adicionar-listas', etc.
  message: string
  details?: any
  automacaoId?: string // ID da automação relacionada (se houver)
}

class LogService {
  private logs: LogEntry[] = []
  private maxLogs: number = 10000 // Máximo de logs mantidos em memória
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()

  // Gerar ID único
  private generateId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Notificar listeners
  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]))
  }

  // Adicionar log
  addLog(
    level: LogLevel,
    category: string,
    message: string,
    details?: any,
    automacaoId?: string
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      automacaoId,
    }

    this.logs.unshift(logEntry) // Adicionar no início (logs mais recentes primeiro)

    // Limitar quantidade de logs mantidos
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    this.notifyListeners()
  }

  // Obter todos os logs
  getAllLogs(): LogEntry[] {
    return [...this.logs]
  }

  // Filtrar logs
  filterLogs(filters: {
    level?: LogLevel[]
    category?: string[]
    search?: string
    startDate?: Date
    endDate?: Date
    automacaoId?: string
  }): LogEntry[] {
    let filtered = [...this.logs]

    // Filtro por nível
    if (filters.level && filters.level.length > 0) {
      filtered = filtered.filter((log) => filters.level!.includes(log.level))
    }

    // Filtro por categoria
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter((log) => filters.category!.includes(log.category))
    }

    // Filtro por busca (texto)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      )
    }

    // Filtro por data inicial
    if (filters.startDate) {
      filtered = filtered.filter((log) => new Date(log.timestamp) >= filters.startDate!)
    }

    // Filtro por data final
    if (filters.endDate) {
      filtered = filtered.filter((log) => new Date(log.timestamp) <= filters.endDate!)
    }

    // Filtro por automação
    if (filters.automacaoId) {
      filtered = filtered.filter((log) => log.automacaoId === filters.automacaoId)
    }

    return filtered
  }

  // Limpar logs antigos (manter apenas os últimos N)
  clearOldLogs(keepLast: number = 1000): void {
    this.logs = this.logs.slice(0, keepLast)
    this.notifyListeners()
  }

  // Limpar todos os logs
  clearAllLogs(): void {
    this.logs = []
    this.notifyListeners()
  }

  // Exportar logs para texto
  exportLogsAsText(logs?: LogEntry[]): string {
    const logsToExport = logs || this.logs

    return logsToExport
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString('pt-BR')
        const level = log.level.toUpperCase().padEnd(8)
        const category = log.category.padEnd(20)
        const details = log.details ? `\n  Detalhes: ${JSON.stringify(log.details, null, 2)}` : ''
        return `[${timestamp}] ${level} [${category}] ${log.message}${details}`
      })
      .join('\n\n')
  }

  // Exportar logs para JSON
  exportLogsAsJSON(logs?: LogEntry[]): string {
    const logsToExport = logs || this.logs
    return JSON.stringify(logsToExport, null, 2)
  }

  // Inscrever-se em mudanças
  subscribe(callback: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(callback)
    // Notificar imediatamente com o estado atual
    callback([...this.logs])

    // Retornar função de unsubscribe
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Obter categorias únicas
  getCategories(): string[] {
    const categories = new Set<string>()
    this.logs.forEach((log) => categories.add(log.category))
    return Array.from(categories).sort()
  }

  // Obter estatísticas
  getStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    byCategory: Record<string, number>
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        info: 0,
        warning: 0,
        error: 0,
        success: 0,
      } as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
    }

    this.logs.forEach((log) => {
      stats.byLevel[log.level]++
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
    })

    return stats
  }

  // Obter contagem de logs importantes (erros e warnings)
  getImportantLogsCount(): number {
    return this.logs.filter(log => log.level === 'error' || log.level === 'warning').length
  }
}

// Instância singleton
export const logService = new LogService()


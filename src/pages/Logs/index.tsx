import { useState, useEffect, useMemo } from 'react'
import { Search, Download, Filter, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { logService, LogEntry, LogLevel } from '@/services/logService'
import { automacaoService } from '@/services/automacaoService'
import { Automacao } from '@/types/Automacao'

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set(['error', 'warning']))
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [showOnlyErrors, setShowOnlyErrors] = useState(true)

  useEffect(() => {
    // Carregar logs iniciais
    setLogs(logService.getAllLogs())
    setAutomacoes(automacaoService.getAll())

    // Inscrever-se em mudanças
    const unsubscribeLogs = logService.subscribe((newLogs) => {
      setLogs(newLogs)
    })

    const unsubscribeAutomacoes = automacaoService.subscribe((newAutomacoes) => {
      setAutomacoes(newAutomacoes)
    })

    return () => {
      unsubscribeLogs()
      unsubscribeAutomacoes()
    }
  }, [])

  // Obter categorias únicas
  const categories = useMemo(() => logService.getCategories(), [logs])

  // Obter estatísticas
  const stats = useMemo(() => logService.getStats(), [logs])

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    const levelsToFilter = showOnlyErrors 
      ? ['error', 'warning'] 
      : (selectedLevels.size > 0 ? Array.from(selectedLevels) : undefined)
    
    return logService.filterLogs({
      level: levelsToFilter,
      category: selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined,
      search: searchTerm || undefined,
    })
  }, [logs, searchTerm, selectedLevels, selectedCategories, showOnlyErrors])

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleExport = () => {
    const logText = logService.exportLogsAsText(filteredLogs)
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearLogs = () => {
    if (window.confirm('Deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
      logService.clearAllLogs()
    }
  }

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'success':
        return 'text-green-400 bg-green-900/20 border-green-500/30'
      default:
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30'
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Logs do Sistema</h1>
            <p className="text-gray-400 mt-1">Visualize e gerencie logs de todas as operações</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-600/30 backdrop-blur-md border border-red-400/30 text-white rounded-lg hover:bg-red-600/40 hover:border-red-400/50 transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-100">{stats.total}</div>
        </div>
        <div className="bg-blue-900/20 backdrop-blur-md rounded-lg border border-blue-500/30 shadow-lg p-4">
          <div className="text-sm text-blue-400 mb-1">Info</div>
          <div className="text-2xl font-bold text-blue-300">{stats.byLevel.info}</div>
        </div>
        <div className="bg-green-900/20 backdrop-blur-md rounded-lg border border-green-500/30 shadow-lg p-4">
          <div className="text-sm text-green-400 mb-1">Sucesso</div>
          <div className="text-2xl font-bold text-green-300">{stats.byLevel.success}</div>
        </div>
        <div className="bg-yellow-900/20 backdrop-blur-md rounded-lg border border-yellow-500/30 shadow-lg p-4">
          <div className="text-sm text-yellow-400 mb-1">Avisos</div>
          <div className="text-2xl font-bold text-yellow-300">{stats.byLevel.warning}</div>
        </div>
        <div className="bg-red-900/20 backdrop-blur-md rounded-lg border border-red-500/30 shadow-lg p-4">
          <div className="text-sm text-red-400 mb-1">Erros</div>
          <div className="text-2xl font-bold text-red-300">{stats.byLevel.error}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-100">Filtros</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => {
                setShowOnlyErrors(e.target.checked)
                if (e.target.checked) {
                  setSelectedLevels(new Set(['error', 'warning']))
                } else {
                  setSelectedLevels(new Set())
                }
              }}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">Apenas erros e avisos</span>
          </label>
        </div>

        {/* Busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar em logs..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
            />
          </div>
        </div>

        {/* Filtros por nível */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-300 mb-2">Nível</div>
          <div className="flex flex-wrap gap-2">
            {(['info', 'success', 'warning', 'error'] as LogLevel[]).map((level) => {
              const isSelected = selectedLevels.has(level)
              return (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? getLevelColor(level)
                      : 'bg-gray-700/50 border border-gray-600/30 text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getLevelIcon(level)}
                    <span className="capitalize">{level}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros por categoria */}
        {categories.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-300 mb-2">Categoria</div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.map((category) => {
                const isSelected = selectedCategories.has(category)
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-400/30 text-blue-200'
                        : 'bg-gray-700/50 border border-gray-600/30 text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Logs */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg">
        <div className="p-4 border-b border-gray-600/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">
              Logs ({filteredLogs.length})
            </h2>
          </div>
        </div>

        <div className="p-4">
          {filteredLogs.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getLevelColor(log.level)} backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getLevelIcon(log.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">{formatDate(log.timestamp)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-700/50 rounded">
                          {log.category}
                        </span>
                        {log.automacaoId && (
                          <span className="text-xs px-2 py-0.5 bg-purple-600/30 rounded text-purple-200">
                            Automação: {automacoes.find((a) => a.id === log.automacaoId)?.titulo || log.automacaoId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm break-words">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            Detalhes
                          </summary>
                          <pre className="mt-2 p-2 bg-black/20 rounded text-xs font-mono text-gray-300 overflow-x-auto">
                            {JSON.stringify(log.details, (key, value) =>
                              typeof value === 'bigint' ? value.toString() : value
                            , 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Nenhum log encontrado com os filtros aplicados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


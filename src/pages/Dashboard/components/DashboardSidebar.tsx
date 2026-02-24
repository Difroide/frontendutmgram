import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, FileText, AlertCircle, ChevronRight, ChevronLeft, Activity, TrendingUp } from 'lucide-react'
import { automacaoService } from '@/services/automacaoService'
import { Automacao } from '@/types/Automacao'
import { logService } from '@/services/logService'
import { databaseService } from '@/services/databaseService'
import { useTheme } from '@/contexts/ThemeContext'

export const DashboardSidebar = () => {
  const { currentTheme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [logs, setLogs] = useState(logService.getAllLogs())
  const [automacoesExecutadasHoje, setAutomacoesExecutadasHoje] = useState(0)

  useEffect(() => {
    setAutomacoes(automacaoService.getAll())

    const loadAutomacoesExecutadasHoje = async () => {
      try {
        const todayStats = await databaseService.getTodayStats()
        setAutomacoesExecutadasHoje(todayStats.automacoesExecutadas || 0)
      } catch (error) {
        console.warn('[DashboardSidebar] Erro ao carregar automações executadas hoje:', error)
      }
    }

    loadAutomacoesExecutadasHoje()

    const unsubscribeAutomacoes = automacaoService.subscribe((novasAutomacoes) => {
      setAutomacoes(novasAutomacoes)
    })

    const unsubscribeLogs = logService.subscribe((updatedLogs) => {
      setLogs(updatedLogs)
    })

    const interval = setInterval(() => {
      loadAutomacoesExecutadasHoje()
    }, 30000)

    return () => {
      unsubscribeAutomacoes()
      unsubscribeLogs()
      clearInterval(interval)
    }
  }, [])

  const automacoesAtivas = automacoes.filter(
    (a) => a.status === 'pendente' || a.status === 'em-andamento'
  )

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const automacoesConcluidasHoje = automacoes.filter(a => {
    if (a.status !== 'concluida' || !a.dataFim) return false
    const dataFim = new Date(a.dataFim)
    dataFim.setHours(0, 0, 0, 0)
    return dataFim.getTime() === hoje.getTime()
  }).length

  const stats = {
    emAndamento: automacoes.filter(a => a.status === 'em-andamento').length,
    concluidasHoje: automacoesConcluidasHoje,
    comErro: automacoes.filter(a => a.status === 'erro').length,
    totalLogs: logs.length,
    logsErro: logs.filter(log => log.level === 'error').length,
  }

  const logsStats = logService.getStats()

  return (
    <div 
      className={`bg-[#161b22] rounded-xl border border-gray-800 transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-14'
      }`}
      style={{ height: 'fit-content', maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-800 cursor-pointer hover:bg-[#21262d] transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              <h2 className="text-sm font-medium text-gray-300">Resumo</h2>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </>
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500 mx-auto" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* ESTATÍSTICAS */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Estatísticas</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <Activity className="w-4 h-4" style={{ color: currentTheme.colors.primary }} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Em Andamento</p>
                  <p className="text-base font-semibold text-white">{stats.emAndamento}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Automações Hoje</p>
                  <p className="text-base font-semibold text-white">{automacoesExecutadasHoje}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Concluídas Hoje</p>
                  <p className="text-base font-semibold text-white">{stats.concluidasHoje}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <XCircle className="w-4 h-4 text-red-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Com Erro</p>
                  <p className="text-base font-semibold text-white">{stats.comErro}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <FileText className="w-4 h-4 text-blue-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Total de Logs</p>
                  <p className="text-base font-semibold text-white">{logsStats.total}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Logs de Erro</p>
                  <p className="text-base font-semibold text-white">{logsStats.byLevel.error || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* STATUS DO SISTEMA */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Status do Sistema</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d1117]">
                <span className="text-sm text-gray-400">Serviços</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d1117]">
                <span className="text-sm text-gray-400">API</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Conectado
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d1117]">
                <span className="text-sm text-gray-400">Banco de Dados</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ativo
                </span>
              </div>
            </div>
          </div>

          {/* AUTOMAÇÕES EM EXECUÇÃO */}
          {automacoesAtivas.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Em Execução</h3>
              <div className="space-y-2">
                {automacoesAtivas.slice(0, 3).map((automacao) => (
                  <div
                    key={automacao.id}
                    className="p-2.5 rounded-lg bg-[#0d1117] border border-gray-800 text-xs"
                  >
                    <p className="text-white font-medium truncate">{automacao.tipo}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {automacao.status === 'em-andamento' ? 'Em andamento...' : 'Pendente'}
                    </p>
                  </div>
                ))}
                {automacoesAtivas.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{automacoesAtivas.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

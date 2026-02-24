import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react'
import { LogEntry, LogLevel } from '@/services/logService'

interface SystemLogProps {
  logs: LogEntry[]
  maxItems?: number
}

const getLogIcon = (level: LogLevel) => {
  switch (level) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400" />
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-amber-400" />
    default:
      return <Info className="w-4 h-4 text-blue-400" />
  }
}

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date()
  const logTime = new Date(timestamp)
  const diffMs = now.getTime() - logTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  return `${diffDays}d`
}

export const SystemLog = ({ logs, maxItems = 10 }: SystemLogProps) => {
  const recentLogs = logs.slice(0, maxItems)

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">Log de Sistema</h2>
      
      <div className="space-y-2">
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Nenhuma atividade recente</p>
          </div>
        ) : (
          recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors"
            >
              {/* Ícone de status */}
              <div className="flex-shrink-0">
                {getLogIcon(log.level)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {log.message}
                </p>
                {log.category && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.category}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-xs text-gray-500">
                {formatTimeAgo(log.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

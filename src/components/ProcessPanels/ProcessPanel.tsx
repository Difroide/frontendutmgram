import { Clock, Users, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react'
import { ProcessInfo } from './ProcessPanelsContainer'

interface ProcessPanelProps {
  process: ProcessInfo
  minimized: boolean
  onMinimize: () => void
  onClose: () => void
}

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const getStatusColor = (status: ProcessInfo['status']) => {
  switch (status) {
    case 'running':
      return 'border-blue-500 bg-blue-500/10'
    case 'completed':
      return 'border-green-500 bg-green-500/10'
    case 'error':
      return 'border-red-500 bg-red-500/10'
    case 'paused':
      return 'border-yellow-500 bg-yellow-500/10'
    default:
      return 'border-gray-500 bg-gray-500/10'
  }
}

const getStatusIcon = (status: ProcessInfo['status']) => {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400" />
    case 'paused':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    default:
      return null
  }
}

export const ProcessPanel = ({ process, minimized, onMinimize, onClose }: ProcessPanelProps) => {
  const progressPercentage = process.progress.total > 0 
    ? (process.progress.completed / process.progress.total) * 100 
    : 0

  return (
    <div className={`bg-gray-800/95 backdrop-blur-md rounded-lg border-2 ${getStatusColor(process.status)} shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon(process.status)}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-100 truncate">{process.title}</h3>
            <p className="text-xs text-gray-400 capitalize">{process.type.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            title={minimized ? 'Expandir' : 'Minimizar'}
          >
            {minimized ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Progress Bar */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">
                {process.progress.completed} / {process.progress.total}
              </span>
              <span className="text-gray-400">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  process.status === 'completed'
                    ? 'bg-green-500'
                    : process.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {process.progress.current && (
              <p className="text-xs text-gray-400 truncate">Processando: {process.progress.current}</p>
            )}
          </div>

          {/* Stats */}
          <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Tempo: {formatTime(process.stats.elapsedTime)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Estimado: {formatTime(process.stats.estimatedTimeRemaining)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <Users className="w-3 h-3 text-green-400" />
                <span>Workers: {process.stats.activeWorkers}</span>
              </div>
              {process.stats.errors > 0 && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <XCircle className="w-3 h-3" />
                  <span>Erros: {process.stats.errors}</span>
                </div>
              )}
            </div>
            
            {process.stats.averageTimePerItem > 0 && (
              <div className="text-xs text-gray-400">
                Tempo médio por item: {formatTime(process.stats.averageTimePerItem)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


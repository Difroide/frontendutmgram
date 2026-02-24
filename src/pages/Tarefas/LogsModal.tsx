import { X } from 'lucide-react'

interface LogsModalProps {
  isOpen: boolean
  onClose: () => void
  titulo: string
  logs: string[]
  erro?: string
}

export const LogsModal = ({ isOpen, onClose, titulo, logs, erro }: LogsModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg border border-gray-600/30 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600/30">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">{titulo}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {erro ? 'Logs do terminal e detalhes do erro' : 'Logs do terminal da execução'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Erro destacado */}
          {erro && (
            <div className="p-4 bg-red-900/20 border-b border-red-500/30">
              <h3 className="text-sm font-semibold text-red-300 mb-2">Erro:</h3>
              <p className="text-sm text-red-200 font-mono">{erro}</p>
            </div>
          )}

          {/* Logs */}
          <div className="flex-1 overflow-auto p-6">
            {logs && logs.length > 0 ? (
              <div className="space-y-1 font-mono text-sm">
                {logs.map((log, index) => {
                  // Detectar tipo de log pela cor
                  let logColor = 'text-gray-300'
                  if (log.includes('[ERROR]')) {
                    logColor = 'text-red-400'
                  } else if (log.includes('[WARN]')) {
                    logColor = 'text-yellow-400'
                  } else if (log.includes('[INFO]')) {
                    logColor = 'text-blue-400'
                  }

                  return (
                    <div key={index} className={`${logColor} whitespace-pre-wrap break-words`}>
                      {log}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p>Nenhum log disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}


import { Trash2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface ApiTelegram {
  id: string
  api_id: string
  api_hash: string
  createdAt: string
  createdBy?: string | null // ID da sessão que criou a API
}

interface ApiTelegramListProps {
  apis: ApiTelegram[]
  onDelete: (id: string) => void
}

export const ApiTelegramList = ({ apis, onDelete }: ApiTelegramListProps) => {
  const [visibleHashes, setVisibleHashes] = useState<Set<string>>(new Set())

  const toggleVisibility = (id: string) => {
    setVisibleHashes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const maskHash = (hash: string) => {
    if (hash.length <= 8) return '••••••••'
    return hash.substring(0, 4) + '••••••••' + hash.substring(hash.length - 4)
  }

  if (apis.length === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6">
        <p className="text-gray-400 text-center">Nenhuma API salva ainda</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-all w-full">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">APIs Salvas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apis.map((api, index) => {
          const isHashVisible = visibleHashes.has(api.id)
          // Garantir que temos uma key única (usar id ou index como fallback)
          const uniqueKey = api.id || `api-${index}`
          return (
            <div
              key={uniqueKey}
              className="bg-gray-700/30 backdrop-blur-sm border border-gray-600/20 rounded-lg p-4 hover:bg-gray-700/40 transition-all h-full"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="text-xs text-gray-400">API ID:</span>
                    <p className="text-sm font-mono text-gray-200 mt-1">{api.api_id}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">API Hash:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono text-gray-200">
                        {isHashVisible ? api.api_hash : maskHash(api.api_hash)}
                      </p>
                      <button
                        onClick={() => toggleVisibility(api.id)}
                        className="p-1 hover:bg-gray-600/30 rounded transition-colors"
                        title={isHashVisible ? 'Ocultar' : 'Mostrar'}
                      >
                        {isHashVisible ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-xs text-gray-500">
                      Criado em: {formatDate(api.createdAt)}
                    </p>
                    {api.createdBy && (
                      <p className="text-xs text-blue-400">
                        Sessão: {api.createdBy}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir esta API?')) {
                      onDelete(api.id)
                    }
                  }}
                  className="p-2 bg-red-600/30 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-lg hover:bg-red-600/40 hover:border-red-400/50 transition-all flex-shrink-0"
                  title="Excluir API"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


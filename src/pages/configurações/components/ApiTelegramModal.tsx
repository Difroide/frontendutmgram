import { X } from 'lucide-react'

interface ApiTelegramModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (apiId: string, apiHash: string) => void
  loading?: boolean
}

export const ApiTelegramModal = ({
  isOpen,
  onClose,
  onSave,
  loading = false,
}: ApiTelegramModalProps) => {
  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const apiId = (formData.get('apiId') as string).trim()
    const apiHash = (formData.get('apiHash') as string).trim()

    if (apiId && apiHash) {
      onSave(apiId, apiHash)
      e.currentTarget.reset()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-600/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Adicionar API Telegram</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start justify-end mb-4">
          <div className="bg-green-500/20 backdrop-blur-md border border-green-400/30 text-green-100 rounded-lg px-3 py-1.5 text-xs shadow-lg whitespace-nowrap">
            <span className="text-green-300 font-semibold">Como obter:</span>{' '}
            Acesse{' '}
            <a
              href="https://my.telegram.org/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-200 font-bold text-green-200"
            >
              my.telegram.org/apps
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API ID
            </label>
            <input
              type="text"
              name="apiId"
              required
              className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
              placeholder="Digite seu API ID"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Hash
            </label>
            <input
              type="password"
              name="apiHash"
              required
              className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
              placeholder="Digite seu API Hash"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 text-gray-300 rounded-lg hover:bg-gray-700/60 hover:border-gray-500/50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


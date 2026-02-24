import { X } from 'lucide-react'
import { ListaBots } from './ListasTab'

interface ViewBotsModalProps {
  isOpen: boolean
  onClose: () => void
  lista: ListaBots | null
}

export const ViewBotsModal = ({ isOpen, onClose, lista }: ViewBotsModalProps) => {
  if (!isOpen || !lista) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">@{lista.listName}</h2>
            <p className="text-sm text-gray-400 mt-1">Bot de Lista Cadastrado</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-700 rounded-lg p-6 text-center">
            <div className="text-2xl font-mono text-gray-100 mb-2">
              @{lista.listName}
            </div>
            {lista.bots && lista.bots.length > 0 && (
              <div className="text-sm text-gray-400 mt-2">
                Bot cadastrado: @{lista.bots[0]}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Esta é uma lista individual. Cada @ cadastrado é uma lista separada.
          </p>
        </div>

        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}


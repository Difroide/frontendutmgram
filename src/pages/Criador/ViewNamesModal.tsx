import { X } from 'lucide-react'
import { PackNomes } from './NomesTab'

interface ViewNamesModalProps {
  isOpen: boolean
  onClose: () => void
  pack: PackNomes | null
}

export const ViewNamesModal = ({ isOpen, onClose, pack }: ViewNamesModalProps) => {
  if (!isOpen || !pack) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">{pack.packName}</h2>
            <p className="text-sm text-gray-400 mt-1">Nicho: {pack.nicheName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {(pack.names || pack.nomes || []).map((name, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gray-600 rounded text-gray-100 text-sm text-center"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2 text-center">
            Total: {(pack.names || pack.nomes || []).length} nomes
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


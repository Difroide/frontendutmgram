import { X } from 'lucide-react'
import { Nicho } from './NichosTab'
import { PackNomes } from './NomesTab'

interface PackNomesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (packName: string, nicheName: string, names: string[]) => void
  nichos: Nicho[]
  pack?: PackNomes | null
  isEdit?: boolean
}

export const PackNomesModal = ({
  isOpen,
  onClose,
  onSave,
  nichos,
  pack,
  isEdit = false,
}: PackNomesModalProps) => {
  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const packName = (formData.get('packName') as string).trim()
    const nicheName = formData.get('niche') as string
    const namesText = (formData.get('names') as string).trim()

    if (!packName || !nicheName) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (!nichos.length) {
      alert('Cadastre um nicho primeiro')
      return
    }

    // Parsear nomes por linhas, removendo linhas vazias e espaços
    const names = namesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (names.length === 0) {
      alert('Adicione pelo menos um nome de grupo')
      return
    }

    onSave(packName, nicheName, names)
    if (!isEdit) {
      e.currentTarget.reset()
    }
  }

  // Preparar valores iniciais para edição
  const initialPackName = pack?.packName || ''
  const initialNicheName = pack?.nicheName || ''
  const initialNames = (pack?.names || pack?.nomes || []).join('\n')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">
            {isEdit ? 'Editar Pack de Nomes' : 'Adicionar Pack de Nomes'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" key={pack?.id || 'new'}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do pack de nomes
            </label>
            <input
              type="text"
              name="packName"
              required
              defaultValue={initialPackName}
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Nomes femininos"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nicho</label>
            {nichos.length === 0 ? (
              <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm">
                Cadastre um nicho primeiro
              </div>
            ) : (
              <select
                name="niche"
                required
                defaultValue={initialNicheName}
                className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar nicho</option>
                {nichos.map((nicho) => (
                  <option key={nicho.id} value={nicho.nome}>
                    {nicho.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Exportar em massa os nomes de grupos
            </label>
            <textarea
              name="names"
              required
              rows={12}
              defaultValue={initialNames}
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
              placeholder="Digite um nome de grupo por linha:&#10;Grupo Marketing&#10;Grupo Vendas&#10;Grupo Suporte&#10;..."
            />
            <p className="text-xs text-gray-400 mt-1">Um nome de grupo por linha</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={nichos.length === 0}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


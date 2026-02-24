import { useState, useEffect } from 'react'
import { Network, CheckCircle, XCircle, RefreshCw, Plus, Trash2, Star } from 'lucide-react'
import { Proxy as ProxyType } from '@/types/Proxy'

interface ProxyTableProps {
  proxies: ProxyType[]
  onEdit: (proxy: ProxyType) => void
  onDelete: (id: number) => void
  onDeleteSelected: (ids: number[]) => void
  onDeleteAll: () => void
  onVerificar: (id: number) => void
  onAdd: () => void
  onSetDefault: (id: number) => void
}

export const ProxyTable = ({ proxies, onEdit, onDelete, onDeleteSelected, onDeleteAll, onVerificar, onAdd, onSetDefault }: ProxyTableProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSelectedIds(new Set())
  }, [proxies])

  const handleSelectAll = () => {
    if (selectedIds.size === proxies.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(proxies.map(p => p.id)))
    }
  }

  const handleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} proxy(ies) selecionado(s)?`)) {
      const idsArray = Array.from(selectedIds)
      await onDeleteSelected(idsArray)
      setSelectedIds(new Set())
    }
  }

  const allSelected = proxies.length > 0 && selectedIds.size === proxies.length

  return (
    <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg border border-gray-600/30 hover:shadow-xl transition-all">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Proxy
          </button>
          
          {proxies.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Selecionados ({selectedIds.size})
                  </button>
                </>
              )}
              
              <button
                onClick={onDeleteAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Todos
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {proxies.map((proxy) => {
            const isSelected = selectedIds.has(proxy.id)
            return (
              <div
                key={proxy.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelect(proxy.id)}
                    className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <div className="p-2 bg-blue-900 rounded-lg">
                    <Network className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-100">
                        {proxy.nome || `${proxy.endereco}:${proxy.porta}`}
                      </p>
                      {proxy.padrao && (
                        <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 text-xs rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {proxy.nome ? `${proxy.endereco}:${proxy.porta}` : ''} {proxy.tipo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {proxy.status === 'Ativo' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-green-300 font-medium">Ativo</span>
                      </>
                    ) : proxy.status === 'Erro' ? (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-sm text-red-300 font-medium">Erro</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-300 font-medium">Inativo</span>
                      </>
                    )}
                  </div>
                  {!proxy.padrao && (
                    <button
                      onClick={() => onSetDefault(proxy.id)}
                      className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                      title="Tornar proxy padrão"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(proxy)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Editar proxy"
                  >
                    <Network className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onVerificar(proxy.id)}
                    className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                    title="Verificar proxy"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja excluir este proxy?')) {
                        onDelete(proxy.id)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Excluir proxy"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


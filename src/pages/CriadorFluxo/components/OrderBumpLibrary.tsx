/**
 * Biblioteca de Order Bumps - Estilo Minimalista
 */

import { useState } from 'react'
import { X, ShoppingCart, Plus, Edit, Copy, Trash2, Check } from 'lucide-react'
import { OrderBumpSalvo, formatCurrency } from '../types/Fluxo'

interface OrderBumpLibraryProps {
  isOpen: boolean
  orderBumps: OrderBumpSalvo[]
  selectedMensagensCount: number
  onClose: () => void
  onCreate: () => void
  onEdit: (orderBump: OrderBumpSalvo) => void
  onDuplicate: (orderBump: OrderBumpSalvo) => void
  onDelete: (id: string) => void
  onApplyToSelected: (orderBump: OrderBumpSalvo) => void
}

export function OrderBumpLibrary({
  isOpen,
  orderBumps,
  selectedMensagensCount,
  onClose,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onApplyToSelected,
}: OrderBumpLibraryProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }
  
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Biblioteca de Order Bumps</h2>
              <p className="text-xs text-gray-500">Gerencie seus Order Bumps e aplique às mensagens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Botão de Criar Novo */}
          <div className="mb-4">
            <button
              onClick={onCreate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0d1117] border border-gray-700 hover:border-gray-600 text-gray-300 rounded-lg hover:bg-[#21262d] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Order Bump
            </button>
          </div>
          
          {/* Info de Seleção */}
          {selectedMensagensCount > 0 && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <span className="font-medium">{selectedMensagensCount}</span> mensagens selecionadas - Clique em "Aplicar" para adicionar o Order Bump
              </p>
            </div>
          )}
          
          {/* Lista de Order Bumps */}
          {orderBumps.length === 0 ? (
            <div className="text-center py-12 bg-[#0d1117] border border-gray-800 rounded-lg">
              <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nenhum Order Bump criado ainda</p>
              <p className="text-gray-600 text-xs mt-1">Clique em "Criar Novo" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {orderBumps.map(ob => (
                <div
                  key={ob.id}
                  className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-200 truncate" title={ob.nome}>
                        {ob.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-base font-semibold text-emerald-500">
                          {formatCurrency(ob.orderBump.value)}
                        </span>
                        {ob.orderBump.enabled && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded">
                            Ativo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Descrição */}
                  <div className="mb-3 p-2 bg-[#161b22] border border-gray-800 rounded text-xs text-gray-500 max-h-[50px] overflow-hidden">
                    {truncateText(ob.orderBump.description || 'Sem descrição', 80)}
                  </div>
                  
                  {/* Info adicional */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    {ob.orderBump.video && (
                      <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">
                        Vídeo
                      </span>
                    )}
                    {ob.orderBump.vipGroups.length > 0 && (
                      <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                        {ob.orderBump.vipGroups.length} grupos
                      </span>
                    )}
                  </div>
                  
                  {/* Botões Aceitar/Recusar */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-center">
                      <span className="text-emerald-400 truncate block text-xs">{ob.orderBump.btnAccept || 'Aceitar'}</span>
                    </div>
                    <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-center">
                      <span className="text-red-400 truncate block text-xs">{ob.orderBump.btnDecline || 'Recusar'}</span>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {selectedMensagensCount > 0 && (
                      <button
                        onClick={() => onApplyToSelected(ob)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aplicar
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(ob)}
                      className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicate(ob)}
                      className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ob.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        confirmDelete === ob.id
                          ? 'bg-red-600 border border-red-500 text-white'
                          : 'bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-red-400'
                      }`}
                      title={confirmDelete === ob.id ? 'Clique para confirmar' : 'Excluir'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-400">{orderBumps.length}</span> Order Bump(s) salvos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

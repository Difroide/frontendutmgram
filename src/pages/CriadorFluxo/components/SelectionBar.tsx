/**
 * Barra de seleção para ações em massa nas mensagens - Estilo Minimalista
 */

import {
  Clock,
  Percent,
  ShoppingCart,
  Trash2,
  Edit,
  X,
} from 'lucide-react'

interface SelectionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onEditFirst: () => void
  onOpenHorarios: () => void
  onOpenDescontoTexto: () => void
  onOpenOrderBump: () => void
  onDeleteSelected: () => void
}

export function SelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onEditFirst,
  onOpenHorarios,
  onOpenDescontoTexto,
  onOpenOrderBump,
  onDeleteSelected,
}: SelectionBarProps) {
  if (selectedCount === 0) return null
  
  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Info de Seleção */}
        <div className="flex items-center gap-3">
          {/* Contagem */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-gray-700 rounded-lg">
            <span className="text-sm font-medium text-gray-200">
              {selectedCount}
            </span>
            <span className="text-sm text-gray-500">
              de {totalCount} selecionadas
            </span>
          </div>
          
          {/* Botões de Seleção */}
          <div className="flex items-center gap-2">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                className="px-3 py-1.5 text-xs bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
              >
                Selecionar Todas
              </button>
            )}
            <button
              onClick={onClearSelection}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
              title="Limpar Seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Separador */}
        <div className="w-px h-6 bg-gray-700" />
        
        {/* Ações em Massa */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <button
            onClick={onOpenHorarios}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border border-gray-700 text-gray-300 hover:bg-[#21262d] hover:border-gray-600 rounded-lg transition-colors text-xs font-medium"
            title="Definir Horários"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            Horários
          </button>
          
          <button
            onClick={onEditFirst}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border border-gray-700 text-gray-300 hover:bg-[#21262d] hover:border-gray-600 rounded-lg transition-colors text-xs font-medium"
            title="Editar Primeira Selecionada"
          >
            <Edit className="w-3.5 h-3.5 text-blue-500" />
            Editar
          </button>
          
          <button
            onClick={onOpenDescontoTexto}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border border-gray-700 text-gray-300 hover:bg-[#21262d] hover:border-gray-600 rounded-lg transition-colors text-xs font-medium"
            title="Aplicar Desconto"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            Desconto
          </button>
          
          <button
            onClick={onOpenOrderBump}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border border-gray-700 text-gray-300 hover:bg-[#21262d] hover:border-gray-600 rounded-lg transition-colors text-xs font-medium"
            title="Biblioteca Order Bump"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-pink-500" />
            Order Bump
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 rounded-lg transition-colors text-xs font-medium"
            title="Excluir Selecionadas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

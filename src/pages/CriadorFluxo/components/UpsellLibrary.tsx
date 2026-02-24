/**
 * Biblioteca de Upsell - Estilo Minimalista
 */

import { useState } from 'react'
import { X, TrendingUp, Plus, Edit, Copy, Trash2, Check } from 'lucide-react'
import { UpsellSalvo } from '../types/Fluxo'
import { criarNomeUpsell } from '../utils/upsellUtils'

interface UpsellLibraryProps {
  isOpen: boolean
  upsells: UpsellSalvo[]
  selectedMensagensCount: number
  totalMensagens?: number
  onClose: () => void
  onCreate: () => void
  onEdit: (upsell: UpsellSalvo) => void
  onDuplicate: (upsell: UpsellSalvo) => void
  onDelete: (id: string) => void
  onApplyToSelected: (upsell: UpsellSalvo) => void
  onApplyToAllFromSecond?: (upsell: UpsellSalvo) => void
}

export function UpsellLibrary({
  isOpen,
  upsells,
  selectedMensagensCount,
  totalMensagens = 0,
  onClose,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onApplyToSelected,
  onApplyToAllFromSecond,
}: UpsellLibraryProps) {
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

  const stripHtml = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
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
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Biblioteca de Upsell</h2>
              <p className="text-xs text-gray-500">Gerencie suas mensagens de Upsell</p>
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
          {/* Criar Novo */}
          <div className="mb-4">
            <button
              onClick={onCreate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0d1117] border border-gray-700 hover:border-gray-600 text-gray-300 rounded-lg hover:bg-[#21262d] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Upsell
            </button>
          </div>

          {selectedMensagensCount > 0 ? (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <span className="font-medium">{selectedMensagensCount}</span> mensagens selecionadas - Clique em "Aplicar"
              </p>
            </div>
          ) : totalMensagens > 1 && onApplyToAllFromSecond ? (
            <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-400">
                Clique em <span className="font-medium">"Aplicar a todas"</span> para adicionar o upsell a todas as mensagens a partir da 2ª (com condição de compra)
              </p>
            </div>
          ) : null}

          {upsells.length === 0 ? (
            <div className="text-center py-12 bg-[#0d1117] border border-gray-800 rounded-lg">
              <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nenhum Upsell criado ainda</p>
              <p className="text-gray-600 text-xs mt-1">Clique em "Criar Novo" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upsells.map(up => {
                const preview = truncateText(stripHtml(up.mensagem.description || ''), 100) || 'Sem descrição'
                const nomeExibicao = up.nome || criarNomeUpsell(up.mensagem)
                return (
                  <div
                    key={up.id}
                    className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-200 truncate" title={nomeExibicao}>
                          {nomeExibicao}
                        </h3>
                        <div className="text-xs text-gray-500 mt-1">
                          {up.mensagem.planos?.length || 0} botão(ões)
                        </div>
                      </div>
                    </div>

                    <div className="mb-3 p-2 bg-[#161b22] border border-gray-800 rounded text-xs text-gray-500 max-h-[50px] overflow-hidden">
                      {preview}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedMensagensCount > 0 ? (
                        <button
                          onClick={() => onApplyToSelected(up)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aplicar ({selectedMensagensCount})
                        </button>
                      ) : onApplyToAllFromSecond && totalMensagens > 1 ? (
                        <button
                          onClick={() => onApplyToAllFromSecond(up)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-xs font-medium"
                          title="Aplica este upsell a todas as mensagens a partir da 2ª (condição de compra)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aplicar a todas ({totalMensagens - 1})
                        </button>
                      ) : null}
                      <button
                        onClick={() => onEdit(up)}
                        className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicate(up)}
                        className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(up.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          confirmDelete === up.id
                            ? 'bg-red-600 border border-red-500 text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-400 hover:text-red-400'
                        }`}
                        title={confirmDelete === up.id ? 'Clique para confirmar' : 'Excluir'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-400">{upsells.length}</span> Upsell(s) salvos
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

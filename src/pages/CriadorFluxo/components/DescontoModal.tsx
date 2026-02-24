/**
 * Modal para aplicar desconto em massa aos planos
 */

import { useState, useMemo } from 'react'
import { X, Percent, Check, ArrowRight } from 'lucide-react'
import { Mensagem, formatCurrency } from '../types/Fluxo'

interface DescontoModalProps {
  isOpen: boolean
  mensagens: Mensagem[]
  selectedIds: Set<number>
  onClose: () => void
  onApply: (mensagemIds: number[], porcentagem: number) => void
  onToggleSelect: (id: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export function DescontoModal({
  isOpen,
  mensagens,
  selectedIds,
  onClose,
  onApply,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: DescontoModalProps) {
  const [porcentagem, setPorcentagem] = useState(10)
  
  // Preview dos valores antes/depois
  const preview = useMemo(() => {
    const fator = 1 - (porcentagem / 100)
    const resultado: Array<{
      mensagemId: number
      posicao: number
      planos: Array<{
        nome: string
        valorAntes: number
        valorDepois: number
      }>
    }> = []
    
    mensagens
      .filter(m => selectedIds.has(m.id))
      .forEach(m => {
        if (m.planos.length > 0) {
          resultado.push({
            mensagemId: m.id,
            posicao: m.posicao + 1,
            planos: m.planos.map(p => ({
              nome: p.name,
              valorAntes: p.value,
              valorDepois: Math.round(p.value * fator * 100) / 100,
            }))
          })
        }
      })
    
    return resultado
  }, [mensagens, selectedIds, porcentagem])
  
  if (!isOpen) return null
  
  const handleApply = () => {
    if (selectedIds.size === 0) {
      alert('Selecione pelo menos uma mensagem')
      return
    }
    onApply(Array.from(selectedIds), porcentagem)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Percent className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Aplicar Desconto</h2>
              <p className="text-xs text-slate-400">Reduza os valores dos planos em porcentagem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input de Porcentagem */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Porcentagem de Desconto
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max="100"
                value={porcentagem}
                onChange={(e) => setPorcentagem(parseInt(e.target.value) || 0)}
                className="w-32 px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              />
              <span className="text-2xl text-yellow-400 font-bold">%</span>
              
              {/* Quick buttons */}
              <div className="flex gap-2">
                {[5, 10, 15, 20, 25, 30].map(p => (
                  <button
                    key={p}
                    onClick={() => setPorcentagem(p)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      porcentagem === p
                        ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Seleção de Mensagens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-300">
                Mensagens Selecionadas ({selectedIds.size}/{mensagens.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={onSelectAll}
                  className="px-3 py-1 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded hover:bg-blue-600/30 transition-all"
                >
                  Selecionar Todas
                </button>
                <button
                  onClick={onDeselectAll}
                  className="px-3 py-1 text-xs bg-slate-800/50 border border-slate-700/50 text-slate-400 rounded hover:bg-slate-800/70 transition-all"
                >
                  Desmarcar
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {mensagens.map(m => (
                <button
                  key={m.id}
                  onClick={() => onToggleSelect(m.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedIds.has(m.id)
                      ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {selectedIds.has(m.id) && <Check className="w-3.5 h-3.5" />}
                  <span>Msg {m.posicao + 1}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Preview das Alterações
              </label>
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
                {preview.map(item => (
                  <div key={item.mensagemId}>
                    <div className="text-xs font-medium text-slate-400 mb-2">
                      Mensagem #{item.posicao}
                    </div>
                    <div className="space-y-1">
                      {item.planos.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400 truncate max-w-[150px]" title={p.nome}>
                            {p.nome.length > 25 ? p.nome.substring(0, 25) + '...' : p.nome}
                          </span>
                          <span className="text-red-400 line-through text-xs">
                            {formatCurrency(p.valorAntes)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-green-400 font-bold">
                            {formatCurrency(p.valorDepois)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-800/70 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 rounded-lg hover:bg-yellow-600/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Percent className="w-4 h-4" />
            Aplicar {porcentagem}% de Desconto
          </button>
        </div>
      </div>
    </div>
  )
}

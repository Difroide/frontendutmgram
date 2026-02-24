/**
 * Modal para adicionar texto extra ao final dos nomes dos planos
 */

import { useState, useMemo } from 'react'
import { X, Type, Check, ArrowRight } from 'lucide-react'
import { Mensagem } from '../types/Fluxo'

interface TextoExtraModalProps {
  isOpen: boolean
  mensagens: Mensagem[]
  selectedIds: Set<number>
  onClose: () => void
  onApply: (mensagemIds: number[], textoExtra: string) => void
  onToggleSelect: (id: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export function TextoExtraModal({
  isOpen,
  mensagens,
  selectedIds,
  onClose,
  onApply,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: TextoExtraModalProps) {
  const [textoExtra, setTextoExtra] = useState('(10% OFF)')
  
  // Preview dos nomes antes/depois
  const preview = useMemo(() => {
    const resultado: Array<{
      mensagemId: number
      posicao: number
      planos: Array<{
        nomeAntes: string
        nomeDepois: string
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
              nomeAntes: p.name,
              nomeDepois: `${p.name} ${textoExtra}`.trim(),
            }))
          })
        }
      })
    
    return resultado
  }, [mensagens, selectedIds, textoExtra])
  
  if (!isOpen) return null
  
  const handleApply = () => {
    if (selectedIds.size === 0) {
      alert('Selecione pelo menos uma mensagem')
      return
    }
    if (!textoExtra.trim()) {
      alert('Digite o texto extra')
      return
    }
    onApply(Array.from(selectedIds), textoExtra.trim())
    onClose()
  }
  
  // Sugestões de texto
  const sugestoes = [
    '(10% OFF)',
    '(20% OFF)',
    '(PROMOÇÃO)',
    '🔥',
    '⭐ DESTAQUE',
    '💎 PREMIUM',
    '🎁 BÔNUS',
    '⏰ OFERTA',
  ]
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Type className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Adicionar Texto Extra</h2>
              <p className="text-xs text-slate-400">Adicione um sufixo ao nome de todos os planos</p>
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
          {/* Input de Texto */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Texto para Adicionar ao Final
            </label>
            <input
              type="text"
              value={textoExtra}
              onChange={(e) => setTextoExtra(e.target.value)}
              placeholder="Ex: (10% OFF)"
              className="w-full px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
            
            {/* Sugestões */}
            <div className="flex flex-wrap gap-2 mt-3">
              {sugestoes.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTextoExtra(s)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    textoExtra === s
                      ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
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
          {preview.length > 0 && textoExtra.trim() && (
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
                    <div className="space-y-2">
                      {item.planos.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-slate-400 text-xs truncate max-w-[200px]" title={p.nomeAntes}>
                            {p.nomeAntes.length > 30 ? p.nomeAntes.substring(0, 30) + '...' : p.nomeAntes}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                          <span className="text-cyan-300 text-xs">
                            {p.nomeDepois.length > 40 ? p.nomeDepois.substring(0, 40) + '...' : p.nomeDepois}
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
            disabled={selectedIds.size === 0 || !textoExtra.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 rounded-lg hover:bg-cyan-600/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Type className="w-4 h-4" />
            Aplicar Texto Extra
          </button>
        </div>
      </div>
    </div>
  )
}

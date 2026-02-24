/**
 * Modal para configurar horários de disparo - Estilo Minimalista
 */

import { useState } from 'react'
import { X, Clock, Check, Plus, AlertTriangle } from 'lucide-react'
import { Mensagem, HORARIOS_PREDEFINIDOS, formatDelay } from '../types/Fluxo'

interface HorarioModalProps {
  isOpen: boolean
  mensagens: Mensagem[]
  selectedIds: Set<number>
  onClose: () => void
  onApplyMultiple: (assignments: Array<{ mensagemId: number, delay: number }>) => void
}

export function HorarioModal({
  isOpen,
  mensagens,
  selectedIds,
  onClose,
  onApplyMultiple,
}: HorarioModalProps) {
  const [selectedHorarios, setSelectedHorarios] = useState<Set<number>>(new Set())
  const [customMinutos, setCustomMinutos] = useState(0)
  const [customSegundos, setCustomSegundos] = useState(0)
  const [customHorarios, setCustomHorarios] = useState<Array<{ label: string, value: number }>>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  
  if (!isOpen) return null
  
  const mensagensSelecionadas = mensagens
    .filter(m => selectedIds.has(m.id) && m.posicao !== 0)
    .sort((a, b) => a.posicao - b.posicao)
  
  const todoHorarios = [...HORARIOS_PREDEFINIDOS, ...customHorarios]
  
  const toggleHorario = (value: number) => {
    const newSet = new Set(selectedHorarios)
    if (newSet.has(value)) {
      newSet.delete(value)
    } else {
      newSet.add(value)
    }
    setSelectedHorarios(newSet)
  }
  
  const handleApply = () => {
    if (mensagensSelecionadas.length === 0) {
      alert('A primeira mensagem sempre é instantânea (0s). Selecione outras mensagens para aplicar horários.')
      return
    }
    
    if (selectedHorarios.size !== mensagensSelecionadas.length) {
      alert(`Selecione exatamente ${mensagensSelecionadas.length} horários para ${mensagensSelecionadas.length} mensagens selecionadas.`)
      return
    }
    
    const horariosOrdenados = Array.from(selectedHorarios).sort((a, b) => a - b)
    
    const assignments = mensagensSelecionadas.map((msg, index) => ({
      mensagemId: msg.id,
      delay: horariosOrdenados[index],
    }))
    
    onApplyMultiple(assignments)
    onClose()
  }
  
  const handleAddCustomHorario = () => {
    const segundos = (customMinutos * 60) + customSegundos
    if (segundos <= 0) {
      alert('O horário deve ser maior que 0')
      return
    }
    
    const label = formatDelay(segundos)
    setCustomHorarios([...customHorarios, { label, value: segundos }])
    setShowAddCustom(false)
    setCustomMinutos(0)
    setCustomSegundos(0)
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Configurar Horários</h2>
              <p className="text-xs text-gray-500">
                {mensagensSelecionadas.length > 0 ? (
                  <>Selecione {mensagensSelecionadas.length} horários para {mensagensSelecionadas.length} mensagens</>
                ) : (
                  <>A primeira mensagem sempre é imediata (0s)</>
                )}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cyan-300">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="text-xs space-y-0.5 text-cyan-400/80 list-disc list-inside">
                <li>A primeira mensagem (#1) sempre é instantânea (0s)</li>
                <li>Selecione {mensagensSelecionadas.length} horários para as mensagens restantes</li>
                <li>Os horários serão ordenados automaticamente</li>
              </ul>
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-4 p-3 bg-[#0d1117] border border-gray-800 rounded-lg">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-gray-400">Horários selecionados:</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                selectedHorarios.size === mensagensSelecionadas.length 
                  ? 'text-emerald-400 bg-emerald-500/10' 
                  : 'text-amber-400 bg-amber-500/10'
              }`}>
                {selectedHorarios.size} / {mensagensSelecionadas.length}
              </span>
            </div>
            {selectedHorarios.size > 0 && (
              <button
                onClick={() => setSelectedHorarios(new Set())}
                className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
          
          {/* Horários Disponíveis */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Selecione os Horários</label>
              <button
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-[#21262d] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#30363d] hover:text-gray-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Personalizado
              </button>
            </div>
            
            {/* Adicionar Custom */}
            {showAddCustom && (
              <div className="flex items-end gap-3 mb-4 p-3 bg-[#0d1117] border border-gray-800 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    value={customMinutos}
                    onChange={(e) => setCustomMinutos(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5">Segundos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSegundos}
                    onChange={(e) => setCustomSegundos(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                  />
                </div>
                <button
                  onClick={handleAddCustomHorario}
                  className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Adicionar
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto p-1">
              {todoHorarios.map((h, i) => {
                const isSelected = selectedHorarios.has(h.value)
                return (
                  <button
                    key={`${h.value}-${i}`}
                    onClick={() => toggleHorario(h.value)}
                    className={`relative px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                        : 'bg-[#21262d] border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {h.label}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Preview */}
          {selectedHorarios.size > 0 && (
            <div className="p-3 bg-[#0d1117] border border-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Preview</h3>
              <div className="space-y-1.5 text-xs">
                {mensagensSelecionadas.slice(0, Math.min(mensagensSelecionadas.length, selectedHorarios.size)).map((msg, index) => {
                  const horariosOrdenados = Array.from(selectedHorarios).sort((a, b) => a - b)
                  return (
                    <div key={msg.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-800/50 rounded">
                      <span className="text-gray-400">Mensagem #{msg.posicao + 1}</span>
                      <span className="text-cyan-400 font-mono font-medium">
                        {horariosOrdenados[index] !== undefined ? formatDelay(horariosOrdenados[index]) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div className="text-xs">
            {selectedHorarios.size !== mensagensSelecionadas.length && mensagensSelecionadas.length > 0 && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Selecione exatamente {mensagensSelecionadas.length} horários
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={selectedHorarios.size !== mensagensSelecionadas.length || mensagensSelecionadas.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="w-4 h-4" />
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

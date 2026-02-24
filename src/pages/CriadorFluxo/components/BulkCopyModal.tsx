/**
 * Modal para adicionar múltiplas copys - Estilo Minimalista
 */

import { useState, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { Plano } from '../types/Fluxo'

interface BulkCopyModalProps {
  isOpen: boolean
  planosBase: Plano[]
  onClose: () => void
  onAdd: (copys: string[], planosBase?: Plano[]) => void
}

export function BulkCopyModal({
  isOpen,
  planosBase,
  onClose,
  onAdd,
}: BulkCopyModalProps) {
  const [textoCompleto, setTextoCompleto] = useState('')
  const [delimitador, setDelimitador] = useState('---')
  const [usarPlanosBase, setUsarPlanosBase] = useState(true)
  
  const copysProcessadas = useMemo(() => {
    if (!textoCompleto.trim()) return []
    
    const partes = textoCompleto.split(delimitador)
    
    return partes
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }, [textoCompleto, delimitador])
  
  if (!isOpen) return null
  
  const handleAdd = () => {
    if (copysProcessadas.length === 0) {
      alert('Cole pelo menos uma copy')
      return
    }
    
    onAdd(copysProcessadas, usarPlanosBase ? planosBase : undefined)
    setTextoCompleto('')
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-purple-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Adicionar Múltiplas Copys</h2>
              <p className="text-xs text-gray-500">Cole várias copys separadas por um delimitador</p>
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
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Esquerda - Input */}
          <div className="flex-1 p-6 border-r border-gray-800 flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Delimitador
                </label>
                <select
                  value={delimitador}
                  onChange={(e) => setDelimitador(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                >
                  <option value="---">--- (três traços)</option>
                  <option value="===">=== (três iguais)</option>
                  <option value="***">*** (três asteriscos)</option>
                  <option value="\n\n\n">Três linhas em branco</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  id="usarPlanos"
                  checked={usarPlanosBase}
                  onChange={(e) => setUsarPlanosBase(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#21262d] border-gray-600"
                />
                <label htmlFor="usarPlanos" className="text-xs text-gray-400">
                  Copiar planos da primeira mensagem
                </label>
              </div>
            </div>
            
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Cole as Copys Aqui
            </label>
            <textarea
              value={textoCompleto}
              onChange={(e) => setTextoCompleto(e.target.value)}
              className="flex-1 px-3 py-3 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm font-mono focus:outline-none focus:border-gray-600 resize-none placeholder:text-gray-600"
              placeholder={`Cole suas copys aqui, separadas por "${delimitador}"

Exemplo:

Primeira copy aqui...
Com várias linhas...

${delimitador}

Segunda copy aqui...
Também com várias linhas...`}
            />
          </div>
          
          {/* Coluna Direita - Preview */}
          <div className="w-72 p-6 flex flex-col bg-[#0d1117]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Preview</label>
              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                {copysProcessadas.length} msg(ns)
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {copysProcessadas.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm">
                  Cole as copys para ver o preview
                </div>
              ) : (
                copysProcessadas.map((copy, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#161b22] border border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-400">
                        {index + 1}
                      </span>
                      <span className="text-xs text-gray-500">Mensagem</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-3">
                      {copy.substring(0, 150)}{copy.length > 150 ? '...' : ''}
                    </p>
                    {usarPlanosBase && planosBase.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <span className="text-[10px] text-gray-600">
                          {planosBase.length} plano(s)
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Cada copy será criada como uma nova mensagem
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={copysProcessadas.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Adicionar {copysProcessadas.length} Mensagem(ns)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { X, Clock, ListPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'
import { ProxySelector } from '@/components/ProxySelector'

interface AdicionarListasModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (listNames: string[], sessoesParalelas?: number, proxyId?: number | null) => Promise<void>
  selectedContas: Conta[]
  listasBots: Array<{ id: string; listName: string; bots: string[] }>
}

export const AdicionarListasModal = ({ isOpen, onClose, onConfirm, selectedContas, listasBots }: AdicionarListasModalProps) => {
  const [sessoesParalelas, setSessoesParalelas] = useState('1')
  const [proxyId, setProxyId] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isProcessing) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, isProcessing, onClose])

  useEffect(() => {
    if (!isOpen) setIsProcessing(false)
  }, [isOpen])

  if (!isOpen) return null

  const todasListas = listasBots.map((lista) => lista.listName || lista.id).filter(Boolean)

  const handleConfirm = async () => {
    if (todasListas.length === 0) {
      alert('Nenhuma lista cadastrada no sistema')
      return
    }
    setIsProcessing(true)
    try {
      await onConfirm(todasListas, parseInt(sessoesParalelas) || 1, proxyId)
    } catch (error) {
      console.error('Erro ao adicionar listas:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl border border-gray-700 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-100">Adicionar Listas</h2>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-400">
            Adicionar <strong className="text-gray-200">{todasListas.length}</strong> listas em{' '}
            <strong className="text-gray-200">{selectedContas.length}</strong> contas.
          </p>

          {/* Listas */}
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1.5">Listas ({todasListas.length})</label>
            {todasListas.length === 0 ? (
              <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-3 text-center text-xs text-gray-500">Nenhuma lista cadastrada</div>
            ) : (
              <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {todasListas.map((listaName, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-1 bg-[#21262d] rounded border border-gray-700">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-xs font-mono text-gray-300">@{listaName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sessões e Tempo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Sessões Paralelas</label>
              <input
                type="number"
                min="1"
                max={selectedContas.length}
                value={sessoesParalelas}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  setSessoesParalelas(Math.min(value, selectedContas.length).toString())
                }}
                disabled={isProcessing}
                className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
              />
              <p className="text-[10px] text-gray-500 mt-1">Máx: {selectedContas.length}</p>
            </div>
            {parseInt(sessoesParalelas) > 0 && todasListas.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Tempo Estimado</label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-sm text-gray-200">{Math.ceil((selectedContas.length * todasListas.length * 60) / (parseInt(sessoesParalelas) * 60))} min</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {todasListas.length} listas × {selectedContas.length} contas
                </p>
              </div>
            )}
          </div>

          {/* Proxy */}
          <ProxySelector selectedProxyId={proxyId} onSelect={setProxyId} label="Proxy (Opcional)" showDefault={true} disabled={isProcessing} />

          {/* Contas */}
          <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-2">
            <p className="text-xs text-gray-500 mb-1.5">Contas ({selectedContas.length})</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedContas.slice(0, 15).map((conta) => (
                <span key={conta.id} className="text-xs text-gray-400 font-mono px-1.5 py-0.5 bg-[#21262d] rounded">
                  {conta.numero}
                </span>
              ))}
              {selectedContas.length > 15 && <span className="text-xs text-gray-500 px-1.5 py-0.5">+{selectedContas.length - 15}</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-800">
          {!isProcessing ? (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={todasListas.length === 0}
                className="flex-1 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Adicionar ({todasListas.length})
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs text-gray-400 py-1.5">Processando...</div>
          )}
        </div>
      </div>
    </div>
  )
}

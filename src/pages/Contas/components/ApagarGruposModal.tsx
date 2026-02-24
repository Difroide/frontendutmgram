import { X, Layers, Loader2, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'

interface ApagarGruposModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (sessoesParalelas: number) => Promise<void>
  selectedContas: Conta[]
  isProcessing: boolean
}

export const ApagarGruposModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedContas,
  isProcessing,
}: ApagarGruposModalProps) => {
  const [sessoesParalelas, setSessoesParalelas] = useState<number>(3)

  useEffect(() => {
    if (isOpen && selectedContas.length > 0) {
      setSessoesParalelas(Math.min(3, selectedContas.length))
    }
  }, [isOpen, selectedContas.length])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isProcessing) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, isProcessing, onClose])

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm(sessoesParalelas)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <div
        className="w-full max-w-md max-h-[90vh] bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Apagar Grupos</h2>
              <p className="text-xs text-gray-500">
                <span className="text-gray-300 font-medium">{selectedContas.length}</span> conta(s) selecionada(s)
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isProcessing ? (
            <>
              <div className="bg-[#0d1117] border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  A conta vai <strong>SAIR</strong> de todos os grupos onde é admin/dono no Telegram.
                  Se for dona, o grupo será <strong>DELETADO</strong>. Isso permite criar novos grupos depois.
                </p>
              </div>

              {/* Sessões Paralelas */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase">Configurações</h3>
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-500 uppercase">Sessões Paralelas</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={selectedContas.length}
                      value={sessoesParalelas}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1
                        setSessoesParalelas(Math.max(1, Math.min(value, selectedContas.length)))
                      }}
                      className="w-20 px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                      disabled={isProcessing}
                    />
                    <span className="text-xs text-gray-500">de {selectedContas.length}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Número de contas processadas em paralelo
                  </p>
                </div>
              </div>

              {/* Lista de Contas */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <p className="text-xs text-gray-500 uppercase">Contas que terão grupos apagados</p>
                </div>
                <div className="space-y-1">
                  {selectedContas.slice(0, 10).map((conta) => (
                    <div key={conta.id} className="text-xs text-gray-400 font-mono">
                      • {conta.numero}
                    </div>
                  ))}
                  {selectedContas.length > 10 && (
                    <div className="text-xs text-gray-500">... e mais {selectedContas.length - 10}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-200">Apagando grupos...</p>
                <p className="text-xs text-gray-500">Aguarde enquanto as contas são processadas.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

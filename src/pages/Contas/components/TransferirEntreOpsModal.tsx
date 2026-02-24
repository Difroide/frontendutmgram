import { X, ArrowRightLeft, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'
import { useTheme } from '@/contexts/ThemeContext'

interface Operacao {
  nome: string
  path: string
}

interface TransferirEntreOpsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedContas: Conta[]
  operacaoAtual: Operacao | null
  operacoes: Operacao[]
  onConfirm: (accountNumeros: string[], operacaoDestinoPath: string) => Promise<void>
}

export const TransferirEntreOpsModal = ({
  isOpen,
  onClose,
  selectedContas,
  operacaoAtual,
  operacoes,
  onConfirm,
}: TransferirEntreOpsModalProps) => {
  const { currentTheme } = useTheme()
  const [operacaoDestinoPath, setOperacaoDestinoPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const operacoesDestino = operacoes.filter((op) => op.path !== operacaoAtual?.path)

  useEffect(() => {
    if (isOpen) {
      const destinos = operacoes.filter((op) => op.path !== operacaoAtual?.path)
      setOperacaoDestinoPath(destinos[0]?.path ?? '')
      setErrorMsg(null)
      setIsLoading(false)
    }
  }, [isOpen, operacoes, operacaoAtual?.path])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, isLoading, onClose])

  const handleTransferir = async () => {
    if (!operacaoDestinoPath?.trim()) {
      setErrorMsg('Selecione a operação de destino.')
      return
    }
    const accountNumeros = selectedContas.map((c) => c.numero)
    if (accountNumeros.length === 0) {
      setErrorMsg('Nenhuma conta selecionada.')
      return
    }
    setErrorMsg(null)
    setIsLoading(true)
    try {
      await onConfirm(accountNumeros, operacaoDestinoPath)
      onClose()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao transferir contas.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
            Transferir contas para outra operação
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            As contas serão <strong className="text-gray-300">movidas</strong> da operação atual (
            {operacaoAtual?.nome ?? '—'}) para a operação de destino.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Contas selecionadas ({selectedContas.length})
            </label>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-900/50 border border-gray-700 p-2 flex flex-wrap gap-1.5">
              {selectedContas.slice(0, 20).map((c) => (
                <span
                  key={c.id}
                  className="text-xs text-gray-300 font-mono px-2 py-1 bg-gray-700/50 rounded"
                >
                  {c.numero}
                </span>
              ))}
              {selectedContas.length > 20 && (
                <span className="text-xs text-gray-500">+{selectedContas.length - 20} mais</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Operação de destino
            </label>
            <select
              value={operacaoDestinoPath}
              onChange={(e) => setOperacaoDestinoPath(e.target.value)}
              disabled={isLoading || operacoesDestino.length === 0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 disabled:opacity-50"
              style={{ '--tw-ring-color': currentTheme.colors.primary } as React.CSSProperties}
            >
              {operacoesDestino.length === 0 ? (
                <option value="">Nenhuma outra operação disponível</option>
              ) : (
                operacoesDestino.map((op) => (
                  <option key={op.path} value={op.path}>
                    {op.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          {errorMsg && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleTransferir}
            disabled={isLoading || operacoesDestino.length === 0}
            className="flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: currentTheme.colors.primary }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              'Transferir'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

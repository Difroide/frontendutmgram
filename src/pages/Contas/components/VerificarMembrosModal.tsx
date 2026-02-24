import { X, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { verificarMembrosService } from '@/services/verificarMembrosService'

interface Conta {
  numero: string
  id: number
}

interface VerificarMembrosModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onAbrirDetalhesConta?: (numero: string) => void
  selectedAccountIds?: string[]
}

interface ResultadoGrupo {
  grupoId: string
  success: boolean
  membros?: number
  nome?: string
  link_convite?: string
  caido?: boolean
  error?: string
}

export const VerificarMembrosModal = ({
  isOpen,
  onClose,
  onSuccess,
  onAbrirDetalhesConta,
  selectedAccountIds = [],
}: VerificarMembrosModalProps) => {
  const [contas, setContas] = useState<Conta[]>([])
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(new Set())
  const [totalGrupos, setTotalGrupos] = useState<number | null>(null)
  const [isLoadingTotal, setIsLoadingTotal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultado, setResultado] = useState<{
    total: number
    atualizados: number
    erros: number
    results: ResultadoGrupo[]
  } | null>(null)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadContas()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && selectedAccountIds.length > 0 && contas.length > 0) {
      const idsSet = new Set(selectedAccountIds.map(id => id.toString()))
      const toSelect = contas
        .filter(conta => {
          const contaNumero = conta.numero?.toString()
          const contaId = conta.id?.toString()
          return (contaNumero && idsSet.has(contaNumero)) || (contaId && idsSet.has(contaId))
        })
        .map(conta => conta.numero?.toString() || conta.id?.toString())
        .filter(Boolean)
      if (toSelect.length > 0) {
        setContasSelecionadas(new Set(toSelect))
        setMostrarConfirmacao(true)
      }
    } else if (isOpen && selectedAccountIds.length === 0) {
      setContasSelecionadas(new Set())
      setMostrarConfirmacao(false)
    }
  }, [isOpen, selectedAccountIds, contas])

  useEffect(() => {
    if (isOpen && contasSelecionadas.size > 0) {
      loadTotalGrupos()
    } else {
      setTotalGrupos(null)
    }
  }, [isOpen, contasSelecionadas])

  const loadContas = async () => {
    try {
      if (window.electron?.telegram?.getContas) {
        const contasData = await window.electron.telegram.getContas()
        setContas(contasData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    }
  }

  const loadTotalGrupos = async () => {
    const ids = Array.from(contasSelecionadas)
    if (ids.length === 0) return
    setIsLoadingTotal(true)
    try {
      const r = await verificarMembrosService.contarGrupos(ids)
      setTotalGrupos(r.success ? r.total : 0)
    } finally {
      setIsLoadingTotal(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setContasSelecionadas(new Set())
      setTotalGrupos(null)
      setResultado(null)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) handleClose()
  }

  const toggleConta = (contaId: string) => {
    if (isProcessing) return
    const novas = new Set(contasSelecionadas)
    if (novas.has(contaId)) novas.delete(contaId)
    else novas.add(contaId)
    setContasSelecionadas(novas)
  }

  const selecionarTodas = () => {
    if (isProcessing) return
    const numeros = contas.map(c => c.numero?.toString() || c.id?.toString()).filter(Boolean)
    setContasSelecionadas(new Set(numeros))
  }

  const deselecionarTodas = () => {
    if (isProcessing) return
    setContasSelecionadas(new Set())
  }

  const handleVerificar = async () => {
    if (contasSelecionadas.size === 0) {
      alert('Selecione pelo menos uma conta')
      return
    }

    setIsProcessing(true)
    setResultado(null)
    const accountIds = Array.from(contasSelecionadas)

    try {
      const res = await verificarMembrosService.verificarGrupos(accountIds)

      if (res.success) {
        setResultado({
          total: res.total,
          atualizados: res.atualizados,
          erros: res.erros,
          results: res.results || [],
        })
        if (res.atualizados > 0 && onSuccess) onSuccess()
        if (res.atualizados > 0 && accountIds.length > 0 && onAbrirDetalhesConta) {
          onAbrirDetalhesConta(accountIds[0])
        }
      } else {
        alert(`Erro: ${res.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  const contasFiltradas = contas.filter(c => c.numero)

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-gray-800/95 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-500" />
            <h2 className="text-xl font-bold text-gray-100">Verificar Membros dos Grupos</h2>
          </div>
          {!isProcessing && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mostrarConfirmacao && contasSelecionadas.size > 0 && !isProcessing && (
            <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-4">
              <p className="text-sm font-medium text-cyan-300">
                {contasSelecionadas.size} {contasSelecionadas.size === 1 ? 'conta selecionada' : 'contas selecionadas'}
              </p>
              {isLoadingTotal ? (
                <p className="text-xs text-cyan-400/80 mt-1">Carregando grupos...</p>
              ) : totalGrupos !== null ? (
                <p className="text-xs text-cyan-400/80 mt-1">
                  {totalGrupos} grupo(s) serão verificados via navegador (sem proxy, em massa)
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Contas ({contasSelecionadas.size} selecionadas)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selecionarTodas}
                  disabled={isProcessing}
                  className="text-xs px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 rounded disabled:opacity-50"
                >
                  Todas
                </button>
                <button
                  onClick={deselecionarTodas}
                  disabled={isProcessing}
                  className="text-xs px-2 py-1 bg-gray-600/30 hover:bg-gray-600/40 text-gray-300 rounded disabled:opacity-50"
                >
                  Nenhuma
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-700/50 rounded-lg">
              {contasFiltradas.length === 0 ? (
                <div className="p-4 text-center text-gray-400">Nenhuma conta encontrada</div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {contasFiltradas.map(conta => {
                    const contaNumero = conta.numero?.toString() || conta.id?.toString()
                    const isSelected = contasSelecionadas.has(contaNumero)
                    return (
                      <div
                        key={contaNumero}
                        onClick={() => toggleConta(contaNumero)}
                        className={`p-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-600/20 border-l-2 border-cyan-500' : 'hover:bg-gray-700/30'
                        } ${isProcessing ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleConta(contaNumero)}
                            disabled={isProcessing}
                            className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                          />
                          <span className="text-gray-100 font-mono">{conta.numero || contaNumero}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-3 p-4 bg-cyan-600/10 border border-cyan-600/30 rounded-lg">
              <Loader2 className="w-5 h-5 text-cyan-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-cyan-300">Verificando membros dos grupos...</p>
            </div>
          )}

          {resultado && !isProcessing && (
            <div className="space-y-3 p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-300">Total: {resultado.total}</span>
                <span className="text-green-400">Atualizados: {resultado.atualizados}</span>
                <span className="text-red-400">Erros: {resultado.erros}</span>
              </div>
              {resultado.results.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase">Resultados</p>
                  {resultado.results.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-gray-800/50 rounded p-2">
                      {r.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : r.caido ? (
                        <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${r.caido ? 'text-amber-400' : 'text-gray-200'}`}>
                          {r.nome || `Grupo ${r.grupoId}`}
                          {r.caido && ' (caído)'}
                        </p>
                        {r.link_convite && (
                          <p className="text-cyan-400 truncate" title={r.link_convite}>
                            {r.link_convite}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {r.success && r.membros != null && (
                            <span className="text-green-400 font-medium">{r.membros} membros</span>
                          )}
                          {r.caido && (
                            <span className="text-amber-400">SEND MESSAGE / grupo inacessível</span>
                          )}
                          {!r.success && !r.caido && r.error && (
                            <span className="text-red-400">{r.error}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700/50">
          {!isProcessing && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-600/30 hover:bg-gray-600/40 border border-gray-500/30 text-gray-300 rounded-lg transition-all"
              >
                Fechar
              </button>
              <button
                onClick={handleVerificar}
                disabled={contasSelecionadas.size === 0 || totalGrupos === 0}
                className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-400/30 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Verificar Membros {totalGrupos != null && totalGrupos > 0 ? `(${totalGrupos} grupos)` : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

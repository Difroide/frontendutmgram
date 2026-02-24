import { X, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { verificarMembrosService } from '@/services/verificarMembrosService'

interface VerificarTodosGruposModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
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

export const VerificarTodosGruposModal = ({
  isOpen,
  onClose,
  onSuccess,
}: VerificarTodosGruposModalProps) => {
  const [totalGrupos, setTotalGrupos] = useState<number | null>(null)
  const [isLoadingTotal, setIsLoadingTotal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultado, setResultado] = useState<{
    total: number
    atualizados: number
    caidos: number
    erros: number
    results: ResultadoGrupo[]
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTotalGrupos()
    } else {
      setTotalGrupos(null)
      setResultado(null)
    }
  }, [isOpen])

  const loadTotalGrupos = async () => {
    setIsLoadingTotal(true)
    try {
      const r = await verificarMembrosService.contarTodosGrupos()
      setTotalGrupos(r.success ? r.total : 0)
    } finally {
      setIsLoadingTotal(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setTotalGrupos(null)
      setResultado(null)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) handleClose()
  }

  const handleAnalisar = async () => {
    setIsProcessing(true)
    setResultado(null)

    try {
      const res = await verificarMembrosService.verificarTodosGrupos()

      if (res.success) {
        setResultado({
          total: res.total,
          atualizados: res.atualizados,
          caidos: res.caidos,
          erros: res.erros,
          results: res.results || [],
        })
        if (onSuccess) onSuccess()
        window.dispatchEvent(new CustomEvent('verificacao-membros-completa'))
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

  const ativos = resultado ? resultado.total - resultado.caidos - resultado.erros : 0

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-gray-800/95 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-500" />
            <h2 className="text-xl font-bold text-gray-100">Analisar Todos os Grupos</h2>
          </div>
          {!isProcessing && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!resultado && !isProcessing && (
            <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-4">
              <p className="text-sm font-medium text-cyan-300">
                {isLoadingTotal
                  ? 'Carregando...'
                  : totalGrupos !== null
                    ? `${totalGrupos} grupo(s) no sistema serão analisados`
                    : 'Nenhum grupo encontrado'}
              </p>
              <p className="text-xs text-cyan-400/80 mt-1">
                Verifica membros e detecta grupos caídos (SEND MESSAGE) em massa, sem proxy.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 p-4 bg-cyan-600/10 border border-cyan-600/30 rounded-lg">
              <Loader2 className="w-5 h-5 text-cyan-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-cyan-300">Analisando todos os grupos do sistema...</p>
            </div>
          )}

          {resultado && !isProcessing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-xl font-bold text-gray-200">{resultado.total}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-xs text-gray-500 uppercase">Ativos</p>
                  <p className="text-xl font-bold text-green-400">{ativos}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-xs text-gray-500 uppercase">Caídos</p>
                  <p className="text-xl font-bold text-red-400">{resultado.caidos}</p>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="text-xs text-gray-500 uppercase">Erros</p>
                  <p className="text-xl font-bold text-amber-400">{resultado.erros}</p>
                </div>
              </div>

              {resultado.results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Resultados</p>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {resultado.results.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs bg-gray-800/50 rounded p-2">
                        {r.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : r.caido ? (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${r.caido ? 'text-red-400 font-semibold' : 'text-gray-200'}`}>
                            {r.nome || `Grupo ${r.grupoId}`}
                            {r.caido && <span className="ml-2 text-red-500 font-bold">CAIU</span>}
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
                              <span className="text-red-400">SEND MESSAGE / grupo inacessível</span>
                            )}
                            {!r.success && !r.caido && r.error && (
                              <span className="text-amber-400">{r.error}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                onClick={handleAnalisar}
                disabled={totalGrupos === 0 || totalGrupos === null}
                className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-400/30 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Analisar Todos {totalGrupos != null && totalGrupos > 0 ? `(${totalGrupos} grupos)` : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

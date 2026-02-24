import { X, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { apiAutoCreatorService } from '@/services/apiAutoCreatorService'

interface Conta {
  numero: string
  id: number
}

interface CriarApiAutomaticaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  selectedAccountIds?: string[] // IDs de contas para pré-selecionar
}

interface ResultadoConta {
  accountId: string
  success: boolean
  apiId?: string
  apiHash?: string
  error?: string
  message?: string
}

export const CriarApiAutomaticaModal = ({
  isOpen,
  onClose,
  onSuccess,
  selectedAccountIds = [],
}: CriarApiAutomaticaModalProps) => {
  const [contas, setContas] = useState<Conta[]>([])
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(new Set())
  const [appName, setAppName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultados, setResultados] = useState<ResultadoConta[]>([])
  const [progresso, setProgresso] = useState({
    isRunning: false,
    currentAccount: null as string | null,
    processed: 0,
    total: 0,
  })
  const [delayEntreContas, setDelayEntreContas] = useState(5)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)

  // Carregar contas quando modal abre
  useEffect(() => {
    if (isOpen) {
      loadContas()
    }
  }, [isOpen])

  // Pré-selecionar contas se fornecidas
  useEffect(() => {
    if (isOpen && selectedAccountIds.length > 0 && contas.length > 0) {
      const idsSet = new Set(selectedAccountIds.map(id => id.toString()))
      // IMPORTANTE: Usar conta.numero para matching (não conta.id, que é índice sequencial)
      const toSelect = contas
        .filter(conta => {
          // Tentar match com numero primeiro, depois com id (para compatibilidade)
          const contaNumero = conta.numero?.toString()
          const contaId = conta.id?.toString()
          return contaNumero && idsSet.has(contaNumero) || (contaId && idsSet.has(contaId))
        })
        .map(conta => conta.numero?.toString() || conta.id?.toString())
        .filter(Boolean)
      if (toSelect.length > 0) {
        setContasSelecionadas(new Set(toSelect))
        // Mostrar confirmação se houver contas pré-selecionadas
        setMostrarConfirmacao(true)
      }
    } else if (isOpen && selectedAccountIds.length === 0) {
      // Limpar seleção se não houver contas pré-selecionadas
      setContasSelecionadas(new Set())
      setMostrarConfirmacao(false)
    }
  }, [isOpen, selectedAccountIds, contas])

  // Atualizar progresso periodicamente
  useEffect(() => {
    if (isProcessing && progresso.isRunning) {
      progressIntervalRef.current = setInterval(async () => {
        const progress = await apiAutoCreatorService.verificarProgresso()
        setProgresso({
          isRunning: progress.isRunning,
          currentAccount: progress.currentAccount,
          processed: progress.processed,
          total: progress.total,
        })
        setResultados(progress.results || [])
        
        if (!progress.isRunning) {
          setIsProcessing(false)
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
        }
      }, 1000) // Atualizar a cada segundo
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [isProcessing, progresso.isRunning])

  const loadContas = async () => {
    try {
      if (window.electron?.telegram?.getContas) {
        const contasData = await window.electron.telegram.getContas()
        setContas(contasData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      alert('Erro ao carregar contas')
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setContasSelecionadas(new Set())
      setAppName('')
      setResultados([])
      setProgresso({
        isRunning: false,
        currentAccount: null,
        processed: 0,
        total: 0,
      })
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) {
      handleClose()
    }
  }

  const toggleConta = (contaId: string) => {
    if (isProcessing) return

    const novasSelecionadas = new Set(contasSelecionadas)
    if (novasSelecionadas.has(contaId)) {
      novasSelecionadas.delete(contaId)
    } else {
      novasSelecionadas.add(contaId)
    }
    setContasSelecionadas(novasSelecionadas)
  }

  const selecionarTodas = () => {
    if (isProcessing) return
    // IMPORTANTE: Usar conta.numero como identificador (não conta.id, que é índice sequencial)
    const numeros = contas.map(c => c.numero?.toString() || c.id?.toString()).filter(Boolean)
    setContasSelecionadas(new Set(numeros))
  }

  const deselecionarTodas = () => {
    if (isProcessing) return
    setContasSelecionadas(new Set())
  }

  const handleCancelar = async () => {
    if (isProcessing) {
      await apiAutoCreatorService.cancelarCriacao()
    }
  }

  const handleCriar = async () => {
    if (contasSelecionadas.size === 0) {
      alert('Por favor, selecione pelo menos uma conta')
      return
    }

    setIsProcessing(true)
    setResultados([])
    
    const accountIds = Array.from(contasSelecionadas)

    try {
      if (accountIds.length === 1) {
        // Criar uma única API
        const resultado = await apiAutoCreatorService.criarApiAutomatica({
          accountId: accountIds[0],
          appName: appName.trim() || undefined,
        })

        setResultados([resultado])

        if (resultado.success) {
          alert(`API criada com sucesso!\nAPI ID: ${resultado.apiId}`)
          if (onSuccess) {
            onSuccess()
          }
          handleClose()
        } else {
          alert(`Erro ao criar API: ${resultado.error}`)
        }
      } else {
        // Criar múltiplas APIs
        const resultado = await apiAutoCreatorService.criarApisEmLote({
          accountIds,
          delayBetweenAccounts: delayEntreContas * 1000,
          appName: appName.trim() || undefined,
        })

        if (resultado.canceled) {
          alert('Processo cancelado pelo usuário')
        } else if (resultado.success && resultado.results) {
          setResultados(resultado.results)

          const sucessos = resultado.results.filter(r => r.success).length
          const erros = resultado.results.filter(r => !r.success).length

          alert(
            `Processo finalizado!\n` +
            `Sucessos: ${sucessos}\n` +
            `Erros: ${erros}`
          )

          if (sucessos > 0 && onSuccess) {
            onSuccess()
          }

          if (erros === 0) {
            handleClose()
          }
        } else {
          alert(`Erro ao criar APIs: ${resultado.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao criar APIs:', error)
      alert(`Erro ao criar APIs: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsProcessing(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-100">Criar APIs Automaticamente</h2>
          </div>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Mensagem informativa quando há contas pré-selecionadas */}
          {mostrarConfirmacao && contasSelecionadas.size > 0 && !isProcessing && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300 mb-1">
                    {contasSelecionadas.size} {contasSelecionadas.size === 1 ? 'conta selecionada' : 'contas selecionadas'} para criar API
                  </p>
                  <p className="text-xs text-blue-400/80">
                    Clique em "Criar" abaixo para iniciar o processo. Você pode ajustar o nome do app antes de iniciar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nome do App (opcional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Nome do App (opcional)
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              disabled={isProcessing}
              placeholder="Deixe vazio para gerar automaticamente"
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Delay entre contas (apenas para lote) */}
          {contasSelecionadas.size > 1 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Delay entre contas (segundos)
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={delayEntreContas}
                onChange={(e) => setDelayEntreContas(parseInt(e.target.value) || 5)}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* Seleção de contas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Selecionar Contas ({contasSelecionadas.size} selecionadas)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selecionarTodas}
                  disabled={isProcessing}
                  className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 rounded disabled:opacity-50"
                >
                  Selecionar Todas
                </button>
                <button
                  onClick={deselecionarTodas}
                  disabled={isProcessing}
                  className="text-xs px-2 py-1 bg-gray-600/30 hover:bg-gray-600/40 text-gray-300 rounded disabled:opacity-50"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>

            {/* Lista de contas */}
            <div className="max-h-60 overflow-y-auto border border-gray-700/50 rounded-lg">
              {contasFiltradas.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Nenhuma conta encontrada
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {contasFiltradas.map((conta) => {
                    // IMPORTANTE: Usar conta.numero como identificador (não conta.id, que é índice sequencial)
                    // O numero é o nome real da pasta/accountId usado no backend
                    const contaNumero = conta.numero?.toString() || conta.id?.toString()
                    const isSelected = contasSelecionadas.has(contaNumero)
                    const resultado = resultados.find(r => r.accountId === contaNumero)
                    const isCurrent = progresso.currentAccount === contaNumero

                    return (
                      <div
                        key={contaNumero}
                        onClick={() => toggleConta(contaNumero)}
                        className={`p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border-l-2 border-blue-500'
                            : 'hover:bg-gray-700/30'
                        } ${isProcessing ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleConta(contaNumero)}
                              disabled={isProcessing}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-100 font-mono">{conta.numero || contaNumero}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCurrent && (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            )}
                            {resultado?.success && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {resultado && !resultado.success && (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {resultado && (
                          <div className="mt-2 ml-7 text-xs">
                            {resultado.success ? (
                              <span className="text-green-400">
                                API ID: {resultado.apiId}
                              </span>
                            ) : (
                              <span className="text-red-400">{resultado.error}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Progresso */}
          {isProcessing && progresso.total > 0 && (
            <div className="space-y-2 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  Processando: {progresso.processed}/{progresso.total}
                </span>
                {progresso.currentAccount && (
                  <span className="text-blue-400 font-mono">
                    {progresso.currentAccount}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(progresso.processed / progresso.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700/50">
          {isProcessing ? (
            <button
              onClick={handleCancelar}
              className="px-4 py-2 bg-red-600/30 hover:bg-red-600/40 border border-red-400/30 text-red-300 rounded-lg transition-all"
            >
              Cancelar
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-600/30 hover:bg-gray-600/40 border border-gray-500/30 text-gray-300 rounded-lg transition-all"
              >
                Fechar
              </button>
              <button
                onClick={handleCriar}
                disabled={contasSelecionadas.size === 0}
                className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-400/30 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Criar {contasSelecionadas.size > 0 ? `(${contasSelecionadas.size})` : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


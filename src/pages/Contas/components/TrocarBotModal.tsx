import { X, Plus, RefreshCw, ArrowRightLeft, Loader2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'
import { ProxySelector } from '@/components/ProxySelector'

interface BotMidia {
  id: string | number
  name: string
  username?: string
  botUsername?: string
}

interface TrocarBotModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: TrocarBotOptions) => Promise<void>
  selectedContas: Conta[]
  botsMidia: BotMidia[]
  botPreSelecionado?: string | null
}

export interface TrocarBotOptions {
  type: 'adicionar-novo' | 'trocar-antigo'
  botsToRemove?: string[]
  botsToAdd: string[]
  proxyId?: number | null
  maxSessoes?: number
}

export const TrocarBotModal = ({ isOpen, onClose, onConfirm, selectedContas, botsMidia, botPreSelecionado }: TrocarBotModalProps) => {
  const [operationType, setOperationType] = useState<'adicionar-novo' | 'trocar-antigo'>('adicionar-novo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [proxyId, setProxyId] = useState<number | null>(null)
  const [maxSessoes, setMaxSessoes] = useState<number>(3)
  const [botNovo, setBotNovo] = useState<string>('')
  const [botsToRemove, setBotsToRemove] = useState<string[]>([''])
  const [botsToAdd, setBotsToAdd] = useState<string[]>([''])

  useEffect(() => {
    if (isOpen) {
      if (botPreSelecionado) {
        setOperationType('trocar-antigo')
        setBotsToRemove([botPreSelecionado.replace(/^@/, '')])
        setBotsToAdd([''])
      } else {
        setOperationType('adicionar-novo')
        setBotsToRemove([''])
      }
      setBotNovo('')
      setIsProcessing(false)
      setProxyId(null)
      setMaxSessoes(3)
    }
  }, [isOpen, botPreSelecionado])

  const handleConfirm = async () => {
    if (operationType === 'adicionar-novo') {
      if (!botNovo) {
        alert('Selecione o bot a adicionar')
        return
      }
      setIsProcessing(true)
      try {
        await onConfirm({ type: 'adicionar-novo', botsToAdd: [botNovo.replace(/^@/, '')], proxyId, maxSessoes })
        onClose()
      } catch (error) {
        alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      } finally {
        setIsProcessing(false)
      }
    } else {
      const botsRemover = botsToRemove.map((b) => b.trim().replace(/^@/, '')).filter((b) => b.length > 0)
      const botsAdicionar = botsToAdd.map((b) => b.trim().replace(/^@/, '')).filter((b) => b.length > 0)
      if (botsRemover.length === 0) {
        alert('Informe pelo menos um bot para remover')
        return
      }
      if (botsAdicionar.length === 0) {
        alert('Informe pelo menos um bot para adicionar')
        return
      }
      setIsProcessing(true)
      try {
        await onConfirm({ type: 'trocar-antigo', botsToRemove: botsRemover, botsToAdd: botsAdicionar, proxyId, maxSessoes })
        onClose()
      } catch (error) {
        alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const adicionarCampoRemover = () => setBotsToRemove([...botsToRemove, ''])
  const removerCampoRemover = (index: number) => {
    if (botsToRemove.length > 1) setBotsToRemove(botsToRemove.filter((_, i) => i !== index))
  }
  const atualizarCampoRemover = (index: number, value: string) => {
    const novos = [...botsToRemove]
    novos[index] = value
    setBotsToRemove(novos)
  }
  const adicionarCampoAdicionar = () => setBotsToAdd([...botsToAdd, ''])
  const removerCampoAdicionar = (index: number) => {
    if (botsToAdd.length > 1) setBotsToAdd(botsToAdd.filter((_, i) => i !== index))
  }
  const atualizarCampoAdicionar = (index: number, value: string) => {
    const novos = [...botsToAdd]
    novos[index] = value
    setBotsToAdd(novos)
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isProcessing) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, isProcessing, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl border border-gray-700 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-100">Gerenciar Bots</h2>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-2">
            <p className="text-sm text-gray-400">
              <strong className="text-gray-200">{selectedContas.length}</strong> conta(s) selecionada(s)
            </p>
          </div>

          {/* Tipo de operação */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOperationType('adicionar-novo')}
              disabled={isProcessing}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                operationType === 'adicionar-novo' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'bg-[#0d1117] border-gray-700 text-gray-400 hover:border-gray-600'
              } disabled:opacity-50`}
            >
              <Plus className="w-4 h-4 mx-auto mb-1" />
              Adicionar Novo
            </button>
            <button
              onClick={() => setOperationType('trocar-antigo')}
              disabled={isProcessing}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                operationType === 'trocar-antigo' ? 'bg-red-600/20 border-red-500/50 text-red-300' : 'bg-[#0d1117] border-gray-700 text-gray-400 hover:border-gray-600'
              } disabled:opacity-50`}
            >
              <RefreshCw className="w-4 h-4 mx-auto mb-1" />
              Trocar Antigo
            </button>
          </div>

          {/* Adicionar Bot Novo */}
          {operationType === 'adicionar-novo' && (
            <div className="space-y-3">
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2">
                <p className="text-xs text-gray-300">Limpa bots banidos e adiciona o novo bot.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Bot a Adicionar</label>
                <input
                  type="text"
                  value={botNovo}
                  onChange={(e) => setBotNovo(e.target.value)}
                  disabled={isProcessing}
                  placeholder="@bot_username"
                  className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
                />
                <select
                  value={botNovo}
                  onChange={(e) => setBotNovo(e.target.value)}
                  disabled={isProcessing}
                  className="w-full mt-2 px-3 py-2 bg-[#0d1117] text-gray-300 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
                >
                  <option value="">Selecione da lista</option>
                  {botsMidia.map((bot) => (
                    <option key={bot.id} value={bot.botUsername || bot.name}>
                      @{bot.botUsername || bot.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Trocar Bot Antigo */}
          {operationType === 'trocar-antigo' && (
            <div className="space-y-3">
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                <p className="text-xs text-gray-300">Informe quais bots remover e quais adicionar.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Bots a REMOVER</label>
                <div className="space-y-1.5">
                  {botsToRemove.map((bot, index) => (
                    <div key={index} className="flex gap-1.5">
                      <input
                        type="text"
                        value={bot}
                        onChange={(e) => atualizarCampoRemover(index, e.target.value)}
                        disabled={isProcessing}
                        placeholder="@bot_username"
                        className="flex-1 px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
                      />
                      {botsToRemove.length > 1 && (
                        <button
                          onClick={() => removerCampoRemover(index)}
                          disabled={isProcessing}
                          className="px-2 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={adicionarCampoRemover}
                    disabled={isProcessing}
                    className="w-full px-3 py-1.5 bg-[#21262d] border border-gray-700 text-gray-400 text-xs rounded-lg hover:bg-[#30363d] disabled:opacity-50"
                  >
                    + Adicionar mais
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Bots a ADICIONAR</label>
                <div className="space-y-1.5">
                  {botsToAdd.map((bot, index) => (
                    <div key={index} className="flex gap-1.5">
                      <input
                        type="text"
                        value={bot}
                        onChange={(e) => atualizarCampoAdicionar(index, e.target.value)}
                        disabled={isProcessing}
                        placeholder="@bot_username"
                        className="flex-1 px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
                      />
                      {botsToAdd.length > 1 && (
                        <button
                          onClick={() => removerCampoAdicionar(index)}
                          disabled={isProcessing}
                          className="px-2 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={adicionarCampoAdicionar}
                    disabled={isProcessing}
                    className="w-full px-3 py-1.5 bg-[#21262d] border border-gray-700 text-gray-400 text-xs rounded-lg hover:bg-[#30363d] disabled:opacity-50"
                  >
                    + Adicionar mais
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configurações */}
          <div className="pt-3 border-t border-gray-800 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Sessões Paralelas</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxSessoes}
                onChange={(e) => setMaxSessoes(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                disabled={isProcessing}
                className="w-20 px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 disabled:opacity-50"
              />
            </div>
            <ProxySelector selectedProxyId={proxyId} onSelect={setProxyId} label="Proxy (Opcional)" showDefault={true} disabled={isProcessing} />
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
                disabled={(operationType === 'adicionar-novo' && !botNovo) || (operationType === 'trocar-antigo' && (botsToRemove.every((b) => !b.trim()) || botsToAdd.every((b) => !b.trim())))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                  operationType === 'adicionar-novo' ? 'bg-[#238636] hover:bg-[#2ea043] text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {operationType === 'adicionar-novo' ? (
                  <>
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Trocar
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {operationType === 'adicionar-novo' ? 'Adicionando...' : 'Trocando...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { X, Loader2, Shield, Search, Clock, Users, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'
import { ProxySelector } from '@/components/ProxySelector'
import { VerificationGroup } from './VerificationGroup'

export type VerificationOption = 'syncGroups' | 'verifyForUse' | 'configurarContaNova' | 'listGroups' | 'updateMembers' | 'detectBannedFrozen' | 'updateBots' | 'checkGroupsOnline' | 'checkBotFatherBots' | 'detectSpam' | 'detectFrozen' | 'testChannel'

export interface VerificationOptionConfig {
  id: VerificationOption
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'basic' | 'advanced'
}

const VERIFICATION_OPTIONS: VerificationOptionConfig[] = [
  { id: 'syncGroups', label: 'Verificar grupos da sessão', description: 'Lista grupos admin, atualiza membros/bots e remove grupos offline', icon: Users, category: 'basic' },
  { id: 'verifyForUse', label: 'Verificar para Uso', description: 'Banida/congelada, SPAM, BotFather e criação de canal', icon: Shield, category: 'basic' },
  { id: 'configurarContaNova', label: 'Conta nova', description: 'Configura nome, 2FA, foto, privacidade máxima e username', icon: UserPlus, category: 'basic' },
]

interface VerificarContasModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: VerificationOption[], sessoesParalelas: number, proxyId?: number | null) => Promise<void>
  selectedContas: Conta[]
  isVerifying: boolean
  progress?: {
    current: number
    total: number
    currentAccount?: string
    activeWorkers?: number
    averageTime?: number
    estimatedTimeRemaining?: number
    queueLength?: number
  }
}

export const VerificarContasModal = ({ isOpen, onClose, onConfirm, selectedContas, isVerifying, progress }: VerificarContasModalProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Set<VerificationOption>>(new Set())
  const [sessoesParalelas, setSessoesParalelas] = useState<number>(1)
  const [proxyId, setProxyId] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedOptions(new Set())
      setSessoesParalelas(1)
      setProxyId(null)
    }
  }, [isOpen])

  const toggleOption = (optionId: VerificationOption) => {
    setSelectedOptions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(optionId)) newSet.delete(optionId)
      else newSet.add(optionId)
      return newSet
    })
  }

  const selectAllBasic = () => {
    const basicOptions = VERIFICATION_OPTIONS.filter((opt) => opt.category === 'basic').map((opt) => opt.id)
    setSelectedOptions((prev) => {
      const newSet = new Set(prev)
      const allBasicSelected = basicOptions.every((opt) => newSet.has(opt))
      if (allBasicSelected) basicOptions.forEach((opt) => newSet.delete(opt))
      else basicOptions.forEach((opt) => newSet.add(opt))
      return newSet
    })
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isVerifying) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, isVerifying, onClose])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (selectedOptions.size > 0) await onConfirm(Array.from(selectedOptions), sessoesParalelas, proxyId)
  }

  const estimatedTime = progress?.estimatedTimeRemaining ? Math.round(progress.estimatedTimeRemaining / 1000) : null
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#161b22] rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Verificar Contas</h2>
              <p className="text-xs text-gray-500">
                <span className="text-gray-300 font-medium">{selectedContas.length}</span> contas selecionadas
              </p>
            </div>
          </div>
          {!isVerifying && (
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isVerifying ? (
            <>
              <VerificationGroup
                title="Verificações"
                icon={Search}
                options={VERIFICATION_OPTIONS.filter((opt) => opt.category === 'basic')}
                selectedOptions={selectedOptions}
                onToggleOption={toggleOption}
                onSelectAll={selectAllBasic}
                disabled={isVerifying}
                accentColor="blue"
              />

              <div className="h-px bg-gray-800" />

              {/* Configurações */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase">Configurações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        disabled={isVerifying}
                      />
                      <span className="text-xs text-gray-500">de {selectedContas.length}</span>
                    </div>
                  </div>
                  <div>
                    <ProxySelector selectedProxyId={proxyId} onSelect={setProxyId} label="Proxy (Opcional)" showDefault={true} disabled={isVerifying} />
                  </div>
                </div>

                {/* Lista de Contas */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-3 max-h-24 overflow-y-auto">
                  <p className="text-xs text-gray-500 uppercase mb-2">Contas</p>
                  <div className="space-y-1">
                    {selectedContas.slice(0, 5).map((conta) => (
                      <div key={conta.id} className="text-xs text-gray-400 font-mono">
                        • {conta.numero}
                      </div>
                    ))}
                    {selectedContas.length > 5 && <div className="text-xs text-gray-500">... e mais {selectedContas.length - 5}</div>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-200">Executando {selectedOptions.size} verificação(ões)...</p>
                  <p className="text-xs text-gray-500">Aguarde, isso pode levar alguns minutos.</p>
                </div>
              </div>
              {progress && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Progresso: <span className="text-gray-200">{progress.current}</span>/<span className="text-gray-200">{progress.total}</span>
                      </span>
                      <span className="text-gray-200 font-medium">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#0d1117] rounded-full h-2 overflow-hidden border border-gray-800">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {progress.activeWorkers !== undefined && (
                      <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-2">
                        <span className="text-[10px] text-gray-500 uppercase block mb-0.5">Workers</span>
                        <span className="text-sm text-gray-200 font-medium">{progress.activeWorkers}</span>
                      </div>
                    )}
                    {progress.averageTime !== undefined && progress.averageTime > 0 && (
                      <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-2">
                        <span className="text-[10px] text-gray-500 uppercase block mb-0.5">Tempo Médio</span>
                        <span className="text-sm text-gray-200 font-medium">{formatTime(Math.round(progress.averageTime / 1000))}</span>
                      </div>
                    )}
                    {estimatedTime !== null && estimatedTime > 0 && (
                      <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-sm text-gray-200 font-medium">{formatTime(estimatedTime)}</span>
                      </div>
                    )}
                  </div>
                  {progress.currentAccount && (
                    <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-2">
                      <p className="text-[10px] text-gray-500 uppercase mb-0.5">Verificando</p>
                      <p className="text-xs text-gray-200 font-mono">{progress.currentAccount}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-800">
          {!isVerifying ? (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedOptions.size === 0}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectedOptions.size > 0 ? 'bg-[#238636] hover:bg-[#2ea043] text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {selectedOptions.size > 0 ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Iniciar ({selectedOptions.size})
                  </>
                ) : (
                  'Selecione uma opção'
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Executando verificação...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

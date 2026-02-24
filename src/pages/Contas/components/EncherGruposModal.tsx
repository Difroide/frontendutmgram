import { X, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'

interface PainelSMM {
  id: string
  nome: string
  apiKey: string
}

interface EncherGruposModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (
    data: {
      painelSMM: string
      codigoServico: string
      quantidadeMembros: number
    },
    contasSelecionadasNoModal?: Conta[]
  ) => void
  selectedContas: Conta[]
}

export const EncherGruposModal = ({ isOpen, onClose, onConfirm, selectedContas }: EncherGruposModalProps) => {
  const [painelSMM, setPainelSMM] = useState<string>('Nenhum')
  const [paineisSMM, setPaineisSMM] = useState<PainelSMM[]>([])
  const [codigoServico, setCodigoServico] = useState('')
  const [quantidadeMembros, setQuantidadeMembros] = useState('100')

  const loadPaineisSMM = async () => {
    try {
      if ((window as any).electron?.smm) {
        const paineis = await (window as any).electron.smm.verificarPaineis()
        setPaineisSMM(paineis || [])
      }
    } catch (error) {
      console.error('[EncherGruposModal] Erro ao carregar painéis SMM:', error)
      setPaineisSMM([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPaineisSMM()
    } else {
      setPainelSMM('Nenhum')
      setCodigoServico('')
      setQuantidadeMembros('100')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, onClose])

  const handleConfirm = () => {
    if (painelSMM === 'Nenhum') {
      alert('Selecione um painel SMM')
      return
    }
    if (!codigoServico.trim()) {
      alert('Informe o código do serviço')
      return
    }
    const quantidade = parseInt(quantidadeMembros, 10)
    if (isNaN(quantidade) || quantidade <= 0) {
      alert('Informe uma quantidade válida')
      return
    }
    onConfirm({ painelSMM, codigoServico: codigoServico.trim(), quantidadeMembros: quantidade }, selectedContas)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-md"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-100">Encher Grupos</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-200">{selectedContas.length}</strong> conta(s) selecionada(s)
          </p>

          {/* Contas */}
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1.5">Números ({selectedContas.length})</label>
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-2 max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {selectedContas.map((conta) => (
                  <span key={conta.id} className="px-2 py-1 bg-[#21262d] text-gray-300 text-xs rounded">
                    {conta.numero}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Painel SMM */}
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1.5">Painel SMM *</label>
            <select
              value={painelSMM}
              onChange={(e) => {
                setPainelSMM(e.target.value)
                if (e.target.value === 'Nenhum') {
                  setCodigoServico('')
                  setQuantidadeMembros('100')
                }
              }}
              className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
            >
              <option value="Nenhum">Selecione um painel</option>
              {paineisSMM.map((painel) => (
                <option key={painel.id} value={painel.id}>
                  {painel.nome}
                </option>
              ))}
            </select>
            {paineisSMM.length === 0 && <p className="text-[10px] text-gray-500 mt-1">Nenhum painel configurado. Configure em Configurações.</p>}
            {painelSMM !== 'Nenhum' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Código do Serviço *</label>
                  <input
                    type="text"
                    value={codigoServico}
                    onChange={(e) => setCodigoServico(e.target.value)}
                    placeholder="12345"
                    className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qtd Membros *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantidadeMembros}
                    onChange={(e) => setQuantidadeMembros(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Editor de Upsell - Estilo Minimalista
 */

import { useEffect, useState } from 'react'
import { X, TrendingUp, Plus, Trash2, Save } from 'lucide-react'
import { Plano, UpsellSalvo, VipGroup } from '../types/Fluxo'
import { criarNomeUpsell } from '../utils/upsellUtils'

interface UpsellEditorProps {
  isOpen: boolean
  upsell: UpsellSalvo | null
  onClose: () => void
  onSave: (upsell: UpsellSalvo) => void
}

interface PlanoTemp {
  id: string
  nome: string
  valor: number
  chatId: string
  duracaoDias: number
}

export function UpsellEditor({
  isOpen,
  upsell,
  onClose,
  onSave,
}: UpsellEditorProps) {
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState('')
  const [delayMin, setDelayMin] = useState(0)
  const [delaySec, setDelaySec] = useState(0)
  const [planos, setPlanos] = useState<PlanoTemp[]>([])

  useEffect(() => {
    if (!isOpen) return
    if (upsell) {
      setDescription(upsell.mensagem.description || '')
      setVideo(upsell.mensagem.video || '')
      const totalSeconds = upsell.mensagem.delay || 0
      setDelayMin(Math.floor(totalSeconds / 60))
      setDelaySec(totalSeconds % 60)
      const planosCarregados = (upsell.mensagem.planos || []).map((p, index) => ({
        id: `plano-${index}-${Date.now()}`,
        nome: p.name,
        valor: p.value,
        chatId: p.vipGroups?.[0]?.chatId || '',
        duracaoDias: p.vipGroups?.[0]?.durationDays || 30,
      }))
      setPlanos(planosCarregados.length > 0 ? planosCarregados : [{
        id: `plano-${Date.now()}`,
        nome: '',
        valor: 0,
        chatId: '',
        duracaoDias: 30,
      }])
    } else {
      setDescription('')
      setVideo('')
      setDelayMin(0)
      setDelaySec(0)
      setPlanos([{
        id: `plano-${Date.now()}`,
        nome: '',
        valor: 0,
        chatId: '',
        duracaoDias: 30,
      }])
    }
  }, [isOpen, upsell])

  if (!isOpen) return null

  const handleAddPlano = () => {
    setPlanos(prev => [
      ...prev,
      {
        id: `plano-${Date.now()}`,
        nome: '',
        valor: 0,
        chatId: '',
        duracaoDias: 30,
      }
    ])
  }

  const handleRemovePlano = (id: string) => {
    if (planos.length <= 1) return
    setPlanos(prev => prev.filter(p => p.id !== id))
  }

  const handleUpdatePlano = (id: string, field: keyof PlanoTemp, value: string | number) => {
    setPlanos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleSave = () => {
    const planosValidos = planos.filter(p => p.nome.trim() !== '')
    if (planosValidos.length === 0) {
      alert('Adicione pelo menos um botão com nome')
      return
    }

    const planosFinal: Plano[] = planosValidos.map((p) => {
      const vipGroups: VipGroup[] = p.chatId.trim()
        ? [{
            chatId: p.chatId.trim(),
            durationDays: p.duracaoDias,
            name: p.nome,
          }]
        : []
      return {
        name: p.nome.trim(),
        value: p.valor,
        vipGroups,
      }
    })

    const delay = (delayMin * 60) + delaySec
    const nomeFinal = criarNomeUpsell({
      description,
      video: video || null,
      delay,
      delayType: 'relative',
      scheduleTime: '',
      scheduleDays: 0,
      planos: planosFinal,
      orderBumpPerPlan: false,
    })

    const upsellSalvo: UpsellSalvo = {
      id: upsell?.id || `up-${Date.now()}`,
      nome: nomeFinal,
      mensagem: {
        description,
        video: video || null,
        delay,
        delayType: 'relative',
        scheduleTime: '',
        scheduleDays: 0,
        planos: planosFinal,
        orderBumpPerPlan: false,
      }
    }

    onSave(upsellSalvo)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {upsell ? 'Editar Upsell' : 'Criar Upsell'}
              </h2>
              <p className="text-xs text-gray-500">Configure a mensagem de upsell e seus botões</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Copy */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Copy / Descrição (HTML)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a mensagem do upsell..."
              rows={5}
              className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm font-mono focus:outline-none focus:border-gray-600 resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Vídeo */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              URL do Vídeo (opcional)
            </label>
            <input
              type="text"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
            />
          </div>

          {/* Delay */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Delay (min)</label>
              <input
                type="number"
                min="0"
                value={delayMin}
                onChange={(e) => setDelayMin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Delay (seg)</label>
              <input
                type="number"
                min="0"
                max="59"
                value={delaySec}
                onChange={(e) => setDelaySec(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Botões ({planos.length})
              </label>
              <button
                onClick={handleAddPlano}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            <div className="space-y-2">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className="p-3 bg-[#161b22] border border-gray-800 rounded-lg"
                >
                  <div className="grid grid-cols-[1fr_100px_1fr_70px_36px] gap-2 items-start">
                    <input
                      type="text"
                      value={plano.nome}
                      onChange={(e) => handleUpdatePlano(plano.id, 'nome', e.target.value)}
                      placeholder="Nome do botão"
                      className="px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={plano.valor}
                      onChange={(e) => handleUpdatePlano(plano.id, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                    />
                    <input
                      type="text"
                      value={plano.chatId}
                      onChange={(e) => handleUpdatePlano(plano.id, 'chatId', e.target.value)}
                      placeholder="Chat ID / Link VIP"
                      className="px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 font-mono text-xs focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                    />
                    <input
                      type="number"
                      min="1"
                      value={plano.duracaoDias}
                      onChange={(e) => handleUpdatePlano(plano.id, 'duracaoDias', parseInt(e.target.value) || 30)}
                      className="px-2 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                    />
                    <button
                      onClick={() => handleRemovePlano(plano.id)}
                      disabled={planos.length <= 1}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Editor de Order Bump - Estilo Minimalista
 */

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Plus, Trash2, Save } from 'lucide-react'
import { OrderBumpSalvo, OrderBump, VipGroup } from '../types/Fluxo'

interface OrderBumpEditorProps {
  isOpen: boolean
  orderBump: OrderBumpSalvo | null
  onClose: () => void
  onSave: (orderBump: OrderBumpSalvo) => void
}

export function OrderBumpEditor({
  isOpen,
  orderBump,
  onClose,
  onSave,
}: OrderBumpEditorProps) {
  const [nome, setNome] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState('')
  const [value, setValue] = useState(0)
  const [btnAccept, setBtnAccept] = useState('Sim, quero!')
  const [btnDecline, setBtnDecline] = useState('Não, obrigado')
  const [vipGroups, setVipGroups] = useState<VipGroup[]>([])
  
  useEffect(() => {
    if (orderBump) {
      setNome(orderBump.nome)
      setEnabled(orderBump.orderBump.enabled)
      setDescription(orderBump.orderBump.description)
      setVideo(orderBump.orderBump.video)
      setValue(orderBump.orderBump.value)
      setBtnAccept(orderBump.orderBump.btnAccept)
      setBtnDecline(orderBump.orderBump.btnDecline)
      setVipGroups(orderBump.orderBump.vipGroups || [])
    } else {
      setNome('')
      setEnabled(true)
      setDescription('')
      setVideo('')
      setValue(0)
      setBtnAccept('Sim, quero!')
      setBtnDecline('Não, obrigado')
      setVipGroups([])
    }
  }, [orderBump, isOpen])
  
  if (!isOpen) return null
  
  const handleAddVipGroup = () => {
    setVipGroups([...vipGroups, { chatId: '', durationDays: 30, name: '' }])
  }
  
  const handleRemoveVipGroup = (index: number) => {
    setVipGroups(vipGroups.filter((_, i) => i !== index))
  }
  
  const handleUpdateVipGroup = (index: number, field: keyof VipGroup, value: string | number) => {
    const newGroups = [...vipGroups]
    newGroups[index] = { ...newGroups[index], [field]: value }
    setVipGroups(newGroups)
  }
  
  const handleSave = () => {
    if (!nome.trim()) {
      alert('Nome do Order Bump é obrigatório')
      return
    }
    
    if (value <= 0) {
      alert('Valor deve ser maior que 0')
      return
    }
    
    const obSalvo: OrderBumpSalvo = {
      id: orderBump?.id || `ob-${Date.now()}`,
      nome: nome.trim(),
      orderBump: {
        enabled,
        description,
        video,
        value,
        btnAccept,
        btnDecline,
        vipGroups,
      },
    }
    
    onSave(obSalvo)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {orderBump ? 'Editar Order Bump' : 'Criar Order Bump'}
              </h2>
              <p className="text-xs text-gray-500">Configure o Order Bump para suas mensagens</p>
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
          {/* Nome */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Nome do Order Bump *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Order Bump Premium"
              className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
            />
          </div>
          
          {/* Ativar/Desativar */}
          <div className="flex items-center gap-3 p-3 bg-[#0d1117] border border-gray-800 rounded-lg">
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                enabled ? 'bg-emerald-600' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-300">Order Bump Ativo</span>
          </div>
          
          {/* Descrição */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Descrição (HTML)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição do Order Bump..."
              rows={3}
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
          
          {/* Valor */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Valor (R$) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
            />
          </div>
          
          {/* Botões Aceitar/Recusar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                Botão Aceitar
              </label>
              <input
                type="text"
                value={btnAccept}
                onChange={(e) => setBtnAccept(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-emerald-500/30 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                Botão Recusar
              </label>
              <input
                type="text"
                value={btnDecline}
                onChange={(e) => setBtnDecline(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-red-500/30 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>
          
          {/* Grupos VIP */}
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Grupos VIP ({vipGroups.length})
              </label>
              <button
                onClick={handleAddVipGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
            
            {vipGroups.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">Nenhum grupo VIP configurado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vipGroups.map((group, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#161b22] border border-gray-800 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => handleUpdateVipGroup(index, 'name', e.target.value)}
                          placeholder="Nome do grupo"
                          className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={group.chatId}
                            onChange={(e) => handleUpdateVipGroup(index, 'chatId', e.target.value)}
                            placeholder="Chat ID"
                            className="px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                          />
                          <input
                            type="number"
                            min="1"
                            value={group.durationDays}
                            onChange={(e) => handleUpdateVipGroup(index, 'durationDays', parseInt(e.target.value) || 30)}
                            placeholder="Dias"
                            className="px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveVipGroup(index)}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

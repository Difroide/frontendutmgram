/**
 * Modal para configurar Order Bump padrão
 */

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Save, Link, Plus, Trash2 } from 'lucide-react'
import { OrderBump, VipGroup, formatCurrency } from '../types/Fluxo'

interface OrderBumpConfigProps {
  isOpen: boolean
  orderBump: OrderBump | null
  onClose: () => void
  onSave: (orderBump: OrderBump) => void
  onApplyToAll: () => void
}

export function OrderBumpConfig({
  isOpen,
  orderBump,
  onClose,
  onSave,
  onApplyToAll,
}: OrderBumpConfigProps) {
  const [enabled, setEnabled] = useState(false)
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState('')
  const [value, setValue] = useState(0)
  const [btnAccept, setBtnAccept] = useState('EU QUERO 🤭')
  const [btnDecline, setBtnDecline] = useState('Não tenho dinheiro 😩')
  const [vipGroups, setVipGroups] = useState<VipGroup[]>([])
  const [newVipLink, setNewVipLink] = useState('')
  const [newVipDays, setNewVipDays] = useState(0)
  
  // Carregar dados quando abrir
  useEffect(() => {
    if (orderBump && isOpen) {
      setEnabled(orderBump.enabled)
      setDescription(orderBump.description || '')
      setVideo(orderBump.video || '')
      setValue(orderBump.value || 0)
      setBtnAccept(orderBump.btnAccept || 'EU QUERO 🤭')
      setBtnDecline(orderBump.btnDecline || 'Não tenho dinheiro 😩')
      setVipGroups([...orderBump.vipGroups] || [])
    } else if (isOpen) {
      // Valores padrão
      setEnabled(true)
      setDescription('')
      setVideo('')
      setValue(5)
      setBtnAccept('EU QUERO 🤭')
      setBtnDecline('Não tenho dinheiro 😩')
      setVipGroups([])
    }
  }, [orderBump, isOpen])
  
  if (!isOpen) return null
  
  const handleSave = () => {
    const ob: OrderBump = {
      enabled,
      description,
      video,
      value,
      btnAccept,
      btnDecline,
      vipGroups,
    }
    onSave(ob)
    onClose()
  }
  
  const handleAddVipGroup = () => {
    if (!newVipLink.trim()) {
      alert('Digite o link do grupo VIP')
      return
    }
    setVipGroups([...vipGroups, {
      chatId: newVipLink.trim(),
      durationDays: newVipDays,
      name: '',
    }])
    setNewVipLink('')
    setNewVipDays(0)
  }
  
  const handleRemoveVipGroup = (index: number) => {
    setVipGroups(vipGroups.filter((_, i) => i !== index))
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Order Bump Padrão</h2>
              <p className="text-xs text-slate-400">Configure o order bump global para todas as mensagens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toggle Ativado */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl">
            <div>
              <div className="text-sm font-semibold text-slate-300">Ativar Order Bump</div>
              <div className="text-xs text-slate-500">Exibir oferta adicional após seleção do plano</div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-all ${
                enabled ? 'bg-pink-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  enabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
          
          {enabled && (
            <>
              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Copy / Descrição do Order Bump
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="🎁 Adicione agora o pacote de +10 LINKS MEGA exclusivo por apenas R$5,00..."
                  className="w-full px-4 py-3 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all resize-none"
                />
              </div>
              
              {/* Vídeo */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  URL do Vídeo (opcional)
                </label>
                <input
                  type="text"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="https://exemplo.com/video.mp4"
                  className="w-full px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                />
              </div>
              
              {/* Valor */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Valor Extra (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  className="w-40 px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                />
                <span className="ml-3 text-slate-400">{formatCurrency(value)}</span>
              </div>
              
              {/* Botões */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Texto do Botão "Aceitar"
                  </label>
                  <input
                    type="text"
                    value={btnAccept}
                    onChange={(e) => setBtnAccept(e.target.value)}
                    placeholder="EU QUERO 🤭"
                    className="w-full px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Texto do Botão "Recusar"
                  </label>
                  <input
                    type="text"
                    value={btnDecline}
                    onChange={(e) => setBtnDecline(e.target.value)}
                    placeholder="Não tenho dinheiro 😩"
                    className="w-full px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  />
                </div>
              </div>
              
              {/* Grupos VIP */}
              <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
                  <Link className="w-4 h-4 text-blue-400" />
                  Grupos VIP do Order Bump
                </label>
                
                {/* Adicionar novo */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newVipLink}
                    onChange={(e) => setNewVipLink(e.target.value)}
                    placeholder="Link do grupo (https://t.me/+...)"
                    className="flex-1 px-3 py-2 bg-black/40 border border-slate-800/60 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    value={newVipDays}
                    onChange={(e) => setNewVipDays(parseInt(e.target.value) || 0)}
                    placeholder="Dias"
                    className="w-20 px-3 py-2 bg-black/40 border border-slate-800/60 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    onClick={handleAddVipGroup}
                    className="px-3 py-2 bg-blue-600/30 border border-blue-500/50 text-blue-300 rounded hover:bg-blue-600/40 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Lista */}
                {vipGroups.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-3">Nenhum grupo VIP configurado</p>
                ) : (
                  <div className="space-y-2">
                    {vipGroups.map((vip, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-slate-800/60 rounded"
                      >
                        <span className="flex-1 text-xs text-slate-300 font-mono truncate">
                          {vip.chatId}
                        </span>
                        <span className="text-xs text-blue-400">{vip.durationDays}d</span>
                        <button
                          onClick={() => handleRemoveVipGroup(index)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60">
          <button
            onClick={onApplyToAll}
            disabled={!enabled}
            className="px-4 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar a Todas as Mensagens
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-800/70 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

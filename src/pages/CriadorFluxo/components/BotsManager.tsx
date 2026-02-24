/**
 * Modal para gerenciar bots de vendas - Estilo Minimalista
 */

import { useState, useEffect } from 'react'
import { X, Plus, Star, Copy, Trash2, Bot, Edit2, Check, AlertCircle } from 'lucide-react'
import { BotVendas } from '../types/Fluxo'

function nomePareceBotUsername(nome: string): boolean {
  if (/[\s\-\.]/.test(nome)) return false
  if (/^[a-z0-9_]+bot$/i.test(nome) && nome.length > 8) return true
  if (/\d{4,}/.test(nome)) return true
  return false
}

interface BotsManagerProps {
  isOpen: boolean
  bots: BotVendas[]
  onClose: () => void
  onSave: (bots: BotVendas[]) => void
}

export function BotsManager({ isOpen, bots, onClose, onSave }: BotsManagerProps) {
  const [botsEditando, setBotsEditando] = useState<BotVendas[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', token: '' })
  const [copiado, setCopiado] = useState<string | null>(null)
  const [avisoNome, setAvisoNome] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      if (bots.length === 0) {
        setBotsEditando([{
          id: `bot-${Date.now()}`,
          nome: 'Bot Principal',
          username: '',
          token: '',
          isPrincipal: true,
        }])
      } else {
        setBotsEditando([...bots])
      }
      setEditandoId(null)
    }
  }, [isOpen, bots])
  
  if (!isOpen) return null
  
  const handleAddBot = () => {
    const novoBot: BotVendas = {
      id: `bot-${Date.now()}`,
      nome: `Bot ${botsEditando.length + 1}`,
      username: '',
      token: '',
      isPrincipal: botsEditando.length === 0,
    }
    setBotsEditando([...botsEditando, novoBot])
    setEditandoId(novoBot.id)
    setEditForm({ nome: novoBot.nome, token: novoBot.token })
  }
  
  const handleStartEdit = (bot: BotVendas) => {
    setEditandoId(bot.id)
    setEditForm({ nome: bot.nome, token: bot.token })
  }
  
  const handleSaveEdit = () => {
    if (!editandoId) return
    
    if (nomePareceBotUsername(editForm.nome)) {
      setAvisoNome(true)
      setTimeout(() => setAvisoNome(false), 5000)
      return
    }
    
    setBotsEditando(botsEditando.map(b => 
      b.id === editandoId 
        ? { ...b, nome: editForm.nome, token: editForm.token }
        : b
    ))
    setEditandoId(null)
    setAvisoNome(false)
  }
  
  const handleCancelEdit = () => {
    setEditandoId(null)
  }
  
  const handleCloneBot = (bot: BotVendas) => {
    const clonado: BotVendas = {
      ...bot,
      id: `bot-${Date.now()}`,
      nome: `${bot.nome} (cópia)`,
      isPrincipal: false,
    }
    setBotsEditando([...botsEditando, clonado])
  }
  
  const handleCopyToken = (token: string, botId: string) => {
    navigator.clipboard.writeText(token)
    setCopiado(botId)
    setTimeout(() => setCopiado(null), 2000)
  }
  
  const handleDeleteBot = (id: string) => {
    const botRemover = botsEditando.find(b => b.id === id)
    if (botRemover?.isPrincipal) {
      alert('Não é possível excluir o bot principal!')
      return
    }
    setBotsEditando(botsEditando.filter(b => b.id !== id))
  }
  
  const handleSetPrincipal = (id: string) => {
    setBotsEditando(botsEditando.map(b => ({
      ...b,
      isPrincipal: b.id === id,
    })))
  }
  
  const handleSalvar = () => {
    const botsValidos = botsEditando.filter(b => b.token.trim())
    if (botsValidos.length === 0) {
      alert('Adicione pelo menos 1 bot com token!')
      return
    }
    
    let botsParaSalvar = [...botsValidos]
    if (!botsParaSalvar.some(b => b.isPrincipal)) {
      botsParaSalvar[0].isPrincipal = true
    }
    
    onSave(botsParaSalvar)
    onClose()
  }
  
  const formatToken = (token: string): string => {
    if (!token) return '(sem token)'
    if (token.length > 30) {
      return `${token.substring(0, 12)}...${token.substring(token.length - 10)}`
    }
    return token
  }
  
  const botPrincipal = botsEditando.find(b => b.isPrincipal)
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-violet-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Gerenciar Bots</h2>
              <p className="text-xs text-gray-500">Configure os bots de vendas do fluxo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info do Bot Principal */}
          {botPrincipal && (
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-gray-200">Bot Principal</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase text-gray-500">Nome</span>
                  <p className="text-sm text-gray-200">{botPrincipal.nome || 'Sem nome'}</p>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase text-gray-500">Token</span>
                  <p className="text-xs text-gray-500 font-mono truncate">{formatToken(botPrincipal.token)}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Lista de Bots */}
          <div className="space-y-2">
            {botsEditando.map((bot, index) => (
              <div
                key={bot.id}
                className={`bg-[#0d1117] border rounded-lg overflow-hidden transition-colors ${
                  bot.isPrincipal 
                    ? 'border-violet-500/40' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {editandoId === bot.id ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Nome</label>
                        <input
                          type="text"
                          value={editForm.nome}
                          onChange={(e) => {
                            setEditForm({ ...editForm, nome: e.target.value })
                            setAvisoNome(false)
                          }}
                          placeholder="Ex: Bot Dark, Lives Bot"
                          className={`w-full px-3 py-2 text-sm bg-[#161b22] border rounded-lg text-gray-200 focus:outline-none ${
                            avisoNome 
                              ? 'border-red-500/50 focus:border-red-500' 
                              : 'border-gray-700 focus:border-gray-600'
                          }`}
                        />
                        {avisoNome && (
                          <div className="mt-2 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <div className="text-xs text-red-400">
                              <strong>Nome inválido!</strong>
                              <p className="text-[10px] text-red-300/80 mt-0.5">
                                Use um nome descritivo, não o username do bot.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Token *</label>
                        <input
                          type="text"
                          value={editForm.token}
                          onChange={(e) => setEditForm({ ...editForm, token: e.target.value })}
                          placeholder="123456:ABC..."
                          className="w-full px-3 py-2 text-sm bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 font-mono focus:outline-none focus:border-gray-600"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#21262d] rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => handleSetPrincipal(bot.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        bot.isPrincipal 
                          ? 'text-yellow-400 bg-yellow-500/10' 
                          : 'text-gray-600 hover:text-gray-400 hover:bg-[#21262d]'
                      }`}
                      title={bot.isPrincipal ? 'Bot Principal' : 'Definir como Principal'}
                    >
                      <Star className={`w-4 h-4 ${bot.isPrincipal ? 'fill-yellow-400' : ''}`} />
                    </button>
                    
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase text-gray-600">Nome</span>
                        <p className="text-sm text-gray-300 truncate">{bot.nome || `Bot ${index + 1}`}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-gray-600">Token</span>
                        <p className="text-xs text-gray-500 font-mono truncate">{formatToken(bot.token)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyToken(bot.token, bot.id)}
                        disabled={!bot.token}
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiado === bot.id 
                            ? 'text-emerald-400 bg-emerald-500/10' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]'
                        } disabled:opacity-30`}
                        title="Copiar Token"
                      >
                        {copiado === bot.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleStartEdit(bot)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCloneBot(bot)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
                        title="Clonar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!bot.isPrincipal && (
                        <button
                          onClick={() => handleDeleteBot(bot.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Botão Adicionar */}
          <button
            onClick={handleAddBot}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Bot
          </button>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            {botsEditando.length} bot{botsEditando.length !== 1 ? 's' : ''} configurado{botsEditando.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              className="px-4 py-2 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

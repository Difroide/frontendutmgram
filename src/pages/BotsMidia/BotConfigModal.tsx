import { useEffect, useState } from 'react'
import { AtSign, Bot, Check, Key, Plus, Tag, Trash2, X } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'
import { BotTagData } from './botMidiaService'

interface BotConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<BotMidia>) => void
  bot: BotMidia | null
  // Tags do bot
  botTags: BotTagData[]
  botTagIds: string[]
  onToggleTag: (botId: string, tagId: string, currentlyHasTag: boolean) => void
  onCreateTag: (nome: string, cor: string) => void
  onDeleteTag: (tagId: string) => void
}

const TAG_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]

export const BotConfigModal = ({
  isOpen,
  onClose,
  onSave,
  bot,
  botTags,
  botTagIds,
  onToggleTag,
  onCreateTag,
  onDeleteTag,
}: BotConfigModalProps) => {
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [tipoBot, setTipoBot] = useState<'vendas' | 'disparo'>('vendas')

  // Criar nova tag
  const [showNewTag, setShowNewTag] = useState(false)
  const [novaTagNome, setNovaTagNome] = useState('')
  const [novaTagCor, setNovaTagCor] = useState(TAG_COLORS[0])

  useEffect(() => {
    if (isOpen && bot) {
      setNome(bot.nome || '')
      setUsername(bot.username?.replace('@', '') || '')
      setToken(bot.token || '')
      setTipoBot(bot.tipoBot || 'vendas')
      setShowNewTag(false)
      setNovaTagNome('')
    }
  }, [isOpen, bot])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      alert('Digite o nome do bot')
      return
    }

    onSave({
      id: bot?.id,
      nome: nome.trim(),
      username: username.trim(),
      token: token.trim(),
      tipoBot,
    })
    onClose()
  }

  const handleCreateTag = () => {
    if (!novaTagNome.trim()) return
    onCreateTag(novaTagNome.trim(), novaTagCor)
    setNovaTagNome('')
    setShowNewTag(false)
  }

  if (!isOpen || !bot) return null

  const botId = String(bot.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800 bg-[#111722] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">Configurar bot</h2>
              <p className="text-xs text-gray-500">Ajuste dados, tipo e tags do bot.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                <Tag className="h-3.5 w-3.5" />
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-100 outline-none transition-all focus:border-gray-500"
                placeholder="Nome do bot"
              />
            </div>

            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                <AtSign className="h-3.5 w-3.5" />
                Username
              </label>
              <div className="flex">
                <span className="rounded-l-lg border border-r-0 border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                  className="w-full rounded-r-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-100 outline-none transition-all focus:border-gray-500"
                  placeholder="meubot"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                <Key className="h-3.5 w-3.5" />
                Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 font-mono text-xs text-gray-100 outline-none transition-all focus:border-gray-500"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Tipo de bot</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoBot('vendas')}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-all ${tipoBot === 'vendas' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-[#0d1117] text-gray-400 hover:border-gray-600'}`}
                >
                  Vendas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoBot('disparo')}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-all ${tipoBot === 'disparo' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-gray-700 bg-[#0d1117] text-gray-400 hover:border-gray-600'}`}
                >
                  Disparo
                </button>
              </div>
            </div>
          </div>

          {/* ═══ Seção de Tags ═══ */}
          <div className="space-y-3 rounded-xl border border-gray-800 bg-[#0d1117] p-4">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                <Tag className="h-3.5 w-3.5" />
                Tags do bot
              </label>
              <button
                type="button"
                onClick={() => setShowNewTag(!showNewTag)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-400 transition-all hover:border-gray-600 hover:text-gray-300"
              >
                <Plus className="h-3 w-3" />
                Nova tag
              </button>
            </div>

            {/* Criador de nova tag */}
            {showNewTag && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
                <input
                  type="text"
                  value={novaTagNome}
                  onChange={(e) => setNovaTagNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() } }}
                  placeholder="Nome da tag..."
                  className="flex-1 rounded-lg border border-gray-700 bg-[#111722] px-2.5 py-1.5 text-sm text-gray-100 outline-none focus:border-gray-500"
                  autoFocus
                />
                {/* Seletor de cor */}
                <div className="flex gap-1">
                  {TAG_COLORS.slice(0, 6).map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovaTagCor(cor)}
                      className={`h-5 w-5 rounded-full transition-all ${novaTagCor === cor ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d1117]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!novaTagNome.trim()}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            )}

            {/* Lista de tags */}
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {botTags.length === 0 ? (
                <p className="p-3 text-center text-sm text-gray-500">Nenhuma tag criada. Clique em "+ Nova tag" para criar.</p>
              ) : (
                botTags.map((tag) => {
                  const hasTag = botTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${hasTag ? 'border-blue-500/30 bg-blue-500/10' : 'border-transparent bg-[#111722] hover:border-gray-700'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTag(botId, tag.id, hasTag)}
                        className="inline-flex min-w-0 flex-1 items-center gap-2"
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${hasTag ? 'bg-blue-500 text-white' : 'border border-gray-600 bg-gray-700/60'}`}>
                          {hasTag && <Check className="h-3 w-3" />}
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                        <span className={`truncate text-sm ${hasTag ? 'text-blue-300' : 'text-gray-300'}`}>{tag.nome}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deletar a tag "${tag.nome}"? Será removida de todos os bots.`)) {
                            onDeleteTag(tag.id)
                          }
                        }}
                        className="rounded p-1 text-gray-600 transition-all hover:bg-red-500/10 hover:text-red-400"
                        title="Deletar tag"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-all hover:bg-[#21262d]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-500"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

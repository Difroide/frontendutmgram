import { useState } from 'react'
import { RotateCcw, Trash2, X, Link2, Pencil } from 'lucide-react'
import { BotReutilizado } from '@/types/electron'
import { BotLinkButton } from '../BotLinkButton'

interface BotsReutilizadosTableProps {
  bots: BotReutilizado[]
  loading: boolean
  categorias: Array<{ id: string; nome: string }>
  onVincularCategoria: (botId: string, categoriaId: string) => Promise<void>
  onEditar: (botId: string, data: { nome: string; username: string; token: string | null }) => Promise<void>
  onRemover: (botId: string) => Promise<void>
}

export function BotsReutilizadosTable({
  bots,
  loading,
  categorias,
  onVincularCategoria,
  onEditar,
  onRemover,
}: BotsReutilizadosTableProps) {
  const [botParaVincular, setBotParaVincular] = useState<BotReutilizado | null>(null)
  const [botParaEditar, setBotParaEditar] = useState<BotReutilizado | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', username: '', token: '' })
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [editando, setEditando] = useState(false)

  const handleAbrirVincular = (bot: BotReutilizado) => {
    setBotParaVincular(bot)
    setCategoriaSelecionada(categorias[0]?.id || '')
  }

  const handleAbrirEditar = (bot: BotReutilizado) => {
    setBotParaEditar(bot)
    setEditForm({
      nome: bot.nome || '',
      username: (bot.username || '').replace(/^@+/, ''),
      token: bot.token || '',
    })
  }

  const handleConfirmarEditar = async () => {
    if (!botParaEditar || !editForm.nome.trim() || !editForm.username.trim()) return
    setEditando(true)
    try {
      await onEditar(botParaEditar.id, {
        nome: editForm.nome.trim(),
        username: editForm.username.trim(),
        token: editForm.token.trim() || null,
      })
      setBotParaEditar(null)
    } finally {
      setEditando(false)
    }
  }

  const handleConfirmarVincular = async () => {
    if (!botParaVincular || !categoriaSelecionada) return
    setVinculando(true)
    try {
      await onVincularCategoria(botParaVincular.id, categoriaSelecionada)
      setBotParaVincular(null)
      setCategoriaSelecionada('')
    } finally {
      setVinculando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">{bots.length} bot(s) reutilizados (de categorias sem grupos)</p>
      </div>

      {bots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 py-16 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-gray-600" />
          <p className="mt-2 text-sm text-gray-400">Nenhum bot reutilizado</p>
          <p className="mt-1 text-xs text-gray-600">Use &quot;Reutilizar bots&quot; na aba Categorias para mover bots de categorias sem grupos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="group relative flex items-center gap-4 rounded-xl border border-l-[3px] border-gray-800/80 border-l-amber-500/70 bg-[#131a24] px-4 py-3 transition-all hover:bg-[#172033]"
            >
              <div className="flex flex-1 min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <RotateCcw className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{bot.nome}</p>
                  <p className="text-xs text-gray-500">
                    {bot.username} • origem: {bot.categoriaOrigemNome || bot.categoriaOrigemId || '-'}
                  </p>
                </div>
                {bot.username && (
                  <BotLinkButton username={bot.username} className="shrink-0" />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleAbrirEditar(bot)}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-amber-400 disabled:opacity-50"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleAbrirVincular(bot)}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-emerald-400 disabled:opacity-50"
                  title="Vincular a categoria"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onRemover(bot.id)}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-red-400 disabled:opacity-50"
                  title="Remover da lista"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {botParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0d1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h3 className="text-base font-semibold text-white">Editar bot reutilizado</h3>
              <button onClick={() => setBotParaEditar(null)} className="rounded-lg p-1.5 hover:bg-gray-800">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Nome</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                  placeholder="Nome do bot"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Username (@)</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value.replace(/^@+/, '') }))}
                  className="w-full rounded-lg border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                  placeholder="username_bot"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Token (opcional)</label>
                <input
                  type="text"
                  value={editForm.token}
                  onChange={(e) => setEditForm((f) => ({ ...f, token: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none font-mono"
                  placeholder="Opcional - deixe vazio para remover"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-800 px-5 py-4">
              <button
                onClick={() => setBotParaEditar(null)}
                className="flex-1 rounded-lg bg-[#21262d] px-4 py-2 text-sm text-gray-300 hover:bg-[#30363d]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEditar}
                disabled={editando || !editForm.nome.trim() || !editForm.username.trim()}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editando ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {botParaVincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0d1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h3 className="text-base font-semibold text-white">Vincular a categoria</h3>
              <button
                onClick={() => setBotParaVincular(null)}
                className="rounded-lg p-1.5 hover:bg-gray-800"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-400">
                Bot: {botParaVincular.nome} ({botParaVincular.username})
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Categoria</label>
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-800 px-5 py-4">
              <button
                onClick={() => setBotParaVincular(null)}
                className="flex-1 rounded-lg bg-[#21262d] px-4 py-2 text-sm text-gray-300 hover:bg-[#30363d]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarVincular}
                disabled={vinculando || !categoriaSelecionada}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {vinculando ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Vincular
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Send, Bot as BotIcon, Users } from 'lucide-react'
import { fixadorService, type Bot, type DispararResult } from '../fixadorService'

interface DispararModalProps {
  isOpen: boolean
  onClose: () => void
  mensagem?: { id: string; titulo?: string } | null
}

export function DispararModal({ isOpen, onClose, mensagem }: DispararModalProps) {
  const [bots, setBots] = useState<Bot[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [disparando, setDisparando] = useState(false)
  const [resultado, setResultado] = useState<DispararResult | null>(null)

  useEffect(() => {
    if (isOpen) {
      setResultado(null)
      fixadorService.listarBots().then((data) => {
        setBots(data || [])
        setSelecionados(new Set((data || []).map((b) => b.id)))
      }).catch(() => setBots([]))
    }
  }, [isOpen, mensagem?.id])

  const toggleBot = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selecionarTodos = () => {
    setSelecionados(new Set(bots.map((b) => b.id)))
  }

  const desmarcarTodos = () => {
    setSelecionados(new Set())
  }

  const handleDisparar = async () => {
    const ids = Array.from(selecionados)
    if (ids.length === 0) return
    setDisparando(true)
    setResultado(null)
    try {
      const res = await fixadorService.dispararSelecionado(ids, mensagem?.id)
      setResultado(res)
    } catch (e) {
      setResultado({ enviados: 0, erros: [{ bot: '', grupo: '', error: String(e) }] })
    } finally {
      setDisparando(false)
    }
  }

  if (!isOpen) return null

  const botsComGrupos = bots.filter((b) => (b.grupos?.length ?? 0) > 0)
  const totalGrupos = botsComGrupos
    .filter((b) => selecionados.has(b.id))
    .reduce((acc, b) => acc + (b.grupos?.length ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#131a24] shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-200">
            <Send className="h-5 w-5" />
            {mensagem ? `Disparar "${mensagem.titulo || 'Mensagem'}"` : 'Disparar mensagens'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-3 text-sm text-gray-500">
            {mensagem
              ? 'Selecione os bots. A mensagem vai em 1 tópico por grupo (o atual do ciclo). Depois de 20 min o ciclo segue no próximo tópico.'
              : 'Selecione os bots para disparar uma mensagem aleatória em todos os grupos de cada bot.'}
          </p>

          {loading ? (
            <p className="py-4 text-center text-sm text-gray-500">Carregando bots...</p>
          ) : bots.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-700 py-8 text-center text-sm text-gray-500">
              Nenhum bot cadastrado. Adicione em Bots e Grupos.
            </p>
          ) : (
            <>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={desmarcarTodos}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Desmarcar todos
                </button>
              </div>
              <div className="space-y-2">
                {bots.map((bot) => {
                  const gruposCount = bot.grupos?.length ?? 0
                  const checked = selecionados.has(bot.id)
                  const semGrupos = gruposCount === 0
                  return (
                    <label
                      key={bot.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        checked ? 'border-cyan-600 bg-cyan-900/20' : 'border-gray-800 bg-[#0d1117] hover:border-gray-700'
                      } ${semGrupos ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => !semGrupos && toggleBot(bot.id)}
                        disabled={semGrupos}
                        className="mt-1 h-4 w-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <BotIcon className="h-4 w-4 shrink-0 text-gray-500" />
                          <span className="font-medium text-gray-200">{bot.nome || 'Bot'}</span>
                          {bot.username && (
                            <span className="text-xs text-gray-500">{bot.username}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          {gruposCount} grupo(s)
                          {semGrupos && (
                            <span className="text-amber-500"> — Sem grupos</span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {resultado && (
            <div className="mt-4 rounded-lg border border-gray-700 p-3">
              <p className="text-sm font-medium text-gray-300">
                {resultado.enviados > 0 ? (
                  <span className="text-emerald-400">✓ {resultado.enviados} enviado(s)</span>
                ) : null}
                {resultado.erros.length > 0 ? (
                  <span className={resultado.enviados > 0 ? 'ml-2' : ''}>
                    <span className="text-red-400">✗ {resultado.erros.length} erro(s)</span>
                  </span>
                ) : null}
              </p>
              {resultado.erros.length > 0 && (
                <div className="mt-2 max-h-24 overflow-y-auto text-xs text-red-300">
                  {resultado.erros.map((e, i) => (
                    <div key={i}>
                      {e.bot && e.grupo ? `${e.bot} - ${e.grupo}: ` : ''}{e.error}
                    </div>
                  ))}
                </div>
              )}
              {resultado.message && (
                <p className="mt-1 text-xs text-gray-500">{resultado.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-800 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800"
          >
            Fechar
          </button>
          <button
            onClick={handleDisparar}
            disabled={disparando || totalGrupos === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {disparando ? 'Disparando...' : `Disparar em ${totalGrupos} grupo(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

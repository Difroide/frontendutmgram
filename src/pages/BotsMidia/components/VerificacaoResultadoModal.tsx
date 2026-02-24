import { useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, X, ExternalLink } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'

interface VerificacaoResultado {
  total: number
  ativos: number
  banidos: number
  semResposta?: number
  congelados: number
  erros: number
  problemas: BotMidia[]
}

interface VerificacaoResultadoModalProps {
  open: boolean
  resultado: VerificacaoResultado | null
  onClose: () => void
  onDeleteSelected?: (ids: (string | number)[]) => Promise<void>
}

export function VerificacaoResultadoModal({
  open,
  resultado,
  onClose,
  onDeleteSelected,
}: VerificacaoResultadoModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  if (!open || !resultado) return null

  const problemas = resultado.problemas
  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === problemas.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(problemas.map((b) => b.id)))
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !onDeleteSelected) return
    setDeleting(true)
    try {
      await onDeleteSelected(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenLink = (username?: string) => {
    const cleanUsername = username?.replace('@', '') || ''
    if (!cleanUsername) return
    const botLink = `https://t.me/${cleanUsername}`
    if ((window as any).electron?.utils?.openExternalUrl) {
      (window as any).electron.utils.openExternalUrl(botLink)
    } else {
      window.open(botLink, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800 bg-[#111722] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-base font-semibold text-gray-100">Resultado da verificacao</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-[#21262d] hover:text-gray-200 transition-colors"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="rounded-lg border border-gray-800 bg-[#0d1117] p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="mt-1 text-lg font-semibold text-gray-100">{resultado.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <div className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> ON
            </div>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{resultado.ativos}</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <div className="inline-flex items-center gap-1 text-xs text-red-300">
              <XCircle className="h-3.5 w-3.5" /> OFF
            </div>
            <p className="mt-1 text-lg font-semibold text-red-300">{resultado.erros}</p>
          </div>
        </div>

        <div className="border-t border-gray-800 p-5">
          {problemas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum bot com problema nesta verificacao.</p>
          ) : (
            <>
              {onDeleteSelected && (
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    onClick={selectAll}
                    className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {selectedIds.size === problemas.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? 'Excluindo...' : `Excluir selecionados (${selectedIds.size})`}
                    </button>
                  )}
                </div>
              )}
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {problemas.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0d1117] p-3"
                  >
                    {onDeleteSelected && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(bot.id)}
                        onChange={() => toggleSelect(bot.id)}
                        className="h-4 w-4 rounded border-gray-600 bg-[#161b22] text-red-500 focus:ring-red-500"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${bot.status === 'Inativo' ? 'text-red-400' : 'text-gray-100'}`}
                      >
                        {bot.nome || 'Sem nome'}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {bot.username ? '@' + bot.username.replace('@', '') : 'Sem username'}
                      </p>
                    </div>
                    <span className="rounded border border-gray-700 bg-gray-700/20 px-2 py-1 text-xs uppercase text-gray-300">
                      {bot.statusDetalhe === 'online' ? 'ON' : bot.statusDetalhe === 'erro' ? 'ERRO' : 'OFF'}
                    </span>
                    {bot.username && (
                      <button
                        onClick={() => handleOpenLink(bot.username)}
                        className="rounded p-2 text-gray-400 hover:bg-[#21262d] hover:text-gray-200 transition-colors"
                        title="Abrir no Telegram"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

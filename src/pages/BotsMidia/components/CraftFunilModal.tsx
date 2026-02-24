import { Hexagon, Loader2, X } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'

interface FunilCraft {
  nome: string
}

interface CraftFunilModalProps {
  bot: BotMidia | null
  funis: FunilCraft[]
  funilSelecionado: string
  onSelecionarFunil: (value: string) => void
  loadingFunis: boolean
  cadastrando: boolean
  erro: string | null
  sucesso: string | null
  onClose: () => void
  onAtualizarFunis: () => void
  onCadastrar: () => void
}

export function CraftFunilModal({
  bot,
  funis,
  funilSelecionado,
  onSelecionarFunil,
  loadingFunis,
  cadastrando,
  erro,
  sucesso,
  onClose,
  onAtualizarFunis,
  onCadastrar,
}: CraftFunilModalProps) {
  if (!bot) return null

  const botNomeExibicao = bot.username ? `@${bot.username.replace(/^@+/, '')}` : bot.nome

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-800 bg-[#111722] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2">
              <Hexagon className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-100">Cadastrar no funil Craft</h3>
              <p className="text-xs text-gray-500">Processo roda em segundo plano para nao travar a tela.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-gray-800 bg-[#0d1117] p-3">
            <p className="mb-1 text-xs text-gray-500">Bot selecionado</p>
            <p className="truncate text-sm font-medium text-gray-100">{botNomeExibicao || 'Sem nome'}</p>
            <p className="mt-1 text-xs text-gray-500">Token ja cadastrado sera reutilizado.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Funil</label>
              <button
                onClick={onAtualizarFunis}
                disabled={loadingFunis}
                className="rounded px-2 py-1 text-xs text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200 disabled:opacity-50"
              >
                {loadingFunis ? 'Atualizando...' : 'Atualizar funis'}
              </button>
            </div>
            <select
              value={funilSelecionado}
              onChange={(e) => onSelecionarFunil(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-200 outline-none transition-all focus:border-gray-500"
              disabled={loadingFunis || cadastrando}
            >
              <option value="">Selecione o funil</option>
              {funis.map((f, idx) => (
                <option key={`${f.nome}-${idx}`} value={f.nome}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {erro && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>
          )}
          {sucesso && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{sucesso}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-800 px-5 py-4">
          <button
            onClick={onClose}
            disabled={cadastrando}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-all hover:bg-[#21262d] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onCadastrar}
            disabled={cadastrando || loadingFunis || !funilSelecionado}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
          >
            {cadastrando && <Loader2 className="h-4 w-4 animate-spin" />}
            Cadastrar no funil
          </button>
        </div>
      </div>
    </div>
  )
}

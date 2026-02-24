import { CheckSquare, Plus, RefreshCw, Settings, Square, Trash2 } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'
import { BotLinkButton } from '../BotLinkButton'
import { BotActionMenu } from './BotActionMenu'

interface BotsDisparoTableProps {
  bots: BotMidia[]
  loading: boolean
  selectedIds: Set<string | number>
  onToggleSelect: (id: string | number) => void
  onSelectAll: () => void
  onConfig: (bot: BotMidia) => void
  onDelete: (id: string | number) => void
  onCreate: () => void
  onVerificar: () => void
  onVerificarIndividual: (bot: BotMidia) => Promise<void>
  onCadastrarNoFunil: (bot: BotMidia) => void
  onDeleteSelected: () => void
  /** Quando true, usa o mesmo estilo de card/lista da página Contas */
  layoutContas?: boolean
}

function getStatusBorder(bot: BotMidia) {
  if (bot.status === 'Inativo') return 'border-l-red-500'
  if (bot.status === 'Ativo') return 'border-l-emerald-500'
  return 'border-l-red-500'
}

export function BotsDisparoTable({
  bots,
  loading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onConfig,
  onDelete,
  onCreate,
  onVerificar,
  onVerificarIndividual,
  onCadastrarNoFunil,
  onDeleteSelected,
  layoutContas = false,
}: BotsDisparoTableProps) {
  return (
    <div className={layoutContas ? 'flex flex-1 flex-col min-h-0' : 'space-y-4'}>
      {/* Toolbar */}
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${layoutContas ? 'border-b border-gray-800 px-4 py-3' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-gray-300"
            title="Selecionar todos"
          >
            {selectedIds.size === bots.length && bots.length > 0
              ? <CheckSquare className="h-4 w-4 text-cyan-400" />
              : <Square className="h-4 w-4" />
            }
          </button>
          <p className={`${layoutContas ? 'text-sm text-gray-500' : 'text-xs text-gray-600'}`}>{bots.length} bots de disparo</p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-all hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir ({selectedIds.size})
            </button>
          )}
          <button
            onClick={onVerificar}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#131a24] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-700 hover:bg-[#1c2536] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </button>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Bot
          </button>
        </div>
      </div>

      {/* Card List */}
      {bots.length === 0 ? (
        <div className={`rounded-xl border border-dashed border-gray-800 py-16 text-center ${layoutContas ? 'mx-4 my-4' : ''}`}>
          <p className="text-sm text-gray-400">Nenhum bot de disparo</p>
          <p className="mt-1 text-xs text-gray-600">Crie um novo bot para iniciar envios em lote.</p>
        </div>
      ) : (
        <div className={layoutContas ? 'flex-1 overflow-y-auto min-h-0' : 'space-y-2'}>
          {bots.map((bot) => {
            const borderColor = getStatusBorder(bot)
            const isSelected = selectedIds.has(bot.id)
            const rowBase = layoutContas
              ? `group relative flex items-center gap-4 border-b border-gray-800 px-4 py-3 transition-colors ${borderColor} ${isSelected ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]'}`
              : `group relative flex items-center gap-4 rounded-xl border border-l-[3px] px-4 py-3 transition-all hover:bg-[#172033] ${borderColor} ${isSelected ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-gray-800/80 bg-[#131a24]'}`

            return (
              <div
                key={bot.id}
                className={rowBase}
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggleSelect(bot.id)}
                  className="shrink-0 rounded p-0.5 text-gray-500 transition-all hover:text-gray-300"
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 text-cyan-400" />
                    : <Square className="h-4 w-4" />
                  }
                </button>

                {/* Nome + Username */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm font-medium ${bot.status === 'Inativo' ? 'text-red-400' : 'text-gray-100'}`}>
                      {bot.nome || '-'}
                    </span>
                    <span className="shrink-0 text-xs text-gray-600">
                      {bot.username ? '@' + bot.username.replace('@', '') : ''}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="hidden shrink-0 sm:block">
                  {bot.status === 'Ativo' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                      Inativo
                    </span>
                  )}
                </div>

                {/* Acoes */}
                <div className="flex shrink-0 items-center gap-1">
                  <BotLinkButton username={bot.username} />
                  <button
                    onClick={() => onConfig(bot)}
                    className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-gray-300"
                    title="Configurar"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <BotActionMenu
                    bot={bot}
                    onVerificarIndividual={onVerificarIndividual}
                    onCadastrarNoFunil={onCadastrarNoFunil}
                    onDelete={onDelete}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

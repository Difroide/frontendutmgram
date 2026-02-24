import { useEffect, useState } from 'react'
import { AlertTriangle, CheckSquare, Pause, Play, Plus, RefreshCw, Search, Settings, Square, Tag, Trash2, X } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'
import { BotLinkButton } from '../BotLinkButton'
import { BotActionMenu } from './BotActionMenu'
import { BotTagData } from '../botMidiaService'

type FiltroTag = 'todas' | 'rodando' | 'paradas' | 'sem-tag' | string

interface BotsVendasTableProps {
  bots: BotMidia[]
  loading: boolean
  problemas: BotMidia[]
  onConfig: (b: BotMidia) => void
  onDelete: (id: string | number) => void
  onCreate: () => void
  onVerificar: () => void
  onVerificarIndividual: (b: BotMidia) => Promise<void>
  onCadastrarNoFunil: (b: BotMidia) => void
  onDispensarProblema: (id: string | number) => void
  onDispensarTodos: () => void
  searchTerm: string
  onSearchChange: (term: string) => void
  totalBots: number
  isNewBot: (createdAt?: string) => boolean
  // Tag system
  botTags: BotTagData[]
  botTagsMap: Record<string, string[]>
  // Mass selection
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  // Mass actions
  onMassDelete: () => void
  onMassAddTag: (tagId: string) => void
  onMassRemoveTag: (tagId: string) => void
  onManageTags: () => void
  /** Quando true, usa o mesmo estilo de card/lista da página Contas (container e linhas) */
  layoutContas?: boolean
}

function getStatusBorder(bot: BotMidia) {
  return bot.status === 'Ativo' ? 'border-l-emerald-500' : 'border-l-red-500'
}

function getProblemaLabel(bot: BotMidia) {
  if (bot.status === 'Inativo') {
    if (bot.statusDetalhe === 'erro') return { label: 'ERRO', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' }
    return { label: 'OFF', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' }
  }
  return null
}

export function BotsVendasTable({
  bots,
  loading,
  problemas,
  onConfig,
  onDelete,
  onCreate,
  onVerificar,
  onVerificarIndividual,
  onCadastrarNoFunil,
  onDispensarProblema,
  onDispensarTodos,
  searchTerm,
  onSearchChange,
  totalBots,
  isNewBot,
  // Tags
  botTags,
  botTagsMap,
  // Mass selection
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  // Mass actions
  onMassDelete,
  onMassAddTag,
  onMassRemoveTag,
  onManageTags,
  layoutContas = false,
}: BotsVendasTableProps) {
  const [showTagFilterDropdown, setShowTagFilterDropdown] = useState(false)
  const [showMassTagDropdown, setShowMassTagDropdown] = useState(false)
  const [showMassRemoveTagDropdown, setShowMassRemoveTagDropdown] = useState(false)
  const [filtroTag, setFiltroTag] = useState<FiltroTag>('todas')

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown="tag-filter"]')) {
        setShowTagFilterDropdown(false)
      }
      if (!target.closest('[data-dropdown="mass-tag"]')) {
        setShowMassTagDropdown(false)
      }
      if (!target.closest('[data-dropdown="mass-remove-tag"]')) {
        setShowMassRemoveTagDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Filtrar bots por tag
  const botsFiltrados = bots.filter(bot => {
    if (filtroTag === 'todas') return true
    if (filtroTag === 'rodando') return bot.status === 'Ativo'
    if (filtroTag === 'paradas') return bot.status === 'Inativo'
    const botId = String(bot.id)
    if (filtroTag === 'sem-tag') {
      return !botTagsMap[botId] || botTagsMap[botId].length === 0
    }
    // Filtrar por tagId específico
    return botTagsMap[botId]?.includes(filtroTag) || false
  })

  const allVisibleSelected = botsFiltrados.length > 0 && botsFiltrados.every(b => selectedIds.has(String(b.id)))
  const someSelected = selectedIds.size > 0

  /** Retorna as tags de um bot específico */
  const getTagsDoBot = (botId: string | number): BotTagData[] => {
    const tagIds = botTagsMap[String(botId)] || []
    return botTags.filter(t => tagIds.includes(t.id))
  }

  return (
    <div className={layoutContas ? 'flex flex-1 flex-col min-h-0' : 'space-y-4'}>
      {/* Toolbar unificada */}
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${layoutContas ? 'border-b border-gray-800 px-4 py-3' : ''}`}>
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou @username..."
            className="w-full rounded-lg border border-gray-800 bg-[#0d1117] py-2 pl-9 pr-8 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-gray-600"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-600 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFiltroTag('todas')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${filtroTag === 'todas' ? 'bg-[#1c2536] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroTag('rodando')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${filtroTag === 'rodando' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Play className="h-3 w-3" />
            Rodando
          </button>
          <button
            onClick={() => setFiltroTag('paradas')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${filtroTag === 'paradas' ? 'bg-amber-500/15 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Pause className="h-3 w-3" />
            Paradas
          </button>
          <button
            onClick={() => setFiltroTag('sem-tag')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${filtroTag === 'sem-tag' ? 'bg-[#1c2536] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sem tag
          </button>

          {/* Filtro por Tag dropdown */}
          {botTags.length > 0 && (
            <div className="relative" data-dropdown="tag-filter">
              <button
                onClick={() => setShowTagFilterDropdown(!showTagFilterDropdown)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${filtroTag !== 'todas' && filtroTag !== 'rodando' && filtroTag !== 'paradas' && filtroTag !== 'sem-tag'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                <Tag className="h-3 w-3" />
                Tags
              </button>
              {showTagFilterDropdown && (
                <div className="absolute right-0 z-50 mt-1.5 max-h-60 w-52 overflow-y-auto rounded-xl border border-gray-800 bg-[#161b22] p-1 shadow-2xl">
                  {botTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { setFiltroTag(tag.id); setShowTagFilterDropdown(false) }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${filtroTag === tag.id ? 'bg-blue-500/10 text-blue-300' : 'text-gray-400 hover:bg-[#21262d] hover:text-gray-200'
                        }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                      <span className="truncate">{tag.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mx-1 hidden h-5 w-px bg-gray-800 lg:block" />

          <button
            onClick={onVerificar}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#131a24] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-700 hover:bg-[#1c2536] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </button>
          <button
            onClick={onManageTags}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-all hover:bg-blue-500/20"
          >
            <Settings className="h-3.5 w-3.5" />
            Tags
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

      {/* Barra de Ações em Massa */}
      {someSelected && (
        <div className={`flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-2.5 ${layoutContas ? 'mx-4 mt-2' : ''}`}>
          <span className="text-xs font-medium text-blue-300">
            {selectedIds.size} selecionado(s)
          </span>
          <div className="mx-2 h-4 w-px bg-blue-500/20" />

          {/* Adicionar tag em massa */}
          <div className="relative" data-dropdown="mass-tag">
            <button
              onClick={() => setShowMassTagDropdown(!showMassTagDropdown)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-300 transition-all hover:bg-blue-500/20"
            >
              <Tag className="h-3 w-3" />
              + Tag
            </button>
            {showMassTagDropdown && (
              <div className="absolute left-0 z-50 mt-1.5 max-h-48 w-48 overflow-y-auto rounded-xl border border-gray-800 bg-[#161b22] p-1 shadow-2xl">
                {botTags.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Nenhuma tag criada</p>
                ) : (
                  botTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { onMassAddTag(tag.id); setShowMassTagDropdown(false) }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200"
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                      <span className="truncate">{tag.nome}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Remover tag em massa */}
          <div className="relative" data-dropdown="mass-remove-tag">
            <button
              onClick={() => setShowMassRemoveTagDropdown(!showMassRemoveTagDropdown)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/20"
            >
              <Tag className="h-3 w-3" />
              - Tag
            </button>
            {showMassRemoveTagDropdown && (
              <div className="absolute left-0 z-50 mt-1.5 max-h-48 w-48 overflow-y-auto rounded-xl border border-gray-800 bg-[#161b22] p-1 shadow-2xl">
                {botTags.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Nenhuma tag criada</p>
                ) : (
                  botTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { onMassRemoveTag(tag.id); setShowMassRemoveTagDropdown(false) }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200"
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                      <span className="truncate">{tag.nome}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Deletar em massa */}
          <button
            onClick={onMassDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-all hover:bg-red-500/20"
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </button>

          <div className="flex-1" />
          <button
            onClick={onDeselectAll}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Alerta de problemas */}
      {problemas.length > 0 && (
        <div className={`rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 ${layoutContas ? 'mx-4 mt-2' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {problemas.length} bot(s) com problema
            </div>
            <button
              onClick={onDispensarTodos}
              className="rounded px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-300"
            >
              Dispensar
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {problemas.map((bot) => {
              const info = getProblemaLabel(bot)
              return (
                <div key={bot.id} className="group inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-[#0d1117] px-2.5 py-1.5">
                  <span className="text-xs text-gray-300">{bot.nome || 'Sem nome'}</span>
                  {info && <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}>{info.label}</span>}
                  <button
                    onClick={() => onDispensarProblema(bot.id)}
                    className="rounded p-0.5 text-gray-600 opacity-0 transition-all hover:text-gray-300 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contador + Select All */}
      <div className={`flex items-center justify-between ${layoutContas ? 'border-b border-gray-800 px-4 py-2' : ''}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (allVisibleSelected) onDeselectAll()
              else onSelectAll()
            }}
            className="rounded p-0.5 text-gray-500 hover:text-gray-300 transition-all"
            title={allVisibleSelected ? 'Desselecionar todos' : 'Selecionar todos'}
          >
            {allVisibleSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-400" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          <p className={`${layoutContas ? 'text-sm text-gray-500' : 'text-xs text-gray-600'}`}>{botsFiltrados.length} de {totalBots} bots</p>
        </div>
      </div>

      {/* Card List */}
      {botsFiltrados.length === 0 ? (
        <div className={`rounded-xl border border-dashed border-gray-800 py-16 text-center ${layoutContas ? 'mx-4 my-4' : ''}`}>
          <p className="text-sm text-gray-400">Nenhum bot encontrado</p>
          <p className="mt-1 text-xs text-gray-600">Crie um novo bot ou ajuste os filtros.</p>
        </div>
      ) : (
        <div className={layoutContas ? 'flex-1 overflow-y-auto min-h-0' : 'space-y-2'}>
          {botsFiltrados.map((bot) => {
            const borderColor = getStatusBorder(bot)
            const problemaInfo = getProblemaLabel(bot)
            const botId = String(bot.id)
            const isSelected = selectedIds.has(botId)
            const tagsDoBot = getTagsDoBot(bot.id)

            const rowBase = layoutContas
              ? `group relative flex items-center gap-3 border-b border-gray-800 px-4 py-3 transition-colors ${borderColor} ${isSelected ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]'}`
              : `group relative flex items-center gap-3 rounded-xl border border-gray-800/80 border-l-[3px] px-3 py-3 transition-all hover:border-gray-700/80 ${borderColor} ${isSelected ? 'bg-blue-500/5 border-blue-500/30' : 'bg-[#131a24] hover:bg-[#172033]'}`

            return (
              <div
                key={bot.id}
                className={rowBase}
              >
                {/* Checkbox de seleção */}
                <button
                  onClick={() => onToggleSelect(botId)}
                  className="shrink-0 rounded p-0.5 transition-all"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
                  )}
                </button>

                {/* Nome + Username */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isNewBot(bot.createdAt) && (
                      <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        NOVO
                      </span>
                    )}
                    <span className={`truncate text-sm font-medium ${bot.status === 'Inativo' ? 'text-red-400' : 'text-gray-100'}`}>
                      {bot.nome || '-'}
                    </span>
                    <span className="shrink-0 text-xs text-gray-600">
                      {bot.username ? '@' + bot.username.replace('@', '') : ''}
                    </span>
                  </div>
                </div>

                {/* Tags do bot */}
                <div className="hidden min-w-0 max-w-[280px] items-center gap-1.5 md:flex">
                  {tagsDoBot.length > 0 ? (
                    <>
                      {tagsDoBot.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="truncate rounded px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: tag.cor + '20',
                            color: tag.cor,
                          }}
                        >
                          {tag.nome}
                        </span>
                      ))}
                      {tagsDoBot.length > 3 && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] text-gray-500">
                          +{tagsDoBot.length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] italic text-gray-600">Sem tags</span>
                  )}
                </div>

                {/* Status badge */}
                <div className="hidden shrink-0 sm:block min-w-[120px] text-right">
                  {problemaInfo ? (
                    <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${problemaInfo.cls}`}>
                      {problemaInfo.label}
                    </span>
                  ) : bot.status === 'Ativo' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      ATIVO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                      INATIVO
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

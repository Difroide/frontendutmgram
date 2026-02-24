import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, MessageSquare, Pencil } from 'lucide-react'
import { fixadorService, type Bot, type Grupo } from '../fixadorService'
import { VerificarTopicosModal } from './VerificarTopicosModal'

function groupByGroupId(grupos: Grupo[]): Map<string, Grupo[]> {
  const map = new Map<string, Grupo[]>()
  for (const g of grupos) {
    const list = map.get(g.groupId) || []
    list.push(g)
    map.set(g.groupId, list)
  }
  return map
}

export function BotsGruposTab() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVerificarTopicos, setModalVerificarTopicos] = useState<{
    open: boolean
    groupLink: string
    groupName?: string
    botId: string
    groupId?: string
    isNewGroup?: boolean
    isEditGroup?: boolean
    newGroupLink?: string
  } | null>(null)
  const [novoBot, setNovoBot] = useState({ nome: '', token: '', username: '' })
  const [novoGrupo, setNovoGrupo] = useState<Record<string, { link: string; nome: string }>>({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await fixadorService.listarBots()
      setBots(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCriarBot = async () => {
    if (!novoBot.token.trim()) return
    try {
      await fixadorService.criarBot(novoBot)
      setNovoBot({ nome: '', token: '', username: '' })
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoverBot = async (id: string) => {
    if (!confirm('Excluir este bot e todos os grupos vinculados?')) return
    try {
      await fixadorService.removerBot(id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdicionarGrupo = async (botId: string) => {
    const g = novoGrupo[botId]
    if (!g?.link?.trim()) return
    try {
      const bot = await fixadorService.adicionarGrupo(botId, { groupLink: g.link, groupName: g.nome || 'Grupo' })
      setNovoGrupo((prev) => ({ ...prev, [botId]: { link: '', nome: '' } }))
      load()
      if (bot) {
        const added = bot.grupos?.find((gr) => gr.groupLink === g.link)
        if (added?.groupId) fixadorService.iniciarCicloGrupo(botId, added.groupId, added.topicId ?? null).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoverGrupo = async (botId: string, grupo: Grupo) => {
    if (!confirm('Remover este grupo?')) return
    try {
      await fixadorService.removerGrupo(botId, grupo.groupId, grupo.topicId ?? undefined)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const openVerificarTopicos = (botId: string, grupo: Grupo, isNew = false, isEdit = false, newLink?: string) => {
    setModalVerificarTopicos({
      open: true,
      groupLink: newLink || grupo.groupLink,
      groupName: grupo.groupName,
      botId,
      groupId: grupo.groupId || undefined,
      isNewGroup: isNew,
      isEditGroup: isEdit,
      newGroupLink: newLink,
    })
  }

  const handleTopicosSelecionados = async (
    groupId: string,
    groupName: string,
    topics: { topicId: number | null; topicTitle?: string }[]
  ) => {
    if (!modalVerificarTopicos || topics.length === 0) return
    const { botId, isNewGroup, isEditGroup, newGroupLink, groupLink } = modalVerificarTopicos
    const link = newGroupLink || groupLink
    try {
      if (isEditGroup && groupId) {
        await fixadorService.atualizarGrupo(botId, groupId, { groupName, topics })
      } else if (isNewGroup && link) {
        for (const t of topics) {
          await fixadorService.adicionarGrupo(botId, {
            groupId,
            groupLink: link,
            groupName,
            topicId: t.topicId,
            topicTitle: t.topicTitle,
          })
          fixadorService.iniciarCicloGrupo(botId, groupId, t.topicId).catch(() => {})
        }
        setNovoGrupo((prev) => ({ ...prev, [botId]: { link: '', nome: '' } }))
      } else if (!isNewGroup && groupId && link) {
        const bot = bots.find((b) => b.id === botId)
        const gruposDoGrupo = bot?.grupos.filter((g) => g.groupId === groupId || g.groupLink === link) ?? []
        for (const g of gruposDoGrupo) {
          await fixadorService.removerGrupo(botId, g.groupId, g.topicId ?? undefined)
        }
        for (const t of topics) {
          await fixadorService.adicionarGrupo(botId, {
            groupId,
            groupLink: link,
            groupName,
            topicId: t.topicId,
            topicTitle: t.topicTitle,
          })
          fixadorService.iniciarCicloGrupo(botId, groupId, t.topicId).catch(() => {})
        }
      }
      load()
    } catch (e) {
      console.error(e)
    }
    setModalVerificarTopicos(null)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-300">Novo bot</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Nome"
            value={novoBot.nome}
            onChange={(e) => setNovoBot((b) => ({ ...b, nome: e.target.value }))}
            className="rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Token do bot *"
            value={novoBot.token}
            onChange={(e) => setNovoBot((b) => ({ ...b, token: e.target.value }))}
            className="min-w-[200px] rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="@username"
            value={novoBot.username}
            onChange={(e) => setNovoBot((b) => ({ ...b, username: e.target.value }))}
            className="rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          />
          <button
            onClick={handleCriarBot}
            disabled={!novoBot.token.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Adicionar bot
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : bots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-700 py-8 text-center text-sm text-gray-500">
          Nenhum bot cadastrado. Adicione acima.
        </p>
      ) : (
        <div className="space-y-6">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="rounded-xl border border-gray-800 bg-[#131a24] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-200">{bot.nome}</h4>
                  <p className="text-xs text-gray-500">{bot.username || 'Sem username'}</p>
                </div>
                <button
                  onClick={() => handleRemoverBot(bot.id)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Link do grupo (t.me/+xxx ou t.me/c/xxx)"
                  value={novoGrupo[bot.id]?.link || ''}
                  onChange={(e) =>
                    setNovoGrupo((prev) => ({
                      ...prev,
                      [bot.id]: { ...prev[bot.id], link: e.target.value, nome: prev[bot.id]?.nome || '' },
                    }))
                  }
                  className="min-w-[240px] flex-1 rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
                />
                <input
                  type="text"
                  placeholder="Nome (opcional)"
                  value={novoGrupo[bot.id]?.nome || ''}
                  onChange={(e) =>
                    setNovoGrupo((prev) => ({
                      ...prev,
                      [bot.id]: { ...prev[bot.id], nome: e.target.value, link: prev[bot.id]?.link || '' },
                    }))
                  }
                  className="w-32 rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
                />
                <button
                  onClick={() => {
                    const link = novoGrupo[bot.id]?.link?.trim()
                    if (link) openVerificarTopicos(bot.id, { groupLink: link, groupName: novoGrupo[bot.id]?.nome || '', groupId: '', topicId: null }, true, false, link)
                  }}
                  disabled={!novoGrupo[bot.id]?.link?.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  Verificar tópicos
                </button>
                <button
                  onClick={() => handleAdicionarGrupo(bot.id)}
                  disabled={!novoGrupo[bot.id]?.link?.trim()}
                  className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  Adicionar grupo
                </button>
              </div>

              <div className="space-y-2">
                {Array.from(groupByGroupId(bot.grupos || [])).map(([groupId, slots]) => {
                  const primeiro = slots[0]
                  const topicosStr = slots
                    .map((s) => (s.topicTitle && s.topicTitle.trim() ? s.topicTitle : s.topicId != null ? `#${s.topicId}` : 'Chat principal'))
                    .join(', ')
                  return (
                    <div
                      key={groupId}
                      className="rounded-lg border border-gray-700/50 bg-[#0d1117] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="text-sm font-medium text-gray-200">
                              {primeiro.groupName || primeiro.groupLink || groupId}
                            </span>
                          </div>
                          <p className="mt-1 pl-6 text-xs text-gray-500">
                            Tópicos: {topicosStr}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => openVerificarTopicos(bot.id, primeiro, false, true)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-700 hover:text-cyan-400"
                            title="Editar nome e tópicos"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Remover este grupo e todos os seus tópicos?')) return
                              try {
                                for (const g of slots) {
                                  await fixadorService.removerGrupo(bot.id, g.groupId, g.topicId ?? undefined)
                                }
                                load()
                              } catch (e) {
                                console.error(e)
                              }
                            }}
                            className="rounded p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(!bot.grupos || bot.grupos.length === 0) && (
                  <p className="py-2 text-center text-xs text-gray-600">Nenhum grupo vinculado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalVerificarTopicos?.open && (
        <VerificarTopicosModal
          isOpen={true}
          onClose={() => setModalVerificarTopicos(null)}
          groupLink={modalVerificarTopicos.groupLink}
          groupName={modalVerificarTopicos.groupName}
          botId={modalVerificarTopicos.botId}
          groupId={modalVerificarTopicos.groupId}
          initialTopicIds={
            modalVerificarTopicos.isEditGroup && modalVerificarTopicos.groupId
              ? bots
                  .find((b) => b.id === modalVerificarTopicos.botId)
                  ?.grupos.filter((g) => g.groupId === modalVerificarTopicos.groupId)
                  .map((g) => g.topicId ?? null) ?? []
              : undefined
          }
          initialTopics={
            modalVerificarTopicos.isEditGroup && modalVerificarTopicos.groupId
              ? bots
                  .find((b) => b.id === modalVerificarTopicos.botId)
                  ?.grupos.filter((g) => g.groupId === modalVerificarTopicos.groupId)
                  .map((g) => ({ topicId: g.topicId ?? null, topicTitle: g.topicTitle })) ?? []
              : undefined
          }
          onTopicosSelecionados={handleTopicosSelecionados}
        />
      )}
    </div>
  )
}

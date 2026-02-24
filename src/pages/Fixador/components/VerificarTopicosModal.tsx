import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { fixadorService, type Topico } from '../fixadorService'

interface Conta {
  id: string
  numero?: string
  tags?: string[]
}

const TAG_VIP_VERIFICACAO = 'VIP VERIFICAÇÃO'

interface VerificarTopicosModalProps {
  isOpen: boolean
  onClose: () => void
  groupLink: string
  groupName?: string
  botId: string
  groupId?: string
  initialTopicIds?: (number | null)[]
  initialTopics?: { topicId: number | null; topicTitle?: string }[]
  onTopicosSelecionados: (groupId: string, groupName: string, topics: { topicId: number | null; topicTitle?: string }[]) => void
}

export function VerificarTopicosModal({
  isOpen,
  onClose,
  groupLink,
  groupName = '',
  botId,
  groupId: existingGroupId,
  initialTopicIds,
  initialTopics,
  onTopicosSelecionados,
}: VerificarTopicosModalProps) {
  const [contas, setContas] = useState<Conta[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number | null>>(
    initialTopicIds?.length ? new Set(initialTopicIds) : new Set([null])
  )
  const [resolvedGroupId, setResolvedGroupId] = useState<string | undefined>(existingGroupId)
  const [resolvedGroupName, setResolvedGroupName] = useState(groupName)
  const [isForum, setIsForum] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setTopicos([])
      setSelectedTopicIds(initialTopicIds?.length ? new Set(initialTopicIds) : new Set([null]))
      setResolvedGroupId(existingGroupId)
      setResolvedGroupName(groupName)
      setVerificando(false)
      const loadContas = async () => {
        setLoading(true)
        try {
          ;(window as any).electron?.tags?.carregarTodas?.()?.catch?.(() => {})
          const data = await (window as any).electron?.telegram?.getContas?.()
          const lista = data || []
          setContas(lista)
          const comVip = lista.filter((c: Conta) => Array.isArray(c.tags) && c.tags.includes(TAG_VIP_VERIFICACAO))
          if (comVip.length > 0) {
            setContaSelecionada(comVip[0].numero || String(comVip[0].id))
          } else if (lista.length > 0) {
            setContaSelecionada(lista[0].numero || lista[0].id || String(lista[0]))
          }
        } catch (e) {
          console.error(e)
          setError('Erro ao carregar contas')
        } finally {
          setLoading(false)
        }
      }
      loadContas()
    }
  }, [isOpen, groupLink, existingGroupId, groupName, initialTopicIds])

  const handleVerificar = async () => {
    const link = (groupLink != null && typeof groupLink === 'string') ? groupLink.trim() : ''
    if (!contaSelecionada || !link) {
      setError('Selecione uma conta e informe o link do grupo')
      return
    }
    setVerificando(true)
    setError(null)
    setTopicos([])
    try {
      const result = await fixadorService.verificarTopicosGrupo(String(contaSelecionada), link)
      if (result.error) {
        setError(result.error)
        return
      }
      const list = result.topicos || []
      setTopicos(list)
      setIsForum(result.isForum)
      if (result.groupId) setResolvedGroupId(result.groupId)
      if (result.groupName) setResolvedGroupName(result.groupName)
      setSelectedTopicIds(new Set([null, ...list.map((t) => t.id)]))
    } catch (e) {
      setError((e as Error).message || 'Erro ao verificar tópicos')
    } finally {
      setVerificando(false)
    }
  }

  const toggleTopico = (id: number | null) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirmar = () => {
    const gId = resolvedGroupId || existingGroupId
    if (!gId) {
      setError('groupId não foi resolvido. Use um link t.me/c/xxx ou uma sessão que seja membro do grupo.')
      return
    }
    const ids = Array.from(selectedTopicIds)
    if (ids.length === 0) {
      setError('Selecione pelo menos um tópico (ou chat principal).')
      return
    }
    const topics = ids.map((topicId) => {
      if (topicId === null) return { topicId: null as number | null, topicTitle: 'Chat principal' }
      const t = topicos.find((x) => x.id === topicId)
      const fromInitial = initialTopics?.find((x) => x.topicId === topicId)
      return { topicId, topicTitle: t?.title ?? fromInitial?.topicTitle ?? `Tópico #${topicId}` }
    })
    onTopicosSelecionados(gId, resolvedGroupName || groupName, topics)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-800 bg-[#0d1117] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Verificar tópicos</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-500">
          {contas.some((c) => c.tags?.includes(TAG_VIP_VERIFICACAO)) ? (
            <>
              Usando sessão com tag <strong className="text-purple-400">{TAG_VIP_VERIFICACAO}</strong> automaticamente.
            </>
          ) : (
            <>
              Selecione uma sessão que seja <strong>membro do grupo</strong> para listar os tópicos.
            </>
          )}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Link do grupo</label>
            <input
              type="text"
              value={groupLink ?? ''}
              readOnly
              className="w-full rounded-lg border border-gray-700 bg-[#131a24] px-3 py-2 text-sm text-gray-400"
            />
          </div>

          {!contas.some((c) => c.tags?.includes(TAG_VIP_VERIFICACAO)) && (
            <div>
              <label className="mb-1 block text-xs text-gray-400">Sessão (conta)</label>
              <select
                value={contaSelecionada}
                onChange={(e) => setContaSelecionada(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-700 bg-[#131a24] px-3 py-2 text-sm text-gray-200"
              >
                {loading ? (
                  <option>Carregando...</option>
                ) : (
                  contas.map((c) => {
                    const accountId = c.numero || c.id
                    return (
                      <option key={accountId} value={accountId}>
                        {c.numero || c.id}
                      </option>
                    )
                  })
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Adicione a tag &quot;{TAG_VIP_VERIFICACAO}&quot; a uma sessão para usá-la automaticamente aqui.
              </p>
            </div>
          )}

          <button
            onClick={handleVerificar}
            disabled={verificando || !contaSelecionada}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            <Search className={`h-4 w-4 ${verificando ? 'animate-pulse' : ''}`} />
            {verificando ? 'Verificando...' : 'Verificar tópicos'}
          </button>

          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
          )}

          {(topicos.length > 0 || resolvedGroupId) && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Nome do grupo</label>
                <input
                  type="text"
                  value={resolvedGroupName}
                  onChange={(e) => setResolvedGroupName(e.target.value)}
                  placeholder="Nome para identificar o grupo"
                  className="w-full rounded-lg border border-gray-700 bg-[#131a24] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Marque os tópicos em que o disparo será feito (desmarque os que não devem receber)
                </label>
              <div className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 p-2 hover:bg-gray-800/50">
                  <input
                    type="checkbox"
                    checked={selectedTopicIds.has(null)}
                    onChange={() => toggleTopico(null)}
                  />
                  <span className="text-sm text-gray-300">Chat principal (sem tópico)</span>
                </label>
                {topicos.length > 0
                  ? topicos.map((t) => (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 p-2 hover:bg-gray-800/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopicIds.has(t.id)}
                          onChange={() => toggleTopico(t.id)}
                        />
                        <span className="text-sm text-gray-300">{t.title}</span>
                        {t.closed && <span className="text-xs text-amber-500">(fechado)</span>}
                      </label>
                    ))
                  : (() => {
                      const list = initialTopics ?? []
                      return list.map((t) => (
                      <label
                        key={t.topicId ?? 'main'}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 p-2 hover:bg-gray-800/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopicIds.has(t.topicId ?? null)}
                          onChange={() => toggleTopico(t.topicId ?? null)}
                        />
                        <span className="text-sm text-gray-300">{t.topicTitle || (t.topicId != null ? `Tópico #${t.topicId}` : 'Chat principal')}</span>
                        <span className="text-xs text-gray-500">(clique em Verificar para atualizar)</span>
                      </label>
                    ))
                  })()}
              </div>
              </div>
            </div>
          )}

          {!isForum && topicos.length === 0 && !verificando && !error && resolvedGroupId && (
            <p className="text-sm text-gray-500">Grupo não possui tópicos. O envio será no chat principal.</p>
          )}

          {(resolvedGroupId || topicos.length > 0) && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmar}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Confirmar
              </button>
              <button onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Tag, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { BotMidia, BotMidiaFormData } from '@/types/BotMidia'
import { useModal } from '@/hooks/useModal'
import { useData } from '@/contexts/DataContext'
import { useModo } from '@/contexts/ModoContext'
import { botMidiaService, botTagsService, BotTagData } from './botMidiaService'
import { BotMidiaModal } from './BotMidiaModal'
import { BotConfigModal } from './BotConfigModal'
import { TagsManagerModal } from './TagsManagerModal'
import { BotsTopBar } from './components/BotsTopBar'
import { BotsVendasTable } from './components/BotsVendasTable'
import { BotsDisparoTable } from './components/BotsDisparoTable'
import { BotsReutilizadosTable } from './components/BotsReutilizadosTable'
import { CraftFunilModal } from './components/CraftFunilModal'
import { VerificacaoResultadoModal } from './components/VerificacaoResultadoModal'

type TabType = 'vendas' | 'disparo' | 'reutilizados'

interface CategoriaInfo {
  id: string
  nome: string
  rodando?: boolean
}

interface VerificacaoResultado {
  total: number
  ativos: number
  banidos: number
  semResposta?: number
  congelados: number
  erros: number
  problemas: BotMidia[]
}

interface FunilCraft {
  nome: string
}

interface CraftFunilJobPendente {
  jobId: string
  botNome: string
  funil: string
}



const isNewBot = (createdAt?: string): boolean => {
  if (!createdAt) return false
  const criacao = new Date(createdAt).getTime()
  const agora = Date.now()
  return (agora - criacao) < (24 * 60 * 60 * 1000)
}

export default function BotsMidia() {
  const { bots, refreshBots, setBots } = useData()
  const modal = useModal()
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'
  const [isBotsCardExpanded, setIsBotsCardExpanded] = useState(true)

  const [selectedBot, setSelectedBot] = useState<BotMidia | null>(null)
  const [configBot, setConfigBot] = useState<BotMidia | null>(null)
  const [showTagsManager, setShowTagsManager] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('vendas')
  const [selectedDisparoIds, setSelectedDisparoIds] = useState<Set<string | number>>(new Set())
  const [problemasVerificacao, setProblemasVerificacao] = useState<BotMidia[]>([])
  const [problemasDispensados, setProblemasDispensados] = useState<Set<string | number>>(new Set())
  const [showNotificacaoPopup, setShowNotificacaoPopup] = useState(false)
  const [verificacaoResultado, setVerificacaoResultado] = useState<VerificacaoResultado | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [botParaCadastrarFunil, setBotParaCadastrarFunil] = useState<BotMidia | null>(null)
  const [funisCraft, setFunisCraft] = useState<FunilCraft[]>([])
  const [funilSelecionado, setFunilSelecionado] = useState('')
  const [loadingFunisCraft, setLoadingFunisCraft] = useState(false)
  const [cadastrandoFunilCraft, setCadastrandoFunilCraft] = useState(false)
  const [erroFunilCraft, setErroFunilCraft] = useState<string | null>(null)
  const [sucessoFunilCraft, setSucessoFunilCraft] = useState<string | null>(null)
  const [jobsFunilPendentes, setJobsFunilPendentes] = useState<CraftFunilJobPendente[]>([])
  const [botsReutilizados, setBotsReutilizados] = useState<any[]>([])
  const [loadingReutilizados, setLoadingReutilizados] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([])

  // ═══ Tags de bots ═══
  const [botTags, setBotTags] = useState<BotTagData[]>([])
  const [botTagsMap, setBotTagsMap] = useState<Record<string, string[]>>({})

  // ═══ Seleção em massa (vendas) ═══
  const [selectedVendasIds, setSelectedVendasIds] = useState<Set<string>>(new Set())

  // Carregar tags de bots ao iniciar
  const loadBotTags = async () => {
    try {
      const [tags, mapa] = await Promise.all([
        botTagsService.carregar(),
        botTagsService.mapa(),
      ])
      setBotTags(tags)
      setBotTagsMap(mapa)
    } catch (error) {
      console.error('[BotsMidia] Erro ao carregar tags:', error)
    }
  }

  useEffect(() => {
    loadBotTags()
    // Carregar categorias para reutilizados (mantido para compatibilidade)
    const loadCategorias = async () => {
      try {
        if ((window as any).electron?.criador?.carregarCategorias) {
          const cats = await (window as any).electron.criador.carregarCategorias()
          setCategorias(cats || [])
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      }
    }
    loadCategorias()
  }, [])

  const loadBotsReutilizados = async () => {
    setLoadingReutilizados(true)
    try {
      if ((window as any).electron?.criador?.carregarBotsReutilizados) {
        const data = await (window as any).electron.criador.carregarBotsReutilizados()
        setBotsReutilizados(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar bots reutilizados:', error)
    } finally {
      setLoadingReutilizados(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reutilizados') {
      loadBotsReutilizados()
    }
  }, [activeTab])

  useEffect(() => {
    if ((window as any).electron?.botMidia?.onBotOffline) {
      const handleBotOffline = (data: { mensagem: string }) => {
        alert('Atencao: ' + data.mensagem)
        refreshBots()
      }
        ; (window as any).electron.botMidia.onBotOffline(handleBotOffline)
      return () => {
        if ((window as any).electron?.botMidia?.removeBotOffline) {
          ; (window as any).electron.botMidia.removeBotOffline()
        }
      }
    }
    return
  }, [refreshBots])

  useEffect(() => {
    if (jobsFunilPendentes.length === 0) return
    const electron = (window as any).electron
    if (!electron?.craftpay?.consultarJobFunil) return

    const timer = setInterval(async () => {
      try {
        const snapshot = [...jobsFunilPendentes]
        for (const job of snapshot) {
          const status = await electron.craftpay.consultarJobFunil(job.jobId)
          if (!status?.success || !status?.job) continue
          const st = status.job.status
          if (st === 'completed') {
            setJobsFunilPendentes(prev => prev.filter(j => j.jobId !== job.jobId))
            alert(`Craft: bot ${job.botNome} cadastrado no funil "${job.funil}".`)
          } else if (st === 'failed') {
            setJobsFunilPendentes(prev => prev.filter(j => j.jobId !== job.jobId))
            alert(`Craft: falha ao cadastrar ${job.botNome} no funil "${job.funil}". ${status.job.error || ''}`.trim())
          }
        }
      } catch (_) { }
    }, 2500)

    return () => clearInterval(timer)
  }, [jobsFunilPendentes])

  const problemasVisiveis = useMemo(() => {
    const botsIds = new Set(bots.map(b => b.id))
    return problemasVerificacao.filter(p => botsIds.has(p.id) && !problemasDispensados.has(p.id))
  }, [problemasVerificacao, bots, problemasDispensados])

  const botsVendas = useMemo(() => {
    let filtered = bots.filter(b => b.tipoBot === 'vendas')

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().replace('@', '')
      filtered = filtered.filter(
        b => (b.nome || '').toLowerCase().includes(term) ||
          (b.username || '').toLowerCase().replace('@', '').includes(term),
      )
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  }, [bots, searchTerm])

  const botsDisparo = useMemo(() => {
    return bots
      .filter(b => b.tipoBot === 'disparo')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
  }, [bots])

  const loadBots = async () => {
    setLoading(true)
    try {
      await refreshBots()
    } catch (error) {
      alert('Erro ao carregar bots: ' + (error instanceof Error ? error.message : 'Erro'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedBot(null)
    modal.open()
  }

  const handleOpenConfig = (bot: BotMidia) => setConfigBot(bot)

  const handleSaveConfig = async (data: Partial<BotMidia>) => {
    try {
      if (!data.id) return
      const result = await botMidiaService.updateBot(data.id, data)
      if (result.success) {
        await loadBots()
        alert('Bot atualizado!')
      } else {
        alert(result.error || 'Erro ao atualizar bot')
      }
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  // ═══ Handlers de Tags ═══
  const handleToggleTag = async (botId: string, tagId: string, currentlyHasTag: boolean) => {
    try {
      if (currentlyHasTag) {
        await botTagsService.removerBot(botId, tagId)
      } else {
        await botTagsService.adicionarBot(botId, tagId)
      }
      await loadBotTags()
    } catch (error) {
      console.error('Erro ao toggle tag:', error)
    }
  }

  const handleCreateTag = async (nome: string, cor: string) => {
    try {
      const result = await botTagsService.criar(nome, cor)
      if (result.success) {
        await loadBotTags()
      } else {
        alert(result.error || 'Erro ao criar tag')
      }
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      const result = await botTagsService.deletar(tagId)
      if (result.success) {
        await loadBotTags()
      } else {
        alert(result.error || 'Erro ao deletar tag')
      }
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  // ═══ Seleção em massa (vendas) ═══
  const handleToggleSelectVenda = (id: string) => {
    setSelectedVendasIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllVendas = () => {
    setSelectedVendasIds(new Set(botsVendas.map(b => String(b.id))))
  }

  const handleDeselectAllVendas = () => {
    setSelectedVendasIds(new Set())
  }

  // ═══ Ações em massa (vendas) ═══
  const handleMassDeleteVendas = async () => {
    if (selectedVendasIds.size === 0) return
    if (!confirm(`Excluir ${selectedVendasIds.size} bot(s)?`)) return
    try {
      for (const id of selectedVendasIds) {
        await botMidiaService.delete(id)
      }
      setSelectedVendasIds(new Set())
      await loadBots()
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const handleMassAddTag = async (tagId: string) => {
    if (selectedVendasIds.size === 0) return
    try {
      await botTagsService.adicionarMassa(Array.from(selectedVendasIds), tagId)
      await loadBotTags()
    } catch (error) {
      console.error('Erro ao adicionar tag em massa:', error)
    }
  }

  const handleMassRemoveTag = async (tagId: string) => {
    if (selectedVendasIds.size === 0) return
    try {
      await botTagsService.removerMassa(Array.from(selectedVendasIds), tagId)
      await loadBotTags()
    } catch (error) {
      console.error('Erro ao remover tag em massa:', error)
    }
  }

  const handleSave = async (data: BotMidiaFormData) => {
    try {
      if (selectedBot) await botMidiaService.update(selectedBot.id, data)
      else await botMidiaService.create(data)
      await loadBots()
      modal.close()
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const handleDelete = async (id: number | string) => {
    if (!confirm('Excluir este bot?')) return
    try {
      await botMidiaService.delete(id)
      await loadBots()
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const handleVerificar = async () => {
    setLoading(true)
    try {
      const result = await botMidiaService.verificar()
      if (result.success && result.bots) {
        setBots(result.bots)
        const problemas = result.bots.filter(b => b.status === 'Inativo')
        setProblemasVerificacao(problemas)
        setProblemasDispensados(new Set())

        setVerificacaoResultado({
          total: result.total || 0,
          ativos: result.ativos || 0,
          banidos: 0,
          semResposta: 0,
          congelados: 0,
          erros: problemas.length,
          problemas,
        })
        setShowNotificacaoPopup(true)
      }
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerificarIndividual = async (bot: BotMidia) => {
    if (!bot.username) {
      alert('Bot sem @username')
      return
    }
    try {
      const result = await botMidiaService.verificarIndividual(bot.id, bot.token)
      if (result.success) {
        setBots(((prev: BotMidia[]) => {
          const atualizados = prev.map((b: BotMidia) => (
            b.id === bot.id
              ? { ...b, status: result.status as BotMidia['status'], username: result.username || b.username, statusDetalhe: result.statusDetalhe as BotMidia['statusDetalhe'], error: result.error }
              : b
          ))
          setProblemasVerificacao(atualizados.filter((b) => b.status === 'Inativo'))
          return atualizados
        }) as any)
      }
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const toggleSelectDisparo = (id: string | number) => {
    setSelectedDisparoIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const selectAllDisparo = () => {
    if (selectedDisparoIds.size === botsDisparo.length) setSelectedDisparoIds(new Set())
    else setSelectedDisparoIds(new Set(botsDisparo.map(b => b.id)))
  }

  const handleDeleteSelectedDisparo = async () => {
    if (selectedDisparoIds.size === 0) return
    if (!confirm('Excluir ' + selectedDisparoIds.size + ' bots?')) return
    try {
      for (const id of selectedDisparoIds) await botMidiaService.delete(id)
      setSelectedDisparoIds(new Set())
      await loadBots()
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const handleDeleteSelecionadosVerificacao = async (ids: (string | number)[]) => {
    if (ids.length === 0) return
    if (!confirm('Excluir ' + ids.length + ' bots?')) return
    try {
      for (const id of ids) await botMidiaService.delete(id)
      await loadBots()
      setVerificacaoResultado((prev) =>
        prev
          ? {
              ...prev,
              problemas: prev.problemas.filter((p) => !ids.includes(p.id)),
              erros: prev.erros - ids.length,
            }
          : null
      )
    } catch (error) {
      alert('Erro: ' + (error instanceof Error ? error.message : 'Erro'))
    }
  }

  const carregarFunisCraft = async (forcarAtualizacao = false) => {
    const electron = (window as any).electron
    if (!electron?.craftpay) {
      setErroFunilCraft('Modulo CraftPay nao disponivel.')
      return
    }

    setLoadingFunisCraft(true)
    setErroFunilCraft(null)
    try {
      const result = forcarAtualizacao
        ? await electron.craftpay.listarFunis?.()
        : await electron.craftpay.carregarFunisCache?.()

      if (result?.success && Array.isArray(result.funis)) {
        setFunisCraft(result.funis)
        if (!funilSelecionado && result.funis.length > 0) {
          setFunilSelecionado(result.funis[0].nome)
        }
      } else {
        setFunisCraft([])
        setErroFunilCraft(result?.error || 'Nao foi possivel carregar os funis da Craft.')
      }
    } catch (error: any) {
      setFunisCraft([])
      setErroFunilCraft(error?.message || 'Erro ao carregar funis da Craft.')
    } finally {
      setLoadingFunisCraft(false)
    }
  }

  const abrirModalCadastrarNoFunil = async (bot: BotMidia) => {
    if (!bot.token?.trim()) {
      alert('Este bot nao possui token cadastrado.')
      return
    }
    if (!bot.username?.trim()) {
      alert('Este bot nao possui @username cadastrado.')
      return
    }
    setBotParaCadastrarFunil(bot)
    setErroFunilCraft(null)
    setSucessoFunilCraft(null)
    setFunilSelecionado('')
    await carregarFunisCraft(false)
  }

  const fecharModalFunilCraft = () => {
    setBotParaCadastrarFunil(null)
    setErroFunilCraft(null)
    setSucessoFunilCraft(null)
    setCadastrandoFunilCraft(false)
  }

  const handleCadastrarBotNoFunil = async () => {
    const electron = (window as any).electron
    if (!botParaCadastrarFunil) return
    if (!electron?.craftpay?.adicionarBotsAoFunilBackground) {
      setErroFunilCraft('Integracao com CraftPay nao disponivel.')
      return
    }
    if (!funilSelecionado) {
      setErroFunilCraft('Selecione um funil.')
      return
    }

    const usernameLimpo = String(botParaCadastrarFunil.username || '').replace(/^@+/, '').trim()
    const nomeParaCraft = usernameLimpo ? `@${usernameLimpo}` : (botParaCadastrarFunil.nome || '')
    if (!nomeParaCraft || !botParaCadastrarFunil.token?.trim()) {
      setErroFunilCraft('Bot invalido para cadastro no funil.')
      return
    }

    setCadastrandoFunilCraft(true)
    setErroFunilCraft(null)
    setSucessoFunilCraft(null)
    try {
      const result = await electron.craftpay.adicionarBotsAoFunilBackground({
        nomeFunil: funilSelecionado,
        bots: [{ nome: nomeParaCraft, token: botParaCadastrarFunil.token.trim() }],
      })

      if (result?.success && result?.jobId) {
        setJobsFunilPendentes(prev => [...prev, { jobId: result.jobId, botNome: nomeParaCraft, funil: funilSelecionado }])
        setSucessoFunilCraft(`Processo iniciado em segundo plano para ${nomeParaCraft} no funil "${funilSelecionado}".`)
        setTimeout(() => fecharModalFunilCraft(), 900)
      } else {
        setErroFunilCraft(result?.error || 'Erro ao cadastrar bot no funil.')
      }
    } catch (error: any) {
      setErroFunilCraft(error?.message || 'Erro ao cadastrar bot no funil.')
    } finally {
      setCadastrandoFunilCraft(false)
    }
  }

  const totalPendenciasFunil = jobsFunilPendentes.length

  const handleVincularBotReutilizado = async (botId: string, categoriaId: string) => {
    try {
      const result = await (window as any).electron?.criador?.vincularBotReutilizadoCategoria?.(botId, categoriaId)
      if (result?.success) {
        await loadBotsReutilizados()
      } else {
        alert(result?.error || 'Erro ao vincular')
      }
    } catch (e: any) {
      alert(e?.message || 'Erro ao vincular')
    }
  }

  const handleEditarBotReutilizado = async (
    botId: string,
    data: { nome: string; username: string; token: string | null }
  ) => {
    try {
      const result = await (window as any).electron?.criador?.atualizarBotReutilizado?.(botId, data)
      if (result?.success) await loadBotsReutilizados()
      else if (result?.error) alert(result.error)
    } catch (e: any) {
      alert(e?.message || 'Erro ao editar')
    }
  }

  const handleRemoverBotReutilizado = async (botId: string) => {
    if (!confirm('Remover bot da lista de reutilizados?')) return
    try {
      const result = await (window as any).electron?.criador?.removerBotReutilizado?.(botId)
      if (result?.success) {
        await loadBotsReutilizados()
      } else {
        alert(result?.error || 'Erro ao remover')
      }
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover')
    }
  }

  const activeBots = activeTab === 'vendas' ? botsVendas : activeTab === 'disparo' ? botsDisparo : []
  const kpi = useMemo(() => {
    const total = activeBots.length
    const ativos = activeBots.filter(b => b.status === 'Ativo').length
    const inativos = activeBots.filter(b => b.status === 'Inativo').length
    const problemas = activeBots.filter(
      b => b.status === 'Inativo',
    ).length
    return { total, ativos, inativos, problemas }
  }, [activeBots])

  const contentAreaHeight = 'calc(100vh - 40px)'
  const sidebarCardGap = 10

  const mainContent = (
    <>
      <BotsTopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botsVendasCount={botsVendas.length}
        botsDisparoCount={botsDisparo.length}
        botsReutilizadosCount={botsReutilizados.length}
        loading={loading}
        kpi={kpi}
        hideKpi={isDifroide}
        hideHeader={isDifroide}
      />

      {totalPendenciasFunil > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-300">
          {totalPendenciasFunil} processo(s) de cadastro no funil rodando em segundo plano.
        </div>
      )}

      <section className={isDifroide ? 'flex-1 flex flex-col min-h-0' : ''}>
        {activeTab === 'reutilizados' ? (
          <div className={isDifroide ? 'bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden flex-1 flex flex-col min-h-0' : ''}>
          <BotsReutilizadosTable
            bots={botsReutilizados}
            loading={loadingReutilizados}
            categorias={categorias}
            onVincularCategoria={handleVincularBotReutilizado}
            onEditar={handleEditarBotReutilizado}
            onRemover={handleRemoverBotReutilizado}
          />
          </div>
        ) : activeTab === 'vendas' ? (
          <div className={isDifroide ? 'bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden flex-1 flex flex-col min-h-0' : ''}>
          <BotsVendasTable
            layoutContas={isDifroide}
            bots={botsVendas}
            loading={loading}
            problemas={problemasVisiveis}
            onConfig={handleOpenConfig}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onVerificar={handleVerificar}
            onVerificarIndividual={handleVerificarIndividual}
            onCadastrarNoFunil={abrirModalCadastrarNoFunil}
            onDispensarProblema={(botId) => setProblemasDispensados(prev => new Set([...prev, botId]))}
            onDispensarTodos={() => setProblemasDispensados(new Set(problemasVerificacao.map(p => p.id)))}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            totalBots={bots.filter(b => b.tipoBot === 'vendas').length}
            isNewBot={isNewBot}
            botTags={botTags}
            botTagsMap={botTagsMap}
            selectedIds={selectedVendasIds}
            onToggleSelect={handleToggleSelectVenda}
            onSelectAll={handleSelectAllVendas}
            onDeselectAll={handleDeselectAllVendas}
            onMassDelete={handleMassDeleteVendas}
            onMassAddTag={handleMassAddTag}
            onMassRemoveTag={handleMassRemoveTag}
            onManageTags={() => setShowTagsManager(true)}
          />
          </div>
        ) : (
          <div className={isDifroide ? 'bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden flex-1 flex flex-col min-h-0' : ''}>
          <BotsDisparoTable
            layoutContas={isDifroide}
            bots={botsDisparo}
            loading={loading}
            selectedIds={selectedDisparoIds}
            onToggleSelect={toggleSelectDisparo}
            onSelectAll={selectAllDisparo}
            onConfig={handleOpenConfig}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onVerificar={handleVerificar}
            onVerificarIndividual={handleVerificarIndividual}
            onCadastrarNoFunil={abrirModalCadastrarNoFunil}
            onDeleteSelected={handleDeleteSelectedDisparo}
          />
          </div>
        )}
      </section>

      <BotMidiaModal isOpen={modal.isOpen} onClose={modal.close} onSave={handleSave} bot={selectedBot} />
      <BotConfigModal
        isOpen={configBot !== null}
        onClose={() => setConfigBot(null)}
        onSave={handleSaveConfig}
        bot={configBot}
        botTags={botTags}
        botTagIds={configBot ? (botTagsMap[String(configBot.id)] || []) : []}
        onToggleTag={handleToggleTag}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
      />

      <CraftFunilModal
        bot={botParaCadastrarFunil}
        funis={funisCraft}
        funilSelecionado={funilSelecionado}
        onSelecionarFunil={setFunilSelecionado}
        loadingFunis={loadingFunisCraft}
        cadastrando={cadastrandoFunilCraft}
        erro={erroFunilCraft}
        sucesso={sucessoFunilCraft}
        onClose={fecharModalFunilCraft}
        onAtualizarFunis={() => carregarFunisCraft(true)}
        onCadastrar={handleCadastrarBotNoFunil}
      />

      <VerificacaoResultadoModal
        open={showNotificacaoPopup}
        resultado={verificacaoResultado}
        onClose={() => setShowNotificacaoPopup(false)}
        onDeleteSelected={handleDeleteSelecionadosVerificacao}
      />
      <TagsManagerModal
        isOpen={showTagsManager}
        onClose={() => setShowTagsManager(false)}
        tags={botTags}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
      />
    </>
  )

  if (isDifroide) {
    return (
      <div
        className="flex gap-3 px-4 -m-6"
        style={{
          height: contentAreaHeight,
          paddingTop: `${sidebarCardGap}px`,
          paddingBottom: `${sidebarCardGap}px`,
        }}
      >
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="rounded-xl overflow-hidden shadow-xl border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
            <div className="relative z-10 flex flex-col h-full min-h-0">
              <div className="flex-1 overflow-y-auto flex flex-col min-h-0 p-6">
                {mainContent}
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-shrink-0 flex flex-col min-h-0 transition-all duration-300 ${isBotsCardExpanded ? 'w-72' : 'w-12'}`}>
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
            <div className={`px-4 pt-4 pb-3 border-b border-gray-600/30 flex items-center ${isBotsCardExpanded ? 'justify-between' : 'justify-center'}`}>
              {isBotsCardExpanded && (
                <div>
                  <h2 className="text-lg font-bold text-white">Resumo</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Bots e ações</p>
                </div>
              )}
              <button
                onClick={() => setIsBotsCardExpanded(!isBotsCardExpanded)}
                className={`p-2 rounded-lg bg-transparent hover:bg-gray-700/30 transition-all text-gray-300 hover:text-white flex items-center justify-center ${isBotsCardExpanded ? 'ml-auto' : ''}`}
                aria-label={isBotsCardExpanded ? 'Colapsar' : 'Expandir'}
              >
                {isBotsCardExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
            {isBotsCardExpanded && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-600/20 bg-gray-800/30 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Total</p>
                    <p className="text-lg font-bold text-white">{kpi.total}</p>
                  </div>
                  <div className="rounded-lg border border-gray-600/20 bg-gray-800/30 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Ativos</p>
                    <p className="text-lg font-bold text-emerald-400">{kpi.ativos}</p>
                  </div>
                  <div className="rounded-lg border border-gray-600/20 bg-gray-800/30 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Inativos</p>
                    <p className="text-lg font-bold text-red-400">{kpi.inativos}</p>
                  </div>
                  <div className="rounded-lg border border-gray-600/20 bg-gray-800/30 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Problemas</p>
                    <p className="text-lg font-bold text-amber-400">{kpi.problemas}</p>
                  </div>
                </div>
                <div className="border-t border-gray-600/30 pt-3 space-y-0 divide-y divide-gray-600/30">
                  <button
                    onClick={handleVerificar}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
                    Verificar
                  </button>
                  <button
                    onClick={() => setShowTagsManager(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
                  >
                    <Tag className="w-4 h-4 text-purple-400" />
                    Tags
                  </button>
                  <button
                    onClick={handleCreate}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Novo bot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-5 bg-[#0b111b] p-6">
      {mainContent}
    </div>
  )
}

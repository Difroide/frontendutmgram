import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  FileText,
  Bot,
  Users,
  RefreshCw,
  Download,
  Trash,
  Play,
  Pause,
  ExternalLink,
  FolderOpen,
  Settings,
  Calendar,
  Search,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  RotateCcw,
} from 'lucide-react'
import { useModo } from '@/contexts/ModoContext'

interface Categoria {
  id: string
  nome: string
  descricao: string
  createdAt: string
  quantidadeBots?: number
  quantidadeGrupos?: number
  quantidadeNomes?: number
  rodando?: boolean
}

interface BotData {
  nome: string
  username: string
  token: string | null
  createdAt: string
}

interface Grupo {
  id: string | number
  nome: string
  link_convite?: string
  link?: string
  username?: string
  tipo?: string
  membros?: number
  createdAt?: string
}

interface NomesArquivo {
  id: string
  nome: string
  nomes: string[]
  quantidade: number
}

type TabType = 'geral' | 'bots' | 'grupos' | 'nomes'

export function CategoriasTab() {
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'
  const [isCategoriesCardExpanded, setIsCategoriesCardExpanded] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRef, setLoadingRef] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('geral')

  const [nomesArquivos, setNomesArquivos] = useState<NomesArquivo[]>([])
  const [botsCategoria, setBotsCategoria] = useState<BotData[]>([])
  const [gruposCategoria, setGruposCategoria] = useState<Grupo[]>([])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNomesModal, setShowNomesModal] = useState(false)
  const [showBotModal, setShowBotModal] = useState(false)
  const [showGrupoModal, setShowGrupoModal] = useState(false)

  const [editingBot, setEditingBot] = useState<BotData | null>(null)
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null)
  const [botForm, setBotForm] = useState({ nome: '', username: '', token: '' })
  const [grupoForm, setGrupoForm] = useState({ nome: '', id: '', link: '', username: '', tipo: 'privado' })
  const [gruposEmMassa, setGruposEmMassa] = useState('')
  const [modoMassa, setModoMassa] = useState(false)
  const [newCategoriaNome, setNewCategoriaNome] = useState('')
  const [newCategoriaDescricao, setNewCategoriaDescricao] = useState('')
  const [nomesTexto, setNomesTexto] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')

  const [sincronizandoGrupos, setSincronizandoGrupos] = useState(false)
  const [baixandoNotas, setBaixandoNotas] = useState(false)
  const [limpandoDuplicatas, setLimpandoDuplicatas] = useState(false)
  const [verificandoGruposSemLista, setVerificandoGruposSemLista] = useState(false)

  const [editingNome, setEditingNome] = useState(false)
  const [editingDescricao, setEditingDescricao] = useState(false)
  const [tempNome, setTempNome] = useState('')
  const [tempDescricao, setTempDescricao] = useState('')

  const RELATORIO_STORAGE_KEY = 'criador-ultima-analise'
  const [analisando, setAnalisando] = useState(false)
  const [relatorio, setRelatorio] = useState<{
    categorias: Array<{ id: string; nome: string; totalGrupos: number; gruposOn: number; gruposOff: number; botDisparoOnline: boolean | null; bots: Array<{ nome: string; username: string; online: boolean }> }>
    categoriasSemGrupos: Array<{ id: string; nome: string }>
    categoriasComBotsOnlineSemGrupos: Array<{ id: string; nome: string }>
  } | null>(() => {
    try {
      const s = localStorage.getItem(RELATORIO_STORAGE_KEY)
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed && Array.isArray(parsed.categorias)) return parsed
      }
    } catch (_) {}
    return null
  })
  const [showApagarModal, setShowApagarModal] = useState(false)
  const [categoriasApagarSelecionadas, setCategoriasApagarSelecionadas] = useState<Set<string>>(new Set())
  const [reutilizando, setReutilizando] = useState(false)
  const [mainView, setMainView] = useState<'categorias' | 'analise'>('categorias')
  const [categoriasSelecionadasAnalise, setCategoriasSelecionadasAnalise] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    if (selectedCategoria && showDetalhesModal) {
      loadNomesCategoria(selectedCategoria.id)
      loadBotsCategoria(selectedCategoria.id)
      loadGruposCategoria(selectedCategoria.id)
    }
  }, [selectedCategoria, showDetalhesModal])

  useEffect(() => {
    if (relatorio) {
      try {
        localStorage.setItem(RELATORIO_STORAGE_KEY, JSON.stringify(relatorio))
      } catch (_) {}
    }
  }, [relatorio])

  const totalCategorias = categorias.length
  const categoriasRodando = categorias.filter((c) => c.rodando).length
  const categoriasParadas = categorias.filter((c) => !c.rodando).length

  // Filtrar e ordenar: PARADOS primeiro, depois RODANDO
  const filteredCategorias = categorias
    .filter((c) => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Parados (rodando = false) vêm primeiro
      if (a.rodando === b.rodando) return 0
      return a.rodando ? 1 : -1
    })

  const loadCategorias = async () => {
    if (loadingRef) return
    try {
      setLoadingRef(true)
      setLoading(true)
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        setCategorias(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  const loadNomesCategoria = async (categoriaId: string) => {
    try {
      if ((window as any).electron?.criador) {
        const data = await (window as any).electron.criador.carregarNomesCategoria(categoriaId)
        setNomesArquivos(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar nomes:', error)
    }
  }

  const loadBotsCategoria = async (categoriaId: string) => {
    try {
      if ((window as any).electron?.criador) {
        const data = await (window as any).electron.criador.carregarBotsCategoria(categoriaId)
        setBotsCategoria(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar bots:', error)
    }
  }

  const loadGruposCategoria = async (categoriaId: string) => {
    try {
      if ((window as any).electron?.criador) {
        const data = await (window as any).electron.criador.carregarGruposCategoria(categoriaId)
        setGruposCategoria(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    }
  }

  const handleOpenCategoria = (categoria: Categoria) => {
    setSelectedCategoria(categoria)
    setActiveTab('geral')
    setShowDetalhesModal(true)
    setTempNome(categoria.nome)
    setTempDescricao(categoria.descricao || '')
        }

  const handleCloseDetalhes = () => {
    setShowDetalhesModal(false)
    setSelectedCategoria(null)
    setEditingNome(false)
    setEditingDescricao(false)
    setNomesArquivos([])
    setBotsCategoria([])
    setGruposCategoria([])
  }

  const handleCreateCategoria = async () => {
    if (!newCategoriaNome.trim()) {
      alert('Digite um nome para a categoria')
      return
    }
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.criarCategoria(newCategoriaNome.trim(), newCategoriaDescricao.trim())
        setNewCategoriaNome('')
        setNewCategoriaDescricao('')
        setShowCreateModal(false)
        await loadCategorias()
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao criar categoria')
    }
  }

  const handleDeleteCategoria = async () => {
    if (!selectedCategoria) return
    if (!confirm(`Tem certeza que deseja deletar "${selectedCategoria.nome}"?`)) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.deletarCategoria(selectedCategoria.id)
        handleCloseDetalhes()
        await loadCategorias()
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao deletar categoria')
    }
  }

  const handleSaveNome = async () => {
    if (!selectedCategoria || !tempNome.trim()) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.atualizarCategoria(selectedCategoria.id, { nome: tempNome.trim() })
        setSelectedCategoria({ ...selectedCategoria, nome: tempNome.trim() })
        setEditingNome(false)
        await loadCategorias()
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar nome')
    }
  }

  const handleSaveDescricao = async () => {
    if (!selectedCategoria) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.atualizarCategoria(selectedCategoria.id, { descricao: tempDescricao.trim() })
        setSelectedCategoria({ ...selectedCategoria, descricao: tempDescricao.trim() })
        setEditingDescricao(false)
        await loadCategorias()
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar descrição')
    }
  }

  const handleToggleRodando = async (categoria?: Categoria) => {
    const cat = categoria || selectedCategoria
    if (!cat) return
    try {
      if ((window as any).electron?.criador) {
        const novoEstado = !cat.rodando
        await (window as any).electron.criador.atualizarCategoria(cat.id, { rodando: novoEstado })
        if (selectedCategoria?.id === cat.id) {
          setSelectedCategoria({ ...selectedCategoria, rodando: novoEstado })
        }
        await loadCategorias()
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar estado')
    }
  }

  const handleSincronizarTudo = async () => {
    if (!selectedCategoria || sincronizandoGrupos) return
    setSincronizandoGrupos(true)
    try {
      if ((window as any).electron?.criador?.sincronizarTudoCategoria) {
        const result = await (window as any).electron.criador.sincronizarTudoCategoria(selectedCategoria.id)
        if (result.success) {
          await loadGruposCategoria(selectedCategoria.id)
          await loadBotsCategoria(selectedCategoria.id)
        }
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao sincronizar')
    } finally {
      setSincronizandoGrupos(false)
    }
  }

  const handleBaixarNotas = async () => {
    if (!selectedCategoria || baixandoNotas) return
    setBaixandoNotas(true)
    try {
      if ((window as any).electron?.criador?.baixarNotasCategoria) {
        await (window as any).electron.criador.baixarNotasCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao baixar notas')
    } finally {
      setBaixandoNotas(false)
    }
  }

  const handleLimparDuplicatas = async () => {
    if (!selectedCategoria || limpandoDuplicatas) return
    if (!confirm('Remover grupos duplicados?')) return
    setLimpandoDuplicatas(true)
    try {
      if ((window as any).electron?.criador?.limparDuplicatasGrupos) {
        await (window as any).electron.criador.limparDuplicatasGrupos(`categoria:${selectedCategoria.id}`)
        await loadGruposCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao limpar duplicatas')
    } finally {
      setLimpandoDuplicatas(false)
    }
  }

  const handleVerificarGruposSemLista = async () => {
    if (verificandoGruposSemLista) return
    if (!confirm('Verificar grupos sem listas?')) return
    setVerificandoGruposSemLista(true)
    try {
      if ((window as any).electron?.criador?.verificarGruposSemListas) {
        await (window as any).electron.criador.verificarGruposSemListas(15)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao verificar')
    } finally {
      setVerificandoGruposSemLista(false)
    }
  }

  const handleAnalisarCategorias = async () => {
    if (analisando) return
    setMainView('analise')
    setAnalisando(true)
    setRelatorio(null)
    setCategoriasSelecionadasAnalise(new Set())
    try {
      const api = (window as any).electron?.criador
      if (!api?.analisarCategoriasRelatorio) {
        alert('API de análise não disponível')
        return
      }
      const result = await api.analisarCategoriasRelatorio()
      setRelatorio(result)
    } catch (error: any) {
      alert(error.message || 'Erro ao analisar')
    } finally {
      setAnalisando(false)
    }
  }

  const handleAbrirApagarModal = () => {
    const semGrupos = categorias.filter((c) => (c.quantidadeGrupos ?? 0) === 0)
    if (semGrupos.length === 0) {
      alert('Nenhuma categoria sem grupos encontrada')
      return
    }
    setCategoriasApagarSelecionadas(new Set(semGrupos.map((c) => c.id)))
    setShowApagarModal(true)
  }

  const handleApagarSelecionadasAnalise = async () => {
    const ids = Array.from(categoriasSelecionadasAnalise)
    if (ids.length === 0) {
      alert('Selecione categorias na tabela para apagar')
      return
    }
    if (!confirm(`Apagar ${ids.length} categoria(s) selecionada(s)?`)) return
    try {
      const api = (window as any).electron?.criador
      if (!api?.deletarCategoriasEmMassa) return
      const result = await api.deletarCategoriasEmMassa(ids)
      if (result.success) {
        setCategoriasSelecionadasAnalise(new Set())
        await loadCategorias()
        setRelatorio((prev) => {
          if (!prev) return prev
          const idsSet = new Set(ids)
          return {
            ...prev,
            categorias: prev.categorias.filter((c) => !idsSet.has(c.id)),
            categoriasSemGrupos: prev.categoriasSemGrupos?.filter((c) => !idsSet.has(c.id)) ?? [],
            categoriasComBotsOnlineSemGrupos: prev.categoriasComBotsOnlineSemGrupos?.filter((c) => !idsSet.has(c.id)) ?? [],
          }
        })
        alert(`${result.deletados ?? ids.length} categoria(s) apagada(s)`)
      } else {
        alert(result.error || 'Erro ao apagar')
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao apagar')
    }
  }

  const handleApagarCategoriasSelecionadas = async () => {
    const ids = Array.from(categoriasApagarSelecionadas)
    if (ids.length === 0) return
    if (!confirm(`Apagar ${ids.length} categoria(s) selecionada(s)?`)) return
    try {
      const api = (window as any).electron?.criador
      if (!api?.deletarCategoriasEmMassa) return
      const result = await api.deletarCategoriasEmMassa(ids)
      if (result.success) {
        setShowApagarModal(false)
        setCategoriasApagarSelecionadas(new Set())
        await loadCategorias()
        alert(`${result.deletados ?? ids.length} categoria(s) apagada(s)`)
      } else {
        alert(result.error || 'Erro ao apagar')
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao apagar categorias')
    }
  }

  const handleReutilizarBots = async () => {
    if (!relatorio) {
      alert('Execute a análise primeiro.')
      return
    }
    const selecionadas = Array.from(categoriasSelecionadasAnalise)
    if (selecionadas.length === 0) {
      alert('Selecione categorias na tabela para reutilizar os bots.')
      return
    }
    if (!confirm(`Reutilizar bots de ${selecionadas.length} categoria(s) selecionada(s)? Os bots serão movidos para a aba Reutilizados.`)) return
    setReutilizando(true)
    try {
      const api = (window as any).electron?.criador
      if (!api?.reutilizarBotsCategoria) return
      const cats = selecionadas.map((id) => ({ categoriaId: id }))
      const result = await api.reutilizarBotsCategoria(cats)
      if (result.success) {
        alert(`${result.totalMovidos ?? 0} bot(s) movido(s) para Reutilizados`)
        setCategoriasSelecionadasAnalise((prev) => {
          const next = new Set(prev)
          selecionadas.forEach((id) => next.delete(id))
          return next
        })
        await loadCategorias()
      } else {
        alert(result.error || 'Erro ao reutilizar')
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao reutilizar bots')
    } finally {
      setReutilizando(false)
    }
  }

  const handleAbrirBotModal = (bot?: BotData) => {
    if (bot) {
      setEditingBot(bot)
      setBotForm({ nome: bot.nome, username: bot.username || '', token: bot.token || '' })
    } else {
      setEditingBot(null)
      setBotForm({ nome: '', username: '', token: '' })
    }
    setShowBotModal(true)
  }

  const handleSalvarBot = async () => {
    if (!selectedCategoria || !botForm.nome.trim()) return
    if (!botForm.username.trim() && !botForm.token.trim()) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.salvarBotCategoriaManual(selectedCategoria.id, {
            nome: botForm.nome.trim(),
            username: botForm.username.trim() || null,
            token: botForm.token.trim() || null,
        })
        setBotForm({ nome: '', username: '', token: '' })
        setShowBotModal(false)
        await loadBotsCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar bot')
    }
  }

  const handleDeletarBot = async (index: number) => {
    if (!selectedCategoria || !confirm('Deletar este bot?')) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.deletarBotCategoria(selectedCategoria.id, index)
        await loadBotsCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao deletar bot')
    }
  }

  const handleAbrirGrupoModal = (grupo?: Grupo) => {
    if (grupo) {
      setEditingGrupo(grupo)
      setGrupoForm({
        nome: grupo.nome,
        id: String(grupo.id || ''),
        link: grupo.link_convite || grupo.link || '',
        username: grupo.username || '',
        tipo: grupo.tipo || 'privado',
      })
      setModoMassa(false)
    } else {
      setEditingGrupo(null)
      setGrupoForm({ nome: '', id: '', link: '', username: '', tipo: 'privado' })
      setModoMassa(false)
      setGruposEmMassa('')
    }
    setShowGrupoModal(true)
  }

  const processarGruposEmMassa = (texto: string) => {
    const linhas = texto.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    const grupos: Array<{ nome: string; id: string; link: string; username?: string }> = []
    for (const linha of linhas) {
      const match = linha.match(/https?:\/\/t\.me\/([^\s]+)\s*-\s*ID:\s*(-?\d+)/i)
      if (match) {
        const link = match[0].split(' - ID:')[0].trim()
        const id = match[2].trim()
        let grupoId = id
        if (!grupoId.startsWith('-')) {
          grupoId = grupoId.startsWith('100') ? '-' + grupoId : '-100' + grupoId
        }
        grupos.push({ nome: selectedCategoria?.nome || 'Grupo', id: grupoId, link, username: match[1] })
      } else {
        const linkMatch = linha.match(/https?:\/\/t\.me\/([^\s]+)/i)
        if (linkMatch) {
          grupos.push({ nome: selectedCategoria?.nome || 'Grupo', id: '', link: linkMatch[0], username: linkMatch[1] })
        }
      }
    }
    return grupos
  }

  const handleSalvarGruposEmMassa = async () => {
    if (!selectedCategoria || !gruposEmMassa.trim()) return
    const gruposProcessados = processarGruposEmMassa(gruposEmMassa)
    if (gruposProcessados.length === 0) return
    try {
      if ((window as any).electron?.criador) {
        for (const grupo of gruposProcessados) {
          try {
            await (window as any).electron.criador.salvarGrupoCategoriaManual(selectedCategoria.id, {
                nome: grupo.nome,
                id: grupo.id || null,
                link_convite: grupo.link || null,
                link: grupo.link || null,
                username: grupo.username || null,
                tipo: 'privado',
            })
          } catch (e) {}
        }
        setGruposEmMassa('')
        setModoMassa(false)
        setShowGrupoModal(false)
        await loadGruposCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar grupos')
    }
  }

  const handleSalvarGrupo = async () => {
    if (!selectedCategoria || !grupoForm.nome.trim()) return
    if (!grupoForm.id.trim() && !grupoForm.link.trim() && !grupoForm.username.trim()) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.salvarGrupoCategoriaManual(selectedCategoria.id, {
            nome: grupoForm.nome.trim(),
            id: grupoForm.id.trim() || null,
            link_convite: grupoForm.link.trim() || null,
            link: grupoForm.link.trim() || null,
            username: grupoForm.username.trim() || null,
            tipo: grupoForm.tipo,
        })
        setGrupoForm({ nome: '', id: '', link: '', username: '', tipo: 'privado' })
        setShowGrupoModal(false)
        await loadGruposCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar grupo')
    }
  }

  const handleDeletarGrupo = async (index: number) => {
    if (!selectedCategoria || !confirm('Deletar este grupo?')) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.deletarGrupoCategoria(selectedCategoria.id, index)
        await loadGruposCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao deletar grupo')
    }
  }

  const handleAbrirNomes = (arquivo: NomesArquivo) => {
    setNomeArquivo(arquivo.nome)
    setNomesTexto(arquivo.nomes.join('\n'))
    setShowNomesModal(true)
  }

  const handleSalvarNomes = async () => {
    if (!selectedCategoria || !nomeArquivo.trim()) return
    const nomes = nomesTexto.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
    if (nomes.length === 0) return
    try {
      if ((window as any).electron?.criador) {
        await (window as any).electron.criador.salvarNomesCategoria(selectedCategoria.id, nomeArquivo.trim(), nomes)
        setNomeArquivo('')
        setNomesTexto('')
        setShowNomesModal(false)
        await loadNomesCategoria(selectedCategoria.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar nomes')
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'geral', label: 'Geral', icon: <Settings className="w-4 h-4" /> },
    { id: 'bots', label: 'Bots', icon: <Bot className="w-4 h-4" />, count: botsCategoria.length },
    { id: 'grupos', label: 'Grupos', icon: <Users className="w-4 h-4" />, count: gruposCategoria.length },
    { id: 'nomes', label: 'Nomes', icon: <FileText className="w-4 h-4" />, count: nomesArquivos.length },
  ]

  const contentAreaHeight = 'calc(100vh - 40px)'
  const sidebarCardGap = 10

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  const mainContent = (
    <>
      {/* Tabs principais: Categorias | Análise */}
      <div className="mb-6 flex gap-1 p-1 bg-[#161b22] rounded-lg border border-gray-800 w-fit">
        <button
          onClick={() => setMainView('categorias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mainView === 'categorias' ? 'bg-[#238636] text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Categorias
        </button>
        <button
          onClick={() => setMainView('analise')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mainView === 'analise' ? 'bg-[#238636] text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Análise
        </button>
      </div>

      {mainView === 'analise' ? (
        /* Vista Análise */
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Análise de Categorias</h2>
            <p className="text-sm text-gray-500">Verifica grupos On/Off e status do bot de disparo via t.me</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAnalisarCategorias}
              disabled={analisando}
              className="px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <BarChart2 className={`w-4 h-4 ${analisando ? 'animate-spin' : ''}`} />
              {analisando ? 'Analisando...' : 'Analisar Categorias'}
            </button>
            <button
              onClick={handleReutilizarBots}
              disabled={reutilizando}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${reutilizando ? 'animate-spin' : ''}`} />
              Reutilizar bots ({categoriasSelecionadasAnalise.size} sel.)
            </button>
            <button
              onClick={handleApagarSelecionadasAnalise}
              disabled={categoriasSelecionadasAnalise.size === 0}
              className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Apagar selecionadas ({categoriasSelecionadasAnalise.size})
            </button>
          </div>
          {analisando ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-[#161b22] rounded-xl border border-gray-800">
              <RefreshCw className="w-12 h-12 animate-spin mb-4" />
              <p>Analisando grupos e bots via t.me (Playwright)...</p>
            </div>
          ) : relatorio ? (
            <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#161b22] border-b border-gray-700">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={relatorio.categorias.length > 0 && relatorio.categorias.every((c) => categoriasSelecionadasAnalise.has(c.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoriasSelecionadasAnalise(new Set(relatorio.categorias.map((c) => c.id)))
                            } else {
                              setCategoriasSelecionadasAnalise(new Set())
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-600"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Categoria</th>
                      <th className="px-4 py-3 text-center text-gray-400 font-medium">Total Grupos</th>
                      <th className="px-4 py-3 text-center text-gray-400 font-medium">Grupos On</th>
                      <th className="px-4 py-3 text-center text-gray-400 font-medium">Bot Disparo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.categorias.map((c) => {
                      const semGrupos = c.totalGrupos === 0
                      const podeReutilizar = semGrupos && c.bots.length > 0
                      const selecionada = categoriasSelecionadasAnalise.has(c.id)
                      return (
                        <tr
                          key={c.id}
                          className={`border-b border-gray-800 ${selecionada ? 'bg-[#238636]/10' : podeReutilizar ? 'bg-amber-500/5' : semGrupos ? 'bg-red-500/5' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selecionada}
                              onChange={(e) => {
                                setCategoriasSelecionadasAnalise((prev) => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(c.id)
                                  else next.delete(c.id)
                                  return next
                                })
                              }}
                              className="w-4 h-4 rounded border-gray-600"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-white">{c.nome}</td>
                          <td className="px-4 py-2.5 text-center text-gray-300">{c.totalGrupos}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={c.gruposOn > 0 ? 'text-emerald-400' : 'text-gray-500'}>{c.gruposOn}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {c.botDisparoOnline === true && <span className="text-emerald-400">Online</span>}
                            {c.botDisparoOnline === false && <span className="text-red-400">Offline</span>}
                            {c.botDisparoOnline === null && <span className="text-gray-500">-</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-800 bg-[#161b22] text-sm text-gray-400">
                Selecione as categorias na tabela. <strong className="text-amber-200">Reutilizar bots</strong>: move bots das selecionadas (0 grupos). <strong className="text-red-300">Apagar selecionadas</strong>: remove as categorias marcadas.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-[#161b22] rounded-xl border border-gray-800">
              <BarChart2 className="w-12 h-12 mb-4 opacity-50" />
              <p>Clique em &quot;Analisar Categorias&quot; para ver o relatório.</p>
              <p className="text-xs mt-1">A verificação usa a URL t.me do bot de cada categoria.</p>
            </div>
          )}
        </div>
      ) : (
        /* Vista Categorias */
        <>
      {/* Header Elegante */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Titulo e Descricao */}
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-gray-400" />
              Categorias
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Gerencie suas campanhas e categorias</p>
          </div>

          {/* Estatisticas Minimalistas */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">{totalCategorias}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-emerald-400">{categoriasRodando}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Rodando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-400">{categoriasParadas}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Paradas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acoes - apenas na vista Categorias (em Difroide os 3 botões ficam no card da direita) */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar categoria..."
              className="w-full pl-10 pr-4 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
            />
          </div>
          {!isDifroide && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Categoria
              </button>
              <button
                onClick={handleVerificarGruposSemLista}
                disabled={verificandoGruposSemLista}
                className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] text-gray-300 text-sm border border-gray-700/50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${verificandoGruposSemLista ? 'animate-spin' : ''}`} />
                Verificar Grupos
              </button>
              <button
                onClick={handleAbrirApagarModal}
                className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] text-gray-300 text-sm border border-gray-700/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Apagar sem grupos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid de Categorias */}
      {filteredCategorias.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filteredCategorias.map((categoria) => {
            const isRodando = categoria.rodando
            return (
            <div
              key={categoria.id}
                onClick={() => handleOpenCategoria(categoria)}
                className="group relative bg-[#161b22] hover:bg-[#1c2128] border border-gray-800 hover:border-gray-700 rounded-lg p-4 cursor-pointer transition-all duration-200"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-100 truncate pr-2 flex-1">
                    {categoria.nome}
                  </h3>
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                      isRodando ? 'bg-emerald-400' : 'bg-gray-600'
                      }`}
                    title={isRodando ? 'Rodando' : 'Parado'}
                  />
                </div>

                {/* Contadores */}
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      Bots
                    </span>
                    <span className="text-gray-400">{categoria.quantidadeBots || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Grupos
                    </span>
                    <span className="text-gray-400">{categoria.quantidadeGrupos || 0}</span>
                </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Nomes
                    </span>
                    <span className="text-gray-400">{categoria.quantidadeNomes || 0}</span>
                </div>
              </div>

                {/* Status Badge */}
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        isRodando ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      {isRodando ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {isRodando ? 'Rodando' : 'Parado'}
                </span>
                    <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
              </div>
            </div>
          )
          })}
                  </div>
      ) : (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-300 mb-2">
            {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchTerm ? 'Tente outro termo de busca' : 'Clique em "Nova Categoria" para começar'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Categoria
            </button>
          )}
                </div>
              )}
              
      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedCategoria && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && handleCloseDetalhes()}
        >
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedCategoria.rodando ? 'bg-emerald-400' : 'bg-gray-500'
                  }`}
                />
                <h2 className="text-lg font-semibold text-white">{selectedCategoria.nome}</h2>
                  </div>
              <button
                onClick={handleCloseDetalhes}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
                </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gray-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'text-white border-[#238636] bg-[#161b22]'
                      : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700/50 rounded">
                      {tab.count}
                    </span>
        )}
                </button>
              ))}
      </div>

            {/* Conteudo */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tab Geral */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Nome
                      </label>
                      {editingNome ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempNome}
                            onChange={(e) => setTempNome(e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#0d1117] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                            autoFocus
                          />
                          <button onClick={handleSaveNome} className="p-2 bg-[#238636] text-white rounded-lg">
                            <Save className="w-4 h-4" />
                          </button>
            <button
                            onClick={() => { setEditingNome(false); setTempNome(selectedCategoria.nome) }}
                            className="p-2 bg-gray-700 text-white rounded-lg"
            >
                            <X className="w-4 h-4" />
            </button>
          </div>
                      ) : (
                        <div
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => setEditingNome(true)}
              >
                          <span className="text-white">{selectedCategoria.nome}</span>
                          <Edit2 className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Status
                      </label>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${selectedCategoria.rodando ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {selectedCategoria.rodando ? 'Rodando' : 'Parado'}
                        </span>
                      <button
                          onClick={() => handleToggleRodando()}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                            selectedCategoria.rodando ? 'bg-emerald-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              selectedCategoria.rodando ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Descricao */}
                  <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Descrição
                    </label>
                    {editingDescricao ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempDescricao}
                          onChange={(e) => setTempDescricao(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0d1117] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveDescricao} className="px-3 py-1.5 bg-[#238636] text-white text-sm rounded-lg flex items-center gap-1">
                            <Save className="w-3.5 h-3.5" /> Salvar
                      </button>
                      <button
                            onClick={() => { setEditingDescricao(false); setTempDescricao(selectedCategoria.descricao || '') }}
                            className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg"
                      >
                            Cancelar
                      </button>
                    </div>
          </div>
          ) : (
                      <div
                        className="flex items-start justify-between cursor-pointer group min-h-[40px]"
                        onClick={() => setEditingDescricao(true)}
                      >
                        <span className="text-gray-300 text-sm">
                          {selectedCategoria.descricao || 'Clique para adicionar descrição'}
                        </span>
                        <Edit2 className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
            </div>
          )}
        </div>

                  {/* Data */}
                  <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Criado em
                    </label>
                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {selectedCategoria.createdAt
                        ? new Date(selectedCategoria.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })
                        : 'Data não disponível'}
                    </div>
                  </div>

                  {/* Acoes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={handleSincronizarTudo}
                disabled={sincronizandoGrupos}
                      className="px-4 py-3 bg-[#161b22] hover:bg-[#21262d] border border-gray-800 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${sincronizandoGrupos ? 'animate-spin' : ''}`} />
                      Sincronizar
              </button>
              <button
                onClick={handleBaixarNotas}
                disabled={baixandoNotas}
                      className="px-4 py-3 bg-[#161b22] hover:bg-[#21262d] border border-gray-800 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${baixandoNotas ? 'animate-pulse' : ''}`} />
                      Notas
              </button>
              <button
                onClick={handleLimparDuplicatas}
                disabled={limpandoDuplicatas}
                      className="px-4 py-3 bg-[#161b22] hover:bg-[#21262d] border border-gray-800 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash className={`w-4 h-4 ${limpandoDuplicatas ? 'animate-pulse' : ''}`} />
                      Duplicatas
              </button>
              <button
                      onClick={handleDeleteCategoria}
                      className="px-4 py-3 bg-[#21262d] hover:bg-red-900/30 border border-gray-800 hover:border-red-800 text-gray-400 hover:text-red-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                      <Trash2 className="w-4 h-4" />
                      Excluir
              </button>
            </div>
          </div>
              )}

              {/* Tab Bots */}
              {activeTab === 'bots' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{botsCategoria.length} bot(s)</span>
                    <button
                      onClick={() => handleAbrirBotModal()}
                      className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                    </div>

                  {botsCategoria.length > 0 ? (
                    <div className="space-y-2">
                      {botsCategoria.map((bot, index) => (
                        <div key={index} className="flex items-center justify-between bg-[#161b22] border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                              <Bot className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-white">{bot.nome}</p>
                              {bot.username && <p className="text-xs text-gray-500">@{bot.username}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleAbrirBotModal(bot)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletarBot(index)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum bot cadastrado</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Grupos */}
              {activeTab === 'grupos' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-400">{gruposCategoria.length} grupo(s)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLimparDuplicatas}
                        disabled={limpandoDuplicatas}
                        className="px-3 py-1.5 bg-[#161b22] border border-gray-800 text-gray-400 text-sm rounded-lg hover:bg-[#21262d] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Duplicatas
                      </button>
                      <button
                        onClick={() => handleAbrirGrupoModal()}
                        className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {gruposCategoria.length > 0 ? (
                    <div className="space-y-2">
                      {gruposCategoria.map((grupo, index) => (
                        <div key={index} className="flex items-center justify-between bg-[#161b22] border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{grupo.nome}</p>
                              {grupo.username && <p className="text-xs text-gray-500">@{grupo.username}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {(grupo.link_convite || grupo.link) && (
                      <button
                                onClick={() => window.open(grupo.link_convite || grupo.link, '_blank')}
                                className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300"
                      >
                                <ExternalLink className="w-4 h-4" />
                      </button>
                            )}
                            <button onClick={() => handleAbrirGrupoModal(grupo)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletarGrupo(index)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                </div>
              ))}
            </div>
          ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum grupo cadastrado</p>
            </div>
          )}
        </div>
      )}

              {/* Tab Nomes */}
              {activeTab === 'nomes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {nomesArquivos.reduce((sum, n) => sum + n.quantidade, 0)} nome(s) em {nomesArquivos.length} arquivo(s)
                    </span>
            <button
                      onClick={() => { setNomeArquivo(''); setNomesTexto(''); setShowNomesModal(true) }}
                      className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
                      Adicionar
            </button>
          </div>

                  {nomesArquivos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {nomesArquivos.map((arquivo) => (
              <div
                key={arquivo.id}
                onClick={() => handleAbrirNomes(arquivo)}
                          className="flex items-center gap-3 bg-[#161b22] border border-gray-800 rounded-lg p-3 cursor-pointer hover:bg-[#21262d] transition-colors"
              >
                          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{arquivo.nome}</p>
                            <p className="text-xs text-gray-500">{arquivo.quantidade} nomes</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            ))}
          </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum arquivo de nomes</p>
            </div>
          )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Categoria */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">Nova Categoria</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={newCategoriaNome}
                  onChange={(e) => setNewCategoriaNome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  placeholder="Ex.: Marketing Digital"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Descrição</label>
                <textarea
                  value={newCategoriaDescricao}
                  onChange={(e) => setNewCategoriaDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  rows={3}
                  placeholder="Descrição opcional..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreateCategoria} className="flex-1 px-4 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2ea043] transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" />
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bot */}
      {showBotModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">{editingBot ? 'Editar Bot' : 'Adicionar Bot'}</h3>
              <button onClick={() => setShowBotModal(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            <div className="p-5 space-y-4">
                <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome *</label>
                  <input
                    type="text"
                    value={botForm.nome}
                    onChange={(e) => setBotForm({ ...botForm, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  placeholder="Nome do bot"
                  />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={botForm.username}
                    onChange={(e) => setBotForm({ ...botForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  placeholder="@meubot"
                  />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Token</label>
                  <input
                    type="text"
                    value={botForm.token}
                    onChange={(e) => setBotForm({ ...botForm, token: e.target.value })}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 font-mono text-xs"
                  placeholder="1234567890:ABC..."
                  />
                </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
              <button onClick={() => setShowBotModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSalvarBot} className="flex-1 px-4 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2ea043] transition-colors flex items-center justify-center gap-1.5">
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Grupo */}
      {showGrupoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">
                {editingGrupo ? 'Editar Grupo' : modoMassa ? 'Adicionar em Massa' : 'Adicionar Grupo'}
                </h3>
              <button onClick={() => setShowGrupoModal(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {!editingGrupo && (
                <div className="flex gap-1 p-1 bg-[#161b22] rounded-lg">
                  <button
                    onClick={() => setModoMassa(false)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${!modoMassa ? 'bg-[#238636] text-white' : 'text-gray-400'}`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setModoMassa(true)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${modoMassa ? 'bg-[#238636] text-white' : 'text-gray-400'}`}
                  >
                    Em Massa
                  </button>
                </div>
              )}

              {modoMassa && !editingGrupo ? (
                  <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Lista de grupos</label>
                  <p className="text-xs text-gray-500 mb-2">Formato: https://t.me/XXX - ID: YYY</p>
                    <textarea
                      value={gruposEmMassa}
                      onChange={(e) => setGruposEmMassa(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 font-mono h-48"
                    placeholder="https://t.me/grupo1 - ID: 123456789&#10;https://t.me/grupo2"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome *</label>
                    <input
                      type="text"
                      value={grupoForm.nome}
                      onChange={(e) => setGrupoForm({ ...grupoForm, nome: e.target.value })}
                      className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                      placeholder="Nome do grupo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">ID</label>
                    <input
                      type="text"
                      value={grupoForm.id}
                      onChange={(e) => setGrupoForm({ ...grupoForm, id: e.target.value })}
                        className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 font-mono text-xs"
                        placeholder="-1001234567890"
                    />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={grupoForm.username}
                      onChange={(e) => setGrupoForm({ ...grupoForm, username: e.target.value })}
                        className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                        placeholder="@meugrupo"
                    />
                  </div>
                  </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Link</label>
                  <input
                    type="text"
                      value={grupoForm.link}
                      onChange={(e) => setGrupoForm({ ...grupoForm, link: e.target.value })}
                      className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                      placeholder="https://t.me/..."
                    />
          </div>
        </div>
      )}
                </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
              <button onClick={() => setShowGrupoModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                  Cancelar
                </button>
                <button
                onClick={modoMassa && !editingGrupo ? handleSalvarGruposEmMassa : handleSalvarGrupo}
                className="flex-1 px-4 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2ea043] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                {modoMassa && !editingGrupo ? 'Salvar Todos' : 'Salvar'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nomes */}
      {showNomesModal && selectedCategoria && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">
                {nomeArquivo ? 'Editar Nomes' : 'Adicionar Nomes'}
                </h3>
              <button onClick={() => setShowNomesModal(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do arquivo *</label>
                  <input
                    type="text"
                    value={nomeArquivo}
                    onChange={(e) => setNomeArquivo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                    placeholder="Ex.: Nomes Marketing"
                  />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nomes (um por linha)</label>
                  <textarea
                    value={nomesTexto}
                    onChange={(e) => setNomesTexto(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] text-white text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 h-64"
                  placeholder="Nome 1&#10;Nome 2&#10;Nome 3"
                  />
                </div>
              </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
              <button onClick={() => setShowNomesModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSalvarNomes} className="flex-1 px-4 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2ea043] transition-colors flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal Apagar Categorias sem Grupos - fora do ternário para funcionar na aba Análise */}
      {showApagarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Apagar categorias sem grupos</h3>
              <button onClick={() => setShowApagarModal(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 max-h-64 overflow-y-auto space-y-2">
              {categorias
                .filter((c) => (c.quantidadeGrupos ?? 0) === 0)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 rounded-lg p-2">
                    <input
                      type="checkbox"
                      checked={categoriasApagarSelecionadas.has(c.id)}
                      onChange={(e) => {
                        setCategoriasApagarSelecionadas((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(c.id)
                          else next.delete(c.id)
                          return next
                        })
                      }}
                      className="w-4 h-4 rounded border-gray-600"
                    />
                    <span className="text-gray-200">{c.nome}</span>
                  </label>
                ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setShowApagarModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] text-gray-300 text-sm rounded-lg hover:bg-[#30363d] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleApagarCategoriasSelecionadas}
                disabled={categoriasApagarSelecionadas.size === 0}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
              >
                Apagar ({categoriasApagarSelecionadas.size})
              </button>
            </div>
          </div>
        </div>
      )}
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
              <div className="px-6 pt-6 pb-4 border-b border-gray-600/30 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Categorias</h1>
                <p className="text-gray-300 text-sm mt-1">Gerencie suas campanhas e categorias</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {mainContent}
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-shrink-0 flex flex-col min-h-0 transition-all duration-300 ${isCategoriesCardExpanded ? 'w-72' : 'w-12'}`}>
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
            <div className={`px-4 pt-4 pb-3 border-b border-gray-600/30 flex items-center ${isCategoriesCardExpanded ? 'justify-between' : 'justify-center'}`}>
              {isCategoriesCardExpanded && (
                <div>
                  <h2 className="text-lg font-bold text-white">Ações</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Categorias</p>
                </div>
              )}
              <button
                onClick={() => setIsCategoriesCardExpanded(!isCategoriesCardExpanded)}
                className={`p-2 rounded-lg bg-transparent hover:bg-gray-700/30 transition-all text-gray-300 hover:text-white flex items-center justify-center ${isCategoriesCardExpanded ? 'ml-auto' : ''}`}
                aria-label={isCategoriesCardExpanded ? 'Colapsar' : 'Expandir'}
              >
                {isCategoriesCardExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
            {isCategoriesCardExpanded && (
              <div className="flex-1 overflow-y-auto p-3 space-y-0 divide-y divide-gray-600/30">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Nova categoria
                </button>
                <button
                  onClick={handleVerificarGruposSemLista}
                  disabled={verificandoGruposSemLista}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-cyan-400 ${verificandoGruposSemLista ? 'animate-spin' : ''}`} />
                  Verificar grupos
                </button>
                <button
                  onClick={handleAbrirApagarModal}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Apagar sem grupos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-6 p-6 bg-[#0d1117]">
      {mainContent}
    </div>
  )
}

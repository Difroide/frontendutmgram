import { X, Plus, Clock, Settings, Palette, Zap, Users, Image, Bot, MessageSquare, Calendar, Play } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Conta } from '@/types/Conta'
import { ProxySelector } from '@/components/ProxySelector'

interface BotConfig {
  id: string
  botId: string
  botName: string
  nicheId?: string
  porcentagem: string
}

interface PainelSMM {
  id: string
  nome: string
  apiKey: string
}

interface Categoria {
  id: string
  nome: string
  descricao: string
  rodando?: boolean
}

interface CriarGruposModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    data: {
      quantidadeGrupos: number
      gruposPorConta?: Array<{ accountId: string; groupCount: number }>
      tipoGrupo?: 'publico' | 'privado'
      bots: BotConfig[]
      criarBots?: boolean
      quantidadeBots?: number
      usarDescricao?: boolean
      descricaoGrupo?: string
      botsExtras?: string[]
      painelSMM?: string
      codigoServico?: string
      quantidadeMembros?: number
      categoriaId?: string
      arquivoNomesId?: string
      nomeGrupoId?: string
      grupoNomesId?: string
      usarNomeSistema?: boolean
      nomeEspecifico?: string
      usarFotos?: boolean
      sessoesParalelas?: number
      proxyId?: number | null
    },
    contasSelecionadas?: Conta[]
  ) => void
  selectedContas: Conta[]
}

const ToggleSwitch = ({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  icon?: any
  disabled?: boolean
}) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-full p-3 rounded-lg border transition-all text-left ${
        disabled ? 'bg-[#0d1117] border-gray-800 opacity-60 cursor-not-allowed' : checked ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${checked && !disabled ? 'text-blue-400' : 'text-gray-500'}`} />}
        <div className="flex-1">
          <div className={`text-sm font-medium ${checked && !disabled ? 'text-blue-300' : 'text-gray-300'}`}>{label}</div>
          {description && <div className={`text-[11px] mt-0.5 ${checked && !disabled ? 'text-blue-400/80' : 'text-gray-500'}`}>{description}</div>}
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${disabled ? 'bg-gray-700' : checked ? 'bg-blue-600' : 'bg-gray-700'}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </div>
    </button>
  )
}

const SectionCard = ({ icon: Icon, title, children, className = '' }: { icon: any; title: string; children: React.ReactNode; className?: string }) => {
  return (
    <div className={`bg-[#161b22] border border-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-medium text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export const CriarGruposModal = ({ isOpen, onClose, onSave, selectedContas }: CriarGruposModalProps) => {
  const [gruposPorSessao, setGruposPorSessao] = useState('5')
  const [resumoGrupos, setResumoGrupos] = useState<Array<{ contaId: string; gruposExistentes: number; gruposACriar: number }>>([])
  const [sessoesParalelas, setSessoesParalelas] = useState('3')
  const [proxyId, setProxyId] = useState<number | null>(null)
  const [tipoGrupo, setTipoGrupo] = useState<'publico' | 'privado'>('publico')
  const [botsConfig] = useState<BotConfig[]>([])
  const [criarBots, setCriarBots] = useState(true)
  const [quantidadeBots, setQuantidadeBots] = useState('1')
  const [descricoes, setDescricoes] = useState<Array<{ id: string; nome: string; quantidade: number }>>([])
  const [descricaoSelecionada, setDescricaoSelecionada] = useState<string>('')
  const [botsExtras, setBotsExtras] = useState<string>('')
  const [painelSMM, setPainelSMM] = useState<string>('Nenhum')
  const [paineisSMM, setPaineisSMM] = useState<PainelSMM[]>([])
  const [codigoServico, setCodigoServico] = useState('')
  const [quantidadeMembros, setQuantidadeMembros] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [tipoNome, setTipoNome] = useState<'sistema' | 'especifico' | 'grupoNomes'>('sistema')
  const [nomeEspecifico, setNomeEspecifico] = useState<string>('')
  const [grupoNomesId, setGrupoNomesId] = useState<string>('')
  const [gruposNomes, setGruposNomes] = useState<Array<{ id: string; nome: string; totalNomes: number }>>([])
  const [usarFotos, setUsarFotos] = useState(false)
  const [botsSalvosCategoria, setBotsSalvosCategoria] = useState<Array<{ nome: string; username: string; token?: string }>>([])
  const [mostrarCriarCategoria, setMostrarCriarCategoria] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [novaCategoriaDescricao, setNovaCategoriaDescricao] = useState('')
  const [criandoCategoria, setCriandoCategoria] = useState(false)

  const totalGrupos = useMemo(() => resumoGrupos.reduce((sum, r) => sum + r.gruposACriar, 0), [resumoGrupos])
  const tempoEstimado = useMemo(() => {
    if (totalGrupos === 0 || !sessoesParalelas) return 0
    const delay = 60
    const paralelas = parseInt(sessoesParalelas) || 1
    return Math.ceil((totalGrupos * delay) / (paralelas * 60))
  }, [totalGrupos, sessoesParalelas])

  const loadDescricoes = async () => {
    try {
      if ((window as any).electron?.descricoes?.carregar) {
        const data = await (window as any).electron.descricoes.carregar()
        setDescricoes(data || [])
      }
    } catch (error) {
      console.error('[Modal] Erro ao carregar descrições:', error)
    }
  }

  useEffect(() => {
    if (isOpen && selectedContas.length > 0 && gruposPorSessao) {
      const gruposPorSessaoNum = parseInt(gruposPorSessao) || 0
      const resumo = selectedContas.map((conta) => {
        const gruposExistentes = conta.grupos || 0
        const gruposACriar = Math.max(0, gruposPorSessaoNum - gruposExistentes)
        return { contaId: conta.numero, gruposExistentes, gruposACriar }
      })
      setResumoGrupos(resumo)
    }
  }, [isOpen, selectedContas, gruposPorSessao])

  const loadGruposNomes = async () => {
    try {
      if ((window as any).electron?.criador?.listarGruposNomes) {
        const list = await (window as any).electron.criador.listarGruposNomes()
        setGruposNomes(list || [])
      }
    } catch (error) {
      console.error('[Modal] Erro ao carregar grupos de nomes:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPaineisSMM()
      loadCategorias()
      loadDescricoes()
      loadGruposNomes()
    } else {
      setGruposPorSessao('5')
      setResumoGrupos([])
      setSessoesParalelas('3')
      setTipoGrupo('publico')
      setCriarBots(true)
      setQuantidadeBots('1')
      setDescricaoSelecionada('')
      setBotsExtras('')
      setPainelSMM('Nenhum')
      setCodigoServico('')
      setQuantidadeMembros('')
      setCategoriaSelecionada('')
      setTipoNome('sistema')
      setNomeEspecifico('')
      setGrupoNomesId('')
      setUsarFotos(false)
      setBotsSalvosCategoria([])
      setMostrarCriarCategoria(false)
      setNovaCategoriaNome('')
      setNovaCategoriaDescricao('')
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && categoriaSelecionada) {
      loadBotsSalvosCategoria(categoriaSelecionada)
    } else {
      setBotsSalvosCategoria([])
    }
  }, [categoriaSelecionada, isOpen])

  useEffect(() => {
    if (categoriaSelecionada && botsSalvosCategoria && botsSalvosCategoria.length > 0) {
      setCriarBots((currentValue) => (currentValue ? false : currentValue))
    }
  }, [botsSalvosCategoria, categoriaSelecionada])

  const loadBotsSalvosCategoria = async (categoriaId: string) => {
    try {
      if (!categoriaId) {
        setBotsSalvosCategoria([])
        return
      }
      if ((window as any).electron?.criador?.carregarBotsCategoria) {
        const data = await (window as any).electron.criador.carregarBotsCategoria(categoriaId)
        setBotsSalvosCategoria(data || [])
      }
    } catch (error) {
      console.error('[Modal] Erro ao carregar bots:', error)
      setBotsSalvosCategoria([])
    }
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, onClose])

  const loadPaineisSMM = async () => {
    try {
      if ((window as any).electron?.smm) {
        const paineis = await (window as any).electron.smm.verificarPaineis()
        setPaineisSMM(paineis || [])
      }
    } catch (error) {
      console.error('[Modal] Erro ao carregar painéis SMM:', error)
    }
  }

  const loadCategorias = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        if (data && Array.isArray(data)) {
          const categoriasFiltradas = data.filter((cat: Categoria) => !cat.rodando)
          setCategorias(categoriasFiltradas)
        }
      }
    } catch (error) {
      console.error('[Modal] Erro ao carregar categorias:', error)
    }
  }

  const handleCriarCategoria = async () => {
    if (!novaCategoriaNome.trim()) {
      alert('Digite um nome para a categoria')
      return
    }
    setCriandoCategoria(true)
    try {
      if ((window as any).electron?.criador?.criarCategoria) {
        const novaCategoria = await (window as any).electron.criador.criarCategoria(novaCategoriaNome.trim(), novaCategoriaDescricao.trim())
        await loadCategorias()
        setCategoriaSelecionada(novaCategoria.id)
        setNovaCategoriaNome('')
        setNovaCategoriaDescricao('')
        setMostrarCriarCategoria(false)
      }
    } catch (error: any) {
      console.error('[Modal] Erro ao criar categoria:', error)
      alert(error.message || 'Erro ao criar categoria')
    } finally {
      setCriandoCategoria(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { verificarSessoesVIP, mostrarAlertaVIP } = await import('@/utils/verificarVIP')
    const verificacaoVIP = await verificarSessoesVIP(selectedContas)
    if (verificacaoVIP.temVIP) {
      mostrarAlertaVIP(verificacaoVIP.sessoesVIP)
      return
    }
    if (tipoNome === 'especifico' && !nomeEspecifico.trim()) {
      alert('Digite um nome específico para os grupos')
      return
    }
    if (tipoNome === 'grupoNomes' && !grupoNomesId) {
      alert('Selecione um grupo de nomes')
      return
    }
    if (criarBots) {
      const qtd = parseInt(quantidadeBots) || 0
      if (qtd < 0) {
        alert('A quantidade de bots não pode ser negativa.')
        return
      }
    }
    const botsExtrasArray = botsExtras
      .split(/[,\n]/)
      .map((b) => b.trim().replace('@', ''))
      .filter((b) => b.length > 0)
    const gruposPorConta = resumoGrupos
      .map((r) => ({ accountId: r.contaId, groupCount: r.gruposACriar }))
      .filter((g) => g.groupCount > 0)
    if (gruposPorConta.length === 0) {
      alert('Todas as sessões já têm a quantidade desejada de grupos.')
      return
    }
    onSave(
      {
        quantidadeGrupos: parseInt(gruposPorSessao) || 1,
        gruposPorConta,
        tipoGrupo,
        bots: botsConfig,
        criarBots: criarBots || undefined,
        quantidadeBots: criarBots ? parseInt(quantidadeBots) || 0 : undefined,
        botsExtras: botsExtrasArray.length > 0 ? botsExtrasArray : undefined,
        painelSMM: painelSMM === 'Nenhum' ? undefined : painelSMM,
        codigoServico: painelSMM !== 'Nenhum' ? codigoServico.trim() : undefined,
        quantidadeMembros: painelSMM !== 'Nenhum' ? parseInt(quantidadeMembros) || undefined : undefined,
        categoriaId: categoriaSelecionada || undefined,
        grupoNomesId: tipoNome === 'grupoNomes' ? grupoNomesId || undefined : undefined,
        usarNomeSistema: tipoNome === 'sistema',
        nomeEspecifico: tipoNome === 'especifico' ? nomeEspecifico.trim() : undefined,
        usarFotos: usarFotos || undefined,
        usarDescricao: descricaoSelecionada ? true : undefined,
        descricaoGrupo: descricaoSelecionada || undefined,
        sessoesParalelas: parseInt(sessoesParalelas) || 1,
        proxyId: proxyId || undefined,
      },
      selectedContas
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl border border-gray-600/30 border-blue-500/20 rounded-xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden max-h-[95vh] flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header - Liquid glass + azul */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Criar Grupos</h2>
              <p className="text-xs text-gray-500">Configure os parâmetros para criar grupos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-2 space-y-4">
              {/* DEFINIÇÕES BÁSICAS */}
              <SectionCard icon={Settings} title="Definições Básicas">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Nomeação</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTipoNome('especifico')
                            setNomeEspecifico('')
                            setGrupoNomesId('')
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            tipoNome === 'especifico' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoNome('sistema')
                            setGrupoNomesId('')
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            tipoNome === 'sistema' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          Sistema
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoNome('grupoNomes')
                            setNomeEspecifico('')
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            tipoNome === 'grupoNomes' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          Grupo de nomes
                        </button>
                      </div>
                      {tipoNome === 'especifico' && (
                        <textarea
                          value={nomeEspecifico}
                          onChange={(e) => setNomeEspecifico(e.target.value)}
                          placeholder="Grupo VIP 1&#10;Grupo VIP 2&#10;..."
                          rows={3}
                          className="mt-2 w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-y font-mono"
                        />
                      )}
                      {tipoNome === 'grupoNomes' && (
                        <div className="mt-2">
                          <select
                            value={grupoNomesId}
                            onChange={(e) => setGrupoNomesId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                          >
                            <option value="">Selecione um grupo de nomes</option>
                            {gruposNomes.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nome} ({g.totalNomes} nomes)
                              </option>
                            ))}
                          </select>
                          {gruposNomes.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">Crie grupos de nomes em Criador → Nomes de Grupo</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Categoria</label>
                      <div className="flex gap-1.5">
                        <select
                          value={categoriaSelecionada}
                          onChange={(e) => setCategoriaSelecionada(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                        >
                          <option value="">Nenhuma</option>
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setMostrarCriarCategoria(!mostrarCriarCategoria)}
                          className="px-2.5 py-2 bg-[#21262d] border border-gray-700 rounded-lg text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {categoriaSelecionada && botsSalvosCategoria.length > 0 && (
                        <div className="mt-2 p-2 bg-[#0d1117] border border-gray-700 rounded-lg">
                          <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            Bots da categoria:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {botsSalvosCategoria.map((bot, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded text-[10px] text-blue-300">
                                @{bot.username || bot.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mostrarCriarCategoria && (
                        <div className="mt-2 p-3 bg-[#0d1117] border border-gray-700 rounded-lg space-y-2">
                          <input
                            type="text"
                            value={novaCategoriaNome}
                            onChange={(e) => setNovaCategoriaNome(e.target.value)}
                            placeholder="Nome *"
                            className="w-full px-3 py-1.5 text-sm bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                          />
                          <input
                            type="text"
                            value={novaCategoriaDescricao}
                            onChange={(e) => setNovaCategoriaDescricao(e.target.value)}
                            placeholder="Descrição"
                            className="w-full px-3 py-1.5 text-sm bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={handleCriarCategoria}
                            disabled={criandoCategoria || !novaCategoriaNome.trim()}
                            className="w-full px-3 py-1.5 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg font-medium disabled:opacity-50"
                          >
                            {criandoCategoria ? 'Criando...' : 'Criar'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Privacidade</label>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setTipoGrupo('privado')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            tipoGrupo === 'privado' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          Privado
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoGrupo('publico')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            tipoGrupo === 'publico' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          Público
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* CONTEÚDO */}
              <SectionCard icon={Palette} title="Conteúdo & Aparência">
                <div className="space-y-3">
                  <ToggleSwitch checked={usarFotos} onChange={setUsarFotos} label="Usar Fotos dos Grupos" description="Fotos aleatórias da pasta configurada" icon={Image} />
                  <div>
                    <label className="block text-xs text-gray-500 uppercase mb-1.5">Descrição / Regras</label>
                    <select
                      value={descricaoSelecionada}
                      onChange={(e) => setDescricaoSelecionada(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                    >
                      <option value="">Nenhuma (Padrão)</option>
                      {descricoes.map((desc) => (
                        <option key={desc.id} value={desc.id}>
                          {desc.nome} ({desc.quantidade})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>

              {/* BOTS */}
              <SectionCard icon={Bot} title="Bots e Integrações">
                <div className="space-y-3">
                  <ToggleSwitch
                    checked={criarBots}
                    onChange={setCriarBots}
                    label="Criar Bot Automaticamente"
                    description={botsSalvosCategoria.length > 0 ? `Categoria tem ${botsSalvosCategoria.length} bot(s)` : 'Adiciona bot como admin'}
                    icon={Zap}
                    disabled={botsSalvosCategoria.length > 0}
                  />
                  {criarBots && (
                    <div className="ml-7">
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Quantidade de Bots</label>
                      <input
                        type="number"
                        min="1"
                        value={quantidadeBots}
                        onChange={(e) => setQuantidadeBots(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <label className="text-xs text-gray-500 uppercase">Painel SMM</label>
                    </div>
                    <select
                      value={painelSMM}
                      onChange={(e) => {
                        setPainelSMM(e.target.value)
                        if (e.target.value === 'Nenhum') {
                          setCodigoServico('')
                          setQuantidadeMembros('')
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                    >
                      <option value="Nenhum">Não utilizar</option>
                      {paineisSMM.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    {painelSMM !== 'Nenhum' && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={codigoServico}
                          onChange={(e) => setCodigoServico(e.target.value)}
                          placeholder="Código"
                          className="px-2 py-1.5 text-sm bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                        />
                        <input
                          type="number"
                          min="1"
                          value={quantidadeMembros}
                          onChange={(e) => setQuantidadeMembros(e.target.value)}
                          placeholder="Qtd Membros"
                          className="px-2 py-1.5 text-sm bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      <label className="text-xs text-gray-500 uppercase">Bots/Usuários Extras</label>
                    </div>
                    <textarea
                      value={botsExtras}
                      onChange={(e) => setBotsExtras(e.target.value)}
                      placeholder="@bot1, @bot2&#10;ou um por linha"
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-y font-mono"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* COLUNA DIREITA */}
            <div className="lg:col-span-1 space-y-4">
              <div className="lg:sticky lg:top-4 space-y-4">
                {/* REGRAS */}
                <SectionCard icon={Zap} title="Regras de Execução">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Grupos por Sessão</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={gruposPorSessao}
                        onChange={(e) => setGruposPorSessao(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Max: 10</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase mb-1.5">Sessões Paralelas</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedContas.length}
                        value={sessoesParalelas}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          setSessoesParalelas(Math.min(value, selectedContas.length).toString())
                        }}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-600"
                      />
                    </div>
                    <ProxySelector selectedProxyId={proxyId} onSelect={setProxyId} label="Proxy (Opcional)" showDefault={true} />
                  </div>
                </SectionCard>

                {/* NÚMEROS */}
                <SectionCard icon={Users} title={`Números - ${selectedContas.length}`}>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedContas.map((conta) => {
                      const resumo = resumoGrupos.find((r) => r.contaId === conta.numero)
                      return (
                        <div key={conta.id} className="flex items-center gap-2 p-2 bg-[#0d1117] border border-gray-800 rounded-lg">
                          <Bot className="w-4 h-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">{conta.numero}</p>
                            {resumo && (
                              <p className="text-[10px] text-gray-500">
                                {resumo.gruposExistentes} → +{resumo.gruposACriar}
                              </p>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>

                {/* RESUMO */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#161b22] rounded-lg border border-gray-800">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-xl font-bold text-blue-400">{totalGrupos} Grupos</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#161b22] rounded-lg border border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400">Tempo</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-300">~{tempoEstimado} min</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      className="w-full px-4 py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Executar Agora
                    </button>
                    <button type="button" className="w-full px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#30363d] transition-colors flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Agendar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

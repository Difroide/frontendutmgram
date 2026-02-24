import { useState, useEffect, useRef } from 'react'
import {
  Copy,
  RefreshCw,
  Search,
  X,
  FolderTree,
  Shield,
  Eye,
  History,
  Users,
  Bot,
  CheckCircle,
  AlertCircle,
  Play,
  Plus,
  ExternalLink,
  Crown,
  Tag,
  PlusCircle,
  FolderPlus,
  Settings,
  ChevronRight,
  FileSearch,
  Lock,
  Folder,
  Image,
  MessageSquare,
  Loader2,
  Video,
  ImageIcon,
} from 'lucide-react'
import type { AnaliseGrupoResult, TopicoAnalise } from '../../../types/electron'

interface Sessao {
  path: string
  name: string
  tag?: string | null
  tagsConta?: string[]
}

interface GrupoVip {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  grupoId: string
  grupoAccessHash: string
  dataCriacao?: string
  tag?: string
  totalMensagens?: number
}

interface Checkpoint {
  existe: boolean
  mensagensClonadas?: number
  grupoDestinoNome?: string
  dataInicio?: string
  sessionPath?: string
  sessaoOriginal?: string
  sessaoDiferente?: boolean
}

// Interface para tópico com filtro de mídia individual
interface TopicoSelecionado {
  id: number
  filtroMidia: 'fotos' | 'videos' | 'ambos'
}

// Interface para clonagens ativas (suporte a múltiplas clonagens simultâneas)
interface ClonagemAtiva {
  operationId: string
  sessionPath: string
  sessionName: string
  sourceLink: string
  sourceName?: string
  status: 'em_andamento' | 'concluido' | 'erro'
  logs: string[]
  progress?: { current: number; total: number }
  resultado?: {
    success: boolean
    groupLink?: string
    totalMensagens?: number
    grupoNome?: string
    error?: string
  }
  iniciadoEm: Date
  grupoDestinoId?: string // Para operações de adicionar mídias
}

// Limite máximo de clonagens simultâneas
const MAX_CLONAGENS_SIMULTANEAS = 5

export default function ClonadorVIP() {
  // Estados principais
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string>('')
  const [sessaoManual, setSessaoManual] = useState<string>('')
  const [linkGrupo, setLinkGrupo] = useState<string>('')
  const [nomeGrupoDestino, setNomeGrupoDestino] = useState<string>('')
  const [clonarTopicos, setClonarTopicos] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Estado para múltiplas clonagens simultâneas
  const [clonagensAtivas, setClonagensAtivas] = useState<Map<string, ClonagemAtiva>>(new Map())
  const [clonagemSelecionadaParaLogs, setClonagemSelecionadaParaLogs] = useState<string | null>(null)

  // Estados para criação automática de tópicos
  const [criarTopicosAuto, setCriarTopicosAuto] = useState<boolean>(true)
  const [midiasPorTopico, setMidiasPorTopico] = useState<number>(2000)

  // Estados para escolha manual de destino
  const [modoDestino, setModoDestino] = useState<'criar' | 'existente'>('criar')
  const [linkGrupoDestino, setLinkGrupoDestino] = useState<string>('')
  const [verificandoGrupoDestino, setVerificandoGrupoDestino] = useState(false)
  const [statusGrupoDestino, setStatusGrupoDestino] = useState<{ ok: boolean; mensagem: string; grupoId?: string; grupoAccessHash?: string; grupoNome?: string } | null>(null)
  const [tagSessao, setTagSessao] = useState<string>('')

  // Estados de busca de sessão
  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('')
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)

  // Estados de checkpoint
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null)

  // Estados de adicionar admins
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminSessionPaths, setAdminSessionPaths] = useState<string[]>([])
  const [botUsernames, setBotUsernames] = useState<string>('')
  const [grupoParaAdmin, setGrupoParaAdmin] = useState<GrupoVip | null>(null)
  const [addingAdmins, setAddingAdmins] = useState(false)

  // Estados de logs
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Estados de resultado
  const [resultado, setResultado] = useState<{
    success: boolean
    groupLink?: string
    totalMensagens?: number
    mensagensLinks?: string[]
    grupoNome?: string
    grupoOrigemNome?: string
    grupoOrigemTipo?: string
    temTopicos?: boolean
    topicosClonados?: number
    error?: string
    grupoId?: string
    grupoAccessHash?: string
  } | null>(null)

  // Estados para pré-análise de grupo
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnaliseGrupoResult | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<TopicoSelecionado[]>([])
  const [grupoTemRestricao, setGrupoTemRestricao] = useState(false)
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([])
  
  // Filtro de tipo de mídia PADRÃO (usado para novos tópicos selecionados)
  const [filtroMidiaPadrao, setFiltroMidiaPadrao] = useState<'fotos' | 'videos' | 'ambos'>('ambos')


  // Carregar sessões
  const loadSessoes = async () => {
    try {
      if (!window.electron?.contingencia?.listarSessoes) {
        console.warn('API contingencia não disponível')
        return
      }

      const result = await window.electron?.contingencia?.listarSessoes(null)
      if (result?.success) {
        setSessoes((result.sessions || []) as Sessao[])
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    }
  }

  useEffect(() => {
    loadSessoes()
  }, [])

  // Limpar status quando mudar modo destino ou link
  useEffect(() => {
    setStatusGrupoDestino(null)
  }, [modoDestino, linkGrupoDestino])

  // Scroll automático nos logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSessionDropdown && !target.closest('.session-dropdown-container')) {
        setShowSessionDropdown(false)
      }
    }

    if (showSessionDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSessionDropdown])

  // Registrar listeners de log/progresso (suporte a múltiplas clonagens)
  useEffect(() => {
    // Listener de log com roteamento por operationId
    if (window.electron?.contingencia?.onClonagemVIPAvancadaLog) {
      window.electron.contingencia.onClonagemVIPAvancadaLog((data: { operationId?: string; message?: string; sessionPath?: string; sessionName?: string; sourceLink?: string } | string) => {
        // Compatibilidade: pode receber string (antigo) ou objeto (novo)
        if (typeof data === 'string') {
          setLogs((prev) => [...prev, data])
        } else if (data.operationId && data.message) {
          // Atualizar logs da clonagem específica
          setClonagensAtivas((prev) => {
            const updated = new Map(prev)
            const clonagem = updated.get(data.operationId!)
            if (clonagem) {
              clonagem.logs = [...clonagem.logs, data.message!]
              updated.set(data.operationId!, clonagem)
            } else {
              // Criar entrada se não existir (clonagem iniciada)
              updated.set(data.operationId!, {
                operationId: data.operationId!,
                sessionPath: data.sessionPath || '',
                sessionName: data.sessionName || '',
                sourceLink: data.sourceLink || '',
                status: 'em_andamento',
                logs: [data.message!],
                iniciadoEm: new Date(),
              })
            }
            return updated
          })
          // Também adicionar aos logs globais para visualização
          setLogs((prev) => [...prev, `[${data.sessionName}] ${data.message}`])
        }
      })
    }

    // Listener de progresso com roteamento por operationId
    if (window.electron?.contingencia?.onClonagemVIPAvancadaProgress) {
      window.electron.contingencia.onClonagemVIPAvancadaProgress((data: { operationId?: string; current?: number; total?: number; sessionPath?: string; sessionName?: string; sourceLink?: string }) => {
        if (data.operationId && data.current !== undefined && data.total !== undefined) {
          setClonagensAtivas((prev) => {
            const updated = new Map(prev)
            const clonagem = updated.get(data.operationId!)
            if (clonagem) {
              clonagem.progress = { current: data.current!, total: data.total! }
              updated.set(data.operationId!, clonagem)
            }
            return updated
          })
        }
      })
    }

    // Listener de conclusão
    if (window.electron?.contingencia?.onClonagemVIPAvancadaComplete) {
      window.electron.contingencia.onClonagemVIPAvancadaComplete((data: { operationId?: string; success?: boolean; [key: string]: unknown }) => {
        if (data.operationId) {
          setClonagensAtivas((prev) => {
            const updated = new Map(prev)
            const clonagem = updated.get(data.operationId!)
            if (clonagem) {
              clonagem.status = data.success ? 'concluido' : 'erro'
              clonagem.resultado = data as ClonagemAtiva['resultado']
              updated.set(data.operationId!, clonagem)
            }
            return updated
          })
        }
      })
    }

    // Listener de erro
    if (window.electron?.contingencia?.onClonagemVIPAvancadaError) {
      window.electron.contingencia.onClonagemVIPAvancadaError((data: { operationId?: string; error?: string }) => {
        if (data.operationId) {
          setClonagensAtivas((prev) => {
            const updated = new Map(prev)
            const clonagem = updated.get(data.operationId!)
            if (clonagem) {
              clonagem.status = 'erro'
              clonagem.resultado = { success: false, error: data.error }
              updated.set(data.operationId!, clonagem)
            }
            return updated
          })
        }
      })
    }

    return () => {
      if (window.electron?.contingencia?.removeClonagemVIPAvancadaListeners) {
        window.electron.contingencia.removeClonagemVIPAvancadaListeners()
      }
    }
  }, [])

  // Registrar listeners de análise de grupo
  useEffect(() => {
    if (window.electron?.contingencia?.onAnaliseGrupoLog) {
      window.electron.contingencia.onAnaliseGrupoLog((logMessage: string) => {
        setAnalysisLogs((prev) => [...prev, logMessage])
      })
    }

    return () => {
      if (window.electron?.contingencia?.removeAnaliseGrupoListeners) {
        window.electron.contingencia.removeAnaliseGrupoListeners()
      }
    }
  }, [])


  // Função para analisar grupo antes de clonar
  const handleAnalisarGrupo = async () => {
    const sessaoFinal = sessaoSelecionada || sessaoManual.trim()

    if (!sessaoFinal) {
      alert('Selecione ou digite o caminho de uma sessão')
      return
    }

    if (!linkGrupo.trim()) {
      alert('Digite o link do grupo/canal origem')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAnalysisLogs([])
    setSelectedTopics([])
    setGrupoTemRestricao(false)

    try {
      if (!window.electron?.contingencia?.analisarGrupo) {
        throw new Error('API não disponível')
      }

      const result = await window.electron.contingencia.analisarGrupo({
        sessionPath: sessaoFinal,
        sourceLink: linkGrupo.trim(),
      })

      if (result.success) {
        setAnalysisResult(result)
        // Pré-selecionar todos os tópicos com filtro 'ambos'
        setSelectedTopics(result.topicos.map((t: TopicoAnalise) => ({
          id: t.id,
          filtroMidia: 'ambos' as const
        })))
        // Pré-marcar restrição se detectada
        setGrupoTemRestricao(result.temRestricao)
        // Abrir modal de configuração
        setShowAnalysisModal(true)
      } else {
        alert(`Erro ao analisar grupo: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao analisar grupo:', error)
      alert(`Erro ao analisar grupo: ${error}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Função para selecionar/desselecionar todos os tópicos
  const handleSelectAllTopics = (checked: boolean) => {
    if (checked && analysisResult) {
      setSelectedTopics(analysisResult.topicos.map((t) => ({
        id: t.id,
        filtroMidia: filtroMidiaPadrao
      })))
    } else {
      setSelectedTopics([])
    }
  }

  // Função para toggle de tópico individual
  const handleToggleTopic = (topicId: number) => {
    setSelectedTopics((prev) => {
      const exists = prev.find(t => t.id === topicId)
      if (exists) {
        return prev.filter((t) => t.id !== topicId)
      } else {
        return [...prev, { id: topicId, filtroMidia: filtroMidiaPadrao }]
      }
    })
  }

  // Função para alterar o filtro de mídia de um tópico específico
  const handleChangeFiltroTopico = (topicId: number, filtro: 'fotos' | 'videos' | 'ambos') => {
    setSelectedTopics((prev) => 
      prev.map((t) => 
        t.id === topicId ? { ...t, filtroMidia: filtro } : t
      )
    )
  }

  // Função para aplicar filtro padrão a todos os tópicos selecionados
  const handleAplicarFiltroTodos = (filtro: 'fotos' | 'videos' | 'ambos') => {
    setFiltroMidiaPadrao(filtro)
    setSelectedTopics((prev) => 
      prev.map((t) => ({ ...t, filtroMidia: filtro }))
    )
  }


  // Função para iniciar clonagem a partir do modal de análise
  const handleIniciarClonagemDoModal = () => {
    setShowAnalysisModal(false)
    // A clonagem será iniciada com os tópicos selecionados e flag de restrição
    handleExecutarComAnalise()
  }

  // Função de execução que usa os dados da análise - RODA EM BACKGROUND
  // Suporta múltiplas clonagens simultâneas
  const handleExecutarComAnalise = () => {
    const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
    const sessionName = sessaoFinal.split(/[/\\]/).pop()?.replace('.session', '') || ''

    // Verificar se esta sessão já está sendo usada em outra clonagem
    const sessaoJaEmUso = Array.from(clonagensAtivas.values()).some(
      (c) => c.sessionPath === sessaoFinal && c.status === 'em_andamento'
    )
    if (sessaoJaEmUso) {
      alert('Esta sessão já está sendo usada em outra clonagem. Aguarde finalizar ou use outra sessão.')
      return
    }

    // Verificar limite de clonagens simultâneas
    const clonagensEmAndamento = Array.from(clonagensAtivas.values()).filter(
      (c) => c.status === 'em_andamento'
    ).length
    if (clonagensEmAndamento >= MAX_CLONAGENS_SIMULTANEAS) {
      alert(`Limite de ${MAX_CLONAGENS_SIMULTANEAS} clonagens simultâneas atingido. Aguarde uma finalizar.`)
      return
    }

    setIsProcessing(true)
    setResultado(null)
    setLogs([])

    // Iniciar clonagem em background (sem await para não bloquear)
    const executarEmBackground = async () => {
      try {
        if (modoDestino === 'existente' && statusGrupoDestino?.ok) {
          // Modo: Adicionar ao grupo existente
          if (!window.electron?.contingencia?.adicionarMidiasVip) {
            throw new Error('API não disponível')
          }

          const result = await window.electron.contingencia.adicionarMidiasVip({
            sessionPath: sessaoFinal,
            sourceLink: linkGrupo.trim(),
            grupoDestinoId: statusGrupoDestino.grupoId,
            grupoDestinoAccessHash: statusGrupoDestino.grupoAccessHash,
            proxy: null,
            clonarTopicos,
            criarTopicosAuto: true, // Sempre criar novos tópicos
            midiasPorTopico,
            retomar: false,
            tagSessao: tagSessao.trim() || null,
            grupoTemRestricao,
            topicosParaClonar: selectedTopics.length > 0 ? selectedTopics : null,
            filtroMidia: filtroMidiaPadrao, // Fallback para grupos sem tópicos
          })

          // Registrar clonagem ativa com operationId retornado
          if (result.operationId) {
            setClonagensAtivas((prev) => {
              const updated = new Map(prev)
              updated.set(result.operationId, {
                operationId: result.operationId,
                sessionPath: sessaoFinal,
                sessionName,
                sourceLink: linkGrupo.trim(),
                sourceName: analysisResult?.grupoNome || linkGrupo.trim(),
                status: result.success ? 'concluido' : 'erro',
                logs: [],
                resultado: result,
                iniciadoEm: new Date(),
                grupoDestinoId: statusGrupoDestino.grupoId,
              })
              return updated
            })
          }

          setResultado(result)
        } else {
          // Modo: Criar novo grupo
          if (!window.electron?.contingencia?.clonarVIPAvancado) {
            throw new Error('API não disponível')
          }

          const result = await window.electron.contingencia.clonarVIPAvancado({
            sessionPath: sessaoFinal,
            sourceLink: linkGrupo.trim(),
            proxy: null,
            clonarTopicos,
            nomeGrupoDestino: nomeGrupoDestino.trim() || null,
            retomar: false,
            criarTopicosAuto,
            midiasPorTopico,
            tagSessao: tagSessao.trim() || null,
            grupoTemRestricao,
            topicosParaClonar: selectedTopics.length > 0 ? selectedTopics : null,
            filtroMidia: filtroMidiaPadrao, // Fallback para grupos sem tópicos
          })

          // Registrar clonagem ativa com operationId retornado
          if (result.operationId) {
            setClonagensAtivas((prev) => {
              const updated = new Map(prev)
              updated.set(result.operationId, {
                operationId: result.operationId,
                sessionPath: sessaoFinal,
                sessionName,
                sourceLink: linkGrupo.trim(),
                sourceName: analysisResult?.grupoNome || linkGrupo.trim(),
                status: result.success ? 'concluido' : 'erro',
                logs: [],
                resultado: result,
                iniciadoEm: new Date(),
              })
              return updated
            })
          }

          setResultado(result)

          if (result.success && result.grupoId) {
            // Guardar informações do grupo criado para adicionar admins depois
            setGrupoParaAdmin({
              sessionPath: sessaoFinal,
              sessionName: sessaoFinal.split(/[/\\]/).pop()?.replace('.session', '') || '',
              groupLink: result.groupLink || '',
              grupoNome: result.grupoNome || '',
              grupoId: result.grupoId,
              grupoAccessHash: result.grupoAccessHash || '',
            })
          }
        }
      } catch (error) {
        console.error('Erro na clonagem:', error)
        setResultado({ success: false, error: String(error) })
      } finally {
        setIsProcessing(false)
      }
    }

    // Iniciar em background (não bloqueia a interface)
    executarEmBackground()
  }

  // Verificar checkpoint quando o link mudar
  useEffect(() => {
    const verificarCheckpoint = async () => {
      const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
      if (!sessaoFinal || !linkGrupo.trim()) {
        setCheckpoint(null)
        return
      }

      try {
        if (window.electron?.contingencia?.verificarCheckpoint) {
          const result = await window.electron.contingencia.verificarCheckpoint({
            sessionPath: sessaoFinal,
            sourceLink: linkGrupo.trim(),
          })
          if (result.existe) {
            setCheckpoint(result)
          } else {
            setCheckpoint(null)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar checkpoint:', error)
      }
    }

    const debounce = setTimeout(verificarCheckpoint, 500)
    return () => clearTimeout(debounce)
  }, [sessaoSelecionada, sessaoManual, linkGrupo])

  // Executar clonagem
  const handleExecutar = async (retomar = false) => {
    if (isProcessing) return

    const sessaoFinal = sessaoSelecionada || sessaoManual.trim()

    if (!sessaoFinal) {
      alert('Selecione ou digite o caminho de uma sessão')
      return
    }

    if (!linkGrupo.trim()) {
      alert('Digite o link do grupo/canal origem')
      return
    }

    // Validar modo "usar grupo existente"
    if (modoDestino === 'existente') {
      if (!linkGrupoDestino.trim()) {
        alert('Digite o link do grupo VIP de destino')
        return
      }
      if (!statusGrupoDestino?.ok) {
        alert('Verifique o grupo de destino antes de continuar')
        return
      }
    }

    setIsProcessing(true)
    setResultado(null)
    setLogs([])

    try {
      if (modoDestino === 'existente' && statusGrupoDestino?.ok) {
        // Modo: Adicionar ao grupo existente
        if (!window.electron?.contingencia?.adicionarMidiasVip) {
          throw new Error('API não disponível')
        }

        const result = await window.electron.contingencia.adicionarMidiasVip({
          sessionPath: sessaoFinal,
          sourceLink: linkGrupo.trim(),
          grupoDestinoId: statusGrupoDestino.grupoId,
          grupoDestinoAccessHash: statusGrupoDestino.grupoAccessHash,
          proxy: null,
          clonarTopicos,
          criarTopicosAuto: true, // Sempre criar novos tópicos
          midiasPorTopico,
          retomar,
          tagSessao: tagSessao.trim() || null,
          grupoTemRestricao: grupoTemRestricao,
          topicosParaClonar: selectedTopics.length > 0 ? selectedTopics : null,
          filtroMidia: filtroMidiaPadrao, // Fallback para grupos sem tópicos
        })

        setResultado(result)
        setCheckpoint(null)

        if (result.success) {
          setGrupoParaAdmin({
            sessionPath: sessaoFinal,
            sessionName: sessoes.find((s) => s.path === sessaoFinal)?.name || '',
            groupLink: linkGrupoDestino.trim(),
            grupoNome: statusGrupoDestino.grupoNome || '',
            grupoId: statusGrupoDestino.grupoId || '',
            grupoAccessHash: statusGrupoDestino.grupoAccessHash || '',
          })
        }
      } else {
        // Modo: Criar novo grupo
        if (!window.electron?.contingencia?.clonarVIPAvancado) {
          throw new Error('API não disponível')
        }

        const result = await window.electron.contingencia.clonarVIPAvancado({
          sessionPath: sessaoFinal,
          sourceLink: linkGrupo.trim(),
          proxy: null,
          clonarTopicos,
          nomeGrupoDestino: nomeGrupoDestino.trim() || null,
          retomar,
          criarTopicosAuto,
          midiasPorTopico,
          tagSessao: tagSessao.trim() || null,
          grupoTemRestricao: grupoTemRestricao,
          topicosParaClonar: selectedTopics.length > 0 ? selectedTopics : null,
          filtroMidia: filtroMidiaPadrao, // Fallback para grupos sem tópicos
        })

        setResultado(result)
        setCheckpoint(null)

        if (result.success && result.grupoId && result.grupoAccessHash) {
          setGrupoParaAdmin({
            sessionPath: sessaoFinal,
            sessionName: sessoes.find((s) => s.path === sessaoFinal)?.name || '',
            groupLink: result.groupLink || '',
            grupoNome: result.grupoNome || '',
            grupoId: result.grupoId,
            grupoAccessHash: result.grupoAccessHash,
          })
        }
      }
    } catch (error) {
      console.error('Erro ao executar clonagem:', error)
      setResultado({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Remover checkpoint
  const handleRemoverCheckpoint = async () => {
    const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
    if (!sessaoFinal || !linkGrupo.trim()) return

    if (!confirm('Tem certeza que deseja remover o checkpoint? Isso fará a clonagem começar do zero.')) {
      return
    }

    try {
      if (window.electron?.contingencia?.removerCheckpoint) {
        await window.electron.contingencia.removerCheckpoint({
          sessionPath: sessaoFinal,
          sourceLink: linkGrupo.trim(),
        })
        setCheckpoint(null)
        alert('Checkpoint removido com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao remover checkpoint:', error)
      alert('Erro ao remover checkpoint')
    }
  }

  // Adicionar admins
  const handleAdicionarAdmins = async () => {
    if (!grupoParaAdmin) return
    if (adminSessionPaths.length === 0 && !botUsernames.trim()) {
      alert('Selecione pelo menos uma sessão ou digite um username de bot')
      return
    }

    setAddingAdmins(true)
    try {
      if (!window.electron?.contingencia?.adicionarAdmins) {
        throw new Error('API não disponível')
      }

      const bots = botUsernames
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0)

      const result = await window.electron.contingencia.adicionarAdmins({
        ownerSessionPath: grupoParaAdmin.sessionPath,
        grupoId: grupoParaAdmin.grupoId,
        grupoAccessHash: grupoParaAdmin.grupoAccessHash,
        adminSessionPaths,
        botUsernames: bots,
      })

      if (result.success) {
        alert(result.mensagem || 'Admins adicionados com sucesso!')
        setShowAdminModal(false)
        setAdminSessionPaths([])
        setBotUsernames('')
      } else {
        alert(`Erro: ${result.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao adicionar admins:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setAddingAdmins(false)
    }
  }

  // Copiar link
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen -m-6 p-6 bg-[#0d1117]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Copy className="w-6 h-6 text-gray-400" />
              Clonador VIP
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Clone grupos e canais com suporte a tópicos e proteção de conteúdo</p>
          </div>

          {/* Features sutis */}
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              Tópicos
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Proteção
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Autor oculto
            </span>
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Checkpoint
            </span>
          </div>

          <button
            onClick={loadSessoes}
            className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] text-gray-300 text-sm border border-gray-700/50 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda - Configurações */}
        <div className="space-y-4">
          {/* Seleção de Sessão */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">Sessão para clonagem</label>

            <div className="space-y-3">
              {/* Campo de pesquisa */}
              <div className="relative session-dropdown-container">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={sessionSearchTerm || (sessaoSelecionada ? sessoes.find((s) => s.path === sessaoSelecionada)?.name || '' : '')}
                    onChange={(e) => {
                      setSessionSearchTerm(e.target.value)
                      setShowSessionDropdown(true)
                      if (!e.target.value) {
                        setSessaoSelecionada('')
                      }
                    }}
                    onFocus={() => setShowSessionDropdown(true)}
                    onClick={() => setShowSessionDropdown(true)}
                    placeholder="Pesquisar sessão..."
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                    autoComplete="off"
                    disabled={isProcessing}
                  />
                  {(sessionSearchTerm || sessaoSelecionada) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSessionSearchTerm('')
                        setSessaoSelecionada('')
                        setShowSessionDropdown(true)
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showSessionDropdown && sessoes.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-[#161b22] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {(() => {
                      const filteredSessoes = sessionSearchTerm
                        ? sessoes.filter((sessao) => {
                            const searchLower = sessionSearchTerm.toLowerCase()
                            return (
                              sessao.name.toLowerCase().includes(searchLower) ||
                              sessao.path.toLowerCase().includes(searchLower) ||
                              sessao.tag?.toLowerCase().includes(searchLower)
                            )
                          })
                        : sessoes

                      if (filteredSessoes.length === 0) {
                        return <div className="px-4 py-3 text-center text-gray-500 text-sm">Nenhuma sessão encontrada</div>
                      }

                      return filteredSessoes.map((sessao) => (
                        <button
                          key={sessao.path}
                          onClick={() => {
                            setSessaoSelecionada(sessao.path)
                            setSessionSearchTerm(sessao.name)
                            setSessaoManual('')
                            setShowSessionDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-[#21262d] text-gray-200 transition-colors border-b border-gray-800 last:border-b-0 ${
                            sessaoSelecionada === sessao.path ? 'bg-[#21262d] border-l-2 border-l-emerald-500' : ''
                          }`}
                        >
                          <div className="text-sm truncate">{sessao.name}</div>
                          <div className="text-xs text-gray-500 truncate">{sessao.path}</div>
                          {sessao.tag && <span className="inline-block mt-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{sessao.tag}</span>}
                        </button>
                      ))
                    })()}
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#161b22] px-2 text-gray-600">ou</span>
                </div>
              </div>

              {/* Campo manual */}
              <input
                type="text"
                value={sessaoManual}
                onChange={(e) => {
                  setSessaoManual(e.target.value)
                  if (e.target.value) setSessaoSelecionada('')
                }}
                placeholder="Caminho completo do arquivo .session"
                className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                disabled={isProcessing}
              />

              {/* Tag da sessão */}
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tag para esta sessão (opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagSessao}
                    onChange={(e) => setTagSessao(e.target.value)}
                    placeholder="Digite uma tag para esta sessão..."
                    className="flex-1 px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={async () => {
                      const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
                      if (!sessaoFinal) {
                        alert('Selecione uma sessão primeiro')
                        return
                      }
                      if (!tagSessao.trim()) {
                        alert('Digite uma tag para salvar')
                        return
                      }
                      try {
                        const result = await window.electron?.contingencia?.definirTag?.(sessaoFinal, tagSessao.trim())
                        if (result?.success) {
                          alert('Tag salva com sucesso!')
                          loadSessoes() // Recarregar lista para atualizar tags
                        } else {
                          alert('Erro ao salvar tag')
                        }
                      } catch (error) {
                        alert('Erro ao salvar tag: ' + (error instanceof Error ? error.message : 'Erro'))
                      }
                    }}
                    disabled={isProcessing || (!sessaoSelecionada && !sessaoManual)}
                    className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-200 text-sm rounded-lg hover:bg-[#30363d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Salvar Tag
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">Adicione uma tag para facilitar a identificação desta sessão</p>
              </div>
            </div>

          </div>

          {/* Destino das Mídias - Escolha Manual */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">Destino das mídias</label>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setModoDestino('criar')}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  modoDestino === 'criar'
                    ? 'bg-[#238636] text-white border border-green-500/30'
                    : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] border border-gray-700/50'
                }`}
                disabled={isProcessing}
              >
                <PlusCircle className="w-4 h-4" />
                Criar Novo Grupo
              </button>
              <button
                onClick={() => setModoDestino('existente')}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  modoDestino === 'existente'
                    ? 'bg-emerald-600 text-white border border-emerald-500/30'
                    : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] border border-gray-700/50'
                }`}
                disabled={isProcessing}
              >
                <FolderPlus className="w-4 h-4" />
                Usar Grupo Existente
              </button>
            </div>

            {modoDestino === 'existente' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkGrupoDestino}
                    onChange={(e) => setLinkGrupoDestino(e.target.value)}
                    placeholder="https://t.me/+hash ou https://t.me/grupo"
                    className="flex-1 px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                    disabled={isProcessing || verificandoGrupoDestino}
                  />
                  <button
                    onClick={async () => {
                      if (!linkGrupoDestino.trim()) {
                        alert('Digite o link do grupo VIP de destino')
                        return
                      }
                      const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
                      if (!sessaoFinal) {
                        alert('Selecione uma sessão primeiro')
                        return
                      }
                      setVerificandoGrupoDestino(true)
                      setStatusGrupoDestino(null)
                      try {
                        const result = await window.electron?.contingencia?.verificarGrupoDestinoVip?.({
                          sessionPath: sessaoFinal,
                          grupoLink: linkGrupoDestino.trim()
                        })
                        if (result?.success) {
                          setStatusGrupoDestino({
                            ok: true,
                            mensagem: result.mensagem || 'Grupo verificado com sucesso',
                            grupoId: result.grupoId,
                            grupoAccessHash: result.grupoAccessHash,
                            grupoNome: result.grupoNome
                          })
                        } else {
                          setStatusGrupoDestino({
                            ok: false,
                            mensagem: result?.error || 'Não foi possível acessar o grupo'
                          })
                        }
                      } catch (error) {
                        setStatusGrupoDestino({
                          ok: false,
                          mensagem: error instanceof Error ? error.message : 'Erro ao verificar grupo'
                        })
                      } finally {
                        setVerificandoGrupoDestino(false)
                      }
                    }}
                    disabled={isProcessing || verificandoGrupoDestino || !linkGrupoDestino.trim() || (!sessaoSelecionada && !sessaoManual.trim())}
                    className="px-4 py-2.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-sm rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {verificandoGrupoDestino ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Verificar
                      </>
                    )}
                  </button>
                </div>

                {statusGrupoDestino && (
                  <div className={`p-3 rounded-lg border ${
                    statusGrupoDestino.ok
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {statusGrupoDestino.ok ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm ${statusGrupoDestino.ok ? 'text-green-300' : 'text-red-300'}`}>
                        {statusGrupoDestino.mensagem}
                      </span>
                    </div>
                    {statusGrupoDestino.ok && statusGrupoDestino.grupoNome && (
                      <div className="mt-2 text-xs text-gray-400">
                        Grupo: <span className="text-gray-300">{statusGrupoDestino.grupoNome}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Novos tópicos serão criados neste grupo (não usa os existentes)</span>
                </div>
              </div>
            )}
          </div>

          {/* Link do Grupo */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">Link do grupo ou canal origem</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkGrupo}
                onChange={(e) => setLinkGrupo(e.target.value)}
                placeholder="https://t.me/grupo ou https://t.me/+hash"
                className="flex-1 px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                disabled={isProcessing || isAnalyzing}
              />
              <button
                onClick={handleAnalisarGrupo}
                disabled={isProcessing || isAnalyzing || !linkGrupo.trim() || (!sessaoSelecionada && !sessaoManual.trim())}
                className="px-4 py-2.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-sm rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4" />
                    Analisar Grupo
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">Grupos públicos, privados e canais • Clique em "Analisar Grupo" para ver tópicos e configurar</p>
          </div>

          {/* Resultado da Análise (se disponível) */}
          {analysisResult && !showAnalysisModal && (
            <div className="bg-[#161b22] rounded-lg border border-blue-600/30 p-4">
              <div className="flex items-start gap-3">
                <FileSearch className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">Análise disponível: {analysisResult.grupoNome}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Image className="w-3 h-3" />
                      {analysisResult.totalMidias !== null ? `${analysisResult.totalMidias.toLocaleString()} mídias` : 'mídias (não contadas)'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Folder className="w-3 h-3" />
                      {analysisResult.topicos.length} tópico(s)
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      {analysisResult.temRestricao ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400">Com restrição</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">Sem restrição</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      {selectedTopics.length}/{analysisResult.topicos.length} selecionados
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAnalysisModal(true)}
                    className="px-3 py-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Settings className="w-3 h-3" /> Configurar Tópicos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Checkpoint Alert */}
          {checkpoint && checkpoint.existe && (
            <div className={`bg-[#161b22] rounded-lg border p-4 ${checkpoint.sessaoDiferente ? 'border-red-600/30' : 'border-amber-600/30'}`}>
              <div className="flex items-start gap-3">
                <History className={`w-4 h-4 mt-0.5 ${checkpoint.sessaoDiferente ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="flex-1">
                  <h4 className={`text-sm font-medium mb-1 ${checkpoint.sessaoDiferente ? 'text-red-300' : 'text-amber-300'}`}>
                    Clonagem anterior encontrada
                  </h4>
                  <p className="text-xs text-gray-400 mb-2">
                    {checkpoint.grupoDestinoNome} • {checkpoint.mensagensClonadas} mensagens
                  </p>
                  
                  {/* Info da sessão original */}
                  {checkpoint.sessionPath && (
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <span>Sessão:</span>
                      <span className="font-mono text-gray-400">
                        {checkpoint.sessionPath.split(/[/\\]/).pop()?.replace('.session', '')}
                      </span>
                    </div>
                  )}
                  
                  {/* Aviso de sessão diferente */}
                  {checkpoint.sessaoDiferente && (
                    <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-2 mb-3">
                      <p className="text-xs text-red-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        A sessão selecionada é diferente da original!
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Use a mesma sessão ou certifique-se que esta sessão tem permissão de admin no grupo.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecutar(true)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" /> Retomar
                    </button>
                    <button
                      onClick={handleRemoverCheckpoint}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <X className="w-3 h-3" /> Recomeçar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão Executar */}
          <button
            onClick={() => handleExecutar(false)}
            disabled={isProcessing || (!sessaoSelecionada && !sessaoManual) || !linkGrupo || (modoDestino === 'existente' && !statusGrupoDestino?.ok)}
            className={`w-full px-4 py-3 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              modoDestino === 'existente' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#238636] hover:bg-[#2ea043]'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {modoDestino === 'existente' ? 'Adicionando...' : 'Clonando...'}
              </>
            ) : modoDestino === 'existente' ? (
              <>
                <FolderPlus className="w-4 h-4" />
                Adicionar Mídias
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Iniciar Clonagem
              </>
            )}
          </button>
        </div>

        {/* Coluna Direita - Logs e Resultado */}
        <div className="space-y-4">
          {/* Painel de Clonagens Ativas */}
          {clonagensAtivas.size > 0 && (
            <div className="bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-[#0d1117] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-gray-400">
                    Clonagens Ativas ({Array.from(clonagensAtivas.values()).filter(c => c.status === 'em_andamento').length})
                  </span>
                </div>
                <button 
                  onClick={() => {
                    // Limpar clonagens concluídas/erros
                    setClonagensAtivas(prev => {
                      const updated = new Map(prev)
                      for (const [id, clonagem] of updated) {
                        if (clonagem.status !== 'em_andamento') {
                          updated.delete(id)
                        }
                      }
                      return updated
                    })
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Limpar concluídas
                </button>
              </div>
              <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {Array.from(clonagensAtivas.values()).map((clonagem) => (
                  <div
                    key={clonagem.operationId}
                    className={`bg-[#0d1117] rounded border p-3 cursor-pointer transition-colors ${
                      clonagemSelecionadaParaLogs === clonagem.operationId
                        ? 'border-purple-500'
                        : clonagem.status === 'em_andamento'
                        ? 'border-amber-600/30 hover:border-amber-600/50'
                        : clonagem.status === 'concluido'
                        ? 'border-emerald-600/30 hover:border-emerald-600/50'
                        : 'border-red-600/30 hover:border-red-600/50'
                    }`}
                    onClick={() => setClonagemSelecionadaParaLogs(
                      clonagemSelecionadaParaLogs === clonagem.operationId ? null : clonagem.operationId
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-200 truncate max-w-[200px]">
                        {clonagem.sessionName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        clonagem.status === 'em_andamento'
                          ? 'bg-amber-500/20 text-amber-400'
                          : clonagem.status === 'concluido'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {clonagem.status === 'em_andamento' ? 'Clonando' : clonagem.status === 'concluido' ? 'Concluído' : 'Erro'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {clonagem.sourceName || clonagem.sourceLink}
                    </div>
                    {clonagem.progress && clonagem.status === 'em_andamento' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{clonagem.progress.current} / {clonagem.progress.total}</span>
                          <span>{Math.round((clonagem.progress.current / clonagem.progress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(clonagem.progress.current / clonagem.progress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {clonagem.resultado?.totalMensagens && clonagem.status === 'concluido' && (
                      <div className="mt-2 text-xs text-emerald-400">
                        {clonagem.resultado.totalMensagens} mensagens clonadas
                      </div>
                    )}
                    {clonagem.resultado?.error && clonagem.status === 'erro' && (
                      <div className="mt-2 text-xs text-red-400 truncate">
                        {clonagem.resultado.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Logs da clonagem selecionada */}
              {clonagemSelecionadaParaLogs && clonagensAtivas.get(clonagemSelecionadaParaLogs) && (
                <div className="border-t border-gray-800 p-3">
                  <div className="text-xs text-gray-400 mb-2">
                    Logs: {clonagensAtivas.get(clonagemSelecionadaParaLogs)?.sessionName}
                  </div>
                  <div className="bg-[#0d1117] rounded border border-gray-800 p-2 h-[150px] overflow-y-auto font-mono text-xs">
                    {clonagensAtivas.get(clonagemSelecionadaParaLogs)?.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.includes('✅')
                            ? 'text-emerald-400'
                            : log.includes('❌') || log.includes('Erro')
                            ? 'text-red-400'
                            : log.includes('⚠️')
                            ? 'text-amber-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Terminal */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden">
            <div className="bg-[#0d1117] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : logs.length > 0 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-400">Terminal</span>
              </div>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors" disabled={isProcessing}>
                Limpar
              </button>
            </div>
            <div className="p-3">
              <div className="bg-[#0d1117] rounded border border-gray-800 p-3 h-[350px] overflow-y-auto font-mono text-xs">
                {logs.length === 0 && !isProcessing && <div className="text-gray-600">Aguardando...</div>}
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`${
                      log.includes('✅')
                        ? 'text-emerald-400'
                        : log.includes('❌') || log.includes('Erro')
                        ? 'text-red-400'
                        : log.includes('⚠️')
                        ? 'text-amber-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className={`bg-[#161b22] rounded-lg border p-4 ${resultado.success ? 'border-emerald-600/30' : 'border-red-600/30'}`}>
              {resultado.success ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-medium text-emerald-400">Clonagem concluída</h3>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Origem</span>
                      <span className="text-gray-200">{resultado.grupoOrigemNome}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Destino</span>
                      <span className="text-gray-200">{resultado.grupoNome}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mensagens</span>
                      <span className="text-emerald-400 font-medium">{resultado.totalMensagens}</span>
                    </div>

                    {resultado.temTopicos && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Tópicos</span>
                        <span className="text-gray-200">{resultado.topicosClonados}</span>
                      </div>
                    )}

                    {/* Link do Grupo */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-2">Link do grupo</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={resultado.groupLink || ''}
                          readOnly
                          className="flex-1 px-3 py-2 bg-[#0d1117] text-emerald-400 text-sm border border-gray-700/50 rounded-lg"
                        />
                        <button
                          onClick={() => copyToClipboard(resultado.groupLink || '')}
                          className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        <a
                          href={resultado.groupLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    </div>

                    {grupoParaAdmin && (
                      <button
                        onClick={() => setShowAdminModal(true)}
                        className="w-full mt-4 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Adicionar Admins
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-1">Erro na clonagem</h3>
                    <p className="text-red-300/70 text-sm">{resultado.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Admins */}
      {showAdminModal && grupoParaAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAdminModal(false)}>
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Adicionar Admins
              </h2>
              <button onClick={() => setShowAdminModal(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-800">
                <div className="text-xs text-gray-500">Grupo</div>
                <div className="text-sm text-gray-200">{grupoParaAdmin.grupoNome}</div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Sessões</label>
                <div className="bg-[#0d1117] rounded-lg border border-gray-800 max-h-40 overflow-y-auto">
                  {sessoes
                    .filter((s) => s.path !== grupoParaAdmin.sessionPath)
                    .slice(0, 20)
                    .map((sessao) => (
                      <label key={sessao.path} className="flex items-center gap-3 px-3 py-2 hover:bg-[#21262d] cursor-pointer border-b border-gray-800 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={adminSessionPaths.includes(sessao.path)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAdminSessionPaths([...adminSessionPaths, sessao.path])
                            } else {
                              setAdminSessionPaths(adminSessionPaths.filter((p) => p !== sessao.path))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-transparent text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-300 truncate">{sessao.name}</span>
                      </label>
                    ))}
                </div>
                {adminSessionPaths.length > 0 && <div className="mt-2 text-xs text-emerald-400">{adminSessionPaths.length} selecionada(s)</div>}
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Bots
                </label>
                <input
                  type="text"
                  value={botUsernames}
                  onChange={(e) => setBotUsernames(e.target.value)}
                  placeholder="@bot1, @bot2, @bot3"
                  className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                />
                <p className="text-xs text-gray-600 mt-1">Separados por vírgula</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button onClick={() => setShowAdminModal(false)} className="flex-1 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleAdicionarAdmins}
                  disabled={addingAdmins || (adminSessionPaths.length === 0 && !botUsernames.trim())}
                  className="flex-1 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {addingAdmins ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Grupo */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAnalysisModal(false)}>
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileSearch className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-lg font-medium text-white">Análise do Grupo</h2>
                  <p className="text-xs text-gray-500">Configure as opções de clonagem</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="p-2 hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Informações do Grupo */}
            <div className="bg-[#0d1117] rounded-lg p-4 mb-6 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-200">{analysisResult.grupoNome}</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${analysisResult.grupoTipo === 'PUBLICO' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
                  {analysisResult.grupoTipo}
                </span>
              </div>
              
              {/* Alerta de restrição */}
              {analysisResult.temRestricao && (
                <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-300 font-medium">Grupo com restrição de conteúdo</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Este grupo não permite encaminhar mídias. O sistema irá baixar cada mídia antes de enviar (pode ser mais lento).
                    </p>
                  </div>
                </div>
              )}

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#161b22] rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-1">
                    <Image className="w-4 h-4" />
                    <span className="text-xs">Total de Mídias</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {analysisResult.totalMidias !== null ? analysisResult.totalMidias.toLocaleString() : '-'}
                  </div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-1">
                    <Folder className="w-4 h-4" />
                    <span className="text-xs">Tópicos</span>
                  </div>
                  <div className="text-xl font-bold text-white">{analysisResult.topicos.length}</div>
                </div>
              </div>
            </div>

            {/* Dica sobre filtro de mídia por tópico */}
            <div className="mb-6 p-3 bg-blue-900/10 border border-blue-600/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-300">Filtro de mídia por tópico</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Selecione os tópicos abaixo e escolha se deseja clonar apenas <strong>fotos</strong>, apenas <strong>vídeos</strong> ou <strong>ambos</strong> para cada tópico individualmente.
                  </p>
                </div>
              </div>
            </div>

            {/* Seleção de Tópicos - UI Melhorada */}
            {analysisResult.topicos.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gray-500" />
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Tópicos para clonar</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {selectedTopics.length}/{analysisResult.topicos.length}
                    </span>
                    <button
                      onClick={() => handleSelectAllTopics(selectedTopics.length !== analysisResult.topicos.length)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        selectedTopics.length === analysisResult.topicos.length
                          ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                          : 'bg-[#21262d] text-gray-400 hover:bg-[#30363d]'
                      }`}
                    >
                      {selectedTopics.length === analysisResult.topicos.length ? 'Desmarcar' : 'Selecionar'} todos
                    </button>
                  </div>
                </div>
                
                <div className="bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {analysisResult.topicos.map((topico, index) => {
                      const topicoSelecionado = selectedTopics.find(t => t.id === topico.id);
                      const isSelected = !!topicoSelecionado;
                      return (
                        <div
                          key={topico.id}
                          className={`flex items-center gap-3 p-3 transition-all ${
                            index !== analysisResult.topicos.length - 1 ? 'border-b border-gray-800/50' : ''
                          } ${
                            isSelected 
                              ? 'bg-blue-600/10' 
                              : 'hover:bg-[#161b22]'
                          }`}
                        >
                          {/* Checkbox customizado */}
                          <div 
                            onClick={() => handleToggleTopic(topico.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          
                          {/* Info do tópico */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleToggleTopic(topico.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium truncate ${
                                isSelected ? 'text-gray-100' : 'text-gray-300'
                              }`}>
                                {topico.titulo}
                              </span>
                              {topico.closed && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-red-900/30 text-red-400 rounded">
                                  fechado
                                </span>
                              )}
                              {topico.pinned && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-amber-900/30 text-amber-400 rounded">
                                  fixado
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Estatísticas */}
                          <div className="flex items-center gap-2">
                            {topico.midias !== null && (
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                                isSelected ? 'bg-blue-600/20 text-blue-300' : 'bg-[#161b22] text-gray-500'
                              }`}>
                                <Image className="w-3.5 h-3.5" />
                                <span>{topico.midias.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Seletor de tipo de mídia POR TÓPICO */}
                          {isSelected && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleChangeFiltroTopico(topico.id, 'ambos')}
                                className={`px-2 py-1 text-[10px] rounded transition-all ${
                                  topicoSelecionado?.filtroMidia === 'ambos'
                                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                                    : 'bg-[#161b22] text-gray-500 hover:text-gray-300'
                                }`}
                                title="Clonar fotos e vídeos"
                              >
                                Ambos
                              </button>
                              <button
                                onClick={() => handleChangeFiltroTopico(topico.id, 'fotos')}
                                className={`px-2 py-1 text-[10px] rounded transition-all ${
                                  topicoSelecionado?.filtroMidia === 'fotos'
                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-[#161b22] text-gray-500 hover:text-gray-300'
                                }`}
                                title="Só fotos"
                              >
                                <ImageIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleChangeFiltroTopico(topico.id, 'videos')}
                                className={`px-2 py-1 text-[10px] rounded transition-all ${
                                  topicoSelecionado?.filtroMidia === 'videos'
                                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                                    : 'bg-[#161b22] text-gray-500 hover:text-gray-300'
                                }`}
                                title="Só vídeos"
                              >
                                <Video className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Resumo da seleção e ações em massa */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <p className="text-xs text-gray-500">
                    {selectedTopics.length === 0 && 'Nenhum tópico selecionado'}
                    {selectedTopics.length === 1 && '1 tópico selecionado'}
                    {selectedTopics.length > 1 && `${selectedTopics.length} tópicos selecionados`}
                  </p>
                  {selectedTopics.length > 0 && (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-blue-400">
                        ~{analysisResult.topicos
                          .filter(t => selectedTopics.some(st => st.id === t.id))
                          .reduce((acc, t) => acc + (t.midias || 0), 0)
                          .toLocaleString()} mídias
                      </p>
                      {/* Aplicar filtro em massa */}
                      <div className="flex items-center gap-1 border-l border-gray-700 pl-3">
                        <span className="text-[10px] text-gray-500">Aplicar a todos:</span>
                        <button
                          onClick={() => handleAplicarFiltroTodos('ambos')}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-[#161b22] text-gray-400 hover:text-blue-300 hover:bg-blue-600/20 transition-all"
                          title="Ambos"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => handleAplicarFiltroTodos('fotos')}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-[#161b22] text-gray-400 hover:text-emerald-300 hover:bg-emerald-600/20 transition-all"
                          title="Só fotos"
                        >
                          📷
                        </button>
                        <button
                          onClick={() => handleAplicarFiltroTodos('videos')}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-[#161b22] text-gray-400 hover:text-purple-300 hover:bg-purple-600/20 transition-all"
                          title="Só vídeos"
                        >
                          🎬
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mensagem quando não há tópicos */}
            {analysisResult.topicos.length === 0 && (
              <div className="mb-6 p-4 bg-[#0d1117] rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 text-gray-400">
                  <Folder className="w-5 h-5" />
                  <div>
                    <p className="text-sm text-gray-300">Grupo sem tópicos</p>
                    <p className="text-xs text-gray-500">Todas as mídias serão clonadas do chat principal</p>
                  </div>
                </div>
              </div>
            )}

            {/* Opções */}
            <div className="space-y-4 mb-6">
              <label className="text-xs text-gray-500 uppercase tracking-wide block">Opções</label>
              
              {/* Toggle de restrição */}
              <label className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-gray-800 cursor-pointer hover:bg-[#161b22] transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className={`w-5 h-5 ${grupoTemRestricao ? 'text-amber-400' : 'text-gray-500'}`} />
                  <div>
                    <div className="text-sm text-gray-200">Grupo com restrição de conteúdo</div>
                    <div className="text-xs text-gray-500">Baixar mídias antes de enviar (mais lento, mas contorna restrições)</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={grupoTemRestricao}
                    onChange={(e) => setGrupoTemRestricao(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-amber-600 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                </div>
              </label>

              {/* Opções de tópicos - diferente se grupo tem ou não tópicos */}
              {analysisResult.temTopicos ? (
                /* Grupo TEM tópicos - opção de replicar estrutura */
                <label className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-gray-800 cursor-pointer hover:bg-[#161b22] transition-colors">
                  <div className="flex items-center gap-3">
                    <FolderTree className={`w-5 h-5 ${clonarTopicos ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <div>
                      <div className="text-sm text-gray-200">Replicar estrutura de tópicos</div>
                      <div className="text-xs text-gray-500">
                        {clonarTopicos 
                          ? 'Criar tópicos com os mesmos nomes do grupo original' 
                          : 'Enviar todas as mídias para o tópico Geral'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={clonarTopicos}
                      onChange={(e) => setClonarTopicos(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                </label>
              ) : (
                /* Grupo NÃO tem tópicos - opção de criar automaticamente */
                <>
                  <label className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-gray-800 cursor-pointer hover:bg-[#161b22] transition-colors">
                    <div className="flex items-center gap-3">
                      <FolderPlus className={`w-5 h-5 ${criarTopicosAuto ? 'text-blue-400' : 'text-gray-500'}`} />
                      <div>
                        <div className="text-sm text-gray-200">Criar tópicos automaticamente</div>
                        <div className="text-xs text-gray-500">
                          {criarTopicosAuto 
                            ? 'Dividir mídias em tópicos numerados' 
                            : 'Enviar todas as mídias sem criar tópicos'}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={criarTopicosAuto}
                        onChange={(e) => setCriarTopicosAuto(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                  </label>

                  {/* Mídias por tópico (só aparece se criar tópicos auto) */}
                  {criarTopicosAuto && (
                    <div className="p-3 bg-[#0d1117] rounded-lg border border-gray-800 ml-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-200">Mídias por tópico</div>
                          <div className="text-xs text-gray-500">Quantas mídias antes de criar novo tópico</div>
                        </div>
                        <input
                          type="number"
                          value={midiasPorTopico}
                          onChange={(e) => setMidiasPorTopico(Math.max(50, parseInt(e.target.value) || 2000))}
                          min={50}
                          className="w-24 px-3 py-1.5 bg-[#161b22] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 text-right"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}


              {/* Nome do grupo destino */}
              <div className="p-3 bg-[#0d1117] rounded-lg border border-gray-800">
                <label className="text-sm text-gray-200 block mb-2">Nome do grupo destino (opcional)</label>
                <input
                  type="text"
                  value={nomeGrupoDestino}
                  onChange={(e) => setNomeGrupoDestino(e.target.value)}
                  placeholder="Deixe vazio para nome automático"
                  className="w-full px-3 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="flex-1 px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleIniciarClonagemDoModal}
                disabled={selectedTopics.length === 0}
                className="flex-1 px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Iniciar Clonagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

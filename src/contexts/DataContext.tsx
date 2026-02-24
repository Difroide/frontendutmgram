import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { Conta } from '@/types/Conta'
import { BotMidia } from '@/types/BotMidia'
import { contaService } from '@/pages/Contas/contaService'
import { botMidiaService } from '@/pages/BotsMidia/botMidiaService'
import { useOperacao } from '@/contexts/OperacaoContext'

// Tipos
interface Categoria {
  id: string
  nome: string
  descricao?: string
  rodando?: boolean
  createdAt?: string
}

interface DashboardStats {
  totalContas: number
  botsAtivos: number
  totalGrupos: number
  contasOnline: number
  contasCaidas: number
  contasSemGrupos: number
  gruposSemMembros: number
  gruposSemListas: number
  gruposCriadosHoje: number
  automacoesEmAndamento: number
  automacoesConcluidasHoje: number
}

interface PieChartData {
  name: string
  value: number
}

interface DashboardPieData {
  porCategoria: PieChartData[]
  porTag: PieChartData[]
}

interface DataContextType {
  // Dados
  contas: Conta[]
  bots: BotMidia[]
  categorias: Categoria[]
  stats: DashboardStats | null
  pieData: DashboardPieData | null
  
  // Estado de loading
  isLoading: boolean
  isInitialLoad: boolean
  lastUpdate: Date | null
  
  // Funções de refresh
  refreshAll: () => Promise<void>
  refreshContas: () => Promise<void>
  refreshBots: () => Promise<void>
  refreshCategorias: () => Promise<void>
  
  // Funções de atualização otimista
  addConta: (conta: Conta) => void
  updateConta: (numero: string, updates: Partial<Conta>) => void
  deleteConta: (numero: string) => void
  
  addBot: (bot: BotMidia) => void
  updateBot: (id: string | number, updates: Partial<BotMidia>) => void
  deleteBot: (id: string | number) => void
  setBots: (bots: BotMidia[]) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider')
  }
  return context
}

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { operacaoAtual } = useOperacao()

  // Estados principais
  const [contas, setContas] = useState<Conta[]>([])
  const [bots, setBots] = useState<BotMidia[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  
  // Estados de controle
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Carregar contas
  const loadContas = useCallback(async () => {
    try {
      const data = await contaService.getAll()
      setContas(data)
      return data
    } catch (error) {
      console.error('[DataContext] Erro ao carregar contas:', error)
      return []
    }
  }, [])

  // Carregar bots
  const loadBots = useCallback(async () => {
    try {
      const data = await botMidiaService.getAll()
      setBots(data)
      return data
    } catch (error) {
      console.error('[DataContext] Erro ao carregar bots:', error)
      return []
    }
  }, [])

  // Carregar categorias
  const loadCategorias = useCallback(async () => {
    try {
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        setCategorias(data || [])
        return data || []
      }
      return []
    } catch (error) {
      console.error('[DataContext] Erro ao carregar categorias:', error)
      return []
    }
  }, [])

  // Refresh all
  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadContas(),
        loadBots(),
        loadCategorias()
      ])
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }, [loadContas, loadBots, loadCategorias])

  // Refresh individual
  const refreshContas = useCallback(async () => {
    await loadContas()
    setLastUpdate(new Date())
  }, [loadContas])

  const refreshBots = useCallback(async () => {
    await loadBots()
    setLastUpdate(new Date())
  }, [loadBots])

  const refreshCategorias = useCallback(async () => {
    await loadCategorias()
    setLastUpdate(new Date())
  }, [loadCategorias])

  // Funções de atualização otimista para contas
  const addConta = useCallback((conta: Conta) => {
    setContas(prev => [...prev, conta])
    setLastUpdate(new Date())
  }, [])

  const updateConta = useCallback((numero: string, updates: Partial<Conta>) => {
    setContas(prev => prev.map(c => 
      c.numero === numero ? { ...c, ...updates } : c
    ))
    setLastUpdate(new Date())
  }, [])

  const deleteConta = useCallback((numero: string) => {
    setContas(prev => prev.filter(c => c.numero !== numero))
    setLastUpdate(new Date())
  }, [])

  // Funções de atualização otimista para bots
  const addBot = useCallback((bot: BotMidia) => {
    setBots(prev => [...prev, bot])
    setLastUpdate(new Date())
  }, [])

  const updateBot = useCallback((id: string | number, updates: Partial<BotMidia>) => {
    setBots(prev => prev.map(b => 
      (b.id === id || String(b.id) === String(id)) ? { ...b, ...updates } : b
    ))
    setLastUpdate(new Date())
  }, [])

  const deleteBot = useCallback((id: string | number) => {
    setBots(prev => prev.filter(b => b.id !== id && String(b.id) !== String(id)))
    setLastUpdate(new Date())
  }, [])

  // Calcular stats derivados das contas e bots
  const stats = useMemo<DashboardStats | null>(() => {
    if (contas.length === 0 && bots.length === 0) return null

    // Total de contas
    const totalContas = contas.length

    // Bots ativos
    const botsAtivos = bots.filter(bot => bot.status === 'Ativo').length

    // Calcular total de grupos (apenas ativos - exclui caídos)
    let totalGrupos = 0
    contas.forEach(conta => {
      if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
        totalGrupos += conta.gruposDetalhes.filter((g: any) => g.caido !== true).length
      } else if (Array.isArray(conta.grupos)) {
        totalGrupos += conta.grupos.filter((g: any) => g.caido !== true).length
      } else if (typeof conta.grupos === 'number') {
        totalGrupos += conta.grupos
      }
    })

    // Contas caídas (banidas, congeladas, restritas)
    const contasCaidas = contas.filter(conta => {
      if (!conta.tags || !Array.isArray(conta.tags)) return false
      return conta.tags.some(tag => {
        const tagLower = tag.toLowerCase()
        return tagLower.includes('banida') || 
               tagLower.includes('banned') || 
               tagLower.includes('congelada') || 
               tagLower.includes('frozen') ||
               tagLower.includes('usuário restrito') ||
               tagLower.includes('user restricted')
      })
    }).length

    const contasOnline = totalContas - contasCaidas

    // Contas sem grupos
    const contasSemGrupos = contas.filter(conta => {
      const temTagEspecial = conta.tags?.some((tag: string) => {
        const tagLower = tag.toLowerCase()
        return tagLower.includes('congelada') || 
               tagLower.includes('banida') || 
               tagLower.includes('usuário restrito')
      }) || false
      return conta.grupos === 0 && !temTagEspecial
    }).length

    // Grupos sem membros (exclui caídos)
    let gruposSemMembros = 0
    contas.forEach(conta => {
      if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
        gruposSemMembros += conta.gruposDetalhes.filter((grupo: any) => {
          if (grupo.caido === true) return false
          const membros = grupo.membros || 0
          return membros === 0
        }).length
      }
    })

    // Grupos sem listas (exclui caídos)
    let gruposSemListas = 0
    contas.forEach(conta => {
      if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
        gruposSemListas += conta.gruposDetalhes.filter((grupo: any) => {
          if (grupo.caido === true) return false
          const listasAdicionadas = Array.isArray(grupo.listas_adicionadas) ? grupo.listas_adicionadas : []
          return listasAdicionadas.length === 0
        }).length
      }
    })

    return {
      totalContas,
      botsAtivos,
      totalGrupos,
      contasOnline,
      contasCaidas,
      contasSemGrupos,
      gruposSemMembros,
      gruposSemListas,
      gruposCriadosHoje: 0, // Será calculado pelo databaseService se necessário
      automacoesEmAndamento: 0,
      automacoesConcluidasHoje: 0,
    }
  }, [contas, bots])

  // Calcular pieData derivado
  const pieData = useMemo<DashboardPieData | null>(() => {
    if (contas.length === 0) return null

    // Contagem de grupos por categoria
    const gruposPorCategoria: Record<string, { nome: string; grupos: number }> = {}
    let gruposSemCategoria = 0

    // Inicializar contadores por categoria
    categorias.forEach(categoria => {
      gruposPorCategoria[categoria.id] = { nome: categoria.nome, grupos: 0 }
    })

    // Contar grupos por categoria
    contas.forEach(conta => {
      const grupos = typeof conta.grupos === 'number' ? conta.grupos : 
                     Array.isArray(conta.grupos) ? conta.grupos.length :
                     conta.gruposDetalhes?.length || 0
      
      if (conta.categoriaId && gruposPorCategoria[conta.categoriaId]) {
        gruposPorCategoria[conta.categoriaId].grupos += grupos
      } else {
        gruposSemCategoria += grupos
      }
    })

    // Preparar dados do gráfico por categoria
    const porCategoria: PieChartData[] = Object.entries(gruposPorCategoria)
      .filter(([_, data]) => data.grupos > 0)
      .map(([_, data]) => ({
        name: data.nome,
        value: data.grupos,
      }))
      .sort((a, b) => b.value - a.value)

    if (gruposSemCategoria > 0) {
      porCategoria.push({
        name: 'Sem Categoria',
        value: gruposSemCategoria,
      })
    }

    // Contagem de contas por tags
    const tagsCount: Record<string, number> = {}
    contas.forEach(conta => {
      if (conta.tags && Array.isArray(conta.tags)) {
        conta.tags.forEach(tag => {
          tagsCount[tag] = (tagsCount[tag] || 0) + 1
        })
      }
    })

    const porTag: PieChartData[] = Object.entries(tagsCount)
      .map(([tag, count]) => ({
        name: tag,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)

    return {
      porCategoria,
      porTag,
    }
  }, [contas, categorias])

  // Carregamento inicial e quando a operação mudar (troca de operação no dropdown)
  useEffect(() => {
    if (!operacaoAtual?.path) return
    refreshAll()
  }, [operacaoAtual?.path])

  // Refresh automático a cada 10 minutos (reduz carga no sistema)
  useEffect(() => {
    if (!operacaoAtual?.path) return
    const interval = setInterval(() => {
      refreshAll()
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [operacaoAtual?.path])

  const value = useMemo(() => ({
    contas,
    bots,
    categorias,
    stats,
    pieData,
    isLoading,
    isInitialLoad,
    lastUpdate,
    refreshAll,
    refreshContas,
    refreshBots,
    refreshCategorias,
    addConta,
    updateConta,
    deleteConta,
    addBot,
    updateBot,
    deleteBot,
    setBots,
  }), [
    contas,
    bots,
    categorias,
    stats,
    pieData,
    isLoading,
    isInitialLoad,
    lastUpdate,
    refreshAll,
    refreshContas,
    refreshBots,
    refreshCategorias,
    addConta,
    updateConta,
    deleteConta,
    addBot,
    updateBot,
    deleteBot,
    setBots,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

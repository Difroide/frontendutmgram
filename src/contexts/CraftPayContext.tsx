import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useActiveTab } from './TabContext'

export interface BotDetalhado {
  bot: string
  valorConvertido: string
  vendas: number
  planos: string[]
  conversao: string
  valorMedio: string
}

export interface CraftPayStatsData {
  vendasConvertidas: { valor: string; variacao: string }
  totalCompras: { valor: string; variacao: string }
  taxaConversao: { valor: string; variacao: string }
  ticketMedio: { valor: string; variacao: string }
  ultimaAtualizacao: string
}

interface CraftPayContextValue {
  stats: CraftPayStatsData | null
  botsDetalhados: BotDetalhado[]
  loading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

const CraftPayContext = createContext<CraftPayContextValue | null>(null)

export function CraftPayProvider({ children }: { children: ReactNode }) {
  const activeTab = useActiveTab()
  const isDashboardActive = activeTab?.path === '/' || activeTab?.path === '/new-tab'

  const [stats, setStats] = useState<CraftPayStatsData | null>(null)
  const [botsDetalhados, setBotsDetalhados] = useState<BotDetalhado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (forceRefresh = false) => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getEstatisticas) return

    setLoading(true)
    setError(null)

    try {
      const result = await electron.craftpay.getEstatisticas(forceRefresh)
      if (result.success && result.stats) {
        setStats(result.stats)
        setBotsDetalhados(Array.isArray(result.botsDetalhados) ? result.botsDetalhados : [])
      } else {
        setError(result.error || 'Erro ao buscar estatísticas')
        setStats(null)
        setBotsDetalhados([])
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar estatísticas')
      setStats(null)
      setBotsDetalhados([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getEstatisticas) return

    if (!isDashboardActive) return

    const runFetch = () => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        ;(window as any).requestIdleCallback(() => fetchStats(), { timeout: 3000 })
      } else {
        setTimeout(fetchStats, 500)
      }
    }

    runFetch()

    const interval = setInterval(() => {
      if (!isDashboardActive) return
      if (typeof (window as any).requestIdleCallback === 'function') {
        ;(window as any).requestIdleCallback(() => fetchStats(), { timeout: 5000 })
      } else {
        setTimeout(fetchStats, 100)
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchStats, isDashboardActive])

  const value: CraftPayContextValue = { stats, botsDetalhados, loading, error, fetchStats }

  return <CraftPayContext.Provider value={value}>{children}</CraftPayContext.Provider>
}

export function useCraftPay() {
  const ctx = useContext(CraftPayContext)
  return ctx
}

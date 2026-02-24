import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ShoppingCart, Percent, Receipt, RefreshCw, Settings, AlertCircle } from 'lucide-react'
import { ModernKPICard } from './ModernKPICard'
import { CraftPayBotsTable } from './CraftPayBotsTable'

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

export const CraftPayStats = () => {
  const [stats, setStats] = useState<CraftPayStatsData | null>(null)
  const [rankingBots, setRankingBots] = useState<BotDetalhado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getEstatisticas) return

    setLoading(true)
    setError(null)

    try {
      // 1. Buscar estatísticas gerais (diárias/atuais)
      const result = await electron.craftpay.getEstatisticas()
      if (result.success && result.stats) {
        setStats(result.stats)
      } else {
        setError(result.error || 'Erro ao buscar estatísticas')
        setStats(null)
      }

      // 2. Buscar ranking agregado (histórico)
      if (electron.craftpay.getRankingBots) { // Verifica se handler existe (segurança)
        const rankingResult = await electron.craftpay.getRankingBots()
        if (rankingResult.success && Array.isArray(rankingResult.ranking)) {
          setRankingBots(rankingResult.ranking)
        }
      } else {
        // Fallback para bots da request atual se handler novo não estiver pronto (dev mode)
        if (result.success && Array.isArray(result.botsDetalhados)) {
          setRankingBots(result.botsDetalhados)
        }
      }

    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao buscar estatísticas')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getEstatisticas) return

    const runFetch = () => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        ; (window as any).requestIdleCallback(() => fetchStats(), { timeout: 3000 })
      } else {
        setTimeout(fetchStats, 500)
      }
    }

    runFetch()

    const interval = setInterval(() => {
      runFetch()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchStats])

  const getVariacaoStyle = (variacao: string) => {
    if (!variacao) return undefined
    const isPositive = variacao.startsWith('+')
    return {
      backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      borderColor: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      color: isPositive ? '#10b981' : '#ef4444',
      border: '1px solid',
      opacity: 0.9,
    }
  }

  const formatLastUpdate = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
      if (diff < 1) return 'Agora'
      if (diff < 60) return `${diff} min atrás`
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (error && !stats) {
    return (
      <div className="bg-[#161b22] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-100">Estatísticas CraftPay</h3>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gray-500 mt-1">
              Configure as credenciais ou verifique sua conexão.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('settings-section-request', { detail: { section: 'craftpay' } }))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurar
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const cards = stats
    ? [
      {
        label: 'Vendas Convertidas',
        value: stats.vendasConvertidas.valor,
        icon: DollarSign,
        iconColor: '#22c55e',
        badge: stats.vendasConvertidas.variacao
          ? { text: stats.vendasConvertidas.variacao, style: getVariacaoStyle(stats.vendasConvertidas.variacao) }
          : undefined,
      },
      {
        label: 'Total de Compras',
        value: stats.totalCompras.valor,
        icon: ShoppingCart,
        iconColor: '#3b82f6',
        badge: stats.totalCompras.variacao
          ? { text: stats.totalCompras.variacao, style: getVariacaoStyle(stats.totalCompras.variacao) }
          : undefined,
      },
      {
        label: 'Taxa de Conversão',
        value: stats.taxaConversao.valor,
        icon: Percent,
        iconColor: '#a855f7',
        badge: stats.taxaConversao.variacao
          ? { text: stats.taxaConversao.variacao, style: getVariacaoStyle(stats.taxaConversao.variacao) }
          : undefined,
      },
      {
        label: 'Ticket Médio',
        value: stats.ticketMedio.valor,
        icon: Receipt,
        iconColor: '#f59e0b',
        badge: stats.ticketMedio.variacao
          ? { text: stats.ticketMedio.variacao, style: getVariacaoStyle(stats.ticketMedio.variacao) }
          : undefined,
      },
    ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100">Estatísticas CraftPay</h3>
        <div className="flex items-center gap-3">
          {stats?.ultimaAtualizacao && (
            <span className="text-xs text-gray-500">
              Atualizado {formatLastUpdate(stats.ultimaAtualizacao)}
            </span>
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('settings-section-request', { detail: { section: 'craftpay' } }))}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors opacity-60 hover:opacity-100"
            title="Configurar credenciais"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50 opacity-60 hover:opacity-100"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && !stats
          ? Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="bg-[#161b22] rounded-xl border border-gray-800 p-7 h-40 animate-pulse"
              />
            ))
          : cards.map((card, i) => (
            <ModernKPICard
              key={i}
              label={card.label}
              value={card.value}
              icon={card.icon}
              iconColor={card.iconColor}
              badge={card.badge}
              size="large"
              showProgress={false}
              showActionHint={false}
            />
          ))}
      </div>

      {/* Bots que mais venderam (Novo Design) */}
      <div className="mt-8 pt-2 h-[500px]">
        <CraftPayBotsTable visible={true} bots={rankingBots} />
      </div>
    </div>
  )
}

import { DollarSign, ShoppingCart, Percent, Receipt, RefreshCw, Settings, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { ModernKPICard } from './ModernKPICard'
import { useCraftPay } from '@/contexts/CraftPayContext'

interface CraftPayStatsCardsProps {
  visible: boolean
  onToggleVisibility: () => void
}

function getVariacaoStyle(variacao: string) {
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

function formatLastUpdate(iso: string) {
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

export const CraftPayStatsCards = ({ visible, onToggleVisibility }: CraftPayStatsCardsProps) => {
  const ctx = useCraftPay()
  if (!ctx) return null
  const { stats, loading, error, fetchStats } = ctx

  // Collapsed bar when hidden
  if (!visible) {
    return (
      <div className="bg-[#161b22] rounded-xl border border-gray-800/60 px-6 py-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Estatísticas CraftPay</h3>
        <button
          onClick={onToggleVisibility}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          title="Mostrar estatísticas"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-[#161b22] rounded-xl border border-gray-800/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-100">Estatísticas CraftPay</h3>
          <button
            onClick={onToggleVisibility}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            title="Ocultar"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gray-500 mt-1">Configure as credenciais ou verifique sua conexão.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('settings-section-request', { detail: { section: 'craftpay' } }))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
          >
            <Settings className="w-4 h-4" /> Configurar
          </button>
          <button
            onClick={() => fetchStats(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Tentar novamente
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
          badge: stats.vendasConvertidas.variacao ? { text: stats.vendasConvertidas.variacao, style: getVariacaoStyle(stats.vendasConvertidas.variacao) } : undefined,
        },
        {
          label: 'Total de Compras',
          value: stats.totalCompras.valor,
          icon: ShoppingCart,
          iconColor: '#3b82f6',
          badge: stats.totalCompras.variacao ? { text: stats.totalCompras.variacao, style: getVariacaoStyle(stats.totalCompras.variacao) } : undefined,
        },
        {
          label: 'Taxa de Conversão',
          value: stats.taxaConversao.valor,
          icon: Percent,
          iconColor: '#a855f7',
          badge: stats.taxaConversao.variacao ? { text: stats.taxaConversao.variacao, style: getVariacaoStyle(stats.taxaConversao.variacao) } : undefined,
        },
        {
          label: 'Ticket Médio',
          value: stats.ticketMedio.valor,
          icon: Receipt,
          iconColor: '#f59e0b',
          badge: stats.ticketMedio.variacao ? { text: stats.ticketMedio.variacao, style: getVariacaoStyle(stats.ticketMedio.variacao) } : undefined,
        },
      ]
    : []

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800/60 p-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Estatísticas CraftPay</h3>
          <div className="flex items-center gap-2">
            {stats?.ultimaAtualizacao && (
              <span className="text-[10px] text-gray-600">Atualizado {formatLastUpdate(stats.ultimaAtualizacao)}</span>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('settings-section-request', { detail: { section: 'craftpay' } }))}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
              title="Configurar credenciais"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fetchStats(true)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggleVisibility}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
              title="Ocultar estatísticas"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && !stats
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-[#0d1117] rounded-xl border border-gray-800/60 p-6 h-32 animate-pulse" />
                ))
            : cards.map((card, i) => (
                <ModernKPICard
                  key={i}
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  iconColor={card.iconColor}
                  badge={card.badge}
                  size="compact"
                  showProgress={false}
                  showActionHint={false}
                />
              ))}
        </div>
      </div>
    </div>
  )
}

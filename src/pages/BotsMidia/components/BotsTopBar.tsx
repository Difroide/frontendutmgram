import { Bot, DollarSign, Loader2, Send, AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

type TabType = 'vendas' | 'disparo' | 'reutilizados'

interface KpiData {
  total: number
  ativos: number
  inativos: number
  problemas: number
}

interface BotsTopBarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  botsVendasCount: number
  botsDisparoCount: number
  botsReutilizadosCount?: number
  loading: boolean
  kpi: KpiData
  /** Quando true, oculta a faixa de KPIs (usado no layout Difroide, onde os KPIs ficam no card da direita) */
  hideKpi?: boolean
  /** Quando true, oculta a faixa de KPIs (header com Bots + subtítulo permanecem) */
  hideHeader?: boolean
}

export function BotsTopBar({
  activeTab,
  setActiveTab,
  botsVendasCount,
  botsDisparoCount,
  botsReutilizadosCount = 0,
  loading,
  kpi,
  hideKpi = false,
  hideHeader = false,
}: BotsTopBarProps) {
  return (
    <div className="space-y-5">
      {/* Header: mesmo estilo do Dashboard/Categorias (sem ícone) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bots</h1>
          <p className="text-gray-300 text-sm mt-1">Visão geral e gerenciamento</p>
        </div>
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-[#161b22] px-3 py-1.5 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
            Atualizando...
          </div>
        )}
      </div>

      {/* KPI Strip (oculto no layout Difroide — KPIs no card da direita) */}
      {!hideKpi && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{kpi.total}</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{kpi.ativos}</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-red-500/10 p-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Inativos</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{kpi.inativos}</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Problemas</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{kpi.problemas}</p>
        </div>
      </div>
      )}

      {/* Segmented Tab Control */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl border border-gray-800 bg-[#0d1117] p-1">
          <button
            onClick={() => setActiveTab('vendas')}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              activeTab === 'vendas'
                ? 'bg-[#1c2536] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <DollarSign className={`h-4 w-4 ${activeTab === 'vendas' ? 'text-rose-400' : ''}`} />
            Vendas
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === 'vendas'
                ? 'bg-gray-700/60 text-gray-200'
                : 'bg-transparent text-gray-600'
            }`}>
              {botsVendasCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('disparo')}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              activeTab === 'disparo'
                ? 'bg-[#1c2536] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Send className={`h-4 w-4 ${activeTab === 'disparo' ? 'text-cyan-400' : ''}`} />
            Disparo
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === 'disparo'
                ? 'bg-gray-700/60 text-gray-200'
                : 'bg-transparent text-gray-600'
            }`}>
              {botsDisparoCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('reutilizados')}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              activeTab === 'reutilizados'
                ? 'bg-[#1c2536] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <RotateCcw className={`h-4 w-4 ${activeTab === 'reutilizados' ? 'text-amber-400' : ''}`} />
            Reutilizados
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === 'reutilizados'
                ? 'bg-gray-700/60 text-gray-200'
                : 'bg-transparent text-gray-600'
            }`}>
              {botsReutilizadosCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

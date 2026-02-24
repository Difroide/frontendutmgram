import { useEffect, useState, useMemo, useCallback } from 'react'
import { BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, Bot, RefreshCw } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useModo } from '@/contexts/ModoContext'
import { parseMoneyValue, formatMoney } from '@/utils/currency'

interface BotDetalhado {
  bot: string
  valorConvertido: string
  vendas: number
  planos: string[]
  conversao: string
  valorMedio: string
}

interface StatsData {
  vendasConvertidas: { valor: string; variacao: string }
  totalCompras: { valor: string; variacao: string }
  taxaConversao: { valor: string; variacao: string }
  ticketMedio: { valor: string; variacao: string }
  ultimaAtualizacao: string
}

interface HistoryEntry {
  stats: StatsData
  botsDetalhados: BotDetalhado[]
  fetchedAt: string
}

type SortField = 'bot' | 'vendas' | 'valorConvertido' | 'valorMedio'
type SortDir = 'asc' | 'desc'
type PeriodFilter = 'today' | '7d' | 'all'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function Estatisticas() {
  const { currentTheme } = useTheme()
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'
  const [historico, setHistorico] = useState<Record<string, HistoryEntry>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('vendas')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [period, setPeriod] = useState<PeriodFilter>('7d')
  const [refreshing, setRefreshing] = useState(false)

  const fetchHistorico = useCallback(async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getHistorico) return

    try {
      const result = await electron.craftpay.getHistorico()
      if (result.success && result.historico) {
        setHistorico(result.historico)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.getEstatisticas) return

    setRefreshing(true)
    try {
      await electron.craftpay.getEstatisticas(true)
      setTimeout(async () => {
        await fetchHistorico()
        setRefreshing(false)
      }, 1000)
    } catch {
      setRefreshing(false)
    }
  }, [fetchHistorico])

  useEffect(() => {
    fetchHistorico()
  }, [fetchHistorico])

  // Filtra datas pelo período selecionado
  const filteredDates = useMemo(() => {
    const allDates = Object.keys(historico).sort()

    if (period === 'today') {
      const today = getTodayString()
      return allDates.filter(d => d === today)
    }

    if (period === '7d') {
      const now = new Date()
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      return allDates.filter(d => d >= cutoffStr)
    }

    return allDates // 'all'
  }, [historico, period])

  // Agrega todos os bots do período filtrado
  // IMPORTANTE: Os valores do CraftPay são ACUMULATIVOS (totais desde sempre), não incrementais
  // Por isso, usamos apenas o snapshot MAIS RECENTE do período
  const allBotsAggregated = useMemo(() => {
    // Para "Hoje": usa apenas os dados de hoje
    // Para "7 dias": usa apenas o snapshot mais recente
    // Para "Total": usa apenas o snapshot mais recente

    const latestDate = filteredDates[filteredDates.length - 1]
    if (!latestDate || !historico[latestDate]?.botsDetalhados) {
      return []
    }

    const latestBots = historico[latestDate].botsDetalhados

    return latestBots.map(b => ({
      bot: b.bot,
      vendas: b.vendas,
      valorTotal: parseMoneyValue(b.valorConvertido),
      planos: new Set(b.planos || []),
    }))
  }, [historico, filteredDates])

  // Filtra e ordena bots
  const sortedBots = useMemo(() => {
    let bots = allBotsAggregated

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      bots = bots.filter(b => b.bot.toLowerCase().includes(term))
    }

    bots.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'bot':
          cmp = a.bot.localeCompare(b.bot)
          break
        case 'vendas':
          cmp = a.vendas - b.vendas
          break
        case 'valorConvertido':
          cmp = a.valorTotal - b.valorTotal
          break
        case 'valorMedio':
          const avgA = a.vendas > 0 ? a.valorTotal / a.vendas : 0
          const avgB = b.vendas > 0 ? b.valorTotal / b.vendas : 0
          cmp = avgA - avgB
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return bots
  }, [allBotsAggregated, searchTerm, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
  }

  const contentAreaHeight = 'calc(100vh - 40px)'
  const sidebarCardGap = 10

  if (loading) {
    const loadingContent = (
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Carregando estatísticas...</p>
        </div>
      </div>
    )
    if (isDifroide) {
      return (
        <div className="flex gap-3 px-4 -m-6" style={{ height: contentAreaHeight, paddingTop: `${sidebarCardGap}px`, paddingBottom: `${sidebarCardGap}px` }}>
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="rounded-xl overflow-hidden shadow-xl border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-6 pb-4 border-b border-gray-600/30 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
                <p className="text-gray-300 text-sm mt-1">Carregando...</p>
              </div>
              {loadingContent}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen -m-6 p-6 bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  const hasCraftPay = !!(window as any).electron?.craftpay

  if (!hasCraftPay) {
    const noCraftPayContent = (
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">CraftPay não configurado</p>
          <p className="text-sm mt-2">Configure as credenciais do CraftPay para ver as estatísticas.</p>
        </div>
      </div>
    )
    if (isDifroide) {
      return (
        <div className="flex gap-3 px-4 -m-6" style={{ height: contentAreaHeight, paddingTop: `${sidebarCardGap}px`, paddingBottom: `${sidebarCardGap}px` }}>
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="rounded-xl overflow-hidden shadow-xl border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-6 pb-4 border-b border-gray-600/30 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
                <p className="text-gray-300 text-sm mt-1">Estatísticas de vendas</p>
              </div>
              {noCraftPayContent}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen -m-6 p-6 bg-[#0d1117] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">CraftPay não configurado</p>
          <p className="text-sm mt-2">Configure as credenciais do CraftPay para ver as estatísticas.</p>
        </div>
      </div>
    )
  }

  const totalBots = allBotsAggregated.length
  const totalVendas = allBotsAggregated.reduce((s, b) => s + b.vendas, 0)
  const totalValor = allBotsAggregated.reduce((s, b) => s + b.valorTotal, 0)

  // Corpo: período, KPIs, busca e tabela (sem o header de título)
  const mainContentBody = (
    <div className="bg-gray-800/30 rounded-xl border border-gray-600/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Bots que mais venderam
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === 'today'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === '7d'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              Total
            </button>
          </div>
        </div>

        {/* KPI Cards do período selecionado */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0d1117] rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bots com vendas</p>
            <p className="text-2xl font-bold text-white">{totalBots}</p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total de Vendas</p>
            <p className="text-2xl font-bold text-emerald-400">{totalVendas}</p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Valor Total</p>
            <p className="text-2xl font-bold text-emerald-400">{formatMoney(totalValor)}</p>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar bot..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 w-full"
            />
          </div>
        </div>

        {/* Tabela */}
        {sortedBots.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-800/80 backdrop-blur-sm">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      <button onClick={() => handleSort('bot')} className="flex items-center gap-1 hover:text-gray-200 transition-colors">
                        # <span className="ml-1">Bot</span> <SortIcon field="bot" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">
                      <button onClick={() => handleSort('valorConvertido')} className="flex items-center gap-1 justify-end hover:text-gray-200 transition-colors ml-auto">
                        Valor Convertido <SortIcon field="valorConvertido" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">
                      <button onClick={() => handleSort('vendas')} className="flex items-center gap-1 justify-end hover:text-gray-200 transition-colors ml-auto">
                        Vendas <SortIcon field="vendas" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">
                      <button onClick={() => handleSort('valorMedio')} className="flex items-center gap-1 justify-end hover:text-gray-200 transition-colors ml-auto">
                        Valor Médio <SortIcon field="valorMedio" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Planos</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBots.map((b, i) => {
                    const valorMedio = b.vendas > 0 ? b.valorTotal / b.vendas : 0
                    return (
                      <tr key={b.bot} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-medium max-w-[250px]">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs w-6 text-right flex-shrink-0">{i + 1}</span>
                            <span className="truncate" title={b.bot}>{b.bot}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                          {formatMoney(b.valorTotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">{b.vendas}</td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatMoney(valorMedio)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[250px]">
                          <span className="truncate block" title={Array.from(b.planos).join('\n')}>
                            {b.planos.size > 0 ? Array.from(b.planos)[0] : '—'}
                            {b.planos.size > 1 ? ` (+${b.planos.size - 1})` : ''}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {searchTerm ? 'Nenhum bot encontrado com esse nome' : `Nenhum dado de vendas ${period === 'today' ? 'hoje' : period === '7d' ? 'nos últimos 7 dias' : 'ainda'}`}
            </p>
            {!searchTerm && (
              <p className="text-xs mt-2 text-gray-600">
                Os dados serão registrados automaticamente quando o CraftPay for consultado.
              </p>
            )}
          </div>
        )}
    </div>
  )

  // Layout normal: header + body
  const mainContent = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
          <div>
            <h1 className="text-xl font-bold text-white">Estatísticas de Vendas</h1>
            <p className="text-sm text-gray-500">Histórico completo de vendas por bot</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
      {mainContentBody}
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
                <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
                <p className="text-gray-300 text-sm mt-1">Histórico de vendas por bot</p>
                <div className="mt-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 hover:border-gray-500 text-gray-300 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {mainContentBody}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6 bg-[#0d1117]">
      {mainContent}
    </div>
  )
}

import { Bot, ArrowRight, Trophy, TrendingUp, Package } from 'lucide-react'
import { useTabs } from '@/contexts/TabContext'
import { useTheme } from '@/contexts/ThemeContext'

import { BotDetalhado } from './CraftPayStats'

interface CraftPayBotsTableProps {
  visible?: boolean
  bots?: BotDetalhado[] // Aceita prop direta para flexibilidade
}

export const CraftPayBotsTable = ({ visible = true, bots = [] }: CraftPayBotsTableProps) => {
  const { openTab } = useTabs()
  const { currentTheme } = useTheme()

  if (!visible) return null

  // Se não vier bots via prop, tenta usar do contexto (compatibilidade)
  // Mas o ideal é passar via prop do CraftPayStats que busca o novo endpoint
  const displayBots = bots.slice(0, 10) // Top 10

  // Encontrar o maior valor de vendas para calcular a barra de progresso
  const maxVendas = Math.max(...displayBots.map(b => b.vendas), 1)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />
      case 1: return <Trophy className="w-5 h-5 text-gray-400" />
      case 2: return <Trophy className="w-5 h-5 text-amber-700" />
      default: return <span className="text-gray-500 font-bold w-5 text-center">{index + 1}</span>
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500/20 border-yellow-500/30'
      case 1: return 'bg-gray-400/20 border-gray-400/30'
      case 2: return 'bg-amber-700/20 border-amber-700/30'
      default: return 'bg-gray-800/40 border-gray-700/30'
    }
  }

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800/60 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-800/60 flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking de Vendas (Top Bots)
          </h4>
          <p className="text-xs text-gray-500 mt-1">Bots com melhor desempenho em vendas acumuladas</p>
        </div>

        <button
          onClick={() => openTab('/estatisticas', 'Estatísticas', true)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-primary-400"
          style={{ color: currentTheme.colors.primary }}
        >
          Ver Detalhes
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {displayBots.length > 0 ? (
          <div className="space-y-3">
            {displayBots.map((bot, index) => (
              <div
                key={index}
                className={`flex items-center p-3 rounded-xl border transition-all hover:bg-gray-800/60 ${getRankColor(index)}`}
              >
                {/* Ranking */}
                <div className="flex-shrink-0 w-10 flex justify-center">
                  {getRankIcon(index)}
                </div>

                {/* Info do Bot */}
                <div className="flex-1 min-w-0 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-sm font-semibold text-gray-200 truncate" title={bot.bot}>
                      {bot.bot}
                    </h5>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                      {bot.valorConvertido}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1" title="Total de Vendas">
                      <Package className="w-3 h-3" />
                      {bot.vendas} vendas
                    </span>
                    {bot.valorMedio && (
                      <span className="flex items-center gap-1" title="Ticket Médio">
                        <TrendingUp className="w-3 h-3" />
                        Médio: {bot.valorMedio}
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso Relativa */}
                  <div className="mt-2 h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      style={{ width: `${(bot.vendas / maxVendas) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Bot className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Nenhum bot ranqueado ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}

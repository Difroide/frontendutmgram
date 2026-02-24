import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'

interface HistoryData {
  date: string
  contasOnline: number
  contasCaidas: number
}

interface AccountHistoryChartProps {
  data: HistoryData[]
  title: string
}

export const AccountHistoryChart = ({ data, title }: AccountHistoryChartProps) => {
  const { currentTheme } = useTheme()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      const total = (data?.contasOnline || 0) + (data?.contasCaidas || 0)
      const onlinePercent = total > 0 ? ((data?.contasOnline || 0) / total) * 100 : 0
      const caidasPercent = total > 0 ? ((data?.contasCaidas || 0) / total) * 100 : 0
      
      return (
        <div className="bg-[#0d1117] border border-gray-800 rounded-lg shadow-lg p-3">
          <p className="text-gray-400 text-sm font-medium mb-2">
            {data?.dateFormatted || data?.date || ''}
          </p>
          <p className="text-sm" style={{ color: currentTheme.colors.primary }}>
            Online: <span className="font-bold text-white">{data?.contasOnline || 0}</span> ({onlinePercent.toFixed(1)}%)
          </p>
          <p className="text-sm text-red-400">
            Caídas: <span className="font-bold text-white">{data?.contasCaidas || 0}</span> ({caidasPercent.toFixed(1)}%)
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Total: {total}
          </p>
        </div>
      )
    }
    return null
  }

  // Formatar dados para gráfico de barras empilhadas
  const formattedData = data.map(item => {
    const total = item.contasOnline + item.contasCaidas
    const onlinePercent = total > 0 ? (item.contasOnline / total) * 100 : 0
    const caidasPercent = total > 0 ? (item.contasCaidas / total) * 100 : 0
    
    return {
      ...item,
      dateFormatted: item.date ? new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : item.date,
      onlinePercent,
      caidasPercent,
      total,
    }
  })

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">{title}</h2>
      
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBarChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis 
            dataKey="dateFormatted" 
            stroke="#30363d"
            tick={{ fill: '#6e7681', fontSize: 11 }}
          />
          <YAxis 
            stroke="#30363d"
            tick={{ fill: '#6e7681', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          {/* Barra Online */}
          <Bar 
            dataKey="contasOnline" 
            name="Online"
            stackId="a"
            fill={currentTheme.colors.primary}
            radius={[0, 0, 0, 0]}
          />
          {/* Barra Caídas */}
          <Bar 
            dataKey="contasCaidas" 
            name="Caídas"
            stackId="a"
            fill="#dc2626"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

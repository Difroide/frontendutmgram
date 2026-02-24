import { XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'

interface GruposOnlineData {
  date: string
  gruposOnline: number
  gruposCriadosHoje: number
  gruposCaidosHoje: number
}

interface GruposOnlineChartProps {
  data: GruposOnlineData[]
  title: string
}

export const GruposOnlineChart = ({ data, title }: GruposOnlineChartProps) => {
  const { currentTheme } = useTheme()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="bg-[#0d1117] border border-gray-800 rounded-lg shadow-lg p-3">
          <p className="text-gray-400 text-sm font-medium mb-2">
            {data?.dateFormatted || data?.date || ''}
          </p>
          <p className="text-sm" style={{ color: currentTheme.colors.primary }}>
            Grupos Online: <span className="font-bold text-white">{data?.gruposOnline || 0}</span>
          </p>
          {data?.gruposCriadosHoje > 0 && (
            <p className="text-sm text-emerald-400">
              Criados: <span className="font-bold">+{data.gruposCriadosHoje}</span>
            </p>
          )}
          {data?.gruposCaidosHoje > 0 && (
            <p className="text-sm text-red-400">
              Caídos: <span className="font-bold">-{data.gruposCaidosHoje}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Formatar dados e calcular evolução
  let valorAcumulado = 0
  const formattedData = data.map((item, index) => {
    const gruposOnline = item.gruposOnline || 0
    const gruposCriadosHoje = item.gruposCriadosHoje || 0
    const gruposCaidosHoje = item.gruposCaidosHoje || 0
    
    if (gruposOnline > 0) {
      valorAcumulado = gruposOnline
    } else if (index === 0) {
      valorAcumulado = 0
    } else {
      valorAcumulado = valorAcumulado + gruposCriadosHoje - gruposCaidosHoje
      valorAcumulado = Math.max(0, valorAcumulado)
    }
    
    const valorParaGrafico = valorAcumulado
    
    return {
      ...item,
      dateFormatted: item.date ? new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : item.date,
      valorProporcional: valorParaGrafico,
      gruposOnline: valorAcumulado,
    }
  })

  const valores = formattedData.map(d => d.valorProporcional)
  const maxValorReal = Math.max(...valores, 0)
  const maxValor = Math.max(100, Math.ceil(maxValorReal / 100) * 100 + 100)
  const minValor = 0

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">{title}</h2>
      
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorGruposOnline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={currentTheme.colors.primary} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={currentTheme.colors.primary} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis 
            dataKey="dateFormatted" 
            stroke="#30363d"
            tick={{ fill: '#6e7681', fontSize: 11 }}
          />
          <YAxis 
            stroke="#30363d"
            tick={{ fill: '#6e7681', fontSize: 11 }}
            domain={[minValor, maxValor]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="valorProporcional" 
            stroke={currentTheme.colors.primary}
            strokeWidth={2}
            fill="url(#colorGruposOnline)"
            dot={{ fill: currentTheme.colors.primary, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legenda */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded"
            style={{ backgroundColor: currentTheme.colors.primary }}
          />
          <span>Grupos Online (marcação a cada 100)</span>
        </div>
      </div>
    </div>
  )
}

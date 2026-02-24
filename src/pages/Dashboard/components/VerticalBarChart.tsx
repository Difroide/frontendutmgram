import { useTheme } from '@/contexts/ThemeContext'

interface VerticalBarChartData {
  online: number
  caidas: number
}

interface VerticalBarChartProps {
  data: VerticalBarChartData
  title: string
}

export const VerticalBarChart = ({ data, title }: VerticalBarChartProps) => {
  const { currentTheme } = useTheme()
  const total = data.online + data.caidas
  const onlinePercent = total > 0 ? (data.online / total) * 100 : 0
  const caidasPercent = total > 0 ? (data.caidas / total) * 100 : 0

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">{title}</h2>
      
      {/* Barra única empilhada vertical */}
      <div className="flex flex-col items-center gap-4 h-[280px]">
        <div className="relative w-20 h-full flex flex-col justify-end">
          {/* Barra empilhada */}
          <div className="w-full h-full flex flex-col justify-end relative rounded-lg overflow-hidden bg-[#0d1117]">
            {/* Parte Online (cor do tema) - em cima */}
            {onlinePercent > 0 && (
              <div
                className="w-full transition-all duration-500"
                style={{
                  height: `${onlinePercent}%`,
                  backgroundColor: currentTheme.colors.primary,
                  minHeight: total > 0 ? '2px' : '0',
                }}
              />
            )}
            {/* Parte Caídas (Vermelho) - embaixo */}
            {caidasPercent > 0 && (
              <div
                className="w-full transition-all duration-500"
                style={{
                  height: `${caidasPercent}%`,
                  backgroundColor: '#dc2626',
                  minHeight: total > 0 ? '2px' : '0',
                }}
              />
            )}
            {/* Se não houver dados */}
            {total === 0 && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500 text-sm">Sem dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Valores abaixo da barra */}
        <div className="text-center space-y-1.5">
          <div>
            <p className="text-sm font-medium" style={{ color: currentTheme.colors.primaryLight }}>
              Online
            </p>
            <p className="text-lg font-bold text-white">{data.online}</p>
            <p className="text-xs text-gray-500">{onlinePercent.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm font-medium text-red-400">Caídas</p>
            <p className="text-lg font-bold text-white">{data.caidas}</p>
            <p className="text-xs text-gray-500">{caidasPercent.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded"
            style={{ backgroundColor: currentTheme.colors.primary }}
          />
          <span className="text-xs text-gray-400">
            Online: {data.online} ({onlinePercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-600" />
          <span className="text-xs text-gray-400">
            Caídas: {data.caidas} ({caidasPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

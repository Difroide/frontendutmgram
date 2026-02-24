import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DonutChartData {
  name: string
  value: number
}

interface DonutChartProps {
  data: DonutChartData[]
  title: string
  total?: number
  colors?: string[]
}

const DEFAULT_COLORS = [
  '#ec4899', // pink-500
  '#a855f7', // purple-500
  '#3b82f6', // blue-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
]

export const DonutChart = ({ 
  data, 
  title, 
  total,
  colors = DEFAULT_COLORS 
}: DonutChartProps) => {
  const totalValue = total || data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d1117] border border-gray-800 rounded-lg shadow-lg p-3">
          <p className="text-gray-400 text-sm font-medium mb-1">
            {payload[0].name}
          </p>
          <p className="text-white text-base font-bold">
            {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">{title}</h2>
      
      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="transparent"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Valor total centralizado */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{totalValue}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        </div>
      </div>
    </div>
  )
}

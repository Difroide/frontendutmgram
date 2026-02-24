import { XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'

interface LineChartData {
  name: string
  value: number
}

interface LineChartProps {
  data: LineChartData[]
  title: string
  color?: string
}

export const LineChart = ({ data, title, color = '#3b82f6' }: LineChartProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#11151d] border border-slate-800/50 rounded-lg shadow-lg p-3">
          <p className="text-slate-300 text-sm font-medium mb-1">
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
    <div className="bg-[#11151d] rounded-lg border border-slate-800/50 p-6 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-6">{title}</h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


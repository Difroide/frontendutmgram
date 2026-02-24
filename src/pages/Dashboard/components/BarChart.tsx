import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts'

interface BarChartData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
  title: string
}

export const BarChart = ({ data, title }: BarChartProps) => {
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
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" stroke="#64748b" />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#64748b"
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            radius={[0, 8, 8, 0]}
            fill="#3b82f6"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || '#3b82f6'}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}


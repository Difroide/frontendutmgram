import { DonutChart } from './components/DonutChart'
import { PieChartData } from './dashboardService'

interface DashboardPieChartProps {
  data: PieChartData[]
  title: string
  total?: number
}

export const DashboardPieChart = ({ data, title, total }: DashboardPieChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#11151d] rounded-lg border border-slate-800/50 p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Nenhum dado disponível</p>
        </div>
      </div>
    )
  }

  return <DonutChart data={data} title={title} total={total} />
}


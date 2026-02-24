import { ModernKPICard } from './components/ModernKPICard'

interface StatCardProps {
  label: string
  value: string
  icon: any
  iconColor: string
  progress?: number
  progressGradient?: string
  badge?: {
    text: string
    color?: string
    style?: React.CSSProperties
  }
  onClick?: () => void
}

export const DashboardStats = ({ stats }: { stats: StatCardProps[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {stats.map((stat, index) => (
        <ModernKPICard
          key={index}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          iconColor={stat.iconColor}
          progress={stat.progress}
          progressGradient={stat.progressGradient}
          badge={stat.badge}
          onClick={stat.onClick}
        />
      ))}
    </div>
  )
}

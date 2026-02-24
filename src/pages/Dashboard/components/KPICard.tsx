import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  iconColor: string
  progress?: number // 0-100
  progressGradient?: string // ex: 'from-purple-500 to-blue-500'
  badge?: {
    text: string
    color?: string
    style?: React.CSSProperties
  }
}

export const KPICard = ({ 
  label, 
  value, 
  icon: Icon, 
  iconColor,
  progress = 0,
  progressGradient = 'from-purple-500 to-blue-500',
  badge 
}: KPICardProps) => {
  return (
    <div className="relative bg-[#11151d] rounded-lg border border-slate-800/50 p-5 shadow-lg">
      {/* Badge no canto superior direito */}
      {badge && (
        <div 
          className={`absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-medium ${badge.color || ''}`}
          style={badge.style}
        >
          {badge.text}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Ícone em quadrado com fundo translúcido */}
        <div className={`${iconColor} p-3 rounded-lg flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-white mb-3">
            {value}
          </p>

          {/* Barra de progresso */}
          {progress > 0 && (
            <div className="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


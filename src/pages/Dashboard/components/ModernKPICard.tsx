import { LucideIcon } from 'lucide-react'

interface ModernKPICardProps {
  label: string
  value: string
  icon: LucideIcon
  iconColor: string
  progress?: number
  progressColor?: string
  badge?: {
    text: string
    color?: string
    style?: React.CSSProperties
  }
  onClick?: () => void
  showProgress?: boolean
  showActionHint?: boolean
  size?: 'default' | 'compact' | 'large'
}

export const ModernKPICard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  progress = 0,
  progressColor = '#3b82f6',
  badge,
  onClick,
  showProgress = true,
  showActionHint = true,
  size = 'default',
}: ModernKPICardProps) => {
  const iconSize = size === 'compact' ? 'p-2' : 'p-2.5'
  const iconSvgSize = size === 'compact' ? 'w-4 h-4' : 'w-5 h-5'
  const valueSize = size === 'large' ? 'text-4xl' : size === 'compact' ? 'text-2xl' : 'text-3xl'
  const padding = size === 'compact' ? 'p-4' : size === 'large' ? 'p-7' : 'p-6'

  return (
    <div
      onClick={onClick}
      className={`relative bg-[#161b22] rounded-xl border border-gray-800 ${padding} transition-all duration-300 overflow-hidden group ${
        onClick ? 'cursor-pointer hover:border-gray-700' : ''
      }`}
    >
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {/* Badge - menor e discreto */}
      {badge && (
        <div
          className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-medium opacity-80 ${badge.color || ''}`}
          style={badge.style}
        >
          {badge.text}
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          {/* Ícone - reduzido */}
          <div
            className={`${iconSize} rounded-xl group-hover:scale-110 transition-transform duration-300`}
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon className={iconSvgSize} style={{ color: iconColor }} />
          </div>
        </div>

        {/* Conteúdo */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`${valueSize} font-bold text-white ${showProgress && progress > 0 ? 'mb-3' : 'mb-0'}`}>
            {value}
          </p>

          {/* Barra de progresso - mais fina e sutil */}
          {showProgress && progress > 0 && (
            <div className="relative w-full h-1 bg-gray-800 rounded-full overflow-hidden opacity-60">
              <div
                className="h-full transition-all duration-700 rounded-full relative"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
          )}

          {/* Hint de ação - discreto */}
          {onClick && showActionHint && (
            <p className="text-[10px] text-gray-600 mt-2 opacity-50">Clique para ver todas</p>
          )}
        </div>
      </div>
    </div>
  )
}

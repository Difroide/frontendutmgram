import { OptionCard } from './OptionCard'
import { VerificationOptionConfig, VerificationOption } from './VerificarContasModal'

interface VerificationGroupProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  options: VerificationOptionConfig[]
  selectedOptions: Set<VerificationOption>
  onToggleOption: (optionId: VerificationOption) => void
  onSelectAll: () => void
  disabled?: boolean
  accentColor?: 'blue' | 'red'
}

export const VerificationGroup = ({
  title,
  icon: Icon,
  options,
  selectedOptions,
  onToggleOption,
  onSelectAll,
  disabled = false,
  accentColor = 'blue'
}: VerificationGroupProps) => {
  const allSelected = options.every(opt => selectedOptions.has(opt.id))

  return (
    <div className="w-full space-y-2 sm:space-y-3 md:space-y-4">
      {/* Header - Flex Wrap para quebrar linha */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 w-full">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className={`
            p-1.5 sm:p-2 rounded-lg flex-shrink-0
            ${accentColor === 'red' ? 'bg-red-500/10' : 'bg-blue-500/10'}
          `}>
            <Icon className={`
              w-4 h-4 sm:w-5 sm:h-5
              ${accentColor === 'red' ? 'text-red-400' : 'text-blue-400'}
            `} />
          </div>
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">{title}</h2>
        </div>
        <button
          onClick={onSelectAll}
          disabled={disabled}
          className={`
            text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0
            ${accentColor === 'red'
              ? allSelected
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-red-400'
              : allSelected
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-blue-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      {/* Options Grid - Adaptativo: 1 coluna mobile, 2 md, 3 lg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 w-full">
        {options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isSelected={selectedOptions.has(option.id)}
            onToggle={() => onToggleOption(option.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

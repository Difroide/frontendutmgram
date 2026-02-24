import { Check } from 'lucide-react'
import { VerificationOptionConfig } from './VerificarContasModal'

interface OptionCardProps {
  option: VerificationOptionConfig
  isSelected: boolean
  onToggle: () => void
  disabled?: boolean
}

export const OptionCard = ({ option, isSelected, onToggle, disabled = false }: OptionCardProps) => {
  const Icon = option.icon

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-full p-3 rounded-lg border transition-all text-left ${
        isSelected ? 'border-emerald-500/50 bg-emerald-600/20' : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} group`}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={`flex-shrink-0 p-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-500/20' : 'bg-[#161b22] group-hover:bg-[#21262d]'}`}>
          <Icon className={`w-4 h-4 transition-colors ${isSelected ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className={`font-medium text-sm transition-colors ${isSelected ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100'}`}>
              {option.label}
            </h3>
            {isSelected && (
              <div className="flex-shrink-0 p-0.5 rounded-full bg-emerald-500/20">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
          </div>
          <p className={`text-xs leading-relaxed ${isSelected ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-400'}`}>{option.description}</p>
        </div>
      </div>
    </button>
  )
}

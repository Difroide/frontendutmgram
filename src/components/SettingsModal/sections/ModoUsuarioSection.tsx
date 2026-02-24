import { Zap, Cpu, Flame } from 'lucide-react'
import { useModo } from '@/contexts/ModoContext'
import type { ModoUsuario } from '@/contexts/ModoContext'

const modos: { id: ModoUsuario; label: string; descricao: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ryu', label: 'Modo Ryu', descricao: 'Experiência otimizada para fluxo de trabalho Ryu', icon: Zap },
  { id: 'difroide', label: 'Modo Difroide', descricao: 'Experiência otimizada para fluxo de trabalho difroide', icon: Cpu },
  { id: 'ruivo', label: 'Modo Ruivo', descricao: 'Experiência otimizada para fluxo de trabalho ruivo', icon: Flame },
]

export const ModoUsuarioSection = () => {
  const { modo, setModo, effectiveTheme } = useModo()
  const modoSelecionado = modo
  const currentTheme = { colors: effectiveTheme.colors }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Modo de usuário</h3>
        <p className="text-sm text-gray-400 mb-6">
          Selecione o modo que melhor se adapta ao seu uso. As preferências são salvas automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modos.map((modo) => {
          const Icon = modo.icon
          const isSelected = modoSelecionado === modo.id

          return (
            <button
              key={modo.id}
              type="button"
              onClick={() => setModo(modo.id)}
              className={`relative p-5 rounded-xl border-2 transition-all text-left flex flex-col gap-3 ${
                isSelected
                  ? 'border-opacity-100 shadow-lg'
                  : 'border-gray-600/30 bg-gray-700/20 hover:border-gray-500/50 hover:bg-gray-700/30'
              }`}
              style={{
                borderColor: isSelected ? currentTheme.colors.primary : undefined,
                backgroundColor: isSelected ? `${currentTheme.colors.primary}15` : undefined,
                boxShadow: isSelected ? `0 10px 40px -10px ${currentTheme.colors.primary}40` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? currentTheme.colors.primary : 'rgba(75, 85, 99, 0.4)',
                  }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {isSelected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">{modo.label}</p>
                <p className="text-xs text-gray-400 mt-1">{modo.descricao}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-700/20 border border-gray-600/30 rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Modo atual:</strong>{' '}
          {modos.find((m) => m.id === modoSelecionado)?.label ?? 'Ryu'}
        </p>
      </div>
    </div>
  )
}

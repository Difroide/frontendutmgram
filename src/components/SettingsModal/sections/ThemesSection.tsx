import { Palette } from 'lucide-react'
import { useTheme, themes, ThemeName } from '@/contexts/ThemeContext'

export const ThemesSection = () => {
  const { themeName, setTheme } = useTheme()

  const themeOptions: ThemeName[] = ['padrao', 'vermelho', 'azul', 'amarelo']

  const getThemePreview = (themeName: ThemeName) => {
    const theme = themes[themeName]
    return (
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-600/50 flex items-center justify-center"
          style={{
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          }}
        >
          <Palette className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-200">{theme.displayName}</p>
          <p className="text-xs text-gray-400">
            {theme.colors.primary} • {theme.colors.backgroundDark}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Selecione um Tema</h3>
        <p className="text-sm text-gray-400 mb-6">
          Escolha um tema para personalizar a aparência do painel. As cores serão aplicadas em toda a interface.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {themeOptions.map((name) => {
          const theme = themes[name]
          const isSelected = themeName === name

          return (
            <button
              key={name}
              onClick={() => setTheme(name)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                  : 'border-gray-600/30 bg-gray-700/20 hover:border-gray-500/50 hover:bg-gray-700/30'
              }`}
              style={{
                borderColor: isSelected ? theme.colors.primary : undefined,
                backgroundColor: isSelected ? `${theme.colors.primary}15` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                {getThemePreview(name)}
                {isSelected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.colors.primary }}
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

              {/* Preview de cores */}
              <div className="mt-4 flex gap-2">
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.colors.backgroundDark }}
                />
                <div
                  className="flex-1 h-8 rounded border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-700/20 border border-gray-600/30 rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Dica:</strong> As cores do tema são aplicadas automaticamente em botões, 
          links ativos, bordas e elementos de destaque. O tema selecionado é salvo automaticamente.
        </p>
      </div>
    </div>
  )
}


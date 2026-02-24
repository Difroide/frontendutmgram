import { X, Plus } from 'lucide-react'
import { useTabs } from '@/contexts/TabContext'
import { useTheme } from '@/contexts/ThemeContext'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabs()
  const { currentTheme } = useTheme()

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      // Middle click
      e.preventDefault()
      closeTab(tabId)
    }
  }

  const handleNewTab = () => {
    openTab('/new-tab', 'Nova Aba')
  }

  return (
    <div
      className="flex items-end h-9 bg-[#040913] border-b border-gray-700/50 select-none overflow-x-auto"
      style={{
        WebkitAppRegion: 'no-drag' as any,
        scrollbarWidth: 'thin',
        scrollbarColor: '#374151 transparent',
      }}
    >
      {/* Container das abas */}
      <div className="flex items-end h-full min-w-0 flex-1">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          const Icon = tab.icon

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              className={`
                group relative flex items-center gap-2 h-8 px-3 min-w-[120px] max-w-[200px]
                cursor-pointer transition-all duration-150 rounded-t-lg
                ${isActive 
                  ? 'bg-[#0b0e14] text-gray-100 border-t border-l border-r border-gray-600/50' 
                  : 'bg-transparent text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }
                ${index === 0 ? 'ml-2' : 'ml-0.5'}
              `}
              style={{
                marginBottom: isActive ? '-1px' : '0',
              }}
            >
              {/* Ícone da aba */}
              <Icon 
                className="w-4 h-4 flex-shrink-0" 
                style={{ color: isActive ? currentTheme.colors.primary : undefined }}
              />

              {/* Título da aba */}
              <span className="text-xs font-medium truncate flex-1">{tab.title}</span>

              {/* Botão de fechar */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className={`
                    p-0.5 rounded transition-all duration-150
                    ${isActive 
                      ? 'opacity-60 hover:opacity-100 hover:bg-gray-700' 
                      : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-gray-600'
                    }
                  `}
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Indicador de aba ativa */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Botão de nova aba */}
      <button
        onClick={handleNewTab}
        className="flex items-center justify-center w-8 h-8 mx-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
        title="Nova aba (Ctrl+T)"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

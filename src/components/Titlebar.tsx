import { useEffect, useState } from 'react'
import { Minus, Square, X, Maximize2, MoreHorizontal, Plus } from 'lucide-react'
import { TitlebarProfile } from './TitlebarProfile'
import { SettingsModal, type SettingsSection } from './SettingsModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabs } from '@/contexts/TabContext'

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsSection>('geral')
  const { currentTheme } = useTheme()
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabs()

  useEffect(() => {
    // Verificar estado inicial
    const checkMaximized = async () => {
      const electron = (window as any).electron
      if (electron?.desktop) {
        try {
          const result = await electron.desktop.isMaximized()
          if (result.success) {
            setIsMaximized(result.isMaximized ?? false)
          }
        } catch (error) {
          console.error('Erro ao verificar estado da janela:', error)
        }
      }
    }

    checkMaximized()

    const handleSettingsSectionRequest = (e: CustomEvent<{ section: SettingsSection }>) => {
      if (e.detail?.section) {
        setSettingsInitialSection(e.detail.section)
        setIsSettingsOpen(true)
      }
    }
    window.addEventListener('settings-section-request', handleSettingsSectionRequest as EventListener)

    // Listener para mudanças de estado
    const electron = (window as any).electron
    if (electron?.desktop) {
      electron.desktop.onMaximizedChanged((maximized: boolean) => {
        setIsMaximized(maximized)
      })
    }

    return () => {
      window.removeEventListener('settings-section-request', handleSettingsSectionRequest as EventListener)
      const electron = (window as any).electron
      if (electron?.desktop) {
        electron.desktop.removeMaximizedChanged()
      }
    }
  }, [])

  const handleMinimize = async () => {
    const electron = (window as any).electron
    if (electron?.desktop) {
      await electron.desktop.minimize()
    }
  }

  const handleMaximize = async () => {
    const electron = (window as any).electron
    if (electron?.desktop) {
      const result = await electron.desktop.toggleMaximize()
      if (result.success) {
        setIsMaximized(result.isMaximized ?? false)
      }
    }
  }

  const handleClose = async () => {
    const electron = (window as any).electron
    if (electron?.desktop) {
      await electron.desktop.close()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Só ativa se clicar na área de drag (não nas abas)
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return
    
    handleMaximize()
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  const handleNewTab = () => {
    openTab('/new-tab', 'Nova Aba')
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center select-none"
      style={{
        WebkitAppRegion: 'drag' as any,
        WebkitUserSelect: 'none',
        backgroundColor: '#040913',
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '18px 18px',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Logo Utmgram, MODO RYUK e botão de configurações */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ paddingLeft: '16px' }}>
        <div style={{ WebkitAppRegion: 'drag' as any }} className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white tracking-tight">
            <span className="font-extrabold">Utm</span>
            <span className="font-extrabold" style={{ color: currentTheme.colors.primary }}>gram.</span>
          </h1>
          <p className="text-xs font-black bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            RYUK
          </p>
        </div>
        <button
          onClick={() => {
            setSettingsInitialSection('geral')
            setIsSettingsOpen(true)
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors duration-200"
          title="Configurações"
          type="button"
          style={{ WebkitAppRegion: 'no-drag' as any }}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Abas - no centro: área é draggável, só as abas individuais são no-drag para clicar */}
      <div 
        className="flex items-center flex-1 h-full overflow-x-auto mx-2"
        style={{ WebkitAppRegion: 'drag' as any }}
      >
        <div className="flex items-center h-full">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            const Icon = tab.icon

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseDown={(e) => handleMiddleClick(e, tab.id)}
                style={{ WebkitAppRegion: 'no-drag' as any }}
                data-no-drag
                className={`
                  group relative flex items-center gap-1.5 h-7 px-2.5 mx-0.5
                  cursor-pointer transition-all duration-150 rounded-md
                  ${isActive 
                    ? 'bg-gray-700/60 text-gray-100' 
                    : 'bg-transparent text-gray-400 hover:bg-gray-700/40 hover:text-gray-200'
                  }
                `}
              >
                {/* Ícone da aba */}
                <Icon 
                  className="w-3.5 h-3.5 flex-shrink-0" 
                  style={{ color: isActive ? currentTheme.colors.primary : undefined }}
                />

                {/* Título da aba */}
                <span className="text-xs font-medium truncate max-w-[100px]">{tab.title}</span>

                {/* Botão de fechar */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className={`
                      p-0.5 rounded transition-all duration-150 ml-1
                      ${isActive 
                        ? 'opacity-60 hover:opacity-100 hover:bg-gray-600' 
                        : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-gray-600'
                      }
                    `}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Botão de nova aba */}
          <button
            onClick={handleNewTab}
            style={{ WebkitAppRegion: 'no-drag' as any }}
            className="flex items-center justify-center w-6 h-6 ml-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title="Nova aba (Ctrl+T)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Perfil e Botões de controle à direita */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' as any }} data-no-drag>
        <TitlebarProfile />
        
        {/* Botões de controle */}
        <div className="flex items-center">
          {/* Botão Minimizar */}
          <button
            onClick={handleMinimize}
            className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors duration-200"
            title="Minimizar"
            type="button"
          >
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Botão Maximizar/Restaurar */}
          <button
            onClick={handleMaximize}
            className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors duration-200"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
            type="button"
          >
            {isMaximized ? (
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
            ) : (
              <Square className="w-3.5 h-3.5" strokeWidth={2} />
            )}
          </button>

          {/* Botão Fechar */}
          <button
            onClick={handleClose}
            className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600/80 transition-colors duration-200"
            title="Fechar"
            type="button"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Modal de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSection={settingsInitialSection}
      />
    </div>
  )
}

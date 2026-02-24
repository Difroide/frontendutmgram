import { LucideIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabs } from '@/contexts/TabContext'

interface SidebarItemProps {
  path: string
  label: string
  icon: LucideIcon
  isCollapsed: boolean
  /** Design UTMGRAM GABRIEL — aplicado apenas no modo Difroide */
  isDesignGabriel?: boolean
  badge?: number
}

export const SidebarItem = ({
  path,
  label,
  icon: Icon,
  isCollapsed,
  isDesignGabriel = false,
  badge,
}: SidebarItemProps) => {
  const { currentTheme } = useTheme()
  const { tabs, activeTabId, openTab } = useTabs()
  
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isActive = activeTab?.path === path

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isActive) return
    
    const openInNewTab = e.ctrlKey || e.metaKey
    openTab(path, label, !openInNewTab)
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      openTab(path, label, false)
    }
  }

  const isGabriel = isDesignGabriel

  // Estilo Gabriel (igual front UTMGRAM GABRIEL): gray, sem border-left, rounded-lg
  if (isGabriel) {
    return (
      <button
        onClick={handleClick}
        onMouseDown={handleMiddleClick}
        data-sidebar-item-design="gabriel"
        className={`sidebar-link w-full flex items-center gap-3 transition-all duration-200 ${
          isCollapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-gray-700/50 backdrop-blur-sm rounded-lg'
            : 'bg-transparent hover:bg-gray-700/20 rounded-none'
        }`}
        style={{
          padding: '12px 16px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        title={isCollapsed ? label : undefined}
      >
        <div className="relative flex-shrink-0">
          <Icon className="w-5 h-5" />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-800">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <span className="transition-opacity duration-200 flex-1 text-left">{label}</span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMiddleClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-all duration-200 ${
        isCollapsed ? 'justify-center' : ''
      } ${isActive ? '' : 'border-transparent hover:bg-[#161b22]'}`}
      style={{
        backgroundColor: isActive ? `${currentTheme.colors.primary}15` : 'transparent',
        borderLeftColor: isActive ? currentTheme.colors.primary : 'transparent',
      }}
      title={isCollapsed ? label : undefined}
    >
      <div className="relative flex-shrink-0">
        <Icon
          className="w-5 h-5 transition-colors"
          style={{
            color: isActive ? currentTheme.colors.primary : '#9ca3af',
          }}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <span
          className="text-sm font-medium transition-colors"
          style={{ color: isActive ? currentTheme.colors.primaryLight : '#d1d5db' }}
        >
          {label}
        </span>
      )}
    </button>
  )
}

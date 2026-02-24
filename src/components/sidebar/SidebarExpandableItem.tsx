import { useState } from 'react'
import { LucideIcon, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabs } from '@/contexts/TabContext'

interface SubItem {
  path: string
  label: string
}

interface SidebarExpandableItemProps {
  label: string
  icon: LucideIcon
  subItems: SubItem[]
  isCollapsed: boolean
  /** Design UTMGRAM GABRIEL — aplicado apenas no modo Difroide */
  isDesignGabriel?: boolean
  badge?: number
}

export const SidebarExpandableItem = ({
  label,
  icon: Icon,
  subItems,
  isCollapsed,
  isDesignGabriel = false,
  badge,
}: SidebarExpandableItemProps) => {
  const { tabs, activeTabId, openTab } = useTabs()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isAnySubItemActive = subItems.some((item) => activeTab?.path === item.path)
  const [isExpanded, setIsExpanded] = useState(isAnySubItemActive)
  const { currentTheme } = useTheme()

  const handleSubItemClick = (e: React.MouseEvent, subItem: SubItem) => {
    e.preventDefault()
    
    if (activeTab?.path === subItem.path) return
    
    const openInNewTab = e.ctrlKey || e.metaKey
    openTab(subItem.path, subItem.label, !openInNewTab)
  }

  const handleSubItemMiddleClick = (e: React.MouseEvent, subItem: SubItem) => {
    if (e.button === 1) {
      e.preventDefault()
      openTab(subItem.path, subItem.label, false)
    }
  }

  // Estilo Gabriel (igual front UTMGRAM GABRIEL): gray, sem border-left, rounded-lg
  const isGabriel = isDesignGabriel

  if (isCollapsed) {
    return (
      <div
        data-sidebar-expandable-design={isGabriel ? 'gabriel' : undefined}
        className={`flex items-center justify-center transition-all cursor-pointer ${
          isGabriel
            ? `px-4 py-3 rounded-lg ${isAnySubItemActive ? 'bg-gray-700/50 backdrop-blur-sm' : 'bg-transparent hover:bg-gray-700/20'}`
            : 'px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#161b22] hover:text-gray-300'
        }`}
        style={
          !isGabriel && isAnySubItemActive ? { color: currentTheme.colors.primary } : undefined
        }
        title={label}
      >
        <Icon className="w-5 h-5" />
      </div>
    )
  }

  if (isGabriel) {
    return (
      <div data-sidebar-expandable-design="gabriel">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`sidebar-link w-full flex items-center gap-3 transition-all duration-200 ${
            isAnySubItemActive
              ? 'bg-gray-700/50 backdrop-blur-sm rounded-lg'
              : 'bg-transparent hover:bg-gray-700/20 rounded-none'
          }`}
          style={{
            padding: '12px 16px',
            justifyContent: 'flex-start',
          }}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left transition-opacity duration-200">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
              {badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {subItems.map((subItem) => {
              const isActive = activeTab?.path === subItem.path
              return (
                <button
                  key={subItem.path}
                  onClick={(e) => handleSubItemClick(e, subItem)}
                  onMouseDown={(e) => handleSubItemMiddleClick(e, subItem)}
                  className={`block w-full text-left px-4 py-2 text-sm rounded-md transition-all ${
                    isActive
                      ? 'text-white bg-gray-700/50 backdrop-blur-sm font-medium'
                      : 'text-gray-300 bg-transparent hover:text-white hover:bg-gray-700/20'
                  }`}
                >
                  {subItem.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-all duration-200 ${
          isAnySubItemActive ? '' : 'border-transparent hover:bg-[#161b22]'
        }`}
        style={{
          backgroundColor: isAnySubItemActive ? `${currentTheme.colors.primary}15` : 'transparent',
          borderLeftColor: isAnySubItemActive ? currentTheme.colors.primary : 'transparent',
        }}
      >
        <Icon
          className="w-5 h-5 flex-shrink-0 transition-colors"
          style={{ color: isAnySubItemActive ? currentTheme.colors.primary : '#9ca3af' }}
        />
        <span
          className="flex-1 text-left text-sm font-medium transition-colors"
          style={{
            color: isAnySubItemActive ? currentTheme.colors.primaryLight : '#d1d5db',
          }}
        >
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-800 pl-3">
          {subItems.map((subItem) => {
            const isActive = activeTab?.path === subItem.path
            return (
              <button
                key={subItem.path}
                onClick={(e) => handleSubItemClick(e, subItem)}
                onMouseDown={(e) => handleSubItemMiddleClick(e, subItem)}
                className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                  isActive ? 'font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-[#161b22]'
                }`}
                style={{
                  backgroundColor: isActive ? `${currentTheme.colors.primary}15` : 'transparent',
                  color: isActive ? currentTheme.colors.primaryLight : undefined,
                }}
              >
                {subItem.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

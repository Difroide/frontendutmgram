import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  AlertTriangle,
  Bot,
  FileJson,
  Tag,
  Workflow,
  Crown,
  Hexagon,
  BarChart3,
  Video,
} from 'lucide-react'
import { SidebarItem } from '../sidebar/SidebarItem'
import { SidebarExpandableItem } from '../sidebar/SidebarExpandableItem'
import { useSidebar } from '../sidebar/SidebarContext'
import { useModo } from '@/contexts/ModoContext'
import { logService } from '@/services/logService'
import { useEffect, useState } from 'react'
import { useSelectedContas } from '@/contexts/SelectedContasContext'
import { useTabs } from '@/contexts/TabContext'
import { useTheme } from '@/contexts/ThemeContext'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contas', label: 'Contas', icon: Users },
  { path: '/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { path: '/categorias', label: 'Categorias', icon: Tag },
  { path: '/bots-midia', label: 'Bots', icon: Bot },
  { path: '/criador-campanha', label: 'Criador de Campanha', icon: FileJson },
  { path: '/criador-fluxo', label: 'Criador de Fluxo', icon: Workflow },
  { path: '/craft', label: 'Craft', icon: Hexagon },
  { path: '/download-reels', label: 'Download Reels', icon: Video },
]

const contingenciaSubItems = [
  { path: '/contingencia/clonador-vip', label: 'Clonador Base' },
  { path: '/contingencia/adicionar-grupo-base', label: 'Adicionar ao Grupo Base' },
  { path: '/contingencia/gerenciar-grupos-vip', label: 'Gerenciar Grupos Base' },
]

const gruposVipSubItems = [
  { path: '/grupos-vip/clonador', label: 'Clonador VIP' },
  { path: '/grupos-vip/adicionar', label: 'Adicionar ao Grupo VIP' },
  { path: '/grupos-vip/gerenciar', label: 'Gerenciar Grupos VIP' },
]

const configuracoesSubItems = [
  { path: '/configuracoes/grupos', label: 'Grupos' },
  { path: '/criador', label: 'Criador' },
  { path: '/logs', label: 'Logs' },
]

export const Sidebar = () => {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { modo } = useModo()
  const { tabs, activeTabId } = useTabs()
  const { selectedCount } = useSelectedContas()
  const { currentTheme } = useTheme()
  const [importantLogsCount, setImportantLogsCount] = useState(0)
  const [botsInativosCount] = useState(0)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isContasPage = activeTab?.path === '/contas'
  /** Design UTMGRAM GABRIEL: aplicado apenas no modo Difroide */
  const isDesignGabriel = modo === 'difroide' || modo === 'ruivo'

  useEffect(() => {
    setImportantLogsCount(logService.getImportantLogsCount())

    const unsubscribe = logService.subscribe(() => {
      setImportantLogsCount(logService.getImportantLogsCount())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const sidebarWidth = isCollapsed ? 'var(--sidebar-collapsed-width, 80px)' : 'var(--sidebar-width, 256px)'

  // Design Gabriel (modo Difroide): botão no topo, cores gray, mesmo layout do front UTMGRAM GABRIEL
  const collapseButton = (
    <button
      onClick={toggleSidebar}
      className={
        isDesignGabriel
          ? 'w-full p-2 rounded-lg bg-transparent hover:bg-gray-700/30 transition-all text-gray-300 hover:text-white flex items-center justify-center'
          : 'w-full p-2.5 rounded-lg transition-all flex items-center justify-center bg-[#161b22] border border-gray-800 hover:bg-[#21262d] hover:border-gray-700 text-gray-400 hover:text-gray-200'
      }
      aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
    >
      {isCollapsed ? (
        isDesignGabriel ? <PanelRightClose className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
      ) : (
        isDesignGabriel ? <PanelLeftClose className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
      )}
    </button>
  )

  return (
    <div
      className="sidebar-wrapper flex flex-col fixed left-0 transition-all duration-300 z-40"
      data-sidebar-design={isDesignGabriel ? 'gabriel' : undefined}
      style={{
        top: '40px',
        height: 'calc(100vh - 40px)',
        width: sidebarWidth,
        ...(isDesignGabriel ? { padding: '10px 0 10px 10px' } : {}),
      }}
    >
      <aside
        className={`sidebar flex flex-col flex-1 transition-all duration-300 overflow-hidden ${
          isDesignGabriel
            ? 'bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl shadow-lg'
            : 'bg-[#0d1117] border-r border-gray-800'
        }`}
        style={{ minHeight: 0 }}
      >
        {/* Design Gabriel: botão de colapsar no topo (igual front UTMGRAM GABRIEL) */}
        {isDesignGabriel && (
          <div className="p-3 border-b border-gray-600/30 flex-shrink-0">
            {collapseButton}
          </div>
        )}

        <div className={`relative z-10 flex flex-col flex-1 min-h-0 ${isDesignGabriel ? '' : ''}`}>
          <nav
            className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden ${
              isDesignGabriel ? 'p-4 gap-2' : 'p-3 gap-1'
            }`}
            style={{
              alignItems: isCollapsed ? 'center' : 'stretch',
            }}
          >
            {menuItems.map((item) => (
              <SidebarItem
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                isCollapsed={isCollapsed}
                isDesignGabriel={isDesignGabriel}
                badge={
                  item.path === '/bots-midia' && botsInativosCount > 0
                    ? botsInativosCount
                    : undefined
                }
              />
            ))}
            <SidebarExpandableItem
              label="Grupos VIP"
              icon={Crown}
              subItems={gruposVipSubItems}
              isCollapsed={isCollapsed}
              isDesignGabriel={isDesignGabriel}
            />
            <SidebarExpandableItem
              label="Contingência"
              icon={AlertTriangle}
              subItems={contingenciaSubItems}
              isCollapsed={isCollapsed}
              isDesignGabriel={isDesignGabriel}
            />
            <SidebarExpandableItem
              label="Configurações"
              icon={Settings}
              subItems={configuracoesSubItems}
              isCollapsed={isCollapsed}
              isDesignGabriel={isDesignGabriel}
              badge={importantLogsCount > 0 ? importantLogsCount : undefined}
            />
          </nav>
        </div>

        {/* Contador de contas selecionadas */}
        {isContasPage && selectedCount > 0 && (
          <div
            className={`mt-auto px-4 py-3 flex-shrink-0 ${
              isDesignGabriel
                ? 'border-t border-gray-600/30 mx-3'
                : 'border-t border-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {!isDesignGabriel && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                />
              )}
              <span className={isCollapsed ? 'hidden' : ''}>
                {selectedCount} {selectedCount === 1 ? 'conta selecionada' : 'contas selecionadas'}
              </span>
            </div>
          </div>
        )}

        {/* Botão para retrair/expandir sidebar (só no design normal; no Gabriel já está no topo) */}
        {!isDesignGabriel && (
          <div className={`${isContasPage && selectedCount > 0 ? '' : 'mt-auto'} p-3 border-t border-gray-800 flex-shrink-0`}>
            {collapseButton}
          </div>
        )}
      </aside>
    </div>
  )
}

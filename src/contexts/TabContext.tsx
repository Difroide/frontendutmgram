import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Settings,
  Bot,
  FileJson,
  Tag,
  Workflow,
  Crown,
  AlertTriangle,
  Network,
  Hexagon,
  Video,
  Send,
  LucideIcon,
} from 'lucide-react'

// Mapeamento de rotas para títulos e ícones
const routeConfig: Record<string, { title: string; icon: LucideIcon }> = {
  '/': { title: 'Dashboard', icon: LayoutDashboard },
  '/contas': { title: 'Contas', icon: Users },
  '/contas/gerenciar-bots-grupos': { title: 'Gerenciar Bots/Grupos', icon: Users },
  '/categorias': { title: 'Categorias', icon: Tag },
  '/criador': { title: 'Criador', icon: FileJson },
  '/bots-midia': { title: 'Bots', icon: Bot },
  '/logs': { title: 'Logs', icon: FileJson },
  '/proxy': { title: 'Proxy', icon: Network },
  '/contingencia/clonador-vip': { title: 'Clonador Base', icon: AlertTriangle },
  '/contingencia/adicionar-grupo-base': { title: 'Adicionar ao Grupo Base', icon: AlertTriangle },
  '/contingencia/gerenciar-grupos-vip': { title: 'Gerenciar Grupos Base', icon: AlertTriangle },
  '/grupos-vip/clonador': { title: 'Clonador VIP', icon: Crown },
  '/grupos-vip/adicionar': { title: 'Adicionar ao Grupo VIP', icon: Crown },
  '/grupos-vip/gerenciar': { title: 'Gerenciar Grupos VIP', icon: Crown },
  '/configuracoes': { title: 'Configurações', icon: Settings },
  '/configuracoes/grupos': { title: 'Grupos', icon: Settings },
  '/configuracoes/gerais': { title: 'Configurações Gerais', icon: Settings },
  '/configuracoes/painel-smm': { title: 'Painel SMM', icon: Settings },
  '/configuracoes/api-telegram': { title: 'API Telegram', icon: Settings },
  '/criador-campanha': { title: 'Criador de Campanha', icon: FileJson },
  '/criador-fluxo': { title: 'Criador de Fluxo', icon: Workflow },
  '/craft': { title: 'Craft', icon: Hexagon },
  '/download-reels': { title: 'Download Reels', icon: Video },
  '/blastsend': { title: 'Gerenciador Links', icon: Send },
  '/new-tab': { title: 'Nova Aba', icon: LayoutDashboard },
}

export interface Tab {
  id: string
  path: string
  title: string
  icon: LucideIcon
  // Estado customizado para preservar dados da aba
  state?: Record<string, unknown>
}

interface TabContextValue {
  tabs: Tab[]
  activeTabId: string
  openTab: (path: string, title?: string, replaceActive?: boolean) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabState: (tabId: string, state: Record<string, unknown>) => void
  getTabState: (tabId: string) => Record<string, unknown> | undefined
}

const TabContext = createContext<TabContextValue | null>(null)

// Gerar ID único para aba
const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Obter configuração da rota
const getRouteConfig = (path: string) => {
  return routeConfig[path] || { title: 'Página', icon: LayoutDashboard }
}

interface TabProviderProps {
  children: ReactNode
}

export function TabProvider({ children }: TabProviderProps) {
  // Iniciar com aba Acesso Rápido
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: generateTabId(),
      path: '/new-tab',
      title: 'Acesso Rápido',
      icon: LayoutDashboard,
    },
  ])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)

  // Abrir nova aba ou navegar na aba ativa
  const openTab = useCallback((path: string, customTitle?: string, replaceActive = false) => {
    const config = getRouteConfig(path)
    const title = customTitle || config.title

    if (replaceActive) {
      // Substituir conteúdo da aba ativa
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, path, title, icon: config.icon, state: undefined }
            : tab
        )
      )
    } else {
      // Criar nova aba
      const newTab: Tab = {
        id: generateTabId(),
        path,
        title,
        icon: config.icon,
      }
      setTabs((prev) => [...prev, newTab])
      setActiveTabId(newTab.id)
    }
  }, [activeTabId])

  // Fechar aba
  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      // Não permitir fechar a última aba
      if (prev.length <= 1) return prev

      const tabIndex = prev.findIndex((t) => t.id === tabId)
      const newTabs = prev.filter((t) => t.id !== tabId)

      // Se fechou a aba ativa, ativar a anterior ou próxima
      if (tabId === activeTabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1)
        setActiveTabId(newTabs[newActiveIndex].id)
      }

      return newTabs
    })
  }, [activeTabId])

  // Definir aba ativa
  const setActiveTabHandler = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  // Atualizar estado de uma aba
  const updateTabState = useCallback((tabId: string, state: Record<string, unknown>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, state: { ...tab.state, ...state } } : tab
      )
    )
  }, [])

  // Obter estado de uma aba
  const getTabState = useCallback((tabId: string) => {
    return tabs.find((t) => t.id === tabId)?.state
  }, [tabs])

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T: Nova aba
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        openTab('/new-tab', 'Nova Aba')
      }

      // Ctrl+W: Fechar aba atual
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (tabs.length > 1) {
          closeTab(activeTabId)
        }
      }

      // Ctrl+Tab: Próxima aba
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTabHandler(tabs[nextIndex].id)
      }

      // Ctrl+Shift+Tab: Aba anterior
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
        setActiveTabHandler(tabs[prevIndex].id)
      }

      // Ctrl+1-9: Ir para aba específica
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const tabIndex = parseInt(e.key) - 1
        if (tabIndex < tabs.length) {
          setActiveTabHandler(tabs[tabIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, openTab, closeTab, setActiveTabHandler])

  const value: TabContextValue = {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab: setActiveTabHandler,
    updateTabState,
    getTabState,
  }

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>
}

export function useTabs() {
  const context = useContext(TabContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider')
  }
  return context
}

// Hook para obter a aba ativa
export function useActiveTab() {
  const { tabs, activeTabId } = useTabs()
  return tabs.find((t) => t.id === activeTabId)
}

// Exportar configuração de rotas para uso externo
export { routeConfig, getRouteConfig }

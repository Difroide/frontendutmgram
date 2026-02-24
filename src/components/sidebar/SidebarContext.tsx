import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StorageService } from '@/services/storage'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = StorageService.getItem<boolean>('sidebar_collapsed')
    return saved ?? false
  })

  useEffect(() => {
    StorageService.setItem('sidebar_collapsed', isCollapsed)
  }, [isCollapsed])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev)
  }

  const collapseSidebar = () => {
    setIsCollapsed(true)
  }

  const expandSidebar = () => {
    setIsCollapsed(false)
  }

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggleSidebar, collapseSidebar, expandSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}


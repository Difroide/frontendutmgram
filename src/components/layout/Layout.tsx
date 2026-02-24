import { ReactNode } from 'react'
import { Sidebar } from '../sidebar/Sidebar'
import { Titlebar } from '../Titlebar'
import { useSidebar } from '../sidebar/SidebarContext'
import { TabContent } from '../tabs'
import { useModo } from '@/contexts/ModoContext'

interface LayoutProps {
  children?: ReactNode
}

const GRID_BG_DIFROIDE: React.CSSProperties = {
  backgroundColor: '#040913',
  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
}

export const Layout = ({ children }: LayoutProps) => {
  const { isCollapsed } = useSidebar()
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'

  return (
    <div
      className="flex h-screen overflow-hidden relative w-full"
      style={{
        height: '100vh',
        minHeight: '100vh',
        ...(isDifroide ? GRID_BG_DIFROIDE : { backgroundColor: '#0b0e14' }),
      }}
    >
      <Titlebar />
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-h-0 transition-all duration-300 relative"
        style={{
          marginLeft: isCollapsed ? 'var(--sidebar-collapsed-width, 80px)' : 'var(--sidebar-width, 256px)',
          marginTop: '40px',
          height: 'calc(100vh - 40px)',
          minWidth: 0,
        }}
      >
        {/* Conteúdo das abas */}
        <TabContent />
      </div>
    </div>
  )
}

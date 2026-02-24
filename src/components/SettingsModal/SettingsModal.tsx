import { useState, useEffect } from 'react'
import { X, Settings, Image, Globe, Key, Network, Palette, BarChart3, Send, UserCircle } from 'lucide-react'
import { GeneralSection } from './sections/GeneralSection'
import { WallpapersSection } from './sections/WallpapersSection'
import { ModoUsuarioSection } from './sections/ModoUsuarioSection'
import { PainelSMMSection } from './sections/PainelSMMSection'
import { ApisTelegramSection } from './sections/ApisTelegramSection'
import { ProxySection } from './sections/ProxySection'
import { ThemesSection } from './sections/ThemesSection'
import { CraftPaySection } from './sections/CraftPaySection'
import { BlastsendSection } from './sections/BlastsendSection'
import { useTheme } from '@/contexts/ThemeContext'
import { useModo } from '@/contexts/ModoContext'
import './SettingsModal.css'

export type SettingsSection = 'geral' | 'wallpapers' | 'modo-usuario' | 'temas' | 'painel-smm' | 'apis-telegram' | 'proxy' | 'craftpay' | 'blastsend'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: SettingsSection
}

interface SidebarItem {
  id: SettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const sidebarItems: SidebarItem[] = [
  { id: 'geral', label: 'Geral', icon: Settings },
  { id: 'wallpapers', label: 'Wallpapers', icon: Image },
  { id: 'modo-usuario', label: 'Modo usuário', icon: UserCircle },
  { id: 'temas', label: 'Temas', icon: Palette },
  { id: 'painel-smm', label: 'Painel SMM', icon: Globe },
  { id: 'craftpay', label: 'CraftPay', icon: BarChart3 },
  { id: 'apis-telegram', label: 'APIs Telegram', icon: Key },
  { id: 'proxy', label: 'Proxy', icon: Network },
  { id: 'blastsend', label: 'Blastsend', icon: Send },
]

export const SettingsModal = ({ isOpen, onClose, initialSection = 'geral' }: SettingsModalProps) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection)
  const { currentTheme } = useTheme()
  const { modo } = useModo()

  const visibleSidebarItems = sidebarItems.filter(
    (item) => item.id !== 'temas' || modo === 'ryu'
  )

  useEffect(() => {
    if (isOpen && initialSection) {
      const section = modo === 'ryu' ? initialSection : initialSection === 'temas' ? 'geral' : initialSection
      setActiveSection(section)
    }
  }, [isOpen, initialSection, modo])

  useEffect(() => {
    if (activeSection === 'temas' && modo !== 'ryu') {
      setActiveSection('geral')
    }
  }, [modo, activeSection])

  if (!isOpen) return null

  // Mapeamento de seções para componentes
  const sections: Record<SettingsSection, React.ReactNode> = {
    'geral': <GeneralSection />,
    'wallpapers': <WallpapersSection />,
    'modo-usuario': <ModoUsuarioSection />,
    'temas': <ThemesSection />,
    'painel-smm': <PainelSMMSection />,
    'craftpay': <CraftPaySection />,
    'apis-telegram': <ApisTelegramSection />,
    'proxy': <ProxySection />,
    'blastsend': <BlastsendSection />,
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="settings-modal-container bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          backgroundColor: 'rgba(31, 41, 55, 0.4)',
        }}
      >
        {/* Sidebar com Tabs */}
        <div className="w-64 bg-gray-900/30 backdrop-blur-md border-r border-gray-700/50 flex-shrink-0">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-gray-100">Configurações</h2>
          </div>
          
          <nav className="p-4 space-y-1">
            {visibleSidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'border text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                  style={isActive ? {
                    backgroundColor: `${currentTheme.colors.primary}30`,
                    borderColor: `${currentTheme.colors.primary}50`,
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Conteúdo da Seção Ativa */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">
              {visibleSidebarItems.find(item => item.id === activeSection)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com Animação */}
          <div className="flex-1 overflow-y-auto p-6">
            <div key={activeSection} className="settings-content-fade">
              {sections[activeSection]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


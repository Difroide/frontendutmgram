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
  LucideIcon,
} from 'lucide-react'
import { useTabs } from '@/contexts/TabContext'
import { useTheme } from '@/contexts/ThemeContext'

interface QuickAccessItem {
  path: string
  title: string
  icon: LucideIcon
  description: string
  color: string
}

const quickAccessItems: QuickAccessItem[] = [
  {
    path: '/',
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral do sistema',
    color: '#3B82F6',
  },
  {
    path: '/contas',
    title: 'Contas',
    icon: Users,
    description: 'Gerenciar contas do Telegram',
    color: '#10B981',
  },
  {
    path: '/categorias',
    title: 'Categorias',
    icon: Tag,
    description: 'Gerenciar categorias e campanhas',
    color: '#8B5CF6',
  },
  {
    path: '/bots-midia',
    title: 'Bots',
    icon: Bot,
    description: 'Gerenciar bots de mídia',
    color: '#F59E0B',
  },
  {
    path: '/grupos-vip/clonador',
    title: 'Clonador VIP',
    icon: Crown,
    description: 'Clonar grupos e canais VIP',
    color: '#F59E0B',
  },
  {
    path: '/criador-campanha',
    title: 'Criador de Campanha',
    icon: FileJson,
    description: 'Criar novas campanhas',
    color: '#EC4899',
  },
  {
    path: '/criador-fluxo',
    title: 'Criador de Fluxo',
    icon: Workflow,
    description: 'Criar fluxos automatizados',
    color: '#06B6D4',
  },
  {
    path: '/proxy',
    title: 'Proxy',
    icon: Network,
    description: 'Gerenciar proxies do sistema',
    color: '#6366F1',
  },
  {
    path: '/contingencia/clonador-vip',
    title: 'Clonador Base',
    icon: AlertTriangle,
    description: 'Clonar grupos base',
    color: '#F97316',
  },
  {
    path: '/configuracoes',
    title: 'Configurações',
    icon: Settings,
    description: 'Configurações do sistema',
    color: '#6B7280',
  },
]

export default function NewTabPage() {
  const { openTab, activeTabId } = useTabs()
  const { currentTheme } = useTheme()

  const handleOpenPage = (item: QuickAccessItem) => {
    // Substituir a aba atual (new-tab) pelo conteúdo selecionado
    openTab(item.path, item.title, true)
  }

  return (
    <div className="min-h-screen -m-6 p-8 bg-[#0b0e14]">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">
          <span className="font-extrabold">Utm</span>
          <span style={{ color: currentTheme.colors.primary }}>gram.</span>
        </h1>
        <p className="text-gray-400 text-lg">Selecione uma página para começar</p>
      </div>

      {/* Grid de acesso rápido */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickAccessItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => handleOpenPage(item)}
                className="group flex flex-col items-start p-4 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all duration-200 text-left"
              >
                <div
                  className="p-2.5 rounded-lg mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 group-hover:text-gray-400 line-clamp-2">
                  {item.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dica de atalho */}
      <div className="text-center mt-12">
        <p className="text-gray-600 text-sm">
          Use o menu lateral para navegar ou clique com o botão do meio para fechar abas
        </p>
      </div>
    </div>
  )
}

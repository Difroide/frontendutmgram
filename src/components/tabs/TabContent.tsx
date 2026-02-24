import { useMemo, lazy, Suspense } from 'react'
import { useTabs, Tab } from '@/contexts/TabContext'
import { useModo } from '@/contexts/ModoContext'
import { TabErrorBoundary } from './TabErrorBoundary'

// Import direto das páginas (para evitar problemas com lazy loading em Electron)
import Dashboard from '@/pages/Dashboard'
import Contas from '@/pages/Contas'
import GerenciarBotsGrupos from '@/pages/Contas/GerenciarBotsGrupos'
import Criador from '@/pages/Criador'
import BotsMidia from '@/pages/BotsMidia'
import Tarefas from '@/pages/Tarefas'
import Todo from '@/pages/Todo'
import Categorias from '@/pages/Categorias'
import Logs from '@/pages/Logs'
import Proxy from '@/pages/Proxy'
import ClonadorVIP from '@/pages/Contingencia/ClonadorVIP'
import AdicionarAoGrupoBase from '@/pages/Contingencia/AdicionarAoGrupoBase'
import GerenciarGruposBase from '@/pages/Contingencia/GerenciarGruposVip'
import ClonadorVIPAvancado from '@/pages/GruposVIP/ClonadorVIP'
import AdicionarAoGrupoVIP from '@/pages/GruposVIP/AdicionarAoGrupoVIP'
import GerenciarGruposVIP from '@/pages/GruposVIP/GerenciarGruposVIP'
import Configuracoes from '@/pages/configurações'
import GruposListPage from '@/pages/configurações/components/GruposList'
import ConfiguracoesGerais from '@/pages/configurações/ConfiguracoesGerais'
import PainelSMM from '@/pages/configurações/PainelSMM'
import ApiTelegram from '@/pages/configurações/ApiTelegram'
import CriadorCampanha from '@/pages/CriadorCampanha'
import CriadorFluxo from '@/pages/CriadorFluxo'
import Fixador from '@/pages/Fixador'
import Craft from '@/pages/Craft'
import DownloadReels from '@/pages/DownloadReels'
import Estatisticas from '@/pages/Estatisticas'
import NewTabPage from './NewTabPage'
import { BlastSend } from '@/pages/BlastSend'
import SendergramConfig from '@/pages/configurações/SendergramConfig'

// Mapeamento de rotas para componentes
const routeComponents: Record<string, React.ComponentType> = {
  '/': Dashboard,
  '/contas': Contas,
  '/estatisticas': Estatisticas,
  '/contas/gerenciar-bots-grupos': GerenciarBotsGrupos,
  '/todo': Todo,
  '/categorias': Categorias,
  '/criador': Criador,
  '/bots-midia': BotsMidia,
  '/tarefas': Tarefas,
  '/logs': Logs,
  '/proxy': Proxy,
  '/contingencia/clonador-vip': ClonadorVIP,
  '/contingencia/adicionar-grupo-base': AdicionarAoGrupoBase,
  '/contingencia/gerenciar-grupos-vip': GerenciarGruposBase,
  '/grupos-vip/clonador': ClonadorVIPAvancado,
  '/grupos-vip/adicionar': AdicionarAoGrupoVIP,
  '/grupos-vip/gerenciar': GerenciarGruposVIP,
  '/configuracoes': Configuracoes,
  '/configuracoes/grupos': GruposListPage,
  '/configuracoes/gerais': ConfiguracoesGerais,
  '/configuracoes/painel-smm': PainelSMM,
  '/configuracoes/api-telegram': ApiTelegram,
  '/criador-campanha': CriadorCampanha,
  '/criador-fluxo': CriadorFluxo,
  '/fixador': Fixador,
  '/craft': Craft,
  '/download-reels': DownloadReels,
  '/new-tab': NewTabPage,
  '/blastsend': BlastSend,
  '/configuracoes/sendergram': SendergramConfig,
}

// Componente de loading
function TabLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
}

// Componente individual da aba
interface TabViewProps {
  tab: Tab
  isActive: boolean
}

function TabView({ tab, isActive }: TabViewProps) {
  const path = tab.path ?? '/new-tab'
  const Component = routeComponents[path]

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-lg">Página não encontrada</p>
        <p className="text-sm text-gray-500">{path}</p>
      </div>
    )
  }

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{
        display: isActive ? 'block' : 'none',
        minHeight: '100%',
      }}
    >
      <div className="p-6 min-h-full h-full">
        <TabErrorBoundary>
          <Component />
        </TabErrorBoundary>
      </div>
    </div>
  )
}

const GRID_BG_DIFROIDE: React.CSSProperties = {
  backgroundColor: '#040913',
  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
}

export function TabContent() {
  const { tabs, activeTabId } = useTabs()
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'

  return (
    <div
      className="flex-1 overflow-hidden relative"
      style={{
        ...(isDifroide ? GRID_BG_DIFROIDE : { backgroundColor: '#0b0e14' }),
        minHeight: 0,
      }}
    >
      {tabs.map((tab) => (
        <TabView key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  )
}

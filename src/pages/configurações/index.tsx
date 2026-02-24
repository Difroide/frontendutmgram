import { Accordion } from '@/components/Accordion'
import { PainelSMM } from './components/PainelSMM'
import { ApiTelegram } from './components/ApiTelegram'
import { Proxy } from './components/Proxy'
import { ApiTelegramCard } from './PainelSMM/components/ApiTelegramCard'
import { MeasmmCard } from './PainelSMM/components/MeasmmCard'
import { SmmProviderCard } from './PainelSMM/components/SmmProviderCard'
import { BrsmmCard } from './PainelSMM/components/BrsmmCard'
import GruposList from './components/GruposList'
import ConfiguracoesGerais from './ConfiguracoesGerais'

export default function Configuracoes() {
  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100">Configurações</h1>
        <p className="text-gray-400 mt-2">Gerencie as configurações do sistema</p>
      </div>

      {/* Cards de Configuração */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">API Telegram</h2>
        <p className="text-gray-400 mb-4">Configure suas credenciais da API Telegram</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ApiTelegramCard />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Painel SMM</h2>
        <p className="text-gray-400 mb-4">Configure seus painéis SMM</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MeasmmCard />
          <SmmProviderCard />
          <BrsmmCard />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Proxy</h2>
        <p className="text-gray-400 mb-4">Gerencie os proxies do sistema</p>
        <Proxy />
      </div>

      {/* Configurações Gerais */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Grupos</h2>
        <p className="text-gray-400 mb-4">Visualize todos os grupos do sistema</p>
        <GruposList />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Configurações Gerais</h2>
        <p className="text-gray-400 mb-4">Configure pastas e opções gerais do sistema</p>
        <ConfiguracoesGerais />
      </div>

      {/* Seção com Accordion */}
      <div className="space-y-4 max-w-3xl">
        <Accordion title="Painel SMM (Legado)">
          <PainelSMM />
        </Accordion>

        <Accordion title="API Telegram (Legado)">
          <ApiTelegram />
        </Accordion>
      </div>
    </div>
  )
}


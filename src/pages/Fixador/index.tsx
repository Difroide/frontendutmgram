import { useState } from 'react'
import { MessageSquare, Bot, Send } from 'lucide-react'
import { MensagensTab } from './components/MensagensTab'
import { BotsGruposTab } from './components/BotsGruposTab'
import { DispararButton } from './components/DispararButton'

type TabType = 'mensagens' | 'bots'

export default function Fixador() {
  const [activeTab, setActiveTab] = useState<TabType>('mensagens')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Fixador / Disparador</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre mensagens, bots e grupos. Dispare para todos com um clique.
          </p>
        </div>
        <DispararButton />
      </div>

      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('mensagens')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'mensagens'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Mensagens
        </button>
        <button
          onClick={() => setActiveTab('bots')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bots'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Bot className="h-4 w-4" />
          Bots e Grupos
        </button>
      </div>

      {activeTab === 'mensagens' && <MensagensTab />}
      {activeTab === 'bots' && <BotsGruposTab />}
    </div>
  )
}

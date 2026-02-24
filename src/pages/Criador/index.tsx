import { useState } from 'react'
import { FileText, List, Tag, FileEdit } from 'lucide-react'
import { CriadorProvider } from './CriadorContext'
import { NomesTab } from './NomesTab'
import { ListasTab } from './ListasTab'
import { CategoriasTab } from './CategoriasTab'
import { DescricoesTab } from './DescricoesTab'
import { useOperacao } from '@/contexts/OperacaoContext'

type TabType = 'nomes' | 'listas' | 'categorias' | 'descricoes'

const tabs = [
  { id: 'nomes' as TabType, label: 'Nomes de Grupo', icon: FileText },
  { id: 'listas' as TabType, label: 'Listas', icon: List },
  { id: 'categorias' as TabType, label: 'Categorias', icon: Tag },
  { id: 'descricoes' as TabType, label: 'Descrições de Grupos', icon: FileEdit },
]

export default function Criador() {
  const { operacaoAtual } = useOperacao()
  const [activeTab, setActiveTab] = useState<TabType>('nomes')

  return (
    <CriadorProvider>
      <div className="min-h-screen -m-6 p-6">
        <div className="mb-6 bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
          <h1 className="text-3xl font-bold text-gray-100">
            Criador{operacaoAtual ? ` - ${operacaoAtual.nome}` : ''}
          </h1>
          <p className="text-gray-400 mt-2">Gerenciar nomes de grupo, nomes e listas</p>
        </div>

        {/* Top Bar com Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'nomes' && <NomesTab />}
        {activeTab === 'listas' && <ListasTab />}
        {activeTab === 'categorias' && <CategoriasTab />}
        {activeTab === 'descricoes' && <DescricoesTab />}
      </div>
    </CriadorProvider>
  )
}

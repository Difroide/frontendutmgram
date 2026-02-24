import { useOperacao } from '@/contexts/OperacaoContext'
import { ClonadorVIPTab } from '../components/ClonadorVIPTab'
import { AlertTriangle } from 'lucide-react'

export default function ClonadorVIP() {
  const { operacaoAtual } = useOperacao()

  return (
    <div className="min-h-screen -m-6 p-6">
      <div className="mb-6 bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          Clonador Base{operacaoAtual ? ` - ${operacaoAtual.nome}` : ''}
        </h1>
        <p className="text-gray-400 mt-2">Clone grupos base ocultando a origem das mensagens</p>
      </div>

      <div className="mt-6">
        <ClonadorVIPTab />
      </div>
    </div>
  )
}


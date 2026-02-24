import { useOperacao } from '@/contexts/OperacaoContext'
import { AdicionarAoGrupoBaseTab } from '../components/AdicionarAoGrupoBaseTab'
import { AlertTriangle } from 'lucide-react'

export default function AdicionarAoGrupoBase() {
  const { operacaoAtual } = useOperacao()

  return (
    <div className="min-h-screen -m-6 p-6">
      <div className="mb-6 bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          Adicionar ao Grupo Base{operacaoAtual ? ` - ${operacaoAtual.nome}` : ''}
        </h1>
        <p className="text-gray-400 mt-2">Adicione bots e usuários como administradores nos grupos base criados</p>
      </div>

      <div className="mt-6">
        <AdicionarAoGrupoBaseTab />
      </div>
    </div>
  )
}


import { CategoriasTab } from '../Criador/CategoriasTab'
import { useOperacao } from '@/contexts/OperacaoContext'

export default function Categorias() {
  const { operacaoAtual } = useOperacao()

  return (
    <div className="min-h-screen -m-6 p-6">
      <CategoriasTab />
    </div>
  )
}


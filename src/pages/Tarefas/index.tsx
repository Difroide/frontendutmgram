import { useState, useEffect } from 'react'
import { AutomacaoCard } from './AutomacaoCard'
import { automacaoService } from '@/services/automacaoService'
import { Automacao } from '@/types/Automacao'
import { useOperacao } from '@/contexts/OperacaoContext'

export default function Tarefas() {
  const { operacaoAtual } = useOperacao()
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])

  useEffect(() => {
    // Carregar automações iniciais
    setAutomacoes(automacaoService.getAll())

    // Inscrever-se em mudanças
    const unsubscribe = automacaoService.subscribe((novasAutomacoes) => {
      setAutomacoes(novasAutomacoes)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Separar automações por status
  const automacoesEmAndamento = automacoes.filter(
    (a) => a.status === 'em-andamento'
  )
  const automacoesFilaEspera = automacoes.filter(
    (a) => a.status === 'pendente'
  )
  const automacoesConcluidas = automacoes.filter(
    (a) => a.status === 'concluida' || a.status === 'erro' || a.status === 'cancelada'
  )

  const handleLimparConcluidas = () => {
    if (window.confirm('Deseja remover todas as automações concluídas?')) {
      automacoesConcluidas.forEach((automacao) => {
        automacaoService.remove(automacao.id)
      })
    }
  }

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="block w-full bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow relative">
        <h1 className="text-3xl font-bold text-gray-100">
          Tarefas{operacaoAtual ? ` - ${operacaoAtual.nome}` : ''}
        </h1>
        <p className="text-gray-400 mt-2">Automações em execução e histórico</p>
        {automacoesConcluidas.length > 0 && (
          <button
            onClick={handleLimparConcluidas}
            className="absolute top-6 right-6 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            Limpar Concluídas
          </button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-100">Total</h3>
          </div>
          <p className="text-3xl font-bold text-gray-100">{automacoes.length}</p>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-100">Em Execução</h3>
          </div>
          <p className="text-3xl font-bold text-blue-400">{automacoesEmAndamento.length + automacoesFilaEspera.length}</p>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-100">Concluídas</h3>
          </div>
          <p className="text-3xl font-bold text-green-400">{automacoesConcluidas.length}</p>
        </div>
      </div>

      {/* Automações Em Andamento */}
      {automacoesEmAndamento.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Em Andamento</h2>
          <div className="space-y-4">
            {automacoesEmAndamento.map((automacao) => (
              <AutomacaoCard key={automacao.id} automacao={automacao} />
            ))}
          </div>
        </div>
      )}

      {/* Automações na Fila de Espera */}
      {automacoesFilaEspera.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Fila de Espera</h2>
          <div className="space-y-4">
            {automacoesFilaEspera.map((automacao) => (
              <AutomacaoCard key={automacao.id} automacao={automacao} />
            ))}
          </div>
        </div>
      )}

      {/* Automações Concluídas */}
      {automacoesConcluidas.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Histórico</h2>
          <div className="space-y-4">
            {automacoesConcluidas.map((automacao) => (
              <AutomacaoCard key={automacao.id} automacao={automacao} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {automacoes.length === 0 && (
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-12 text-center">
          <p className="text-gray-400 text-lg">Nenhuma automação em execução</p>
          <p className="text-gray-500 text-sm mt-2">
            As automações iniciadas na aba de Contas aparecerão aqui
          </p>
        </div>
      )}
    </div>
  )
}

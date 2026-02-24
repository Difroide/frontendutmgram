import { useState } from 'react'
import { X, CheckCircle, XCircle, Loader2, Clock, AlertCircle, FileText } from 'lucide-react'
import { Automacao } from '@/types/Automacao'
import { automacaoService } from '@/services/automacaoService'
import { LogsModal } from './LogsModal'

interface AutomacaoCardProps {
  automacao: Automacao
}

const getStatusIcon = (status: Automacao['status']) => {
  switch (status) {
    case 'concluida':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'erro':
      return <XCircle className="w-5 h-5 text-red-500" />
    case 'em-andamento':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    case 'cancelada':
      return <XCircle className="w-5 h-5 text-gray-500" />
    default:
      return <Clock className="w-5 h-5 text-yellow-500" />
  }
}

const getStatusColor = (status: Automacao['status']) => {
  switch (status) {
    case 'concluida':
      return 'bg-green-900/50 text-green-300 border-green-500/30'
    case 'erro':
      return 'bg-red-900/50 text-red-300 border-red-500/30'
    case 'em-andamento':
      return 'bg-blue-900/50 text-blue-300 border-blue-500/30'
    case 'cancelada':
      return 'bg-gray-700/50 text-gray-400 border-gray-600/30'
    default:
      return 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30'
  }
}

const getStatusLabel = (status: Automacao['status']) => {
  switch (status) {
    case 'concluida':
      return 'Concluída'
    case 'erro':
      return 'Erro'
    case 'em-andamento':
      return 'Em Andamento'
    case 'cancelada':
      return 'Cancelada'
    case 'pendente':
      return 'Fila de Espera'
    default:
      return 'Pendente'
  }
}

export const AutomacaoCard = ({ automacao }: AutomacaoCardProps) => {
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  
  const progressoPercentual = automacao.progresso
    ? Math.round((automacao.progresso.current / automacao.progresso.total) * 100)
    : 0

  const handleRemover = () => {
    if (automacao.status === 'em-andamento') {
      if (window.confirm('Esta automação está em andamento. Deseja cancelá-la?')) {
        automacaoService.cancelar(automacao.id)
      }
    } else {
      automacaoService.remove(automacao.id)
    }
  }

  const temLogs = automacao.logs && automacao.logs.length > 0

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg hover:shadow-xl transition-all p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {getStatusIcon(automacao.status)}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-100 mb-1">{automacao.titulo}</h3>
            {automacao.descricao && (
              <p className="text-sm text-gray-400 mb-2">{automacao.descricao}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                  automacao.status
                )}`}
              >
                {getStatusLabel(automacao.status)}
              </span>
              {automacao.categoriaNome && (
                <span className="px-2 py-1 rounded text-xs font-medium border bg-purple-900/50 text-purple-300 border-purple-500/30">
                  {automacao.categoriaNome}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {formatarData(automacao.dataInicio)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRemover}
          className="text-gray-400 hover:text-red-400 transition-colors p-1"
          title={automacao.status === 'em-andamento' ? 'Cancelar' : 'Remover'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progresso */}
      {automacao.progresso && automacao.status === 'em-andamento' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">
              {automacao.progresso.current} de {automacao.progresso.total}
            </span>
            <span className="text-gray-400">{progressoPercentual}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
          {automacao.progresso.mensagem && (
            <p className="text-xs text-gray-500 mt-2">{automacao.progresso.mensagem}</p>
          )}
          {/* Mostrar contagem de membros se disponível (para encher grupos) */}
          {automacao.tipo === 'encher-grupos' && (
            <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              {automacao.progresso.mediaMembros !== undefined && (
                <p className="text-xs text-blue-300">
                  📊 Média de membros: <strong>{automacao.progresso.mediaMembros}</strong>
                </p>
              )}
              {automacao.progresso.gruposCompletos !== undefined && automacao.progresso.total > 0 && (
                <p className="text-xs text-blue-300 mt-1">
                  ✅ Pedidos completos: <strong>{automacao.progresso.gruposCompletos}/{automacao.progresso.total}</strong>
                  {automacao.progresso.total > 1 && (
                    <span className="text-blue-400/70 ml-2">(Sessão/Lote)</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {automacao.resultado && (
        <div
          className={`p-3 rounded-lg border ${
            automacao.resultado.sucesso
              ? 'bg-green-900/20 border-green-500/30'
              : 'bg-red-900/20 border-red-500/30'
          }`}
        >
          <div className="flex items-start gap-2">
            {automacao.resultado.sucesso ? (
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm ${
                  automacao.resultado.sucesso ? 'text-green-300' : 'text-red-300'
                }`}
              >
                {automacao.resultado.mensagem}
              </p>
              {automacao.erro && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-red-400 mb-1">Detalhes do erro:</p>
                  <p className="text-xs text-red-300 font-mono bg-black/20 p-2 rounded border border-red-500/30 whitespace-pre-wrap break-words">
                    {automacao.erro}
                  </p>
                </div>
              )}
              {/* Mostrar resumo de erros se disponível */}
              {(() => {
                const errorsList = automacao.resultado.detalhes?.errorsList || automacao.resultado.detalhes?.errors || []
                if (errorsList.length === 0) return null
                
                return (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-red-400 mb-1">
                      {errorsList.length} erro(s) encontrado(s):
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {errorsList.slice(0, 10).map((err: any, idx: number) => {
                        const errorText = typeof err === 'string' 
                          ? err 
                          : err.error 
                            ? `Conta ${err.accountId || 'N/A'}: ${err.error}`
                            : err.message
                            ? `Conta ${err.accountId || 'N/A'}: ${err.message}`
                            : JSON.stringify(err)
                        return (
                          <p key={idx} className="text-xs text-red-300 font-mono bg-black/10 p-1.5 rounded break-words">
                            {errorText}
                          </p>
                        )
                      })}
                      {errorsList.length > 10 && (
                        <p className="text-xs text-red-400 italic">
                          ... e mais {errorsList.length - 10} erro(s)
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Erro sem resultado */}
      {automacao.erro && !automacao.resultado && (
        <div className="p-3 rounded-lg border bg-red-900/20 border-red-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300 mb-1">Erro:</p>
              <p className="text-sm text-red-200 font-mono bg-black/20 p-2 rounded border border-red-500/30 whitespace-pre-wrap break-words">
                {automacao.erro}
              </p>
              {temLogs && (
                <button
                  onClick={() => setIsLogsModalOpen(true)}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-red-800/50 hover:bg-red-800/70 text-red-200 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver Detalhes do Erro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão Ver Detalhes quando há logs disponíveis */}
      {temLogs && (
        <div className="mt-3">
          <button
            onClick={() => setIsLogsModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              automacao.status === 'erro' || (automacao.resultado && !automacao.resultado.sucesso)
                ? 'bg-red-900/50 hover:bg-red-900/70 text-red-200'
                : 'bg-gray-700/50 hover:bg-gray-700/70 text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            {automacao.status === 'erro' || (automacao.resultado && !automacao.resultado.sucesso)
              ? 'Ver Detalhes do Erro'
              : 'Ver Detalhes'}
          </button>
        </div>
      )}

      {/* Modal de Logs */}
      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        titulo={automacao.titulo}
        logs={automacao.logs || []}
        erro={automacao.erro}
      />
    </div>
  )
}


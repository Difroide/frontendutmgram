import { Bot, Settings, Trash2, Plus, Loader2, RefreshCw, CheckCircle } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'
import { useTheme } from '@/contexts/ThemeContext'

interface BotMidiaTableProps {
  bots: BotMidia[]
  onEdit: (bot: BotMidia) => void
  onDelete: (id: number | string) => void
  onCreate: () => void
  onVerificar?: () => void
  onVerificarIndividual?: (bot: BotMidia) => Promise<void>
  onVerificarGrupos?: (bot: BotMidia) => Promise<void>
  loading?: boolean
}

export const BotMidiaTable = ({
  bots,
  onEdit,
  onDelete,
  onCreate,
  onVerificar,
  onVerificarIndividual,
  onVerificarGrupos,
  loading = false,
}: BotMidiaTableProps) => {
  const { currentTheme } = useTheme()

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-5">
        {/* Header com botões */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-100">Lista de Bots</h2>
            {loading && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando tokens...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onVerificar && (
              <button
                onClick={onVerificar}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#21262d] border border-gray-700 text-gray-200 rounded-lg hover:bg-[#30363d] transition-all disabled:opacity-50 text-sm font-medium"
                title="Verificar status dos bots"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Verificar Bots
              </button>
            )}
            <button
              onClick={onCreate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-all disabled:opacity-50 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Novo Bot
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Origem</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {bots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    Nenhum bot cadastrado
                  </td>
                </tr>
              ) : (
                bots.map((bot) => (
                  <tr
                    key={bot.id}
                    className="border-b border-gray-800 hover:bg-[#21262d] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${currentTheme.colors.primary}15` }}
                        >
                          <Bot className="w-4 h-4" style={{ color: currentTheme.colors.primary }} />
                        </div>
                        <span className={`font-medium text-sm ${bot.status === 'Inativo' ? 'text-red-400' : 'text-gray-100'}`}>
                          {bot.nome || bot.categoriaNome || bot.nichoNome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      <code className="px-2 py-0.5 bg-[#0d1117] border border-gray-700 rounded text-xs font-mono">
                        {bot.username ? (bot.username.startsWith('@') ? bot.username : `@${bot.username}`) : '-'}
                      </code>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {bot.status === 'Ativo' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-emerald-400 font-medium text-xs">Ativo</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span className="text-red-400 font-medium text-xs">Inativo</span>
                          </div>
                        )}
                        {bot.status === 'Inativo' && (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium rounded">
                            Erro
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-1.5">
                        {onVerificarIndividual && (
                          <button
                            onClick={() => onVerificarIndividual(bot)}
                            disabled={loading}
                            className="p-2 bg-[#0d1117] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#21262d] hover:text-gray-200 transition-all disabled:opacity-50"
                            title="Verificar este bot"
                          >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {onVerificarGrupos && bot.token && (
                          <button
                            onClick={() => onVerificarGrupos(bot)}
                            disabled={loading}
                            className="p-2 bg-[#0d1117] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#21262d] hover:text-gray-200 transition-all disabled:opacity-50"
                            title="Verificar grupos onde este bot é admin"
                          >
                            <CheckCircle className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {bot.origem === 'nicho' && (
                          <button
                            onClick={() => onEdit(bot)}
                            className="p-2 bg-[#0d1117] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#21262d] hover:text-gray-200 transition-all"
                            title="Editar"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        {bot.origem === 'nicho' && (
                          <button
                            onClick={() => onDelete(bot.id)}
                            className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { X, CheckCircle, AlertTriangle, Bot, Users, Zap, AtSign, ExternalLink } from 'lucide-react'

interface BotEncontrado {
  accountId: string
  name?: string | null
  username?: string | null
  token?: string | null
  error?: string | null
}

interface ContaComUsername {
  accountId: string
  username: string
}

interface VerificacaoResumo {
  totalSessoes: number
  totalGrupos: number
  gruposOnline: number
  gruposOffline: number
  prontasParaUso: number
  bots: BotEncontrado[]
  contasComUsername?: ContaComUsername[]
}

interface VerificacaoResumoModalProps {
  isOpen: boolean
  onClose: () => void
  resumo: VerificacaoResumo | null
}

export const VerificacaoResumoModal = ({ isOpen, onClose, resumo }: VerificacaoResumoModalProps) => {
  if (!isOpen || !resumo) return null

  const totalBots = resumo.bots.length
  const contasComUsername = resumo.contasComUsername || []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Resumo da Verificação</h2>
              <p className="text-xs text-gray-500">Resultado consolidado da verificação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500 uppercase">Sessões verificadas</span>
              </div>
              <div className="text-2xl font-semibold text-white">{resumo.totalSessoes}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-500 uppercase">Prontas para uso</span>
              </div>
              <div className="text-2xl font-semibold text-green-400">{resumo.prontasParaUso}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-500 uppercase">Grupos encontrados</span>
              </div>
              <div className="text-2xl font-semibold text-white">{resumo.totalGrupos}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-500 uppercase">Online / Caídos</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                <span className="text-green-400">{resumo.gruposOnline}</span>
                <span className="text-gray-600 mx-1">/</span>
                <span className="text-red-400">{resumo.gruposOffline}</span>
              </div>
            </div>
          </div>

          {/* Usernames das contas (Conta nova) */}
          {contasComUsername.length > 0 && (
            <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-200">Usernames configurados</span>
                </div>
                <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#0d1117] rounded border border-gray-800">
                  {contasComUsername.length} conta(s)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {contasComUsername.map((c) => (
                  <a
                    key={c.accountId}
                    href={`https://t.me/${c.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-mono text-gray-400 hover:text-gray-200 bg-[#0d1117] border border-gray-800 rounded-lg hover:border-gray-600 transition-all"
                  >
                    <AtSign className="w-3 h-3 text-gray-500" />
                    @{c.username}
                    <ExternalLink className="w-3 h-3 text-gray-600" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bots Section */}
          <div className="p-4 rounded-lg border border-gray-800 bg-[#161b22]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200">Bots encontrados</span>
              </div>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#0d1117] rounded border border-gray-800">
                {totalBots} total
              </span>
            </div>
            {totalBots === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                Nenhum bot encontrado via BotFather.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {resumo.bots.map((bot, index) => (
                  <div key={`${bot.accountId}-${bot.username}-${index}`} className="p-3 rounded-lg bg-[#0d1117] border border-gray-800">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm font-medium text-gray-200">
                        {bot.name || 'Bot sem nome'} {bot.username ? `(@${bot.username})` : ''}
                      </div>
                      <div className="text-[10px] text-gray-600 px-2 py-0.5 bg-[#161b22] rounded">
                        Sessão {bot.accountId}
                      </div>
                    </div>
                    {bot.token ? (
                      <div className="text-xs text-gray-400 mt-1 break-all font-mono bg-[#161b22] p-2 rounded">
                        {bot.token}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-yellow-400 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{bot.error || 'Token não encontrado'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

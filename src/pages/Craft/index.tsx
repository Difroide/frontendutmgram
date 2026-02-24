import { useState, useEffect } from 'react'
import { RefreshCw, Hexagon, Bot, AlertCircle, GripVertical } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export interface Funil {
  nome: string
}

function formatLastFetched(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

export default function CraftPage() {
  const { currentTheme } = useTheme()
  const [funis, setFunis] = useState<Funil[]>([])
  const [ultimaVerificacao, setUltimaVerificacao] = useState<string | null>(null)
  const [loadingFunis, setLoadingFunis] = useState(false)
  const [errorFunis, setErrorFunis] = useState<string | null>(null)
  const [cadastrarParaFunil, setCadastrarParaFunil] = useState<string | null>(null)

  useEffect(() => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.carregarFunisCache) return
    electron.craftpay.carregarFunisCache().then((result: { success?: boolean; funis?: Funil[]; fetchedAt?: string | null }) => {
      if (result?.success && Array.isArray(result.funis)) {
        setFunis(result.funis)
        if (result.fetchedAt) setUltimaVerificacao(result.fetchedAt)
      }
    }).catch(() => {})
  }, [])

  const handleAtualizarFunis = async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.listarFunis) return
    setLoadingFunis(true)
    setErrorFunis(null)
    try {
      const result = await electron.craftpay.listarFunis()
      if (result?.success && Array.isArray(result.funis)) {
        setFunis(result.funis)
        if (result.fetchedAt) setUltimaVerificacao(result.fetchedAt)
      } else {
        setErrorFunis(result?.error || 'Erro ao listar funis.')
      }
    } catch (err: any) {
      setErrorFunis(err?.message || 'Erro ao atualizar funis.')
    } finally {
      setLoadingFunis(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl shrink-0"
            style={{ backgroundColor: `${currentTheme.colors.primary}18`, border: `1px solid ${currentTheme.colors.primary}40` }}
          >
            <Hexagon className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Craft</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Gerencie funis e cadastre bots no CraftPay. Use &quot;Atualizar funis&quot; só quando precisar buscar algo novo.
            </p>
          </div>
        </div>
        <button
          onClick={handleAtualizarFunis}
          disabled={loadingFunis}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: currentTheme.colors.primary, color: '#fff' }}
          title="Buscar funis no site"
        >
          <RefreshCw className={`w-4 h-4 ${loadingFunis ? 'animate-spin' : ''}`} />
          Atualizar funis
        </button>
      </div>

      <div className="rounded-2xl border border-gray-700/80 bg-[#161b22]/80 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-700/80 bg-[#0d1117]/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Funis da conta</h2>
            {ultimaVerificacao && funis.length > 0 && (
              <span className="text-xs text-gray-500">
                Última verificação: {formatLastFetched(ultimaVerificacao)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Lista salva da última verificação. Cadastre bots em cada funil pelo botão na linha.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {errorFunis && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorFunis}</span>
            </div>
          )}

          {funis.length === 0 && !loadingFunis && (
            <div className="py-16 text-center">
              <p className="text-gray-500 mb-2">Nenhum funil na lista.</p>
              <p className="text-sm text-gray-600">Clique em &quot;Atualizar funis&quot; para buscar os funis cadastrados no site.</p>
            </div>
          )}

          {funis.length > 0 && (
            <div className="rounded-xl border border-gray-700/60 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700/80" style={{ backgroundColor: `${currentTheme.colors.primary}20` }}>
                    <th className="w-10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400" style={{ color: currentTheme.colors.primary }} />
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-300">Nome</th>
                    <th className="w-40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {funis.map((f, i) => (
                    <tr
                      key={`${f.nome}-${i}`}
                      className="border-b border-gray-800/80 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{f.nome}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setCadastrarParaFunil(f.nome)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                          style={{ backgroundColor: currentTheme.colors.primary, color: '#fff' }}
                        >
                          <Bot className="w-3.5 h-3.5" />
                          Cadastrar bot
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {cadastrarParaFunil !== null && (
        <CadastrarBotModal
          funis={funis}
          funilInicial={cadastrarParaFunil}
          onClose={() => setCadastrarParaFunil(null)}
          onSuccess={() => setCadastrarParaFunil(null)}
        />
      )}
    </div>
  )
}

interface CadastrarBotModalProps {
  funis: Funil[]
  funilInicial?: string | null
  onClose: () => void
  onSuccess: () => void
}

function CadastrarBotModal({ funis, funilInicial, onClose, onSuccess }: CadastrarBotModalProps) {
  const { currentTheme } = useTheme()
  const [funilSelecionado, setFunilSelecionado] = useState(funilInicial || '')
  const [bots, setBots] = useState<Array<{ nome: string; token: string }>>([
    { nome: '', token: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const somenteEsteFunil = Boolean(funilInicial)

  useEffect(() => {
    if (funilInicial) setFunilSelecionado(funilInicial)
  }, [funilInicial])

  const addBot = () => {
    setBots((prev) => [...prev, { nome: '', token: '' }])
  }

  const updateBot = (index: number, field: 'nome' | 'token', value: string) => {
    setBots((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeBot = (index: number) => {
    if (bots.length <= 1) return
    setBots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.adicionarBotsAoFunil) return
    const valid = bots.filter((b) => b.nome.trim() && b.token.trim())
    if (!funilSelecionado || valid.length === 0) {
      setError('Selecione um funil e preencha ao menos um bot (nome e token).')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await electron.craftpay.adicionarBotsAoFunil({
        nomeFunil: funilSelecionado,
        bots: valid,
      })
      if (result?.success) {
        setSuccess(true)
        setSuccessMessage(result?.mensagem || `Fluxo "${funilSelecionado}" atualizado com sucesso!`)
        setTimeout(() => onSuccess(), 2000)
      } else {
        setError(result?.error || 'Erro ao cadastrar bots.')
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar bots.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161b22] rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Cadastrar novo bot</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Funil</label>
            {somenteEsteFunil ? (
              <div className="w-full px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 text-white font-medium">
                {funilSelecionado || funilInicial}
              </div>
            ) : (
              <select
                value={funilSelecionado}
                onChange={(e) => setFunilSelecionado(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100"
              >
                <option value="">Selecione o funil</option>
                {funis.map((f, i) => (
                  <option key={i} value={f.nome}>
                    {f.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Bots</label>
              <button
                type="button"
                onClick={addBot}
                className="text-sm px-2 py-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
              >
                + Adicionar outro
              </button>
            </div>
            <div className="space-y-3">
              {bots.map((bot, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-800 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Bot {i + 1}</span>
                    {bots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBot(i)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Nome do bot"
                    value={bot.nome}
                    onChange={(e) => updateBot(i, 'nome', e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Token do bot Telegram"
                    value={bot.token}
                    onChange={(e) => updateBot(i, 'token', e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error.includes('login') || error.includes('email') || error.includes('Campo de email')
                ? 'O sistema não conseguiu acessar o site CraftPay (sessão pode ter expirado). Clique em "Atualizar funis" na tela anterior para renovar a sessão e tente cadastrar o bot de novo.'
                : error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              {successMessage || 'Bots cadastrados com sucesso. O modal será fechado em instantes.'}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: currentTheme.colors.primary }}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar bots'}
          </button>
        </div>
      </div>
    </div>
  )
}

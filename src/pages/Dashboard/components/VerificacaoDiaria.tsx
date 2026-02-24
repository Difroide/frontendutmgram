import { Fragment, useEffect, useState, useCallback, useRef } from 'react'
import {
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  BarChart3,
  List,
  Radio,
  ExternalLink,
} from 'lucide-react'
import { useVerificacao } from '@/contexts/VerificacaoContext'
import { verificadorDisparoSessaoService } from '@/services/verificadorDisparoSessaoService'
import type { ResultadoVerificacaoDisparoCompleto, BotDisparoInfo } from '@/types/electron'
import type { Conta } from '@/types/Conta'

const TAG_VERIFICADOR_DISPARO = 'Verificador disparo'

type TabAtiva = 'geral' | 'lista'

function toTelegramUrl(link: string | null | undefined): string {
  if (!link || typeof link !== 'string') return ''
  const s = link.trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('t.me')) return `https://${s}`
  return `https://t.me/${s.replace(/^@/, '')}`
}

export const VerificacaoDiaria = () => {
  const { lastProgress, verificacaoRodando, iniciarVerificacao, botLogsOffline } = useVerificacao()

  const [contas, setContas] = useState<Conta[]>([])
  const [sessaoDisparo, setSessaoDisparo] = useState<string>('')
  const [disparoRodando, setDisparoRodando] = useState(false)
  const [disparoProgress, setDisparoProgress] = useState<string | null>(null)
  const [resultadosDisparo, setResultadosDisparo] = useState<ResultadoVerificacaoDisparoCompleto[]>([])
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('geral')

  const [menuAberto, setMenuAberto] = useState(false)
  const [detalhesGruposAberto, setDetalhesGruposAberto] = useState(false)
  const [detalhesBotsAberto, setDetalhesBotsAberto] = useState(false)
  const [segundosDesdeAtualizacao, setSegundosDesdeAtualizacao] = useState<number | null>(null)
  const [listaBotExpandido, setListaBotExpandido] = useState<string | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)


  const [selecionarModoAberto, setSelecionarModoAberto] = useState(false)
  const [selectedModes, setSelectedModes] = useState<string[]>(['groups']) // groups, session, sales

  const toggleMode = (mode: string) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    )
  }

  const handleRunVerification = async () => {
    setSelecionarModoAberto(false)

    // 1. Grupos e Bots (Link)
    if (selectedModes.includes('groups') && !verificacaoRodando) {
      iniciarVerificacao()
    }

    // 2. Disparo Sessão - Delay se rodar junto para não travar
    if (selectedModes.includes('session') && !disparoRodando) {
      const delay = selectedModes.includes('groups') ? 3000 : 0
      setTimeout(() => {
        iniciarVerificacaoDisparo()
      }, delay)
    }

    // 3. Sales Bots (Force)
    if (selectedModes.includes('sales')) {
      const delay = selectedModes.includes('groups') || selectedModes.includes('session') ? 6000 : 0
      setTimeout(() => {
        const api = (window as any).electron?.botMidia
        if (api?.verificarDiario) {
          api.verificarDiario(true).catch((err: any) => console.error('[Verificação Sales] Erro:', err))
        }
      }, delay)
    }
  }


  const contasComTagDisparo = contas.filter(
    (c) => Array.isArray(c.tags) && c.tags.includes(TAG_VERIFICADOR_DISPARO)
  )
  const algoRodando = verificacaoRodando || disparoRodando

  useEffect(() => {
    const api = (window as any).electron?.telegram
    if (!api?.getContas) return
    api.getContas().then((list: Conta[]) => {
      setContas(list || [])
      const comTag = (list || []).filter(
        (c: Conta) => Array.isArray(c.tags) && c.tags.includes(TAG_VERIFICADOR_DISPARO)
      )
      setSessaoDisparo((prev) => {
        if (comTag.some((c: Conta) => c.numero === prev)) return prev
        return comTag[0]?.numero ?? ''
      })
    }).catch(() => { })
  }, [])

  useEffect(() => {
    const db = (window as any).electron?.database
    if (!db?.carregarVerificacaoDiaria) return
    db.carregarVerificacaoDiaria().then((res: any) => {
      if (res?.success && res.data?.disparo?.resultados?.length > 0) {
        setResultadosDisparo(res.data.disparo.resultados as ResultadoVerificacaoDisparoCompleto[])
      }
    }).catch(() => { })
  }, [])

  useEffect(() => {
    if (!disparoRodando) return
    const onProgress = (data: { categoriaNome: string }) => setDisparoProgress(data.categoriaNome)
    verificadorDisparoSessaoService.onVerificacaoDisparoProgress(onProgress)
    return () => verificadorDisparoSessaoService.removeVerificacaoDisparoProgress()
  }, [disparoRodando])

  useEffect(() => {
    if (!verificacaoRodando || !lastProgress?.ultimaAtualizacao) {
      setSegundosDesdeAtualizacao(null)
      return
    }
    const update = () => {
      setSegundosDesdeAtualizacao(
        Math.floor((Date.now() - (lastProgress?.ultimaAtualizacao ?? 0)) / 1000)
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [verificacaoRodando, lastProgress?.ultimaAtualizacao])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
    }
    if (menuAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuAberto])

  const iniciarVerificacaoDisparo = useCallback(async () => {
    if (!sessaoDisparo || disparoRodando) return
    setDisparoRodando(true)
    setDisparoProgress(null)
    setResultadosDisparo([])
    const onResultado = (r: ResultadoVerificacaoDisparoCompleto) => {
      setResultadosDisparo((prev) => {
        const sem = prev.filter((x) => x.categoriaId !== r.categoriaId)
        const next = [...sem, r]
        // Persistir a cada categoria para não perder ao sair da aba
        const db = (window as any).electron?.database
        if (db?.salvarVerificacaoDiariaDisparo) {
          db.salvarVerificacaoDiariaDisparo(next).catch(() => { })
        }
        return next
      })
    }
    verificadorDisparoSessaoService.onVerificacaoDisparoResultadoCategoria(onResultado)
    try {
      const res = await verificadorDisparoSessaoService.verificarDisparoSessao(sessaoDisparo)
      const resultados = (res.resultados ?? []) as ResultadoVerificacaoDisparoCompleto[]
      setResultadosDisparo(resultados)
      if (resultados.length > 0) {
        const db = (window as any).electron?.database
        db?.salvarVerificacaoDiariaDisparo?.(resultados).catch(() => { })
      }
    } finally {
      verificadorDisparoSessaoService.removeVerificacaoDisparoResultadoCategoria()
      setDisparoRodando(false)
      setDisparoProgress(null)
    }
  }, [sessaoDisparo, disparoRodando])

  const iniciarVerificacaoDiaria = useCallback(async () => {
    if (algoRodando) return
    iniciarVerificacao()
    if (sessaoDisparo && contasComTagDisparo.length > 0) {
      setTimeout(() => iniciarVerificacaoDisparo(), 2000)
    }
  }, [algoRodando, iniciarVerificacao, sessaoDisparo, contasComTagDisparo.length, iniciarVerificacaoDisparo])

  const gruposCaidos = lastProgress?.grupos.caidos?.length ?? 0
  const botsOffline = lastProgress?.bots.offline?.length ?? 0
  const gruposOnline = lastProgress?.grupos.online ?? 0
  const botsOnline = lastProgress?.bots.online ?? 0
  const temResultados = !!lastProgress
  const temResultadosDisparo = resultadosDisparo.length > 0

  const resumoVendas = temResultadosDisparo
    ? resultadosDisparo.reduce(
      (acc, r) => {
        if (r.botVendas) {
          if (r.botVendas.online) acc.on++
          else acc.off++
        }
        return acc
      },
      { on: 0, off: 0 }
    )
    : null

  const botsListaFlat: Array<{ categoria: string; grupo: string; bot: BotDisparoInfo }> = []
  if (temResultadosDisparo) {
    for (const r of resultadosDisparo) {
      for (const bot of r.botsGrupo || []) {
        if (bot.tipo === 'lista' || bot.tipo === 'desconhecido') {
          botsListaFlat.push({
            categoria: r.categoriaNome,
            grupo: r.grupoLabel,
            bot,
          })
        }
      }
    }
  }

  const getStatusText = () => {
    if (verificacaoRodando && disparoRodando)
      return disparoProgress ? `Disparo: ${disparoProgress}` : 'Verificando...'
    if (verificacaoRodando) return 'Verificando grupos e bots...'
    if (disparoRodando) return disparoProgress ? `Disparo: ${disparoProgress}` : 'Verificando disparo...'
    return null
  }

  // Um registro por bot de lista (mesmo bot em vários grupos = uma linha, dados do primeiro encontro)
  const botsListaUnicos = (() => {
    const vistos = new Set<string>()
    return botsListaFlat.filter((item) => {
      const key = (item.bot.username || item.bot.nome || '').toString()
      if (vistos.has(key)) return false
      vistos.add(key)
      return true
    })
  })()

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 py-4 border-b border-gray-800/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2 rounded-lg bg-cyan-500/10">
              <RefreshCw
                className={`w-4 h-4 text-cyan-400 ${algoRodando ? 'animate-spin' : ''}`}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-100 truncate">
                Verificação Diária
              </h2>
              {getStatusText() && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{getStatusText()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelecionarModoAberto(true)}
              disabled={algoRodando}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium inline-flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${algoRodando ? 'animate-spin' : ''}`} />
              {algoRodando ? 'Verificando...' : 'Iniciar...'}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Opções"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-[#1c2333] border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                  <button
                    type="button"
                    onClick={() => { setMenuAberto(false); iniciarVerificacao() }}
                    disabled={verificacaoRodando}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 disabled:opacity-40 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Grupos e bots
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuAberto(false); iniciarVerificacaoDisparo() }}
                    disabled={disparoRodando || contasComTagDisparo.length === 0}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 disabled:opacity-40 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Apenas disparo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {algoRodando && (
          <div className="mt-3">
            <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-2/5 bg-cyan-500 rounded-full animate-pulse" />
            </div>
            {verificacaoRodando && segundosDesdeAtualizacao != null && (
              <p className="text-gray-500 text-[11px] mt-1.5">
                Atualização há {segundosDesdeAtualizacao}s
                {segundosDesdeAtualizacao > 90 && (
                  <span className="text-amber-400 ml-2">Pode ter travado</span>
                )}
              </p>
            )}
          </div>
        )}
      </header>

      {/* ─── Cards: Grupos / Bots (verificação de membros) ────────────────── */}
      {temResultados && (
        <section className="shrink-0 px-5 py-4 border-b border-gray-800/40">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            Grupos e bots
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => gruposCaidos > 0 && setDetalhesGruposAberto(!detalhesGruposAberto)}
              className={`text-left p-3 rounded-lg border transition-colors ${gruposCaidos > 0
                ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                : 'bg-emerald-500/5 border-emerald-500/20'
                }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {gruposCaidos > 0 ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="text-[10px] uppercase tracking-wider text-gray-500">
                  Grupos caídos
                </span>
              </div>
              <p className={`text-lg font-bold ${gruposCaidos > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {gruposCaidos}
              </p>
            </button>
            <button
              type="button"
              onClick={() => botsOffline > 0 && setDetalhesBotsAberto(!detalhesBotsAberto)}
              className={`text-left p-3 rounded-lg border transition-colors ${botsOffline > 0
                ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                : 'bg-emerald-500/5 border-emerald-500/20'
                }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {botsOffline > 0 ? (
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="text-[10px] uppercase tracking-wider text-gray-500">
                  Bots offline
                </span>
              </div>
              <p className={`text-lg font-bold ${botsOffline > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {botsOffline}
              </p>
            </button>
            <div className="p-3 rounded-lg bg-[#0d1117]/40 border border-gray-800/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Grupos online</span>
              </div>
              <p className="text-lg font-bold text-white">{gruposOnline}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0d1117]/40 border border-gray-800/40">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Bots online</span>
              </div>
              <p className="text-lg font-bold text-white">{botsOnline}</p>
            </div>
          </div>
          {detalhesGruposAberto && gruposCaidos > 0 && lastProgress?.grupos.caidos && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-xs font-medium text-red-400 mb-2">Grupos caídos</p>
              <ul className="space-y-1 text-sm text-gray-400">
                {lastProgress.grupos.caidos.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    <span className="flex items-center gap-1.5">
                      {c.nome}
                      {c.link && (
                        <a
                          href={toTelegramUrl(c.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-0.5 rounded hover:bg-red-500/20 text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Abrir grupo no Telegram"
                          aria-label="Abrir grupo"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </span>
                    {c.link && <span className="text-gray-600 text-xs">({c.link})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detalhesBotsAberto && botsOffline > 0 && lastProgress?.bots.offline && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-xs font-medium text-red-400 mb-2">Bots offline</p>
              <ul className="space-y-1 text-sm text-gray-400">
                {lastProgress.bots.offline.map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {b.nome}
                    {b.username && (
                      <span className="text-gray-600 text-xs">
                        (@{(b.username || '').replace(/^@+/, '')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {botLogsOffline.length > 0 && (
                <details className="mt-2">
                  <summary className="text-amber-400 text-xs cursor-pointer hover:underline">
                    Log de bots offline
                  </summary>
                  <ul className="text-gray-500 text-xs mt-1 space-y-1 max-h-28 overflow-y-auto">
                    {botLogsOffline.map((log, i) => (
                      <li key={i} className="border-l-2 border-amber-500/30 pl-2">
                        {log.url} · {log.username} · {log.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Conteúdo principal: abas Disparo/Vendas | Bots de lista ─────── */}
      {temResultadosDisparo ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 flex border-b border-gray-800/50">
            <button
              type="button"
              onClick={() => setTabAtiva('geral')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${tabAtiva === 'geral'
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Disparo e vendas
            </button>
            <button
              type="button"
              onClick={() => setTabAtiva('lista')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${tabAtiva === 'lista'
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              Bots de lista
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {tabAtiva === 'geral' && (
              <section className="p-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Por categoria
                </p>
                {resumoVendas && (
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Radio className="w-3.5 h-3.5" />
                      Vendas ON: {resumoVendas.on}
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="w-3.5 h-3.5" />
                      Vendas OFF: {resumoVendas.off}
                    </span>
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-gray-800/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800/50 bg-[#0d1117]/60">
                        <th className="text-left py-2.5 px-4 text-gray-500 font-medium">
                          Categoria
                        </th>
                        <th className="text-left py-2.5 px-4 text-gray-500 font-medium">
                          Grupo
                        </th>
                        <th className="text-center py-2.5 px-3 text-gray-500 font-medium">
                          Bot vendas
                        </th>
                        <th className="text-center py-2.5 px-3 text-gray-500 font-medium">
                          Bot mídia
                        </th>
                        <th className="text-left py-2.5 px-4 text-gray-500 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const ordenados = [...resultadosDisparo].sort((a, b) => {
                          const aOk = !a.erro
                          const bOk = !b.erro
                          if (aOk !== bOk) return aOk ? -1 : 1
                          return 0
                        })
                        return ordenados.flatMap((r, i) => {
                          const prev = ordenados[i - 1]
                          const mostrarDivisor = prev && !prev.erro && r.erro
                          return [
                            ...(mostrarDivisor
                              ? [
                                <tr key={`div-${r.categoriaId}`} className="bg-gray-800/40">
                                  <td colSpan={5} className="py-2 px-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    ——— Problemas ———
                                  </td>
                                </tr>,
                              ]
                              : []),
                            <tr
                              key={r.categoriaId}
                              className="border-b border-gray-800/30 hover:bg-gray-800/20"
                            >
                              <td className="py-2.5 px-4 text-gray-200 font-medium">
                                {r.categoriaNome}
                              </td>
                              <td className="py-2.5 px-4 text-gray-400">
                                <span className="flex items-center gap-1.5">
                                  {r.grupoLabel}
                                  {r.grupoLink && (
                                    <a
                                      href={toTelegramUrl(r.grupoLink)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-0.5 rounded hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                                      title="Abrir grupo no Telegram"
                                      aria-label="Abrir grupo"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {r.erro ? (
                                  <span className="text-gray-600">—</span>
                                ) : r.botVendas ? (
                                  r.botVendas.online ? (
                                    <span className="text-emerald-400">ON</span>
                                  ) : (
                                    <span className="text-red-400">OFF</span>
                                  )
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {r.erro ? (
                                  <span className="text-gray-600">—</span>
                                ) : r.botMidia ? (
                                  r.botMidia.ok1h ? (
                                    <span className="text-emerald-400">OK</span>
                                  ) : r.botMidia.ok5h ? (
                                    <span className="text-amber-400">Lento</span>
                                  ) : (
                                    <span className="text-red-400">Parado</span>
                                  )
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                {r.erro ? (
                                  <span className="text-red-400 truncate block max-w-[200px]" title={r.erro}>
                                    {r.erro}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">OK</span>
                                )}
                              </td>
                            </tr>
                          ]
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tabAtiva === 'lista' && (
              <section className="p-5">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Bots de lista — disparos últimos 2 dias
                </p>
                {botsListaUnicos.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Nenhum bot de lista. Execute a verificação de disparo.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-800/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800/50 bg-[#0d1117]/60">
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Bot</th>
                          <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Disparos 2d</th>
                          <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Último</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Em que grupos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {botsListaUnicos.map((item) => {
                          const bot = item.bot
                          const at = (bot.username || bot.nome || '—').toString().replace(/^@/, '')
                          const gruposOrdenados = bot.gruposDetalhes?.length
                            ? [...bot.gruposDetalhes].sort((a, b) => (b.vezes ?? 0) - (a.vezes ?? 0))
                            : []
                          const temGrupos = gruposOrdenados.length > 0
                          const expandido = listaBotExpandido === at
                          return (
                            <Fragment key={at}>
                              <tr
                                className="border-b border-gray-800/30 hover:bg-gray-800/20"
                              >
                                <td className="py-2.5 px-4 text-gray-200 font-medium">
                                  <span className="flex items-center gap-1.5">
                                    {temGrupos && (
                                      <button
                                        type="button"
                                        onClick={() => setListaBotExpandido(expandido ? null : at)}
                                        className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300"
                                        aria-label={expandido ? 'Recolher' : 'Ver grupos'}
                                      >
                                        {expandido ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                        )}
                                      </button>
                                    )}
                                    @{at}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={bot.totalDisparos === 0 ? 'text-red-400 font-medium' : 'text-white'}>
                                    {bot.totalDisparos}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-gray-400">
                                  {bot.ultimoDisparo ? formatTimeAgo(bot.ultimoDisparo) : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-gray-400">
                                  {temGrupos ? (
                                    <button
                                      type="button"
                                      onClick={() => setListaBotExpandido(expandido ? null : at)}
                                      className="text-left text-cyan-400 hover:underline"
                                    >
                                      {gruposOrdenados.length} grupo{gruposOrdenados.length !== 1 ? 's' : ''} encontrado{gruposOrdenados.length !== 1 ? 's' : ''}
                                    </button>
                                  ) : bot.totalDisparos === 0 ? (
                                    <span className="text-red-400/80">Sem atividade</span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                              {expandido && temGrupos && (
                                <tr className="border-b border-gray-800/30 bg-[#0d1117]/40">
                                  <td colSpan={4} className="p-0">
                                    <div className="px-4 pb-4 pt-1">
                                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                                        Grupos encontrados neste bot
                                      </p>
                                      <div className="rounded-lg border border-gray-800/50 overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-[#0d1117]/60 border-b border-gray-800/50">
                                              <th className="text-left py-2 px-3 text-gray-500 font-medium">Nome</th>
                                              <th className="text-left py-2 px-3 text-gray-500 font-medium">Link</th>
                                              <th className="text-left py-2 px-3 text-gray-500 font-medium">Última vez visto</th>
                                              <th className="text-center py-2 px-3 text-gray-500 font-medium">Vezes</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {gruposOrdenados.map((gd, gi) => (
                                              <tr key={gi} className="border-b border-gray-800/30 last:border-0">
                                                <td className="py-2 px-3 text-gray-200">
                                                  <span className="flex items-center gap-1.5">
                                                    {gd.nome || '—'}
                                                    {gd.link && (
                                                      <a
                                                        href={toTelegramUrl(gd.link)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-0.5 rounded hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                                                        title="Abrir grupo no Telegram"
                                                        aria-label="Abrir grupo"
                                                      >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                      </a>
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                  {gd.link ? (
                                                    <a
                                                      href={toTelegramUrl(gd.link)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-cyan-400 hover:underline truncate block max-w-[200px]"
                                                    >
                                                      {gd.link}
                                                    </a>
                                                  ) : (
                                                    <span className="text-gray-600">—</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-gray-400">
                                                  {gd.ultimaVez ? formatTimeAgo(gd.ultimaVez) : '—'}
                                                </td>
                                                <td className="py-2 px-3 text-center text-gray-400">{gd.vezes ?? 0}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5">
          {!temResultados && !algoRodando && (
            <p className="text-sm text-gray-500">
              Clique em <strong className="text-gray-400">Iniciar</strong> para verificar
              grupos, bots e disparo.
            </p>
          )}
        </div>
      )}
      {/* ─── Modal Seleção de Modo ────────────────────────────────────────── */}
      {selecionarModoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1c2333] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Nova Verificação</h3>
              <button
                onClick={() => setSelecionarModoAberto(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid gap-4">
              <p className="text-sm text-gray-400 mb-2">Selecione o que deseja verificar agora:</p>

              {/* Grupos/Bots Link - CHECKBOX */}
              <label
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${selectedModes.includes('groups')
                  ? 'bg-cyan-500/20 border-cyan-500'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModes.includes('groups')}
                  onChange={() => toggleMode('groups')}
                  disabled={algoRodando}
                  className="mt-1 w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                />
                <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-200 mb-1">
                    Grupos e Bots (Via Link)
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Verifica se os links <code>t.me</code> dos grupos e bots estão acessíveis publicamente.
                    Detecta grupos caídos ("Contact @") e bots offline sem usar login.
                  </p>
                </div>
              </label>

              {/* Disparo Sessão - CHECKBOX */}
              <label
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${selectedModes.includes('session')
                  ? 'bg-emerald-500/20 border-emerald-500'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-gray-600'
                  } ${(!sessaoDisparo || contasComTagDisparo.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedModes.includes('session')}
                  onChange={() => toggleMode('session')}
                  disabled={algoRodando || !sessaoDisparo || contasComTagDisparo.length === 0}
                  className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                />
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-200 mb-1">
                    Disparo e Integridade (Sessão)
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Usa a conta de disparo para verificar se consegue acessar e enviar mensagens nos grupos.
                    Confirma se a conta não foi banida dos grupos.
                  </p>
                </div>
              </label>

              {/* Bots de Vendas - CHECKBOX */}
              <label
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${selectedModes.includes('sales')
                  ? 'bg-purple-500/20 border-purple-500'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModes.includes('sales')}
                  onChange={() => toggleMode('sales')}
                  disabled={algoRodando}
                  className="mt-1 w-5 h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                />
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-200 mb-1">
                    Bots de Vendas (Teste Real)
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Loga nas sessões e envia <code>/start</code> para os bots de vendas.
                    Verifica se o bot responde corretamente. (Bypassa cache de 24h)
                  </p>
                </div>
              </label>
            </div>

            <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {selectedModes.length === 0 ? 'Selecione ao menos uma opção' : `${selectedModes.length} modo(s) selecionado(s)`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelecionarModoAberto(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRunVerification}
                  disabled={selectedModes.length === 0 || algoRodando}
                  className="px-6 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Verificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diff < 1) return 'Agora'
    if (diff < 60) return `${diff}m`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return `${Math.floor(diff / 1440)}d`
  } catch {
    return '—'
  }
}

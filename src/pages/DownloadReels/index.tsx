import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Video,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  X,
  BarChart2,
  Terminal,
  Settings2,
  FolderOpen,
  Layers,
  Users,
  ExternalLink,
  ChevronDown,
  Activity
} from 'lucide-react'
import { databaseService } from '@/services/databaseService'
import { useOperacao } from '@/contexts/OperacaoContext'

const CONCURRENCY_OPTIONS = [3, 5, 10]
const CONFIG_KEYS = {
  COOKIES: 'reels_default_cookies',
  COOKIES_FROM_BROWSER: 'reels_default_cookies_from_browser',
  YTDLP_PATH: 'reels_default_ytdlp_path',
  OUTPUT_DIR: 'reels_default_output_dir',
}

const BROWSER_OPTIONS = [
  { value: '', label: 'Cookies Manuais' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'edge', label: 'Microsoft Edge' },
  { value: 'brave', label: 'Brave' },
]

// --- Utility Functions ---
function isValidReelUrl(url: string): boolean {
  const u = url.trim()
  return u.length > 0 && u.includes('instagram.com') && (u.includes('/reel/') || u.includes('/reels/'))
}

function parseLinks(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(isValidReelUrl)
}

// --- Sub-Components ---

/**
 * Status de Ferramentas e Configuração Rápida de Cookies
 */
const ConfigHeader = ({
  ytDlpStatus,
  checkYtDlp,
  cookiesFromBrowser,
  setCookiesFromBrowser,
  isVerifying
}: any) => (
  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/40 p-4 border-b border-white/5 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${ytDlpStatus?.ok
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
        {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
        {ytDlpStatus?.ok ? `yt-dlp v${ytDlpStatus.version || '...'}` : 'yt-dlp Necessário'}
      </div>
      <button
        onClick={checkYtDlp}
        className="text-xs text-slate-400 hover:text-white transition-colors"
      >
        {isVerifying ? 'Verificando...' : 'Re-verificar'}
      </button>
    </div>

    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Fonte de Sessão:</span>
        <select
          value={cookiesFromBrowser}
          onChange={(e) => setCookiesFromBrowser(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500/50"
        >
          {BROWSER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  </div>
)

/**
 * Área de Extração via Perfis
 */
const ProfileExtractor = ({
  usernames,
  setUsernames,
  isExtracting,
  handleExtract,
  logs,
  includeStats,
  setIncludeStats
}: any) => {
  const count = usernames.split('\n').filter((u: string) => u.trim()).length

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Users className="h-4 w-4 text-violet-400" />
          Extração de Perfis
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeStats}
              onChange={e => setIncludeStats(e.target.checked)}
              className="hidden"
            />
            <div className={`w-8 h-4 rounded-full transition-colors relative ${includeStats ? 'bg-teal-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${includeStats ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-slate-300 font-bold">Stats</span>
          </label>
          <div className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded border border-violet-500/20">
            {count} ALVOS
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <textarea
          value={usernames}
          onChange={(e) => setUsernames(e.target.value)}
          placeholder="Insira @usernames aqui... (um por linha)"
          className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:ring-1 focus:ring-violet-500/30 resize-none font-mono"
        />

        <button
          onClick={handleExtract}
          disabled={isExtracting || !usernames.trim()}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {isExtracting ? 'Iniciando Playwright...' : 'Analisar Perfis'}
        </button>

        {logs.length > 0 && (
          <div className="mt-2 bg-black/60 rounded-lg p-3 font-mono text-[10px] text-teal-400 h-32 overflow-y-auto custom-scrollbar border border-white/5">
            <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold uppercase tracking-tighter">
              <Terminal className="h-3 w-3" /> Console Output
            </div>
            {logs.map((log: string, i: number) => (
              <div key={i} className="py-0.5 border-b border-white/[0.02] break-all">{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Fila de Links e Análise
 */
const LinkQueue = ({ links, setLinks, isAnalyzing, handleAnalyze, isDownloading }: any) => {
  const validUrls = parseLinks(links)

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Layers className="h-4 w-4 text-teal-400" />
          Fila de Processamento
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
          {validUrls.length} REELS VÁLIDOS
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="Cole links dos Reels aqui..."
          disabled={isDownloading}
          className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:ring-1 focus:ring-teal-500/30 font-mono resize-none transition-opacity disabled:opacity-50"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || validUrls.length === 0}
            className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-700 border border-white/5 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all"
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart2 className="h-3 w-3" />}
            Extrair Metadados
          </button>
          <button
            onClick={() => setLinks('')}
            disabled={isDownloading}
            className="p-2 aspect-square bg-slate-700/50 hover:bg-rose-900/30 border border-white/5 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
            title="Limpar Fila"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Barra de Configuração e Controle Inferior
 */
const DownloadSettingsToolbar = ({
  outputDir,
  changePath,
  concurrency,
  setConcurrency,
  handleStart,
  isDownloading,
  progress
}: any) => (
  <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-center z-40 transition-all duration-500">
    <div className="max-w-6xl w-full flex items-center justify-between gap-6 px-4">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          <FolderOpen className="h-3 w-3" /> Destino dos Arquivos
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm truncate max-w-xs font-mono transition-colors ${outputDir ? 'text-slate-300' : 'text-amber-400'}`}>
            {outputDir || 'Caminho não definido!'}
          </span>
          <button
            onClick={changePath}
            className="p-1.5 hover:bg-white/5 rounded text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden sm:flex flex-col items-end">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Threads</div>
          <div className="flex gap-1">
            {CONCURRENCY_OPTIONS.map(val => (
              <button
                key={val}
                disabled={isDownloading}
                onClick={() => setConcurrency(val)}
                className={`w-7 h-7 rounded text-[10px] font-bold border transition-all ${concurrency === val
                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                    : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={handleStart}
            disabled={isDownloading || !outputDir}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 ${isDownloading
                ? 'bg-teal-600/40 text-teal-200 cursor-not-allowed border border-teal-500/20'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20'
              }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-teal-300" />
                <span>Processando {progress.completed}/{progress.total}</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>INICIAR DOWNLOAD</span>
              </>
            )}
          </button>
          {isDownloading && progress.total > 0 && (
            <div className="absolute -top-1 left-0 right-0">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-teal-400 transition-all duration-300 shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)

// --- Main Application Component ---

export default function DownloadReels() {
  const { operacaoAtual } = useOperacao()

  // State: Configuration
  const [outputDir, setOutputDir] = useState('')
  const [ytDlpPath, setYtDlpPath] = useState('')
  const [cookiesString, setCookiesString] = useState('')
  const [cookiesFromBrowser, setCookiesFromBrowser] = useState('')
  const [concurrency, setConcurrency] = useState(5)

  // State: UI & Interaction
  const [linksText, setLinksText] = useState('')
  const [usernamesText, setUsernamesText] = useState('')
  const [includeStats, setIncludeStats] = useState(false)

  // State: Operation Status
  const [isDownloading, setIsDownloading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [ytDlpStatus, setYtDlpStatus] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  // Results
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Memoized valid URLs
  const validUrls = useMemo(() => parseLinks(linksText), [linksText])

  // --- Handlers ---

  const checkYtDlp = useCallback(async () => {
    setIsVerifying(true)
    try {
      const r = await window.electron?.reels?.checkYtDlp?.(ytDlpPath || undefined)
      setYtDlpStatus({ ok: r?.success, version: r?.version, error: r?.error })
    } catch (e) {
      setYtDlpStatus({ ok: false, error: (e as Error).message })
    } finally {
      setIsVerifying(false)
    }
  }, [ytDlpPath])

  const handleSetPath = useCallback(async () => {
    const folder = await window.electron?.utils?.selecionarPasta?.()
    if (folder) {
      setOutputDir(folder)
      await databaseService.saveConfig(CONFIG_KEYS.OUTPUT_DIR, folder)
    }
  }, [])

  const handleStartDownload = useCallback(async () => {
    if (!validUrls.length || !outputDir || isDownloading) return

    setIsDownloading(true)
    setProgress({ completed: 0, total: validUrls.length })
    setStatusMsg(null)

    try {
      const res = await window.electron.reels.downloadReels({
        urls: validUrls,
        outputDir,
        concurrency,
        ytDlpPath: ytDlpPath || undefined,
        cookiesFromBrowser: cookiesFromBrowser || undefined,
        cookiesString: cookiesString || undefined,
      })

      if (res.success) {
        setStatusMsg({ type: 'success', text: `Concluído: ${res.completed} baixados, ${res.failed} falhas.` })
      } else {
        setStatusMsg({ type: 'error', text: `Processo encerrado com erros. Verifique os logs.` })
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: `Erro: ${(e as Error).message}` })
    } finally {
      setIsDownloading(false)
    }
  }, [validUrls, outputDir, concurrency, ytDlpPath, cookiesFromBrowser, cookiesString, isDownloading])

  const handleExtractFromProfiles = useCallback(async () => {
    const users = usernamesText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (!users.length || isExtracting) return

    setIsExtracting(true)
    setLogs([])
    setStatusMsg(null)

    try {
      const res = await window.electron.reels.extractLinksInsta3({
        usernames: users,
        cookiesFromBrowser: cookiesFromBrowser || undefined,
        ytDlpPath: ytDlpPath || undefined,
        cookiesString: cookiesString || undefined,
        includeStats,
      })

      if (res.success) {
        if (res.links?.length) {
          setLinksText(prev => (prev ? prev + '\n' : '') + res.links!.join('\n'))
          setStatusMsg({ type: 'success', text: `${res.links.length} novos links extraídos com sucesso!` })
        } else {
          setStatusMsg({ type: 'info', text: 'Extração concluída, mas nenhum link novo foi encontrado.' })
        }
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Falha na extração dos perfis.' })
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: `Exceção: ${(e as Error).message}` })
    } finally {
      setIsExtracting(false)
    }
  }, [usernamesText, cookiesFromBrowser, ytDlpPath, cookiesString, includeStats, isExtracting])

  const handleAnalyzeQueue = useCallback(async () => {
    if (!validUrls.length || isAnalyzing) return
    setIsAnalyzing(true)
    setLogs([])
    setStatusMsg(null)

    try {
      const res = await window.electron.reels.analyzeReelsStats({
        urls: validUrls,
        cookiesString: cookiesString || undefined,
        cookiesFromBrowser: cookiesFromBrowser || undefined,
        ytDlpPath: ytDlpPath || undefined,
      })
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Análise concluída para ${res.data?.length || 0} links. Relatório gerado.` })
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Erro na análise de metadados.' })
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: `Erro IPC: ${(e as Error).message}` })
    } finally {
      setIsAnalyzing(false)
    }
  }, [validUrls, cookiesString, cookiesFromBrowser, ytDlpPath, isAnalyzing])

  // --- Effects ---

  useEffect(() => {
    const loadConfig = async () => {
      const [savedPath, savedYt, savedCookies, savedBrowser] = await Promise.all([
        databaseService.getConfig(CONFIG_KEYS.OUTPUT_DIR, ''),
        databaseService.getConfig(CONFIG_KEYS.YTDLP_PATH, ''),
        databaseService.getConfig(CONFIG_KEYS.COOKIES, ''),
        databaseService.getConfig(CONFIG_KEYS.COOKIES_FROM_BROWSER, '')
      ])

      if (savedPath) setOutputDir(savedPath)
      else if (operacaoAtual) setOutputDir(path.join(operacaoAtual.path, 'Reels'))

      setYtDlpPath(savedYt)
      setCookiesString(savedCookies)
      setCookiesFromBrowser(savedBrowser)

      // Check yt-dlp on start
      setTimeout(checkYtDlp, 1000)
    }
    loadConfig()
  }, [operacaoAtual, checkYtDlp])

  // Persist cookies from browser quickly
  useEffect(() => {
    if (cookiesFromBrowser !== undefined) {
      databaseService.saveConfig(CONFIG_KEYS.COOKIES_FROM_BROWSER, cookiesFromBrowser)
    }
  }, [cookiesFromBrowser])

  // Listeners
  useEffect(() => {
    if (!window.electron?.reels) return

    window.electron.reels.onDownloadProgress((data: any) => {
      setProgress({ completed: data.completed, total: data.total })
    })

    window.electron.reels.onReelsInsta3Log((data: any) => {
      setLogs(prev => [...prev.slice(-49), data.line])
    })

    return () => {
      window.electron.reels?.removeDownloadProgress?.()
      window.electron.reels?.removeReelsInsta3Log?.()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-32 animate-in fade-in duration-500">

      <ConfigHeader
        ytDlpStatus={ytDlpStatus}
        checkYtDlp={checkYtDlp}
        cookiesFromBrowser={cookiesFromBrowser}
        setCookiesFromBrowser={setCookiesFromBrowser}
        isVerifying={isVerifying}
      />

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Top Titles */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Video className="h-8 w-8 text-teal-500" />
              ReelHub <span className="text-sm font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded ml-2">v2.1</span>
            </h1>
            <p className="text-slate-400 mt-1">Automação de download e análise de engajamento do Instagram</p>
          </div>

          {statusMsg && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border animate-in slide-in-from-top duration-300 ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                statusMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
              }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="ml-2 hover:bg-black/10 rounded p-0.5"><X className="h-3 w-3" /></button>
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">

          <ProfileExtractor
            usernames={usernamesText}
            setUsernames={setUsernamesText}
            isExtracting={isExtracting}
            handleExtract={handleExtractFromProfiles}
            logs={logs}
            includeStats={includeStats}
            setIncludeStats={setIncludeStats}
          />

          <LinkQueue
            links={linksText}
            setLinks={setLinksText}
            isAnalyzing={isAnalyzing}
            handleAnalyze={handleAnalyzeQueue}
            isDownloading={isDownloading}
          />

        </div>
      </div>

      <DownloadSettingsToolbar
        outputDir={outputDir}
        changePath={handleSetPath}
        concurrency={concurrency}
        setConcurrency={setConcurrency}
        handleStart={handleStartDownload}
        isDownloading={isDownloading}
        progress={progress}
      />

      {/* Styles for scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}

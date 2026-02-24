import React, { useState, useEffect } from 'react'
import { FolderOpen, RefreshCw, Send, Trash2 } from 'lucide-react'

export function CampanhasNovasSection() {
  const [campanhasList, setCampanhasList] = useState<Array<{ fileName: string; name: string; botUsername: string; groupsCount: number; hasBotToken: boolean; error?: string }>>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [folderPath, setFolderPath] = useState('')
  const [processando, setProcessando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [blastsendLog, setBlastsendLog] = useState<Array<{ msg: string; type: string }>>([])

  const carregar = async () => {
    setLoading(true)
    try {
      const api = (window as any).electron?.blastsendCampanhas?.listarNovas
      if (!api) {
        setCampanhasList([])
        return
      }
      const result = await api()
      if (result.success && Array.isArray(result.campanhas)) {
        setCampanhasList(result.campanhas)
        setFolderPath(result.folderPath || '')
      } else {
        setCampanhasList([])
      }
    } catch {
      setCampanhasList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleEnviar = async () => {
    setErro(null)
    setSucesso(null)
    setBlastsendLog([])
    setProcessando(true)
    try {
      const api = (window as any).electron?.blastsendCampanhas?.processarNovas
      if (!api) {
        setErro('API Blastsend Campanhas não disponível')
        return
      }
      const result = await api()
      if (result.log && Array.isArray(result.log)) {
        setBlastsendLog(result.log)
      }
      if (result.success) {
        const msg = `${result.botsImportados ?? 0} bot(s), ${result.gruposImportados ?? 0} grupo(s), ${result.campanhasCriadas ?? 0} campanha(s), ${result.arquivosProcessados ?? 0} arquivo(s) processado(s)`
        setSucesso(msg)
        carregar()
      } else {
        setErro(result.error || 'Erro ao processar')
        carregar()
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar Campanhas-novas')
      setBlastsendLog((prev) => [...prev, { msg: `Exceção: ${e?.message}`, type: 'error' }])
      carregar()
    } finally {
      setProcessando(false)
    }
  }

  const toggleSelecao = (fileName: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileName)) next.delete(fileName)
      else next.add(fileName)
      return next
    })
  }

  const selecionarTodas = () => {
    if (selectedIds.size === campanhasList.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(campanhasList.map((c) => c.fileName)))
    }
  }

  const handleExcluirUm = async (fileName: string) => {
    if (!confirm(`Excluir a campanha "${fileName}"?`)) return
    setErro(null)
    setExcluindo(true)
    try {
      const api = (window as any).electron?.blastsendCampanhas?.excluirNovas
      if (!api) {
        setErro('API não disponível')
        return
      }
      const result = await api([fileName])
      if (result.success || result.excluidos > 0) {
        setSucesso('Campanha excluída')
        carregar()
        setSelectedIds((prev) => {
          const n = new Set(prev)
          n.delete(fileName)
          return n
        })
      } else {
        setErro(result.erros?.join('; ') || 'Erro ao excluir')
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao excluir')
    } finally {
      setExcluindo(false)
    }
  }

  const handleExcluirSelecionadas = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Excluir ${selectedIds.size} campanha(s) selecionada(s)?`)) return
    setErro(null)
    setExcluindo(true)
    try {
      const api = (window as any).electron?.blastsendCampanhas?.excluirNovas
      if (!api) {
        setErro('API não disponível')
        return
      }
      const result = await api(Array.from(selectedIds))
      if (result.excluidos > 0) {
        setSucesso(`${result.excluidos} campanha(s) excluída(s)`)
        carregar()
        setSelectedIds(new Set())
      }
      if (result.erros?.length) {
        setErro(result.erros.join('; '))
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao excluir')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            Campanhas-novas
          </h2>
          <div className="flex items-center gap-2">
            {campanhasList.length > 0 && (
              <button
                type="button"
                onClick={selecionarTodas}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                {selectedIds.size === campanhasList.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            )}
            <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Atualizar lista"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4 truncate" title={folderPath}>
          Pasta: {folderPath || 'Carregando...'}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw className="h-10 w-10 animate-spin" />
          </div>
        ) : campanhasList.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma campanha na pasta Campanhas-novas</p>
            <p className="text-sm mt-1">Gere campanhas na aba &quot;Criar Campanha&quot; para que apareçam aqui</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {campanhasList.map((c) => (
              <div
                key={c.fileName}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  c.error ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 bg-slate-800/50'
                } ${selectedIds.has(c.fileName) ? 'ring-1 ring-amber-500/50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.fileName)}
                  onChange={() => toggleSelecao(c.fileName)}
                  className="rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/50 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    @{c.botUsername} • {c.groupsCount} grupo(s)
                    {!c.hasBotToken && <span className="text-red-400 ml-1">• sem token</span>}
                    {c.error && <span className="text-red-400 ml-1">• {c.error}</span>}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 truncate max-w-[160px]" title={c.fileName}>
                  {c.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => handleExcluirUm(c.fileName)}
                  disabled={excluindo}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Excluir esta campanha"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {erro && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{erro}</div>}
        {sucesso && <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400">{sucesso}</div>}

        {blastsendLog.length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-950/80 p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              Log Blastsend
            </h4>
            <pre className="text-xs font-mono overflow-x-auto overflow-y-auto max-h-48 bg-slate-900 rounded p-3 border border-slate-800 space-y-0.5">
              {blastsendLog.map((e, i) => (
                <div
                  key={i}
                  className={
                    e.type === 'error' ? 'text-red-400' : e.type === 'success' ? 'text-emerald-400' : e.type === 'warn' ? 'text-yellow-400' : 'text-slate-400'
                  }
                >
                  {e.msg}
                </div>
              ))}
            </pre>
          </div>
        )}

        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleExcluirSelecionadas}
              disabled={excluindo}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              {excluindo ? 'Excluindo...' : `Excluir ${selectedIds.size} selecionada(s)`}
            </button>
          )}
          <button
            type="button"
            onClick={handleEnviar}
            disabled={processando || campanhasList.length === 0}
            className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="h-5 w-5" />
            {processando ? 'Enviando...' : `Enviar ${campanhasList.length} campanha(s) para Blastsend`}
          </button>
        </div>
      </div>
    </div>
  )
}

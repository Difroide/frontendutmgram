import React, { useState, useEffect } from 'react'
import { Download, Link2, X, Copy, Check, Send, Settings } from 'lucide-react'
import { CampaignCardsGrid } from './CampaignCardsGrid'
import { ExportOptionCard } from './ExportOptionCard'
import type { CampaignCardCategoria } from './CampaignCard'

export function ExportarDadosSection() {
  const [categorias, setCategorias] = useState<CampaignCardCategoria[]>([])
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(new Set())
  const [exportarGrupos, setExportarGrupos] = useState(false)
  const [exportarBots, setExportarBots] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [memberCount, setMemberCount] = useState('600')
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [enviandoBlastsend, setEnviandoBlastsend] = useState(false)
  const [blastsendLog, setBlastsendLog] = useState<Array<{ msg: string; type: string }>>([])

  // Painel Link Fornecedor (abre ao clicar no botão)
  const [painelFornecedorOpen, setPainelFornecedorOpen] = useState(false)
  const [copiadoFornecedor, setCopiadoFornecedor] = useState(false)

  const abrirConfigBlastsend = () => {
    window.dispatchEvent(new CustomEvent('settings-section-request', { detail: { section: 'blastsend' } }))
  }

  useEffect(() => {
    const load = async () => {
      try {
        if ((window as any).electron?.criador?.carregarCategorias) {
          const data = await (window as any).electron.criador.carregarCategorias()
          const sorted = (data || []).sort((a: CampaignCardCategoria, b: CampaignCardCategoria) => {
            if (a.rodando === b.rodando) return 0
            return a.rodando ? 1 : -1
          })
          setCategorias(sorted)
        }
      } catch (e) {
        console.error('Erro ao carregar categorias:', e)
      }
    }
    load()
  }, [])

  const toggleCategoria = (id: string) => {
    setCategoriasSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selecionarTodas = () => {
    if (categoriasSelecionadas.size === categorias.length) {
      setCategoriasSelecionadas(new Set())
    } else {
      setCategoriasSelecionadas(new Set(categorias.map((c) => c.id)))
    }
  }

  const podeExportar =
    categoriasSelecionadas.size > 0 && (exportarGrupos || exportarBots)

  const handleExportar = async () => {
    if (!podeExportar) return
    setErro(null)
    setSucesso(null)
    setExportando(true)
    try {
      const api = (window as any).electron?.criador?.exportarDadosCategorias
      if (!api) throw new Error('API de exportação não disponível')
      const result = await api({
        categoriaIds: Array.from(categoriasSelecionadas),
        exportarGrupos,
        exportarBots,
        exportarFornecedor: false,
        serviceId: '',
        memberCount: '600',
      })
      if (result.success) {
        const count = result.savedFiles?.length ?? 0
        setSucesso(count > 0 ? `${count} arquivo(s) exportado(s) com sucesso!` : 'Exportação concluída.')
      } else {
        setErro(result.error || 'Erro ao exportar')
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro inesperado ao exportar')
    } finally {
      setExportando(false)
    }
  }

  const handleCopiarFornecedor = async () => {
    if (!serviceId.trim()) {
      setErro('Preencha o ID do serviço')
      return
    }
    if (categoriasSelecionadas.size === 0) {
      setErro('Selecione pelo menos uma categoria')
      return
    }
    setErro(null)
    try {
      const api = (window as any).electron?.criador?.obterLinksFornecedorCategorias
      if (!api) throw new Error('API não disponível')
      const result = await api({
        categoriaIds: Array.from(categoriasSelecionadas),
        serviceId: serviceId.trim(),
        memberCount: memberCount.trim() || '600',
      })
      if (result.success && result.text) {
        await navigator.clipboard.writeText(result.text)
        setCopiadoFornecedor(true)
        setTimeout(() => setCopiadoFornecedor(false), 2500)
      } else {
        setErro(result.error || 'Nenhum link encontrado')
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao copiar')
    }
  }

  const handleEnviarBlastsend = async () => {
    if (categoriasSelecionadas.size === 0) {
      setErro('Selecione pelo menos uma categoria')
      return
    }
    setErro(null)
    setSucesso(null)
    setBlastsendLog([])
    setEnviandoBlastsend(true)
    try {
      const api = (window as any).electron?.blastsendApi?.enviarCategorias
      if (!api) {
        setErro('API Blastsend não disponível')
        setBlastsendLog([{ msg: 'API blastsendApi.enviarCategorias não encontrada no window.electron', type: 'error' }])
        return
      }
      const ids = Array.from(categoriasSelecionadas)
      setBlastsendLog([{ msg: `Chamando API com ${ids.length} categoria(s)...`, type: 'info' }])
      const result = await api({ categoriaIds: ids })
      if (result.log && Array.isArray(result.log)) {
        setBlastsendLog(result.log)
      }
      if (result.success) {
        const msg = `${result.botsImportados ?? 0} bot(s), ${result.gruposImportados ?? 0} grupo(s) e ${result.campanhasCriadas ?? 0} campanha(s) enviados!`
        setSucesso(msg)
      } else {
        const errMsg = result.error || 'Erro ao enviar'
        setErro(errMsg)
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Erro ao enviar para Blastsend'
      setErro(errMsg)
      setBlastsendLog((prev) => [...prev, { msg: `Exceção: ${errMsg}`, type: 'error' }])
    } finally {
      setEnviandoBlastsend(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Exportar + Copiar Links Fornecedor - NO TOPO */}
      <section>
        <h3 className="text-base font-semibold text-slate-100 mb-4">Criar Campanha / Exportar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExportOptionCard icon="txt" title="Grupos (TXT)" description="Lista de grupos das campanhas" selected={exportarGrupos} onClick={() => setExportarGrupos(!exportarGrupos)} />
          <ExportOptionCard icon="json" title="Bots (JSON)" description="Array de bots com token" selected={exportarBots} onClick={() => setExportarBots(!exportarBots)} />
          <button
            type="button"
            onClick={() => {
              if (categoriasSelecionadas.size === 0) {
                setErro('Selecione pelo menos uma categoria')
                return
              }
              setErro(null)
              setPainelFornecedorOpen(true)
            }}
            disabled={categoriasSelecionadas.size === 0}
            className="w-full p-4 rounded-xl border-2 border-dashed border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400/60 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80">
                <Link2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-cyan-400">Copiar Links Fornecedor</h4>
                <p className="text-xs text-slate-500 mt-0.5">ID | LINK | Membros</p>
              </div>
            </div>
          </button>
          <div className="w-full p-4 rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-400/60 text-left transition-all focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleEnviarBlastsend}
                disabled={enviandoBlastsend || categoriasSelecionadas.size === 0}
                className="flex items-start gap-3 text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 rounded-lg bg-slate-800/80 flex-shrink-0">
                  <Send className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-purple-400">{enviandoBlastsend ? 'Enviando...' : 'Enviar para Blastsend'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bots e grupos em massa via API • {categoriasSelecionadas.size === 0 ? 'Selecione categorias abaixo' : `${categoriasSelecionadas.size} selecionada(s)`}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={abrirConfigBlastsend}
                className="text-xs text-purple-400/80 hover:text-purple-300 flex items-center gap-1 self-start"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurar API
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportar}
          disabled={!podeExportar || exportando}
          className="w-full mt-4 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Download className="w-5 h-5" />
          {exportando ? 'Exportando...' : 'Exportar'}
        </button>
      </section>

      {/* Categorias - abaixo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">Categorias</h3>
          <button
            type="button"
            onClick={selecionarTodas}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {categoriasSelecionadas.size === categorias.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        </div>
        <CampaignCardsGrid
          categorias={categorias}
          selectedId={null}
          onSelect={() => {}}
          multiSelect
          selectedIds={categoriasSelecionadas}
          onToggle={toggleCategoria}
        />
      </section>

      {erro && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{erro}</div>}
      {sucesso && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400">{sucesso}</div>}

      {/* Log do Blastsend */}
      {blastsendLog.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-400" />
            Log Blastsend
          </h4>
          <pre className="text-xs font-mono overflow-x-auto overflow-y-auto max-h-64 bg-slate-950/80 rounded-lg p-3 border border-slate-800 space-y-0.5">
            {blastsendLog.map((e, i) => (
              <div
                key={i}
                className={
                  e.type === 'error'
                    ? 'text-red-400'
                    : e.type === 'success'
                      ? 'text-emerald-400'
                      : e.type === 'warn'
                        ? 'text-yellow-400'
                        : 'text-slate-400'
                }
              >
                {e.msg}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Painel Link Fornecedor (abre ao clicar no botão) */}
      {painelFornecedorOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setPainelFornecedorOpen(false)}
        >
          <div className="bg-[#161b22] rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-cyan-500" />
                <h2 className="text-lg font-semibold text-gray-100">Copiar Links Fornecedor</h2>
              </div>
              <button
                onClick={() => setPainelFornecedorOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Formato: ID_SERVICO | LINK | QUANTIDADE_MEMBROS</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">ID do serviço</label>
                <input
                  type="text"
                  placeholder="Ex: 2583"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 focus:outline-none focus:border-gray-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Membros padrão</label>
                <input
                  type="text"
                  placeholder="600"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 focus:outline-none focus:border-gray-700 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleCopiarFornecedor}
                disabled={!serviceId.trim()}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold"
              >
                {copiadoFornecedor ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copiar formatado
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">{categoriasSelecionadas.size} categoria(s) selecionada(s)</p>
          </div>
        </div>
      )}
    </div>
  )
}

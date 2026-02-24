import React, { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Link2, MessageSquare, Users, Upload, Shuffle, FileEdit, FolderOpen } from 'lucide-react'
import { GruposEditor } from './GruposEditor'

interface ButtonConfig { text: string; url: string }
interface MessageConfig { forwardLink: string; text: string; buttons: ButtonConfig[]; expanded: boolean }
type MessageMode = 'individual' | 'batch'

interface CampaignFormProps {
  campaignName: string
  setCampaignName: (v: string) => void
  botName: string
  setBotName: (v: string) => void
  botToken: string
  setBotToken: (v: string) => void
  groupsInput: string
  setGroupsInput: (v: string) => void
  messageMode: MessageMode
  setMessageMode: (v: MessageMode) => void
  messages: MessageConfig[]
  setMessages: (v: MessageConfig[] | ((p: MessageConfig[]) => MessageConfig[])) => void
  batchMessageLinks: string
  setBatchMessageLinks: (v: string) => void
  batchText: string
  setBatchText: (v: string) => void
  batchButtons: ButtonConfig[]
  setBatchButtons: (v: ButtonConfig[] | ((p: ButtonConfig[]) => ButtonConfig[])) => void
  importMessageLinks: (e: React.ChangeEvent<HTMLInputElement>) => void
  addMessage: () => void
  removeMessage: (i: number) => void
  updateMessage: (i: number, field: keyof MessageConfig, value: any) => void
  addButtonToMessage: (msgIdx: number) => void
  removeButtonFromMessage: (msgIdx: number, btnIdx: number) => void
  updateMessageButton: (msgIdx: number, btnIdx: number, field: 'text' | 'url', value: string) => void
  toggleMessage: (i: number) => void
  addBatchButton: () => void
  removeBatchButton: (i: number) => void
  updateBatchButton: (i: number, field: 'text' | 'url', value: string) => void
  shuffleIndividualMessages: () => void
  shuffleBatchLinks: () => void
  extractGroupLinks: () => string[]
  handleAbrirReformatarModal: () => void
  hasMessages: boolean
  onGenerate: () => void
  onSendToApi: () => void
  multiCampanha?: boolean
}

const inputClass = 'w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all'

interface GrupoBaseOption {
  sessionPath: string
  sessionName: string
  grupoNome: string
}

export function CampaignForm(props: CampaignFormProps) {
  const batchTextRef = useRef<HTMLTextAreaElement>(null)
  const [gruposBase, setGruposBase] = useState<GrupoBaseOption[]>([])
  const [grupoBaseSelecionado, setGrupoBaseSelecionado] = useState('')
  const [puxandoLinks, setPuxandoLinks] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const api = (window as any).electron?.contingencia?.listarSessoesComGrupoBase
        if (api) {
          const result = await api()
          if (result?.success && result?.sessoes?.length) {
            setGruposBase(result.sessoes.map((s: any) => ({
              sessionPath: s.sessionPath,
              sessionName: s.sessionName || (s.sessionPath ? String(s.sessionPath).split(/[/\\]/).pop()?.replace(/\.session$/, '') || '' : ''),
              grupoNome: s.grupoNome || 'Grupo Base',
            })))
          }
        }
      } catch (e) {
        console.error('Erro ao carregar grupos base:', e)
      }
    }
    load()
  }, [])

  const handlePuxarLinksGrupoBase = async () => {
    if (!grupoBaseSelecionado) {
      alert('Selecione um grupo base')
      return
    }
    setPuxandoLinks(true)
    try {
      const api = (window as any).electron?.contingencia?.obterLinksMensagens
      if (!api) throw new Error('API não disponível')
      const result = await api(grupoBaseSelecionado)
      if (!result.success || !result.links?.length) {
        alert(result.error || 'Nenhum link de mensagem cadastrado neste grupo base')
        return
      }
      const links = result.links.filter((l: string) => String(l).trim()).map((l: string) => l.trim())
      if (props.messageMode === 'batch') {
        const atuais = props.batchMessageLinks.trim() ? props.batchMessageLinks.trim().split('\n').filter(Boolean) : []
        const unicos = [...new Set([...atuais, ...links])]
        props.setBatchMessageLinks(unicos.join('\n'))
      } else {
        const novas = links.map((forwardLink: string) => ({
          forwardLink,
          text: '',
          buttons: [{ text: '', url: '' }],
          expanded: false,
        }))
        props.setMessages((prev) => [...prev, ...novas])
      }
      alert(`${links.length} link(s) adicionado(s) do grupo base!`)
    } catch (e: any) {
      alert(e?.message || 'Erro ao puxar links')
    } finally {
      setPuxandoLinks(false)
    }
  }

  const addHyperlinkToBatchText = () => {
    const ta = batchTextRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = props.batchText.substring(start, end)
    if (!sel) { alert('Selecione um texto primeiro!'); return }
    const url = prompt('Digite o link:', 'https://')
    if (!url) return
    const before = props.batchText.substring(0, start)
    const after = props.batchText.substring(end)
    props.setBatchText(`${before}[${sel}](${url})${after}`)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + sel.length + url.length + 4, start + sel.length + url.length + 4) }, 0)
  }

  const handleExportTxt = () => {
    if (!props.groupsInput.trim()) { alert('Não há grupos para exportar'); return }
    const blob = new Blob([props.groupsInput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grupos_${props.campaignName.replace(/[^a-zA-Z0-9]/g, '_') || 'campanha'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const multiCampanha = props.multiCampanha ?? false

  return (
    <div className="space-y-8">
      {!multiCampanha && (
        <section className="p-6 rounded-xl bg-slate-900/80 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <FileEdit className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-100">Informações Básicas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Nome da Campanha</label>
              <input type="text" placeholder="Ex: AMADORES (#2)" value={props.campaignName} onChange={(e) => props.setCampaignName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Nome do Bot</label>
              <input type="text" placeholder="Ex: AMADORES (#2) - reserva" value={props.botName} onChange={(e) => props.setBotName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Token do Bot</label>
              <input type="text" placeholder="Ex: 8302897383:AAHU_L2Cs..." value={props.botToken} onChange={(e) => props.setBotToken(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
          </div>
        </section>
      )}

      {!multiCampanha && (
        <section className="p-6 rounded-xl bg-slate-900/80 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-slate-100">Grupos da Campanha</h3>
          </div>
          <GruposEditor value={props.groupsInput} onChange={props.setGroupsInput} campaignName={props.campaignName} onExportTxt={handleExportTxt} onReformatarFornecedor={props.handleAbrirReformatarModal} />
        </section>
      )}

      {multiCampanha && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm">
          Modo multi campanha: preencha apenas os links das mensagens e botões. Nome, bot, token e grupos vêm de cada categoria.
        </div>
      )}

      <section className="p-6 rounded-xl bg-slate-900/80 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-slate-100">Modo de Mensagens</h3>
        </div>

        {/* Puxar links de um grupo base */}
        {gruposBase.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              Puxar links de um grupo base
            </h4>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Grupo base</label>
                <select
                  value={grupoBaseSelecionado}
                  onChange={(e) => setGrupoBaseSelecionado(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Selecione...</option>
                  {gruposBase.map((g) => (
                    <option key={g.sessionPath} value={g.sessionPath}>
                      {g.grupoNome} ({g.sessionName})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handlePuxarLinksGrupoBase}
                disabled={!grupoBaseSelecionado || puxandoLinks}
                className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2 transition-all"
              >
                {puxandoLinks ? 'Puxando...' : 'Puxar Links'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <button type="button" onClick={() => props.setMessageMode('individual')} className={`p-4 rounded-xl border-2 transition-all ${props.messageMode === 'individual' ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            <div className="font-semibold mb-1">Individual</div>
            <div className="text-sm opacity-80">Cada mensagem com legenda e botões únicos</div>
          </button>
          <button type="button" onClick={() => props.setMessageMode('batch')} className={`p-4 rounded-xl border-2 transition-all ${props.messageMode === 'batch' ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            <div className="font-semibold mb-1">Em Massa</div>
            <div className="text-sm opacity-80">Mesma legenda e botões para todas</div>
          </button>
        </div>

        {props.messageMode === 'individual' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-medium text-slate-300">Mensagens Individuais ({props.messages.length})</h4>
              <div className="flex gap-2">
                <input id="import-msg" type="file" accept=".json" onChange={props.importMessageLinks} className="hidden" />
                <label htmlFor="import-msg"><button type="button" className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-2 text-sm"> <Upload className="w-4 h-4" /> Importar Links</button></label>
                <button type="button" onClick={props.shuffleIndividualMessages} disabled={props.messages.length === 0} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-600 flex items-center gap-2 text-sm"> <Shuffle className="w-4 h-4" /> Embaralhar</button>
                <button type="button" onClick={props.addMessage} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 text-sm"> <Plus className="w-4 h-4" /> Adicionar</button>
              </div>
            </div>
            {props.messages.length === 0 ? (
              <div className="py-12 text-center text-slate-500 rounded-xl border-2 border-dashed border-slate-700"><MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" /><p className="text-sm">Nenhuma mensagem adicionada</p></div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {props.messages.map((msg, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                      <button type="button" onClick={() => props.toggleMessage(idx)} className="flex-1 flex items-center gap-2 text-slate-300 hover:text-slate-100 text-left">
                        {msg.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>Mensagem {idx + 1}</span>
                        {msg.forwardLink && <span className="text-xs text-slate-500 truncate max-w-[200px] ml-auto">{msg.forwardLink.split('/').slice(-2).join('/')}</span>}
                      </button>
                      <button type="button" onClick={() => props.removeMessage(idx)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {msg.expanded && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs text-slate-500 uppercase mb-2">Link da Mensagem</label>
                          <input type="text" placeholder="https://t.me/c/..." value={msg.forwardLink} onChange={(e) => props.updateMessage(idx, 'forwardLink', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 uppercase mb-2">Legenda</label>
                          <textarea placeholder="Legenda..." value={msg.text} onChange={(e) => props.updateMessage(idx, 'text', e.target.value)} className={`${inputClass} min-h-[80px]`} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 uppercase mb-2">Botões</label>
                          <div className="space-y-2">
                            {msg.buttons.map((btn, bi) => (
                              <div key={bi} className="flex gap-2">
                                <input type="text" placeholder="Texto" value={btn.text} onChange={(e) => props.updateMessageButton(idx, bi, 'text', e.target.value)} className={`${inputClass} flex-1`} />
                                <input type="text" placeholder="URL" value={btn.url} onChange={(e) => props.updateMessageButton(idx, bi, 'url', e.target.value)} className={`${inputClass} flex-1 font-mono`} />
                                {msg.buttons.length > 1 && <button type="button" onClick={() => props.removeButtonFromMessage(idx, bi)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                              </div>
                            ))}
                            <button type="button" onClick={() => props.addButtonToMessage(idx)} className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-slate-400 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Adicionar Botão</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-300">Configuração em Massa</h4>
              <div className="flex gap-2">
                <input id="import-batch" type="file" accept=".json" onChange={props.importMessageLinks} className="hidden" />
                <label htmlFor="import-batch"><button type="button" className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-2 text-sm"><Upload className="w-4 h-4" /> Importar</button></label>
                <button type="button" onClick={props.shuffleBatchLinks} disabled={!props.batchMessageLinks.trim()} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-600 flex items-center gap-2 text-sm"><Shuffle className="w-4 h-4" /> Embaralhar</button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2">Links (um por linha)</label>
              <textarea placeholder="https://t.me/c/..." value={props.batchMessageLinks} onChange={(e) => props.setBatchMessageLinks(e.target.value)} className={`${inputClass} min-h-[120px] font-mono`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-slate-500 uppercase">Legenda</label>
                <button type="button" onClick={addHyperlinkToBatchText} className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs flex items-center gap-1"><Link2 className="w-3 h-3" /> Adicionar Link</button>
              </div>
              <textarea ref={batchTextRef} placeholder="Legenda para todas..." value={props.batchText} onChange={(e) => props.setBatchText(e.target.value)} className={`${inputClass} min-h-[80px]`} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2">Botões</label>
              <div className="space-y-2">
                {props.batchButtons.map((btn, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" placeholder="Texto" value={btn.text} onChange={(e) => props.updateBatchButton(i, 'text', e.target.value)} className={`${inputClass} flex-1`} />
                    <input type="text" placeholder="URL" value={btn.url} onChange={(e) => props.updateBatchButton(i, 'url', e.target.value)} className={`${inputClass} flex-1 font-mono`} />
                    {props.batchButtons.length > 1 && <button type="button" onClick={() => props.removeBatchButton(i)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={props.addBatchButton} className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-slate-400 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Adicionar Botão</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={props.onGenerate} disabled={multiCampanha ? !props.hasMessages : (!props.campaignName || !props.botName || !props.botToken || !props.groupsInput || !props.hasMessages)} className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg hover:shadow-emerald-500/20">
          {multiCampanha ? 'Gerar Campanhas JSON' : 'Gerar Campanha JSON'}
        </button>

        <button type="button" onClick={props.onSendToApi} disabled={multiCampanha ? !props.hasMessages : (!props.campaignName || !props.botName || !props.botToken || !props.groupsInput || !props.hasMessages)} className="flex-1 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2">
          <Upload className="w-5 h-5" />
          Enviar para API
        </button>
      </div>
    </div>
  )
}

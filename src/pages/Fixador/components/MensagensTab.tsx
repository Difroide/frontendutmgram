import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, Image, X, Info, Bold, Italic, Underline, Strikethrough, Code, Eye, Quote, Send } from 'lucide-react'
import { fixadorService, type Mensagem, type VariavelTexto } from '../fixadorService'
import { MensagemPreview } from './MensagemPreview'
import { DispararModal } from './DispararModal'

function aplicarFormatacao(texto: string, start: number, end: number, tag: string, url?: string): string {
  if (!texto || start >= end) return texto
  const antes = texto.slice(0, start)
  const selecionado = texto.slice(start, end)
  const depois = texto.slice(end)
  if (tag === 'a' && url) return antes + `<a href="${url}">${selecionado}</a>` + depois
  return antes + `<${tag}>${selecionado}</${tag}>` + depois
}

export function MensagensTab() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [variaveis, setVariaveis] = useState<VariavelTexto[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Mensagem | null>(null)
  const [form, setForm] = useState({ titulo: '', texto: '', botaoTexto: '', botaoUrl: '', fotoPath: '' })
  const [dispararMensagem, setDispararMensagem] = useState<Mensagem | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const textoRef = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [data, vars] = await Promise.all([
        fixadorService.listarMensagens(),
        fixadorService.listarVariaveisTexto(),
      ])
      setMensagens(data || [])
      setVariaveis(vars || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFormatacaoClick = useCallback(
    (tag: string) => {
      const ta = textoRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      if (tag === 'a') {
        const url = prompt('URL do link:')
        if (url) setForm((f) => ({ ...f, texto: aplicarFormatacao(f.texto, start, end, tag, url) }))
      } else {
        setForm((f) => ({ ...f, texto: aplicarFormatacao(f.texto, start, end, tag) }))
      }
      setTimeout(() => ta.focus(), 0)
    },
    []
  )

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!form.texto.trim()) return
    try {
      await fixadorService.criarMensagem(form)
      setForm({ titulo: '', texto: '', botaoTexto: '', botaoUrl: '', fotoPath: '' })
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async () => {
    if (!editing || !form.texto.trim()) return
    try {
      await fixadorService.atualizarMensagem(editing.id, form)
      setEditing(null)
      setForm({ titulo: '', texto: '', botaoTexto: '', botaoUrl: '', fotoPath: '' })
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta mensagem?')) return
    try {
      await fixadorService.removerMensagem(id)
      if (editing?.id === id) setEditing(null)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const startEdit = (m: Mensagem) => {
    setEditing(m)
    setForm({ titulo: m.titulo || '', texto: m.texto || '', botaoTexto: m.botaoTexto || '', botaoUrl: m.botaoUrl || '', fotoPath: m.fotoPath || '' })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm({ titulo: '', texto: '', botaoTexto: '', botaoUrl: '', fotoPath: '' })
  }

  const handleSelecionarFoto = async () => {
    const path = await fixadorService.selecionarFoto()
    if (path) setForm((f) => ({ ...f, fotoPath: path }))
  }

  return (
    <div className="space-y-6">
      <DispararModal
        isOpen={!!dispararMensagem}
        onClose={() => setDispararMensagem(null)}
        mensagem={dispararMensagem}
      />

      <div ref={formRef} className="rounded-xl border border-gray-800 bg-[#131a24] p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-300">
          {editing ? `Editar mensagem "${editing.titulo || 'Sem título'}"` : 'Nova mensagem'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Título (opcional)"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          />
          <div>
            <div className="mb-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('b')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Negrito (Ctrl+B)"
              >
                <Bold className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('i')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Itálico (Ctrl+I)"
              >
                <Italic className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('u')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Sublinhado (Ctrl+U)"
              >
                <Underline className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('s')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Tachado (Ctrl+Shift+X)"
              >
                <Strikethrough className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('code')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Código (Ctrl+Shift+M)"
              >
                <Code className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('tg-spoiler')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Spoiler (Ctrl+Shift+P)"
              >
                <Eye className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('blockquote')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Citação (Ctrl+Shift+.)"
              >
                <Quote className="inline h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aplicarFormatacaoClick('a')}
                className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                title="Link (Ctrl+K)"
              >
                Link
              </button>
            </div>
            <textarea
              ref={textoRef}
              placeholder="Variáveis: [hoje] [HOJE] [tempo]. Formatação: **negrito** *itálico* __sublinhado__ etc."
              value={form.texto}
              onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
              onKeyDown={(e) => {
                const ta = textoRef.current
                if (!ta) return
                if (e.ctrlKey && e.key === 'b') {
                  e.preventDefault()
                  aplicarFormatacaoClick('b')
                } else if (e.ctrlKey && e.key === 'i') {
                  e.preventDefault()
                  aplicarFormatacaoClick('i')
                } else if (e.ctrlKey && e.key === 'u') {
                  e.preventDefault()
                  aplicarFormatacaoClick('u')
                } else if (e.ctrlKey && e.shiftKey && e.key === 'X') {
                  e.preventDefault()
                  aplicarFormatacaoClick('s')
                } else if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                  e.preventDefault()
                  aplicarFormatacaoClick('code')
                } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                  e.preventDefault()
                  aplicarFormatacaoClick('tg-spoiler')
                } else if (e.ctrlKey && e.shiftKey && e.key === '.') {
                  e.preventDefault()
                  aplicarFormatacaoClick('blockquote')
                } else if (e.ctrlKey && e.key === 'k') {
                  e.preventDefault()
                  aplicarFormatacaoClick('a')
                }
              }}
              rows={12}
              className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
            />
            {form.texto.trim() && (
              <details className="mt-2" open={false}>
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                  Preview (como ficará no Telegram)
                </summary>
                <div className="mt-1 max-h-32 overflow-y-auto">
                  <MensagemPreview texto={form.texto} />
                </div>
              </details>
            )}
            {variaveis.length > 0 && (
              <details className="mt-1.5">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400">
                  <Info className="h-3.5 w-3.5" />
                  Variáveis (substituídas no envio)
                </summary>
                <div className="mt-1.5 rounded-lg border border-gray-800 bg-[#0d1117] px-3 py-2 text-xs">
                  {variaveis.map((v) => (
                    <div key={v.nome} className="flex gap-2 py-0.5">
                      <code className="shrink-0 text-cyan-400">{v.nome}</code>
                      <span className="text-gray-500">{v.descricao}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Texto do botão (opcional)"
              value={form.botaoTexto}
              onChange={(e) => setForm((f) => ({ ...f, botaoTexto: e.target.value }))}
              className="rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
            />
            <input
              type="url"
              placeholder="URL do botão (opcional)"
              value={form.botaoUrl}
              onChange={(e) => setForm((f) => ({ ...f, botaoUrl: e.target.value }))}
              className="rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Imagem (opcional)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelecionarFoto}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <Image className="h-4 w-4" />
                {form.fotoPath ? 'Trocar imagem' : 'Selecionar imagem'}
              </button>
              {form.fotoPath && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2">
                  <span className="max-w-[220px] truncate text-sm text-gray-300">{form.fotoPath.split(/[/\\]/).pop()}</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, fotoPath: '' }))} className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400" title="Remover imagem">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Pasta padrão: C:\Operação\FOTOS\FOTO DE GRUPO</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleUpdate}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
                >
                  Salvar
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!form.texto.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-300">Mensagens cadastradas ({mensagens.length})</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : mensagens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 py-8 text-center text-sm text-gray-500">
            Nenhuma mensagem. Adicione acima.
          </p>
        ) : (
          <div className="space-y-2">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                  editing?.id === m.id
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-gray-800 bg-[#131a24]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-200">{m.titulo || 'Sem título'}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{m.texto.replace(/<[^>]+>/g, '')}</p>
                  {(m.botaoTexto || m.botaoUrl) && (
                    <p className="mt-1 text-xs text-cyan-400">
                      Botão: {m.botaoTexto || 'Link'} {m.botaoUrl && `→ ${m.botaoUrl}`}
                    </p>
                  )}
                  {m.fotoPath && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-purple-400">
                      <Image className="h-3 w-3" />
                      Com imagem
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setDispararMensagem(m)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-cyan-900/30 hover:text-cyan-400"
                    title="Disparar esta mensagem"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(m)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

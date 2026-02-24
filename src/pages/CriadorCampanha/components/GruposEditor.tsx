import React, { useState, useMemo } from 'react'
import { Plus, Trash2, FileText, Link2, ClipboardPaste } from 'lucide-react'

export interface GrupoLinha {
  name: string
  id: string
  link: string
}

function parseGroupsInput(text: string): GrupoLinha[] {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  const linkRegex = /https?:\/\/t\.me\/\+?[a-zA-Z0-9_-]+/
  const idRegex = /(-?\d{10,})/
  const result: GrupoLinha[] = []

  lines.forEach((line, index) => {
    const cleanLine = line.replace(/\|/g, ';').replace(/^\.*|\.*$/g, '').trim()
    let name = ''
    let id = ''
    let link = ''

    if (cleanLine.includes(';')) {
      const parts = cleanLine.split(';').map((p) => p.trim())
      if (parts.length >= 3) {
        name = parts[0]
        id = parts[1]
        link = parts[2]
        if (!link.startsWith('http') && link) link = 'https://' + link
      } else if (parts.length === 2) {
        const p1Link = parts[0].match(linkRegex)
        const p2Link = parts[1].match(linkRegex)
        if (p1Link) {
          link = parts[0].startsWith('http') ? parts[0] : 'https://' + parts[0]
          id = parts[1]
        } else if (p2Link) {
          link = parts[1].startsWith('http') ? parts[1] : 'https://' + parts[1]
          id = parts[0]
        }
        name = `Grupo ${index + 1}`
      }
    } else {
      const linkMatch = cleanLine.match(linkRegex)
      const idMatch = cleanLine.match(/ID:\s*(-?\d+)/) || cleanLine.match(idRegex)
      if (linkMatch && idMatch) {
        link = linkMatch[0]
        id = idMatch[1]
        name = `Grupo ${index + 1}`
      }
    }

    if (id) {
      const normalized = id.replace(/^-/, '')
      id = normalized.startsWith('100') ? '-' + normalized : '-100' + normalized
    }

    if (id && link) {
      if (!name) name = `Grupo ${index + 1}`
      result.push({ name, id, link })
    }
  })

  return result
}

function formatGruposToInput(grupos: GrupoLinha[]): string {
  return grupos
    .map((g) => `${g.name};${g.id};${g.link}`)
    .join('\n')
}

interface GruposEditorProps {
  value: string
  onChange: (value: string) => void
  campaignName: string
  onExportTxt: () => void
  onReformatarFornecedor: () => void
}

export function GruposEditor({
  value,
  onChange,
  campaignName,
  onExportTxt,
  onReformatarFornecedor,
}: GruposEditorProps) {
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const grupos = useMemo(() => parseGroupsInput(value), [value])

  const updateGrupos = (newGrupos: GrupoLinha[]) => {
    onChange(formatGruposToInput(newGrupos))
  }

  const updateGrupo = (index: number, field: keyof GrupoLinha, val: string) => {
    const next = [...grupos]
    next[index] = { ...next[index], [field]: val }
    updateGrupos(next)
  }

  const removeGrupo = (index: number) => {
    const next = grupos.filter((_, i) => i !== index)
    updateGrupos(next)
  }

  const addGrupo = () => {
    updateGrupos([...grupos, { name: '', id: '', link: '' }])
  }

  const handlePaste = () => {
    if (pasteText.trim()) {
      const parsed = parseGroupsInput(pasteText)
      if (parsed.length > 0) {
        updateGrupos([...grupos, ...parsed])
        setPasteText('')
        setShowPaste(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Botões de exportação no topo */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onExportTxt}
            disabled={grupos.length === 0}
            className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Exportar TXT
          </button>
          <button
            type="button"
            onClick={onReformatarFornecedor}
            disabled={grupos.length === 0}
            className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link2 className="w-4 h-4" />
            Reformatar Fornecedor
          </button>
          <button
            type="button"
            onClick={() => setShowPaste(!showPaste)}
            className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-sm flex items-center gap-2 transition-all"
          >
            <ClipboardPaste className="w-4 h-4" />
            Colar em massa
          </button>
          <button
            type="button"
            onClick={addGrupo}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Formato: NOME;ID;LINK ou https://t.me/XXXXX - ID: -100XXXXXXX
        </p>
      </div>

      {showPaste && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2">
          <label className="block text-xs text-slate-500 uppercase tracking-wide">Colar grupos (um por linha)</label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="NOME;ID;LINK&#10;ou https://t.me/xxx - ID: -100xxx"
            className="w-full min-h-[100px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-all"
            >
              Inserir
            </button>
            <button
              type="button"
              onClick={() => { setShowPaste(false); setPasteText('') }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="max-h-[280px] overflow-y-auto">
          {grupos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <p>Nenhum grupo adicionado</p>
              <p className="text-slate-600 mt-1">Clique em &quot;Adicionar&quot; ou &quot;Colar em massa&quot;</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {grupos.map((g, i) => (
                <div
                  key={i}
                  className="flex flex-wrap gap-2 items-center p-3 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                >
                  <input
                    type="text"
                    value={g.name}
                    onChange={(e) => updateGrupo(i, 'name', e.target.value)}
                    placeholder="Nome"
                    className="flex-1 min-w-[120px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <input
                    type="text"
                    value={g.id}
                    onChange={(e) => updateGrupo(i, 'id', e.target.value)}
                    placeholder="ID"
                    className="flex-1 min-w-[100px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <input
                    type="text"
                    value={g.link}
                    onChange={(e) => updateGrupo(i, 'link', e.target.value)}
                    placeholder="https://t.me/..."
                    className="flex-[2] min-w-[180px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeGrupo(i)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

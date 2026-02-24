import React from 'react'
import { FileText, FileJson, Link2 } from 'lucide-react'

interface ExportOptionCardProps {
  icon: 'txt' | 'json' | 'link'
  title: string
  description?: string
  selected: boolean
  onClick: () => void
}

const icons = { txt: FileText, json: FileJson, link: Link2 }
const colors = {
  txt: 'text-sky-400',
  json: 'text-amber-400',
  link: 'text-cyan-400',
}

export function ExportOptionCard({ icon, title, description, selected, onClick }: ExportOptionCardProps) {
  const Icon = icons[icon]
  const colorClass = colors[icon]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-950
        ${selected
          ? 'bg-emerald-500/10 border-emerald-500/60'
          : 'bg-slate-900/80 border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-slate-800/80 ${selected ? 'bg-emerald-500/20' : ''}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100">{title}</h4>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </button>
  )
}

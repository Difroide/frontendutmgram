import React from 'react'
import { Bot, Users, Check } from 'lucide-react'

export interface CampaignCardCategoria {
  id: string
  nome: string
  descricao?: string
  rodando?: boolean
  quantidadeBots?: number
  quantidadeGrupos?: number
}

interface CampaignCardProps {
  categoria: CampaignCardCategoria
  selected: boolean
  multiSelect?: boolean
  loading?: boolean
  onClick: () => void
}

export function CampaignCard({ categoria, selected, multiSelect, loading, onClick }: CampaignCardProps) {
  const bots = categoria.quantidadeBots ?? 0
  const grupos = categoria.quantidadeGrupos ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-950
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
        min-h-[96px]
        ${selected
          ? 'bg-emerald-500/10 border-emerald-500/60 shadow-emerald-500/5'
          : 'bg-slate-900/80 border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      {multiSelect && selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      <div className="pr-8">
        <h3 className="text-base font-semibold text-slate-100 truncate">
          {categoria.nome}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            {bots} bot{bots !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {grupos} grupo{grupos !== 1 ? 's' : ''}
          </span>
        </div>
        {categoria.rodando && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Rodando
          </span>
        )}
      </div>
      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
    </button>
  )
}

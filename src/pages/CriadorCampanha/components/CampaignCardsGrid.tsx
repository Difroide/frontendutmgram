import React from 'react'
import { CampaignCard, type CampaignCardCategoria } from './CampaignCard'

interface CampaignCardsGridProps {
  categorias: CampaignCardCategoria[]
  selectedId: string | null
  onSelect?: (id: string) => void
  loadingId?: string | null
  loadingIds?: Set<string>
  multiSelect?: boolean
  selectedIds?: Set<string>
  onToggle?: (id: string) => void
}

export function CampaignCardsGrid({
  categorias,
  selectedId,
  onSelect = () => { },
  loadingId = null,
  loadingIds,
  multiSelect = false,
  selectedIds,
  onToggle,
}: CampaignCardsGridProps) {
  if (categorias.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">Nenhuma campanha disponível</p>
        <p className="text-slate-600 text-sm mt-1">Crie categorias no Criador para começar</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categorias.map((cat) => {
        const isSelected = multiSelect
          ? (selectedIds?.has(cat.id) ?? false)
          : selectedId === cat.id
        const handleClick = multiSelect && onToggle
          ? () => onToggle(cat.id)
          : () => onSelect(cat.id)

        return (
          <CampaignCard
            key={cat.id}
            categoria={cat}
            selected={isSelected}
            multiSelect={multiSelect}
            loading={loadingIds?.has(cat.id) ?? loadingId === cat.id}
            onClick={handleClick}
          />
        )
      })}
    </div>
  )
}

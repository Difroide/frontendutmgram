/**
 * Card de uma mensagem do fluxo - Estilo Minimalista
 */

import {
  Clock,
  ShoppingCart,
  Video,
  Copy,
} from 'lucide-react'
import { Mensagem, formatDelay, formatCurrency } from '../types/Fluxo'
import { gerarPreviewMensagem } from '../utils/fluxoParser'

interface MensagemCardProps {
  mensagem: Mensagem
  isSelected: boolean
  hasSelections: boolean
  onClick: () => void
  onToggleSelect: () => void
  onDuplicate: () => void
}

export function MensagemCard({
  mensagem,
  isSelected,
  hasSelections,
  onClick,
  onToggleSelect,
  onDuplicate,
}: MensagemCardProps) {
  const preview = gerarPreviewMensagem(mensagem.description, 120)
  const hasVideo = !!mensagem.video
  const hasOrderBump = mensagem.orderBumpGlobal?.enabled || mensagem.planos.some(p => p.orderBump?.enabled)
  
  // Formatar horário de disparo
  const formatarHorario = () => {
    if (mensagem.delayType === 'absolute' && mensagem.scheduleTime) {
      const dias = mensagem.scheduleDays > 0 ? `+${mensagem.scheduleDays}d ` : ''
      return `${dias}${mensagem.scheduleTime}`
    }
    return formatDelay(mensagem.delay)
  }
  
  // Handler de clique: se há seleções, alterna seleção; senão, abre editor
  const handleCardClick = () => {
    if (hasSelections) {
      onToggleSelect()
    } else {
      onClick()
    }
  }
  
  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-[#161b22] border rounded-lg transition-all cursor-pointer
        ${isSelected 
          ? 'border-emerald-500/50 bg-emerald-500/5' 
          : 'border-gray-800 hover:border-gray-700 hover:bg-[#1c2128]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
        {/* Checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className={`
            w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer
            ${isSelected 
              ? 'bg-emerald-600 border-emerald-600' 
              : 'border-gray-600 hover:border-gray-500 bg-transparent'
            }
          `}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        {/* ID Badge */}
        <span className="text-xs font-medium text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
          #{mensagem.posicao + 1}
        </span>
        
        {/* Horário Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0d1117] border border-gray-700 rounded text-xs text-gray-300">
          <Clock className="w-3 h-3 text-gray-500" />
          <span>{formatarHorario()}</span>
        </div>
        
        {/* Badges de features */}
        {hasVideo && (
          <div 
            className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center" 
            title="Vídeo"
          >
            <Video className="w-3 h-3 text-purple-400" />
          </div>
        )}
        {hasOrderBump && (
          <div 
            className="w-5 h-5 rounded bg-pink-500/20 flex items-center justify-center" 
            title="Order Bump"
          >
            <ShoppingCart className="w-3 h-3 text-pink-400" />
          </div>
        )}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Botão Duplicar */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
          className="w-6 h-6 rounded bg-[#0d1117] border border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
          title="Duplicar mensagem"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
      
      {/* Body - Preview da Copy */}
      <div className="px-3 py-3">
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
          {preview || <em className="text-gray-600">Sem descrição</em>}
        </p>
      </div>
      
      {/* Footer - Planos */}
      <div className="px-3 pb-3">
        {mensagem.planos.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <span className="font-medium">{mensagem.planos.length} Planos</span>
            </div>
            <div className="space-y-1">
              {mensagem.planos.slice(0, 3).map((plano, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-2 py-1.5 bg-[#0d1117] border border-gray-800 rounded text-xs"
                >
                  <span className="text-gray-400 truncate mr-2 flex-1" title={plano.name}>
                    {plano.name}
                  </span>
                  <span className="font-medium text-emerald-500 whitespace-nowrap">
                    {formatCurrency(plano.value)}
                  </span>
                </div>
              ))}
              {mensagem.planos.length > 3 && (
                <div className="text-xs text-gray-600 text-center py-1">
                  +{mensagem.planos.length - 3} mais
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600 text-center py-2 bg-[#0d1117] rounded border border-dashed border-gray-800">
            Nenhum plano configurado
          </div>
        )}
      </div>
    </div>
  )
}

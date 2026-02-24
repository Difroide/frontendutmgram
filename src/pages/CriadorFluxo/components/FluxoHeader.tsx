/**
 * Header do Criador de Fluxo - Estilo Minimalista
 */

import {
  Upload,
  Download,
  Percent,
  Type,
  ShoppingCart,
  TrendingUp,
  Bot,
  Trash2,
  Plus,
  MousePointer,
} from 'lucide-react'
import { useRef } from 'react'
import { Fluxo } from '../types/Fluxo'

interface FluxoHeaderProps {
  fluxo: Fluxo | null
  onImport: (jsonString: string) => void
  onExport: () => void
  onClear: () => void
  onUpdateName: (name: string) => void
  onOpenDescontoTexto: () => void
  onOpenOrderBump: () => void
  onOpenUpsell: () => void
  onOpenBotoes: () => void
  onOpenBulkCopy: () => void
  onAddMensagem: () => void
  onOpenBots: () => void
}

export function FluxoHeader({
  fluxo,
  onImport,
  onExport,
  onClear,
  onUpdateName,
  onOpenDescontoTexto,
  onOpenOrderBump,
  onOpenUpsell,
  onOpenBotoes,
  onOpenBulkCopy,
  onAddMensagem,
  onOpenBots,
}: FluxoHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      onImport(text)
    } catch (error) {
      console.error('Erro ao ler arquivo:', error)
      alert('Erro ao ler arquivo JSON')
    }
    
    // Limpar input para permitir reimportar o mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Linha 1: Nome do Fluxo e Info */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Nome do Fluxo */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
              Nome do Fluxo
            </label>
            <input
              type="text"
              value={fluxo?.name || ''}
              onChange={(e) => onUpdateName(e.target.value)}
              disabled={!fluxo}
              placeholder="Importe um fluxo para começar"
              className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-gray-700/50 rounded-lg text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
          
          {/* Bots Badge - Clicável para gerenciar; tooltip com nomes dos bots */}
          {fluxo && (() => {
            const bots = fluxo.bots?.length ? fluxo.bots : [{ nome: 'Bot Principal', isPrincipal: true }]
            const principal = bots.find(b => b.isPrincipal) || bots[0]
            const tooltipNomes = bots.map(b => b.nome || 'Sem nome').join(', ')
            return (
              <button
                onClick={onOpenBots}
                className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-gray-700/50 rounded-lg hover:bg-[#21262d] hover:border-gray-600 transition-colors"
                title={tooltipNomes ? `Bots: ${tooltipNomes}` : 'Gerenciar Bots de Vendas'}
              >
                <Bot className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">{bots.length}</span>
                <span className="text-xs text-gray-500">bot{bots.length > 1 ? 's' : ''}</span>
                {principal?.nome && (
                  <span className="text-xs text-gray-500 truncate max-w-[100px]" title={principal.nome}>
                    · {principal.nome}
                  </span>
                )}
              </button>
            )
          })()}
          
          {/* Stats Badge */}
          {fluxo && (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#0d1117] border border-gray-700/50 rounded-lg">
              <span className="text-xs text-gray-500">Mensagens:</span>
              <span className="text-sm font-medium text-gray-200">{fluxo.mensagens.length}</span>
              <div className="w-px h-4 bg-gray-700" />
              <span className="text-xs text-gray-400">{fluxo.paymentMethod}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Linha 2: Ações Rápidas em Grid */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {/* Importar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <Upload className="w-5 h-5 text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Importar</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Exportar */}
          <button
            onClick={onExport}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Download className="w-5 h-5 text-blue-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Exportar</span>
          </button>
          
          {/* Nova Mensagem */}
          <button
            onClick={onAddMensagem}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Plus className="w-5 h-5 text-green-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Nova Msg</span>
          </button>
          
          {/* Bulk Copy */}
          <button
            onClick={onOpenBulkCopy}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Type className="w-5 h-5 text-purple-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Bulk</span>
          </button>
          
          {/* Desconto & Texto */}
          <button
            onClick={onOpenDescontoTexto}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Percent className="w-5 h-5 text-amber-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Desconto</span>
          </button>
          
          {/* Order Bump */}
          <button
            onClick={onOpenOrderBump}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <ShoppingCart className="w-5 h-5 text-pink-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Order Bump</span>
          </button>
          
          {/* Upsell */}
          <button
            onClick={onOpenUpsell}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <TrendingUp className="w-5 h-5 text-cyan-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Upsell</span>
          </button>
          
          {/* Botões */}
          <button
            onClick={onOpenBotoes}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <MousePointer className="w-5 h-5 text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Botões</span>
          </button>
          
          {/* Bots */}
          <button
            onClick={onOpenBots}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Bot className="w-5 h-5 text-violet-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Bots</span>
          </button>
          
          {/* Limpar */}
          <button
            onClick={onClear}
            disabled={!fluxo}
            className="group flex flex-col items-center justify-center h-20 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0d1117] disabled:hover:border-gray-800"
          >
            <Trash2 className="w-5 h-5 text-red-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">Limpar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal de Biblioteca de Botões/Planos - Estilo Minimalista
 */

import { useEffect, useState } from 'react'
import {
  X,
  Plus,
  Edit,
  Copy,
  Trash2,
  Check,
  Link,
  MousePointer,
} from 'lucide-react'
import { BotaoReconhecido, BotaoSalvo, Plano, VipGroup, formatCurrency } from '../types/Fluxo'
import { formatarValorComMoeda } from '../utils/formatadorPlanos'

interface BotoesLibraryProps {
  isOpen: boolean
  botoes: BotaoSalvo[]
  botoesReconhecidos: BotaoReconhecido[]
  selectedMensagensCount: number
  onClose: () => void
  onCreate: () => void
  onEdit: (botao: BotaoSalvo) => void
  onDuplicate: (botao: BotaoSalvo) => void
  onDelete: (id: string) => void
  onApplyToSelected: (planos: Plano[]) => void
  onUpdateReconhecido: (botao: BotaoReconhecido) => void
}

export function BotoesLibrary({
  isOpen,
  botoes,
  botoesReconhecidos,
  selectedMensagensCount,
  onClose,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onApplyToSelected,
  onUpdateReconhecido,
}: BotoesLibraryProps) {
  const [selectedBotoes, setSelectedBotoes] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'biblioteca' | 'reconhecidos'>('biblioteca')
  const [reconhecidosEditados, setReconhecidosEditados] = useState<Record<string, BotaoReconhecido>>({})
  
  useEffect(() => {
    if (!isOpen) return
    const initial: Record<string, BotaoReconhecido> = {}
    botoesReconhecidos.forEach(botao => {
      initial[botao.id] = {
        ...botao,
        vipGroups: (botao.vipGroups || []).map(v => ({ ...v })),
      }
    })
    setReconhecidosEditados(initial)
    setSelectedBotoes(new Set())
  }, [isOpen, botoesReconhecidos])

  if (!isOpen) return null
  
  const toggleSelectBotao = (id: string) => {
    setSelectedBotoes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const obterReconhecido = (id: string) => {
    return reconhecidosEditados[id] || botoesReconhecidos.find(b => b.id === id)
  }

  const atualizarReconhecido = (id: string, updates: Partial<BotaoReconhecido>) => {
    setReconhecidosEditados(prev => {
      const atual = prev[id] || botoesReconhecidos.find(b => b.id === id)
      if (!atual) return prev
      return {
        ...prev,
        [id]: {
          ...atual,
          ...updates,
        }
      }
    })
  }
  
  const handleApply = () => {
    const botoesParaAplicar = botoes.filter(b => selectedBotoes.has(`lib:${b.id}`))
    const reconhecidosParaAplicar = botoesReconhecidos.filter(b => selectedBotoes.has(`rec:${b.id}`))
    const planosReconhecidos: Plano[] = reconhecidosParaAplicar.map(rec => {
      const valorFinal = rec.desconto
        ? Math.round(rec.valorBase * (1 - rec.desconto / 100) * 100) / 100
        : rec.valorBase
      const porFinal = rec.porTexto.trim() || 'por'
      const nome = `${rec.nomeBase} ${porFinal} ${formatarValorComMoeda(valorFinal, rec.moeda)}${rec.sufixo}`
      const vipGroups = (rec.vipGroups || []).map(v => ({ ...v, name: nome }))
      return {
        name: nome,
        value: valorFinal,
        vipGroups,
        descontoPercentual: rec.desconto,
      }
    })
    const planosBiblioteca = botoesParaAplicar.map(b => ({ ...b.plano }))
    const planosParaAplicar = [...planosBiblioteca, ...planosReconhecidos]
    if (planosParaAplicar.length === 0) {
      alert('Selecione pelo menos um botão para aplicar')
      return
    }
    if (selectedMensagensCount === 0) {
      alert('Selecione pelo menos uma mensagem no grid antes de aplicar')
      return
    }
    onApplyToSelected(planosParaAplicar)
    setSelectedBotoes(new Set())
    onClose()
  }
  
  const handleSelectAll = () => {
    const totalItens = botoes.length + botoesReconhecidos.length
    if (selectedBotoes.size === totalItens) {
      setSelectedBotoes(new Set())
    } else {
      const ids = [
        ...botoes.map(b => `lib:${b.id}`),
        ...botoesReconhecidos.map(b => `rec:${b.id}`),
      ]
      setSelectedBotoes(new Set(ids))
    }
  }

  const totalItens = botoes.length + botoesReconhecidos.length
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <MousePointer className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Biblioteca de Botões</h2>
              <p className="text-xs text-gray-500">
                {totalItens} itens - {selectedBotoes.size} selecionados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('biblioteca')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'biblioteca'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-[#21262d] border border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Biblioteca ({botoes.length})
            </button>
            <button
              onClick={() => setActiveTab('reconhecidos')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'reconhecidos'
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  : 'bg-[#21262d] border border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Reconhecidos ({botoesReconhecidos.length})
            </button>
          </div>

          <div className="flex-1" />

          {activeTab === 'biblioteca' && (
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Botão
            </button>
          )}

          {totalItens > 0 && (
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg transition-colors text-xs"
            >
              {selectedBotoes.size === totalItens ? 'Desmarcar' : 'Selecionar Todos'}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'biblioteca' ? (
            botoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-[#0d1117] border border-gray-800 rounded-lg">
                <MousePointer className="w-10 h-10 text-gray-600 mb-3" />
                <h3 className="text-sm font-medium text-gray-400 mb-1">Nenhum Botão Cadastrado</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Crie botões com planos para reutilizar em várias mensagens
                </p>
                <button
                  onClick={onCreate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Botão
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {botoes.map(botao => (
                  <div
                    key={botao.id}
                    className={`
                      relative p-4 bg-[#0d1117] border rounded-lg transition-colors cursor-pointer
                      ${selectedBotoes.has(`lib:${botao.id}`)
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-gray-800 hover:border-gray-700'
                      }
                    `}
                    onClick={() => toggleSelectBotao(`lib:${botao.id}`)}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-3 left-3">
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors
                        ${selectedBotoes.has(`lib:${botao.id}`)
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-gray-600 bg-transparent'
                        }
                      `}>
                        {selectedBotoes.has(`lib:${botao.id}`) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="ml-8">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-medium text-gray-200">{botao.nome}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{botao.plano.name}</p>
                        </div>
                        <span className="text-sm font-medium text-emerald-500">
                          {formatCurrency(botao.plano.value)}
                        </span>
                      </div>
                      
                      {/* VIP Groups */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <Link className="w-3 h-3 text-gray-600" />
                        {botao.plano.vipGroups.length > 0 ? (
                          botao.plano.vipGroups.slice(0, 3).map((vip, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-blue-500/10 rounded text-[10px] text-blue-400"
                            >
                              {vip.durationDays}d
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-600">Sem grupos</span>
                        )}
                        {botao.plano.vipGroups.length > 3 && (
                          <span className="text-[10px] text-gray-500">
                            +{botao.plano.vipGroups.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="absolute top-3 right-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEdit(botao)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicate(botao)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${botao.nome}"?`)) {
                            onDelete(botao.id)
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            botoesReconhecidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-[#0d1117] border border-gray-800 rounded-lg">
                <MousePointer className="w-10 h-10 text-gray-600 mb-3" />
                <h3 className="text-sm font-medium text-gray-400 mb-1">Nenhum Botão Reconhecido</h3>
                <p className="text-xs text-gray-600">
                  Nenhuma mensagem possui botões configurados
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {botoesReconhecidos.map(botao => {
                  const editado = obterReconhecido(botao.id) || botao
                  const vip = editado.vipGroups?.[0]
                  const chatId = vip?.chatId || ''
                  const duracao = vip?.durationDays || 30
                  return (
                    <div
                      key={botao.id}
                      className="p-3 bg-[#0d1117] border border-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelectBotao(`rec:${botao.id}`)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            selectedBotoes.has(`rec:${botao.id}`)
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-600 bg-transparent'
                          }`}
                          title="Selecionar"
                        >
                          {selectedBotoes.has(`rec:${botao.id}`) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>

                        <div className="flex-1 grid grid-cols-[1fr_100px_1fr_60px_80px] gap-2">
                          <input
                            type="text"
                            value={editado.nomeBase}
                            onChange={(e) => atualizarReconhecido(botao.id, { nomeBase: e.target.value })}
                            placeholder="Nome do plano"
                            className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editado.valorBase}
                            onChange={(e) => atualizarReconhecido(botao.id, { valorBase: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                          />
                          <input
                            type="text"
                            value={chatId}
                            onChange={(e) => {
                              const novoChat = e.target.value
                              const vipGroups: VipGroup[] = novoChat.trim()
                                ? [{
                                    chatId: novoChat.trim(),
                                    durationDays: duracao,
                                    name: editado.nomeBase,
                                  }]
                                : []
                              atualizarReconhecido(botao.id, { vipGroups })
                            }}
                            placeholder="Chat ID"
                            className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 font-mono text-xs focus:outline-none focus:border-gray-600"
                          />
                          <input
                            type="number"
                            min="1"
                            value={duracao}
                            onChange={(e) => {
                              const novoDuracao = parseInt(e.target.value) || 30
                              const vipGroups: VipGroup[] = chatId.trim()
                                ? [{
                                    chatId: chatId.trim(),
                                    durationDays: novoDuracao,
                                    name: editado.nomeBase,
                                  }]
                                : []
                              atualizarReconhecido(botao.id, { vipGroups })
                            }}
                            className="px-2 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                          />
                          <button
                            onClick={() => {
                              const atualizado = obterReconhecido(botao.id)
                              if (atualizado) {
                                onUpdateReconhecido(atualizado)
                              }
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded text-xs font-medium hover:bg-purple-500/30 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Aplicar
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 bg-gray-800 rounded">
                          {botao.count}x em mensagens
                        </span>
                        <span>
                          Valor final: {formatarValorComMoeda(
                            editado.desconto
                              ? Math.round(editado.valorBase * (1 - editado.desconto / 100) * 100) / 100
                              : editado.valorBase,
                            editado.moeda
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            {selectedMensagensCount > 0 ? (
              <>
                <span className="text-emerald-400 font-medium">{selectedMensagensCount}</span> mensagens selecionadas
              </>
            ) : (
              <span>Selecione mensagens no grid para aplicar</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleApply}
              disabled={selectedBotoes.size === 0 || selectedMensagensCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Aplicar às Mensagens
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

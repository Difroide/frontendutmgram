/**
 * Modal integrado para aplicar Desconto e Texto Extra - Estilo Minimalista
 */

import { useMemo, useState } from 'react'
import { X, Percent, Type, Zap } from 'lucide-react'
import { Mensagem } from '../types/Fluxo'
import { extrairNomeBase, formatarNomePlano, formatarValorComMoeda, MoedaPlano } from '../utils/formatadorPlanos'

interface DescontoTextoModalProps {
  isOpen: boolean
  mensagens: Mensagem[]
  selectedIds: Set<number>
  onClose: () => void
  onApply: (mensagemIds: number[], descontoPorcentagem: number, textoExtra: string, porTexto: string, moeda: MoedaPlano) => void
}

export function DescontoTextoModal({
  isOpen,
  mensagens,
  selectedIds,
  onClose,
  onApply,
}: DescontoTextoModalProps) {
  const [descontoPorcentagem, setDescontoPorcentagem] = useState(0)
  const [textoExtra, setTextoExtra] = useState('')
  const [porTexto, setPorTexto] = useState('por')
  const [moeda, setMoeda] = useState<MoedaPlano>('R$')
  const porTextoFinal = useMemo(() => porTexto.trim() || 'por', [porTexto])

  const calcularValorComDesconto = (valor: number) => {
    if (descontoPorcentagem === 0) return valor
    return valor * (1 - descontoPorcentagem / 100)
  }

  const aplicarTextoExtra = (nome: string) => {
    if (!textoExtra.trim()) return nome
    return `${nome} ${textoExtra}`.trim()
  }

  const mensagensSelecionadas = useMemo(
    () => mensagens.filter(m => selectedIds.has(m.id)),
    [mensagens, selectedIds]
  )

  const todosPlanos = useMemo(
    () => mensagensSelecionadas.flatMap(m => m.planos),
    [mensagensSelecionadas]
  )

  const temAlteracoes = useMemo(() => {
    if (selectedIds.size === 0) return false

    return mensagensSelecionadas.some(msg =>
      msg.planos.some(plano => {
        const valorNovo = calcularValorComDesconto(plano.value)
        const nomeBase = extrairNomeBase(plano.name, porTextoFinal)
        let nomeNovo = formatarNomePlano(
          nomeBase,
          valorNovo,
          undefined,
          porTextoFinal,
          moeda
        )
        nomeNovo = aplicarTextoExtra(nomeNovo)
        return nomeNovo !== plano.name || valorNovo !== plano.value
      })
    )
  }, [
    mensagensSelecionadas,
    selectedIds.size,
    descontoPorcentagem,
    textoExtra,
    porTextoFinal,
    moeda,
  ])
  
  if (!isOpen) return null
  
  const handleApply = () => {
    if (selectedIds.size === 0) {
      alert('Selecione pelo menos uma mensagem')
      return
    }
    
    if (!temAlteracoes) {
      alert('Nenhuma alteração para aplicar')
      return
    }
    
    onApply(Array.from(selectedIds), descontoPorcentagem, textoExtra, porTextoFinal, moeda)
    onClose()
  }
  
  const descontoPresets = [5, 10, 15, 20, 25, 30, 40, 50]
  const textoSugestoes = ['10% OFF', '(PROMO)', 'OFERTA', 'VIP']
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Percent className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">Desconto & Texto Extra</h2>
              <p className="text-xs text-gray-500">Aplicar desconto e/ou adicionar texto aos planos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* COLUNA 1: Configuração */}
            <div className="space-y-4">
              {/* Seção Desconto */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-medium text-gray-300">Desconto (%)</h3>
                </div>
                
                <div className="mb-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={descontoPorcentagem}
                    onChange={(e) => setDescontoPorcentagem(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 text-xl font-semibold text-center focus:outline-none focus:border-gray-600"
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {descontoPresets.map(d => (
                    <button
                      key={d}
                      onClick={() => setDescontoPorcentagem(d)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                        descontoPorcentagem === d
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                          : 'bg-[#21262d] border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      }`}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Seção Texto Extra */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-sm font-medium text-gray-300">Texto Extra</h3>
                </div>
                
                <div className="mb-3">
                  <input
                    type="text"
                    value={textoExtra}
                    onChange={(e) => setTextoExtra(e.target.value)}
                    placeholder="Ex: 10% OFF"
                    className="w-full px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {textoSugestoes.map(texto => (
                    <button
                      key={texto}
                      onClick={() => setTextoExtra(texto)}
                      className="px-2 py-1 bg-[#21262d] border border-gray-700 text-gray-400 rounded text-xs hover:text-gray-200 hover:border-gray-600 transition-colors"
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Seção Formato do Preço */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-medium text-gray-300">Formato do Preço</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Texto entre nome e valor</label>
                    <input
                      type="text"
                      value={porTexto}
                      onChange={(e) => setPorTexto(e.target.value)}
                      placeholder="por"
                      className="w-full px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Moeda</label>
                    <select
                      value={moeda}
                      onChange={(e) => setMoeda(e.target.value as MoedaPlano)}
                      className="w-full px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                    >
                      <option value="R$">R$ (Real)</option>
                      <option value="$">$ (Dólar)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-sm text-gray-300">
                  <div>
                    <span className="font-medium text-blue-400">{mensagensSelecionadas.length}</span> mensagens selecionadas
                  </div>
                  <div>
                    <span className="font-medium text-blue-400">{todosPlanos.length}</span> planos serão afetados
                  </div>
                </div>
              </div>
            </div>
            
            {/* COLUNA 2: Preview */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-300">Preview</h3>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {mensagensSelecionadas.map((msg) => (
                  <div key={msg.id} className="p-3 bg-[#161b22] border border-gray-800 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      <span className="text-purple-400">#{msg.posicao + 1}</span> Mensagem
                    </div>
                    <div className="space-y-1.5">
                      {msg.planos.map((plano, planoIndex) => {
                        const valorOriginal = plano.value
                        const valorNovo = calcularValorComDesconto(valorOriginal)
                        const nomeOriginal = plano.name
                        const nomeBase = extrairNomeBase(nomeOriginal, porTextoFinal)
                        const nomeComValor = formatarNomePlano(
                          nomeBase,
                          valorNovo,
                          undefined,
                          porTextoFinal,
                          moeda
                        )
                        const nomeNovo = aplicarTextoExtra(nomeComValor)
                        const houveAlteracao = valorNovo !== valorOriginal || nomeNovo !== nomeOriginal
                        
                        return (
                          <div
                            key={planoIndex}
                            className={`p-2 rounded text-xs ${
                              houveAlteracao 
                                ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                : 'bg-gray-800/50 border border-gray-700/50'
                            }`}
                          >
                            <div className="mb-1">
                              {nomeNovo !== nomeOriginal ? (
                                <>
                                  <div className="text-gray-600 line-through text-[10px]">{nomeOriginal}</div>
                                  <div className="text-emerald-400 font-medium">{nomeNovo}</div>
                                </>
                              ) : (
                                <div className="text-gray-400">{nomeOriginal}</div>
                              )}
                            </div>
                            
                            <div>
                              {valorNovo !== valorOriginal ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 line-through">
                                    {formatarValorComMoeda(valorOriginal, moeda)}
                                  </span>
                                  <span className="text-emerald-400 font-medium">
                                    {formatarValorComMoeda(valorNovo, moeda)}
                                  </span>
                                  <span className="text-emerald-500 text-[10px]">
                                    -{descontoPorcentagem}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-500">
                                  {formatarValorComMoeda(valorOriginal, moeda)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || !temAlteracoes}
            className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Percent className="w-4 h-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

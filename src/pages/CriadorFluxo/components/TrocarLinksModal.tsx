/**
 * Modal para trocar links VIP em massa em todas as mensagens selecionadas
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Link,
  ArrowRight,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Mensagem } from '../types/Fluxo'

interface TrocarLinksModalProps {
  isOpen: boolean
  mensagens: Mensagem[]
  mensagensSelecionadasIds: number[]
  onClose: () => void
  onAplicar: (
    substituicoes: Record<string, string>,
    adicionados: Array<{ mensagemId: number; planoIndex: number; vipIndex?: number; link: string }>
  ) => void
}

export function TrocarLinksModal({
  isOpen,
  mensagens,
  mensagensSelecionadasIds,
  onClose,
  onAplicar,
}: TrocarLinksModalProps) {
  const [linkSubstituicoes, setLinkSubstituicoes] = useState<Record<string, string>>({})
  const [linkParaTodos, setLinkParaTodos] = useState('')
  
  // Filtrar mensagens selecionadas
  const mensagensSelecionadas = useMemo(() => {
    return mensagens.filter(m => mensagensSelecionadasIds.includes(m.id))
  }, [mensagens, mensagensSelecionadasIds])
  
  // Extrair todos os links únicos das mensagens selecionadas
  const linksUnicos = useMemo(() => {
    const links = new Map<string, number>() // link -> contagem de ocorrências
    
    mensagensSelecionadas.forEach(msg => {
      msg.planos.forEach(plano => {
        plano.vipGroups.forEach(vip => {
          if (vip.chatId) {
            const count = links.get(vip.chatId) || 0
            links.set(vip.chatId, count + 1)
          }
        })
      })
    })
    
    return Array.from(links.entries()).map(([link, count]) => ({
      link,
      count,
    }))
  }, [mensagensSelecionadas])
  
  const targetsSemLink = useMemo(() => {
    const targets: Array<{ key: string; mensagemId: number; planoIndex: number; vipIndex?: number; label: string }> = []
    mensagensSelecionadas.forEach(msg => {
      msg.planos.forEach((plano, planoIndex) => {
        if (!plano.vipGroups || plano.vipGroups.length === 0) {
          targets.push({
            key: `m${msg.id}-p${planoIndex}`,
            mensagemId: msg.id,
            planoIndex,
            label: `Mensagem #${msg.posicao + 1} • Botão ${planoIndex + 1}`,
          })
          return
        }
        
        plano.vipGroups.forEach((vip, vipIndex) => {
          if (!vip.chatId) {
            targets.push({
              key: `m${msg.id}-p${planoIndex}-v${vipIndex}`,
              mensagemId: msg.id,
              planoIndex,
              vipIndex,
              label: `Mensagem #${msg.posicao + 1} • Botão ${planoIndex + 1}`,
            })
          }
        })
      })
    })
    return targets
  }, [mensagensSelecionadas])
  
  // Inicializar substituições quando abrir o modal
  useEffect(() => {
    if (!isOpen) return
    const initial: Record<string, string> = {}
    linksUnicos.forEach(({ link }) => {
      initial[link] = link // Por padrão, manter o mesmo
    })
    setLinkSubstituicoes(initial)
    
    setLinkParaTodos('')
  }, [isOpen, linksUnicos, targetsSemLink])
  
  if (!isOpen) return null
  
  const handleAplicar = () => {
    // Filtrar apenas os links que foram alterados
    const substituicoesAlteradas: Record<string, string> = {}
    Object.entries(linkSubstituicoes).forEach(([original, novo]) => {
      if (original !== novo && novo.trim() !== '') {
        substituicoesAlteradas[original] = novo.trim()
      }
    })
    
    const linkGlobal = linkParaTodos.trim()
    const adicionados = linkGlobal
      ? targetsSemLink.map(target => ({
          mensagemId: target.mensagemId,
          planoIndex: target.planoIndex,
          vipIndex: target.vipIndex,
          link: linkGlobal,
        }))
      : []
    
    if (Object.keys(substituicoesAlteradas).length === 0 && adicionados.length === 0) {
      onClose()
      return
    }
    
    onAplicar(substituicoesAlteradas, adicionados)
    onClose()
  }
  
  // Contar quantos links serão alterados
  const linksAlterados = Object.entries(linkSubstituicoes).filter(
    ([original, novo]) => original !== novo && novo.trim() !== ''
  ).length
  const linksAdicionados = linkParaTodos.trim() ? targetsSemLink.length : 0
  const totalAlteracoes = linksAlterados + linksAdicionados
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#0d1117] to-[#080a0f] border border-blue-500/20 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-blue-500/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/40 bg-gradient-to-r from-slate-900/50 to-blue-900/10 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/20">
              <Link className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Trocar Links VIP em Massa
              </h2>
              <p className="text-xs text-slate-400">
                {mensagensSelecionadas.length} mensagens selecionadas • {linksUnicos.length + targetsSemLink.length} itens encontrados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-700/60 rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {linksUnicos.length === 0 && targetsSemLink.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-center">
                Nenhum link VIP encontrado nas mensagens selecionadas.
              </p>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Adicione planos com grupos VIP às mensagens primeiro.
              </p>
            </div>
          ) : (
            <>
              {targetsSemLink.length > 0 && (
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Detectamos botões sem link VIP. Preencha um link para aplicar em todos.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-slate-700/40 rounded-xl hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
                        {targetsSemLink.length}x
                      </span>
                      <span className="text-xs text-slate-500">
                        será aplicado em {targetsSemLink.length} {targetsSemLink.length === 1 ? 'botão' : 'botões'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Novo Link VIP (para todos):</label>
                      <input
                        type="text"
                        value={linkParaTodos}
                        onChange={(e) => setLinkParaTodos(e.target.value)}
                        placeholder="Cole o link do grupo VIP aqui"
                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-600 transition-all ${
                          linkParaTodos.trim()
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-slate-700/40'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <RefreshCw className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                  Altere os links abaixo para substituir em <strong className="text-blue-300">todas as mensagens selecionadas</strong>.
                  Links vazios ou iguais ao original serão ignorados.
                </p>
              </div>
              
              <div className="space-y-4">
                {linksUnicos.map(({ link, count }, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-slate-900/40 border border-slate-700/40 rounded-xl hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
                        {count}x
                      </span>
                      <span className="text-xs text-slate-500">
                        usado em {count} {count === 1 ? 'botão' : 'botões'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-2">Link Atual:</label>
                        <div 
                          className="px-4 py-3 bg-slate-800/50 border border-slate-700/40 rounded-xl text-sm text-slate-400 truncate"
                          title={link}
                        >
                          {link}
                        </div>
                      </div>
                      
                      <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-6" />
                      
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-2">Novo Link:</label>
                        <input
                          type="text"
                          value={linkSubstituicoes[link] || ''}
                          onChange={(e) => setLinkSubstituicoes(prev => ({
                            ...prev,
                            [link]: e.target.value
                          }))}
                          placeholder="Cole o novo link aqui"
                          className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-600 transition-all ${
                            linkSubstituicoes[link] !== link && linkSubstituicoes[link]?.trim()
                              ? 'border-green-500/40 bg-green-500/5'
                              : 'border-slate-700/40'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-800/40 bg-gradient-to-r from-slate-900/30 to-transparent rounded-b-3xl">
          <div className="text-sm text-slate-400">
            {totalAlteracoes > 0 ? (
              <span className="text-green-400">
                ✓ {totalAlteracoes} {totalAlteracoes === 1 ? 'alteração' : 'alterações'}
              </span>
            ) : (
              <span className="text-slate-500">Nenhuma alteração</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800/50 border border-slate-700/40 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all duration-200 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleAplicar}
              disabled={totalAlteracoes === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Aplicar Substituição
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook para gerenciar estado do fluxo
 */

import { useState, useCallback, useMemo } from 'react'
import { Fluxo, Mensagem, Plano, OrderBump, VipGroup, OrderBumpSalvo, BotaoSalvo, BotaoReconhecido, BotVendas, UpsellSalvo } from '../types/Fluxo'
import { parseFluxoJson } from '../utils/fluxoParser'
import { exportFluxoToJson, gerarNomeArquivo } from '../utils/fluxoExporter'
import { formatarNomePlano, extrairNomeBase, extrairDesconto, formatarValorComMoeda, normalizarNomeBase, parseNomePlano, MoedaPlano } from '../utils/formatadorPlanos'

export interface UseFluxoReturn {
  // Estado
  fluxo: Fluxo | null
  isLoading: boolean
  error: string | null
  selectedMensagens: Set<number>
  
  // Ações de importação/exportação
  importarFluxo: (jsonStringOrObject: string | object) => void
  exportarFluxo: () => void
  limparFluxo: () => void
  
  // Ações de edição do fluxo
  atualizarNome: (nome: string) => void
  atualizarToken: (token: string) => void
  atualizarBotName: (botName: string) => void
  
  // Ações de mensagens
  adicionarMensagem: (mensagem?: Partial<Mensagem>) => void
  adicionarMensagemCompleta: (mensagem: Mensagem) => void
  atualizarMensagem: (id: number, updates: Partial<Mensagem>) => void
  duplicarMensagem: (id: number) => void
  excluirMensagem: (id: number) => void
  excluirMensagensEmMassa: (ids: number[]) => void
  moverMensagem: (id: number, direcao: 'up' | 'down') => void
  reordenarMensagens: (novaOrdem: number[]) => void
  
  // Ações de planos
  adicionarPlano: (mensagemId: number, plano?: Partial<Plano>) => void
  atualizarPlano: (mensagemId: number, planoIndex: number, updates: Partial<Plano>) => void
  excluirPlano: (mensagemId: number, planoIndex: number) => void
  reordenarPlanos: (mensagemId: number, novaOrdem: number[]) => void
  
  // Ações em massa
  aplicarDescontoEmMassa: (mensagemIds: number[], porcentagem: number) => void
  aplicarTextoExtraEmMassa: (mensagemIds: number[], textoExtra: string) => void
  aplicarDescontoTextoEmMassa: (mensagemIds: number[], desconto: number, texto: string, porTexto: string, moeda: MoedaPlano) => void
  aplicarHorarioEmMassa: (mensagemIds: number[], delay: number, delayType: 'relative' | 'absolute', scheduleTime?: string, scheduleDays?: number) => void
  aplicarHorariosMultiplos: (assignments: Array<{ mensagemId: number, delay: number }>) => void
  
  // Order Bump
  atualizarOrderBumpGlobal: (orderBump: OrderBump) => void
  aplicarOrderBumpGlobalATodas: () => void
  aplicarOrderBumpEmMassa: (ids: number[], orderBump: OrderBump) => void
  
  // Order Bump Library (CRUD)
  adicionarOrderBumpNaBiblioteca: (ob: OrderBumpSalvo) => void
  atualizarOrderBumpNaBiblioteca: (ob: OrderBumpSalvo) => void
  duplicarOrderBumpNaBiblioteca: (id: string) => void
  excluirOrderBumpDaBiblioteca: (id: string) => void
  
  // Botões/Planos Library (CRUD)
  adicionarBotaoNaBiblioteca: (botao: BotaoSalvo) => void
  atualizarBotaoNaBiblioteca: (botao: BotaoSalvo) => void
  duplicarBotaoNaBiblioteca: (id: string) => void
  excluirBotaoDaBiblioteca: (id: string) => void
  aplicarBotoesEmMassa: (mensagemIds: number[], planos: Plano[]) => void
  atualizarBotoesReconhecidosEmMassa: (botao: BotaoReconhecido) => void
  
  // Upsell Library (CRUD)
  adicionarUpsellNaBiblioteca: (upsell: UpsellSalvo) => void
  atualizarUpsellNaBiblioteca: (upsell: UpsellSalvo) => void
  duplicarUpsellNaBiblioteca: (id: string) => void
  excluirUpsellDaBiblioteca: (id: string) => void
  aplicarUpsellEmMassa: (mensagemIds: number[], upsellId: string) => void
  sincronizarUpsellsLibrary: (upsells: UpsellSalvo[]) => void
  atualizarUpsellIds: (mapa: Map<string, string>) => void
  
  // Bots de Vendas
  atualizarBots: (bots: BotVendas[]) => void
  
  // Seleção
  toggleSelecionarMensagem: (id: number) => void
  selecionarTodas: () => void
  desmarcarTodas: () => void
  
  // Bulk copy
  adicionarMensagensEmMassa: (copys: string[], planosBase?: Plano[]) => void
}

const criarMensagemVazia = (id: number, posicao: number): Mensagem => ({
  id,
  description: '',
  video: null,
  delay: 0,
  delayType: 'relative',
  scheduleTime: '',
  scheduleDays: 0,
  planos: [],
  orderBumpPerPlan: false,
  posicao,
})

const criarPlanoVazio = (): Plano => ({
  name: 'Novo Plano',
  value: 0,
  vipGroups: [],
})

export function useFluxo(): UseFluxoReturn {
  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMensagens, setSelectedMensagens] = useState<Set<number>>(new Set())
  
  // Próximo ID disponível para mensagens
  const nextId = useMemo(() => {
    if (!fluxo?.mensagens.length) return 1
    return Math.max(...fluxo.mensagens.map(m => m.id)) + 1
  }, [fluxo?.mensagens])
  
  // Importar fluxo de JSON (aceita string ou objeto já parseado)
  const importarFluxo = useCallback((jsonStringOrObject: string | object) => {
    setIsLoading(true)
    setError(null)
    try {
      const parsed = parseFluxoJson(jsonStringOrObject)
      setFluxo(parsed)
      setSelectedMensagens(new Set())
    } catch (err) {
      console.error('Erro ao importar fluxo:', err)
      setError(err instanceof Error ? err.message : 'Erro ao importar fluxo')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Exportar fluxo para JSON e fazer download
  const exportarFluxo = useCallback(() => {
    if (!fluxo) return
    
    try {
      const jsonString = exportFluxoToJson(fluxo)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = gerarNomeArquivo(fluxo)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao exportar fluxo:', err)
      setError(err instanceof Error ? err.message : 'Erro ao exportar fluxo')
    }
  }, [fluxo])
  
  // Limpar fluxo
  const limparFluxo = useCallback(() => {
    setFluxo(null)
    setSelectedMensagens(new Set())
    setError(null)
  }, [])
  
  // Atualizar nome do fluxo
  const atualizarNome = useCallback((nome: string) => {
    setFluxo(prev => prev ? { ...prev, name: nome } : null)
  }, [])
  
  // Atualizar token do bot
  const atualizarToken = useCallback((token: string) => {
    setFluxo(prev => prev ? { ...prev, token } : null)
  }, [])
  
  // Atualizar botName
  const atualizarBotName = useCallback((botName: string) => {
    setFluxo(prev => prev ? { ...prev, botName } : null)
  }, [])
  
  // Adicionar nova mensagem
  const adicionarMensagem = useCallback((mensagem?: Partial<Mensagem>) => {
    setFluxo(prev => {
      if (!prev) return null
      const novaPosicao = prev.mensagens.length
      const novaMensagem: Mensagem = {
        ...criarMensagemVazia(nextId, novaPosicao),
        ...mensagem,
        id: nextId,
        posicao: novaPosicao,
      }
      return {
        ...prev,
        mensagens: [...prev.mensagens, novaMensagem],
      }
    })
  }, [nextId])
  
  // Adicionar mensagem completa (já com todos os dados)
  const adicionarMensagemCompleta = useCallback((mensagem: Mensagem) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: [...prev.mensagens, mensagem],
      }
    })
  }, [])
  
  // Atualizar mensagem existente
  const atualizarMensagem = useCallback((id: number, updates: Partial<Mensagem>) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }
    })
  }, [])
  
  // Duplicar mensagem
  const duplicarMensagem = useCallback((id: number) => {
    setFluxo(prev => {
      if (!prev) return null
      const mensagemOriginal = prev.mensagens.find(m => m.id === id)
      if (!mensagemOriginal) return prev
      
      const novaPosicao = mensagemOriginal.posicao + 1
      const novaMensagem: Mensagem = {
        ...mensagemOriginal,
        id: nextId,
        posicao: novaPosicao,
      }
      
      // Ajustar posições das mensagens seguintes
      const mensagensAtualizadas = prev.mensagens.map(m =>
        m.posicao >= novaPosicao ? { ...m, posicao: m.posicao + 1 } : m
      )
      
      return {
        ...prev,
        mensagens: [...mensagensAtualizadas, novaMensagem].sort((a, b) => a.posicao - b.posicao),
      }
    })
  }, [nextId])
  
  // Excluir mensagem
  const excluirMensagem = useCallback((id: number) => {
    setFluxo(prev => {
      if (!prev) return null
      const mensagemExcluida = prev.mensagens.find(m => m.id === id)
      if (!mensagemExcluida) return prev
      
      // Reajustar posições
      const mensagensFiltradas = prev.mensagens
        .filter(m => m.id !== id)
        .map(m => m.posicao > mensagemExcluida.posicao
          ? { ...m, posicao: m.posicao - 1 }
          : m
        )
      
      return {
        ...prev,
        mensagens: mensagensFiltradas,
      }
    })
    setSelectedMensagens(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])
  
  // Excluir múltiplas mensagens em massa
  const excluirMensagensEmMassa = useCallback((ids: number[]) => {
    setFluxo(prev => {
      if (!prev) return null
      
      // Filtrar mensagens que não estão na lista de exclusão
      const mensagensRestantes = prev.mensagens
        .filter(m => !ids.includes(m.id))
        .sort((a, b) => a.posicao - b.posicao)
        .map((m, index) => ({ ...m, posicao: index })) // Reindexar posições
      
      return {
        ...prev,
        mensagens: mensagensRestantes,
      }
    })
    setSelectedMensagens(new Set())
  }, [])
  
  // Mover mensagem para cima ou para baixo
  const moverMensagem = useCallback((id: number, direcao: 'up' | 'down') => {
    setFluxo(prev => {
      if (!prev) return null
      const mensagem = prev.mensagens.find(m => m.id === id)
      if (!mensagem) return prev
      
      const novaPosicao = direcao === 'up' 
        ? mensagem.posicao - 1 
        : mensagem.posicao + 1
      
      if (novaPosicao < 0 || novaPosicao >= prev.mensagens.length) return prev
      
      const outraMensagem = prev.mensagens.find(m => m.posicao === novaPosicao)
      if (!outraMensagem) return prev
      
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (m.id === id) return { ...m, posicao: novaPosicao }
          if (m.id === outraMensagem.id) return { ...m, posicao: mensagem.posicao }
          return m
        }).sort((a, b) => a.posicao - b.posicao),
      }
    })
  }, [])
  
  // Reordenar mensagens por lista de IDs
  const reordenarMensagens = useCallback((novaOrdem: number[]) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => ({
          ...m,
          posicao: novaOrdem.indexOf(m.id),
        })).sort((a, b) => a.posicao - b.posicao),
      }
    })
  }, [])
  
  // Adicionar plano a uma mensagem
  const adicionarPlano = useCallback((mensagemId: number, plano?: Partial<Plano>) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (m.id !== mensagemId) return m
          return {
            ...m,
            planos: [...m.planos, { ...criarPlanoVazio(), ...plano }],
          }
        }),
      }
    })
  }, [])
  
  // Atualizar plano
  const atualizarPlano = useCallback((mensagemId: number, planoIndex: number, updates: Partial<Plano>) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (m.id !== mensagemId) return m
          return {
            ...m,
            planos: m.planos.map((p, i) =>
              i === planoIndex ? { ...p, ...updates } : p
            ),
          }
        }),
      }
    })
  }, [])
  
  // Excluir plano
  const excluirPlano = useCallback((mensagemId: number, planoIndex: number) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (m.id !== mensagemId) return m
          return {
            ...m,
            planos: m.planos.filter((_, i) => i !== planoIndex),
          }
        }),
      }
    })
  }, [])
  
  // Reordenar planos
  const reordenarPlanos = useCallback((mensagemId: number, novaOrdem: number[]) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (m.id !== mensagemId) return m
          const planosReordenados = novaOrdem.map(i => m.planos[i])
          return { ...m, planos: planosReordenados }
        }),
      }
    })
  }, [])
  
  // Aplicar desconto em massa
  const aplicarDescontoEmMassa = useCallback((mensagemIds: number[], porcentagem: number) => {
    const fator = 1 - (porcentagem / 100)
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return {
            ...m,
            planos: m.planos.map(p => ({
              ...p,
              value: Math.round(p.value * fator * 100) / 100,
              descontoPercentual: porcentagem > 0 ? porcentagem : undefined,
            })),
          }
        }),
      }
    })
  }, [])
  
  // Aplicar texto extra em massa
  const aplicarTextoExtraEmMassa = useCallback((mensagemIds: number[], textoExtra: string) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return {
            ...m,
            planos: m.planos.map(p => ({
              ...p,
              name: `${p.name} ${textoExtra}`.trim(),
            })),
          }
        }),
      }
    })
  }, [])
  
  // Aplicar desconto E texto extra em massa (combo)
  const aplicarDescontoTextoEmMassa = useCallback((mensagemIds: number[], desconto: number, texto: string, porTexto: string = 'por', moeda: MoedaPlano = 'R$') => {
    const fator = desconto > 0 ? 1 - (desconto / 100) : 1
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return {
            ...m,
            planos: m.planos.map(p => {
              let novoValor = p.value
              const porTextoFinal = porTexto.trim() || 'por'
              let nomeBase = extrairNomeBase(p.name, porTextoFinal)
              
              // Aplicar desconto
              if (desconto > 0) {
                novoValor = Math.round(p.value * fator * 100) / 100
              }
              
              // Formatar nome sem aplicar desconto no texto
              let novoNome = formatarNomePlano(nomeBase, novoValor, undefined, porTextoFinal, moeda)
              
              // Aplicar texto extra (adicionar ao final)
              if (texto.trim()) {
                novoNome = `${novoNome} ${texto}`.trim()
              }
              
              return {
                ...p,
                value: novoValor,
                name: novoNome,
                descontoPercentual: desconto > 0 ? desconto : undefined,
              }
            }),
          }
        }),
      }
    })
  }, [])
  
  // Aplicar horário em massa
  const aplicarHorarioEmMassa = useCallback((
    mensagemIds: number[],
    delay: number,
    delayType: 'relative' | 'absolute',
    scheduleTime?: string,
    scheduleDays?: number
  ) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return {
            ...m,
            delay,
            delayType,
            scheduleTime: scheduleTime || m.scheduleTime,
            scheduleDays: scheduleDays ?? m.scheduleDays,
          }
        }),
      }
    })
  }, [])
  
  // Aplicar horários múltiplos (ordem crescente)
  const aplicarHorariosMultiplos = useCallback((assignments: Array<{ mensagemId: number, delay: number }>) => {
    setFluxo(prev => {
      if (!prev) return null
      
      return {
        ...prev,
        mensagens: prev.mensagens.map(msg => {
          // REGRA: Primeira mensagem (posição 0) SEMPRE é imediata (0 segundos)
          if (msg.posicao === 0) {
            return { ...msg, delay: 0, delayType: 'relative' as const }
          }
          
          const assignment = assignments.find(a => a.mensagemId === msg.id)
          if (assignment) {
            return { ...msg, delay: assignment.delay, delayType: 'relative' as const }
          }
          return msg
        }),
      }
    })
  }, [])
  
  // Atualizar Order Bump global
  const atualizarOrderBumpGlobal = useCallback((orderBump: OrderBump) => {
    setFluxo(prev => prev ? { ...prev, orderBumpGlobal: orderBump } : null)
  }, [])
  
  // Aplicar Order Bump global a todas as mensagens
  const aplicarOrderBumpGlobalATodas = useCallback(() => {
    setFluxo(prev => {
      if (!prev?.orderBumpGlobal) return prev
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => ({
          ...m,
          orderBumpGlobal: prev.orderBumpGlobal!,
        })),
      }
    })
  }, [])
  
  // Aplicar Order Bump em mensagens específicas (em massa)
  const aplicarOrderBumpEmMassa = useCallback((ids: number[], orderBump: OrderBump) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!ids.includes(m.id)) return m
          return { ...m, orderBumpGlobal: orderBump }
        }),
      }
    })
  }, [])
  
  // === Order Bump Library CRUD ===
  
  // Adicionar Order Bump na biblioteca
  const adicionarOrderBumpNaBiblioteca = useCallback((ob: OrderBumpSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        orderBumpsLibrary: [...prev.orderBumpsLibrary, ob],
      }
    })
  }, [])
  
  // Atualizar Order Bump na biblioteca
  const atualizarOrderBumpNaBiblioteca = useCallback((ob: OrderBumpSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        orderBumpsLibrary: prev.orderBumpsLibrary.map(item =>
          item.id === ob.id ? ob : item
        ),
      }
    })
  }, [])
  
  // Duplicar Order Bump na biblioteca
  const duplicarOrderBumpNaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      const original = prev.orderBumpsLibrary.find(ob => ob.id === id)
      if (!original) return prev
      
      const novoOB: OrderBumpSalvo = {
        ...original,
        id: `ob-${Date.now()}`,
        nome: `${original.nome} (cópia)`,
      }
      
      return {
        ...prev,
        orderBumpsLibrary: [...prev.orderBumpsLibrary, novoOB],
      }
    })
  }, [])
  
  // Excluir Order Bump da biblioteca
  const excluirOrderBumpDaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        orderBumpsLibrary: prev.orderBumpsLibrary.filter(ob => ob.id !== id),
      }
    })
  }, [])
  
  // === Upsell Library CRUD ===
  
  const adicionarUpsellNaBiblioteca = useCallback((upsell: UpsellSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        upsellsLibrary: [...(prev.upsellsLibrary || []), upsell],
      }
    })
  }, [])
  
  const atualizarUpsellNaBiblioteca = useCallback((upsell: UpsellSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        upsellsLibrary: (prev.upsellsLibrary || []).map(item =>
          item.id === upsell.id ? upsell : item
        ),
      }
    })
  }, [])
  
  const duplicarUpsellNaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      const original = (prev.upsellsLibrary || []).find(item => item.id === id)
      if (!original) return prev
      
      const novoUpsell: UpsellSalvo = {
        ...original,
        id: `up-${Date.now()}`,
        nome: `${original.nome} (cópia)`,
      }
      
      return {
        ...prev,
        upsellsLibrary: [...(prev.upsellsLibrary || []), novoUpsell],
      }
    })
  }, [])
  
  const excluirUpsellDaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        upsellsLibrary: (prev.upsellsLibrary || []).filter(item => item.id !== id),
      }
    })
  }, [])
  
  const aplicarUpsellEmMassa = useCallback((mensagemIds: number[], upsellId: string) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return { ...m, upsellId }
        }),
      }
    })
  }, [])

  const sincronizarUpsellsLibrary = useCallback((upsells: UpsellSalvo[]) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        upsellsLibrary: upsells,
      }
    })
  }, [])

  const atualizarUpsellIds = useCallback((mapa: Map<string, string>) => {
    if (!mapa || mapa.size === 0) return
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        mensagens: prev.mensagens.map(mensagem => {
          if (!mensagem.upsellId) return mensagem
          const novoId = mapa.get(mensagem.upsellId)
          if (!novoId || novoId === mensagem.upsellId) return mensagem
          return { ...mensagem, upsellId: novoId }
        }),
      }
    })
  }, [])
  
  // === Botões/Planos Library CRUD ===
  
  // Adicionar Botão na biblioteca
  const adicionarBotaoNaBiblioteca = useCallback((botao: BotaoSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        botoesLibrary: [...(prev.botoesLibrary || []), botao],
      }
    })
  }, [])
  
  // Atualizar Botão na biblioteca
  const atualizarBotaoNaBiblioteca = useCallback((botao: BotaoSalvo) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        botoesLibrary: (prev.botoesLibrary || []).map(item =>
          item.id === botao.id ? botao : item
        ),
      }
    })
  }, [])
  
  // Duplicar Botão na biblioteca
  const duplicarBotaoNaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      const original = (prev.botoesLibrary || []).find(b => b.id === id)
      if (!original) return prev
      
      const novoBotao: BotaoSalvo = {
        ...original,
        id: `btn-${Date.now()}`,
        nome: `${original.nome} (cópia)`,
      }
      
      return {
        ...prev,
        botoesLibrary: [...(prev.botoesLibrary || []), novoBotao],
      }
    })
  }, [])
  
  // Excluir Botão da biblioteca
  const excluirBotaoDaBiblioteca = useCallback((id: string) => {
    setFluxo(prev => {
      if (!prev) return null
      return {
        ...prev,
        botoesLibrary: (prev.botoesLibrary || []).filter(b => b.id !== id),
      }
    })
  }, [])
  
  // Aplicar Botões (Planos) em mensagens selecionadas
  const aplicarBotoesEmMassa = useCallback((mensagemIds: number[], planos: Plano[]) => {
    setFluxo(prev => {
      if (!prev) return null

      return {
        ...prev,
        mensagens: prev.mensagens.map(m => {
          if (!mensagemIds.includes(m.id)) return m
          return {
            ...m,
            planos: planos.map(plano => ({ ...plano })),
          }
        }),
      }
    })
  }, [])

  const atualizarBotoesReconhecidosEmMassa = useCallback((botao: BotaoReconhecido) => {
    const chave = normalizarNomeBase(botao.id)
    setFluxo(prev => {
      if (!prev) return null

      return {
        ...prev,
        mensagens: prev.mensagens.map(m => ({
          ...m,
          planos: m.planos.map(p => {
            const partes = parseNomePlano(p.name)
            const baseAtual = normalizarNomeBase(partes.nomeBase)
            if (baseAtual !== chave) return p

            const descontoAtual = p.descontoPercentual ?? extrairDesconto(p.name)
            const valorFinal = descontoAtual
              ? Math.round(botao.valorBase * (1 - descontoAtual / 100) * 100) / 100
              : botao.valorBase
            const porFinal = partes.porTexto.trim() || 'por'
            const nomeNovo = `${botao.nomeBase} ${porFinal} ${formatarValorComMoeda(valorFinal, partes.moeda)}${partes.sufixo}`
            const vipGroupsAtualizados = (botao.vipGroups || []).map(v => ({
              ...v,
              name: nomeNovo,
            }))

            return {
              ...p,
              name: nomeNovo,
              value: valorFinal,
              vipGroups: vipGroupsAtualizados,
              descontoPercentual: descontoAtual,
            }
          }),
        })),
      }
    })
  }, [])
  
  // Atualizar bots de vendas
  const atualizarBots = useCallback((bots: BotVendas[]) => {
    setFluxo(prev => {
      if (!prev) return null
      
      // Encontrar o bot principal para sincronizar o token
      const botPrincipal = bots.find(b => b.isPrincipal)
      
      return {
        ...prev,
        bots,
        // Sincronizar token do bot principal
        token: botPrincipal?.token || prev.token,
        // Sincronizar backupBotToken (segundo bot se existir)
        backupBotToken: bots.filter(b => !b.isPrincipal)[0]?.token || null,
        // Sincronizar clonedBots (bots extras além do principal e backup)
        clonedBots: bots.filter(b => !b.isPrincipal).slice(1).map(b => b.token),
      }
    })
  }, [])
  
  // Toggle seleção de mensagem
  const toggleSelecionarMensagem = useCallback((id: number) => {
    setSelectedMensagens(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])
  
  // Selecionar todas as mensagens
  const selecionarTodas = useCallback(() => {
    if (!fluxo) return
    setSelectedMensagens(new Set(fluxo.mensagens.map(m => m.id)))
  }, [fluxo])
  
  // Desmarcar todas as mensagens
  const desmarcarTodas = useCallback(() => {
    setSelectedMensagens(new Set())
  }, [])
  
  // Adicionar mensagens em massa a partir de copys
  const adicionarMensagensEmMassa = useCallback((copys: string[], planosBase?: Plano[]) => {
    setFluxo(prev => {
      if (!prev) return null
      
      let currentId = nextId
      const basePosition = prev.mensagens.length
      
      const novasMensagens: Mensagem[] = copys.map((copy, index) => ({
        id: currentId++,
        description: copy,
        video: null,
        delay: 0,
        delayType: 'relative' as const,
        scheduleTime: '',
        scheduleDays: 0,
        planos: planosBase ? [...planosBase] : [],
        orderBumpPerPlan: false,
        posicao: basePosition + index,
      }))
      
      return {
        ...prev,
        mensagens: [...prev.mensagens, ...novasMensagens],
      }
    })
  }, [nextId])
  
  return {
    fluxo,
    isLoading,
    error,
    selectedMensagens,
    importarFluxo,
    exportarFluxo,
    limparFluxo,
    atualizarNome,
    atualizarToken,
    atualizarBotName,
    adicionarMensagem,
    adicionarMensagemCompleta,
    atualizarMensagem,
    duplicarMensagem,
    excluirMensagem,
    excluirMensagensEmMassa,
    moverMensagem,
    reordenarMensagens,
    adicionarPlano,
    atualizarPlano,
    excluirPlano,
    reordenarPlanos,
    aplicarDescontoEmMassa,
    aplicarTextoExtraEmMassa,
    aplicarDescontoTextoEmMassa,
    aplicarHorarioEmMassa,
    aplicarHorariosMultiplos,
    atualizarOrderBumpGlobal,
    aplicarOrderBumpGlobalATodas,
    aplicarOrderBumpEmMassa,
    adicionarOrderBumpNaBiblioteca,
    atualizarOrderBumpNaBiblioteca,
    duplicarOrderBumpNaBiblioteca,
    excluirOrderBumpDaBiblioteca,
    adicionarUpsellNaBiblioteca,
    atualizarUpsellNaBiblioteca,
    duplicarUpsellNaBiblioteca,
    excluirUpsellDaBiblioteca,
    aplicarUpsellEmMassa,
    sincronizarUpsellsLibrary,
    atualizarUpsellIds,
    adicionarBotaoNaBiblioteca,
    atualizarBotaoNaBiblioteca,
    duplicarBotaoNaBiblioteca,
    excluirBotaoDaBiblioteca,
    aplicarBotoesEmMassa,
    atualizarBotoesReconhecidosEmMassa,
    atualizarBots,
    toggleSelecionarMensagem,
    selecionarTodas,
    desmarcarTodas,
    adicionarMensagensEmMassa,
  }
}

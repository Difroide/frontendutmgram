/**
 * Página principal do Criador de Fluxo - Estilo Minimalista
 */

import { useState, useRef, useMemo, useEffect } from 'react'
import { FileJson, Upload, RefreshCw } from 'lucide-react'
import { useFluxo } from './hooks/useFluxo'
import { useOrderBumpLibrary } from './hooks/useOrderBumpLibrary'
import { useUpsellLibrary } from './hooks/useUpsellLibrary'
import { FluxoHeader } from './components/FluxoHeader'
import { MensagemCard } from './components/MensagemCard'
import { MensagemEditor } from './components/MensagemEditor'
import { SelectionBar } from './components/SelectionBar'
import { HorarioModal } from './components/HorarioModal'
import { DescontoTextoModal } from './components/DescontoTextoModal'
import { OrderBumpLibrary } from './components/OrderBumpLibrary'
import { OrderBumpEditor } from './components/OrderBumpEditor'
import { BulkCopyModal } from './components/BulkCopyModal'
import { BotoesLibrary } from './components/BotoesLibrary'
import { BotaoEditor } from './components/BotaoEditor'
import { BotsManager } from './components/BotsManager'
import { UpsellLibrary } from './components/UpsellLibrary'
import { UpsellEditor } from './components/UpsellEditor'
import { Mensagem, OrderBumpSalvo, BotaoSalvo, BotaoReconhecido, BotVendas, Plano, UpsellSalvo } from './types/Fluxo'
import { extrairDesconto, normalizarNomeBase, parseNomePlano } from './utils/formatadorPlanos'
import { criarAssinaturaUpsellSalvo } from './utils/upsellUtils'

export default function CriadorFluxo() {
  const {
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
    adicionarMensagemCompleta,
    atualizarMensagem,
    duplicarMensagem,
    excluirMensagem,
    excluirMensagensEmMassa,
    aplicarDescontoTextoEmMassa,
    aplicarHorariosMultiplos,
    aplicarOrderBumpEmMassa,
    adicionarBotaoNaBiblioteca,
    atualizarBotaoNaBiblioteca,
    duplicarBotaoNaBiblioteca,
    excluirBotaoDaBiblioteca,
    aplicarBotoesEmMassa,
    atualizarBotoesReconhecidosEmMassa,
    aplicarUpsellEmMassa,
    sincronizarUpsellsLibrary,
    atualizarUpsellIds,
    atualizarBots,
    toggleSelecionarMensagem,
    selecionarTodas,
    desmarcarTodas,
    adicionarMensagensEmMassa,
  } = useFluxo()
  
  // Biblioteca de Order Bumps PERSISTENTE (salva em arquivo)
  const {
    orderBumps: orderBumpsLibrary,
    adicionar: adicionarOrderBumpNaBiblioteca,
    atualizar: atualizarOrderBumpNaBiblioteca,
    duplicar: duplicarOrderBumpNaBiblioteca,
    excluir: excluirOrderBumpDaBiblioteca,
  } = useOrderBumpLibrary()
  
  // Biblioteca de Upsells PERSISTENTE (salva em arquivo)
  const {
    upsells: upsellsLibrary,
    adicionar: adicionarUpsellNaBiblioteca,
    atualizar: atualizarUpsellNaBiblioteca,
    duplicar: duplicarUpsellNaBiblioteca,
    excluir: excluirUpsellDaBiblioteca,
  } = useUpsellLibrary()

  // Estados de modais
  const [mensagemEditando, setMensagemEditando] = useState<Mensagem | null>(null)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [showDescontoTextoModal, setShowDescontoTextoModal] = useState(false)
  const [showOrderBumpLibrary, setShowOrderBumpLibrary] = useState(false)
  const [showOrderBumpEditor, setShowOrderBumpEditor] = useState(false)
  const [orderBumpEditando, setOrderBumpEditando] = useState<OrderBumpSalvo | null>(null)
  const [showUpsellLibrary, setShowUpsellLibrary] = useState(false)
  const [showUpsellEditor, setShowUpsellEditor] = useState(false)
  const [upsellEditando, setUpsellEditando] = useState<UpsellSalvo | null>(null)
  const [showBulkCopyModal, setShowBulkCopyModal] = useState(false)
  const [showBotoesLibrary, setShowBotoesLibrary] = useState(false)
  const [showBotaoEditor, setShowBotaoEditor] = useState(false)
  const [botaoEditando, setBotaoEditando] = useState<BotaoSalvo | null>(null)
  const [showBotsManager, setShowBotsManager] = useState(false)
  const [isCreatingNewMessage, setIsCreatingNewMessage] = useState(false)
  
  // Ref para input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Verificar se há seleções
  const hasSelections = selectedMensagens.size > 0
  
  // Mensagens ordenadas
  const mensagensOrdenadas = fluxo?.mensagens
    ? [...fluxo.mensagens].sort((a, b) => a.posicao - b.posicao)
    : []
  
  // Planos base (primeira mensagem)
  const planosBase = mensagensOrdenadas[0]?.planos || []

  const botoesReconhecidos = useMemo<BotaoReconhecido[]>(() => {
    if (!fluxo) return []
    const map = new Map<string, BotaoReconhecido>()

    fluxo.mensagens.forEach(msg => {
      msg.planos.forEach(plano => {
        const partes = parseNomePlano(plano.name)
        const nomeBase = partes.nomeBase || plano.name
        const id = normalizarNomeBase(nomeBase)
        if (!id) return

        const desconto = plano.descontoPercentual ?? extrairDesconto(plano.name)
        const valorBase = desconto
          ? Math.round((plano.value / (1 - desconto / 100)) * 100) / 100
          : plano.value

        const existente = map.get(id)
        if (existente) {
          existente.count += 1
          return
        }

        map.set(id, {
          id,
          nomeBase,
          valorBase,
          porTexto: partes.porTexto,
          moeda: partes.moeda,
          desconto,
          sufixo: partes.sufixo,
          vipGroups: plano.vipGroups,
          count: 1,
        })
      })
    })

    return Array.from(map.values())
  }, [fluxo])

  // Flag para evitar loops infinitos na sincronização de upsells
  const upsellSyncRef = useRef(false)
  const lastFluxoIdRef = useRef<string | null>(null)

  // Sincronizar upsells library com o fluxo - apenas quando a library externa muda
  useEffect(() => {
    if (!fluxo) return
    // Só sincroniza se não estiver no meio de uma importação
    if (upsellSyncRef.current) return
    sincronizarUpsellsLibrary(upsellsLibrary)
  }, [upsellsLibrary]) // Remover fluxo das dependências para evitar loop

  // Importar upsells do fluxo - apenas quando um NOVO fluxo é importado
  useEffect(() => {
    if (!fluxo) return
    
    // Criar um ID único para o fluxo baseado no nome e quantidade de mensagens
    const fluxoId = `${fluxo.nome}-${fluxo.mensagens.length}`
    
    // Se já processamos este fluxo, não processar novamente
    if (lastFluxoIdRef.current === fluxoId) return
    lastFluxoIdRef.current = fluxoId
    
    const importados = fluxo.upsellsLibrary || []
    if (importados.length === 0) return

    // Marcar que estamos sincronizando para evitar loops
    upsellSyncRef.current = true

    const existentesPorAssinatura = new Map(
      (upsellsLibrary || []).map(upsell => [criarAssinaturaUpsellSalvo(upsell), upsell])
    )
    const mapaIds = new Map<string, string>()

    const adicionarMissing = async () => {
      try {
        for (const upsell of importados) {
          const assinatura = criarAssinaturaUpsellSalvo(upsell)
          const existente = existentesPorAssinatura.get(assinatura)
          if (existente) {
            if (existente.id !== upsell.id) {
              mapaIds.set(upsell.id, existente.id)
            }
            continue
          }
          await adicionarUpsellNaBiblioteca(upsell)
        }
        if (mapaIds.size > 0) {
          atualizarUpsellIds(mapaIds)
        }
      } finally {
        // Liberar a flag após um delay para evitar reprocessamento
        setTimeout(() => {
          upsellSyncRef.current = false
        }, 500)
      }
    }

    adicionarMissing()
  }, [fluxo?.nome]) // Só depender do nome do fluxo para detectar nova importação
  
  // === Handlers ===
  
  // Handler: Clicar no card abre o editor
  const handleClickCard = (mensagem: Mensagem) => {
    setMensagemEditando(mensagem)
  }
  
  // Handler: Nova mensagem - abre modal imediatamente
  const handleNovaMensagem = () => {
    const nextId = fluxo?.mensagens.length
      ? Math.max(...fluxo.mensagens.map(m => m.id)) + 1
      : 1
    const novaPosicao = fluxo?.mensagens.length || 0
    
    const mensagemNova: Mensagem = {
      id: nextId,
      description: '',
      video: null,
      delay: 300, // 5 minutos default
      delayType: 'relative',
      scheduleTime: '',
      scheduleDays: 0,
      planos: [],
      orderBumpPerPlan: false,
      posicao: novaPosicao,
    }
    
    setMensagemEditando(mensagemNova)
    setIsCreatingNewMessage(true)
  }
  
  // Handler: Salvar mensagem (criar ou atualizar)
  const handleSaveMensagem = (mensagem: Mensagem) => {
    if (isCreatingNewMessage) {
      // Adicionar nova mensagem ao fluxo usando função do hook
      adicionarMensagemCompleta(mensagem)
      setIsCreatingNewMessage(false)
    } else {
      // Atualizar mensagem existente
      atualizarMensagem(mensagem.id, mensagem)
    }
    setMensagemEditando(null)
  }
  
  // Handler: Fechar editor
  const handleCloseEditor = () => {
    // Se estava criando e não salvou, não fazer nada
    setMensagemEditando(null)
    setIsCreatingNewMessage(false)
  }
  
  // Handler: Aplicar horários múltiplos (ordem crescente)
  const handleApplyMultipleHorarios = (assignments: Array<{ mensagemId: number, delay: number }>) => {
    aplicarHorariosMultiplos(assignments)
  }
  
  // Handler: Aplicar desconto e texto
  const handleApplyDescontoTexto = (mensagemIds: number[], descontoPorcentagem: number, textoExtra: string, porTexto: string, moeda: '$' | 'R$') => {
    aplicarDescontoTextoEmMassa(mensagemIds, descontoPorcentagem, textoExtra, porTexto, moeda)
  }
  
  // Handler: Order Bump Library - Criar novo
  const handleCreateOrderBump = () => {
    setOrderBumpEditando(null)
    setShowOrderBumpEditor(true)
  }
  
  // Handler: Order Bump Library - Editar
  const handleEditOrderBump = (ob: OrderBumpSalvo) => {
    setOrderBumpEditando(ob)
    setShowOrderBumpEditor(true)
  }
  
  // Handler: Order Bump Library - Duplicar
  const handleDuplicateOrderBump = async (ob: OrderBumpSalvo) => {
    await duplicarOrderBumpNaBiblioteca(ob.id)
  }
  
  // Handler: Order Bump Library - Excluir
  const handleDeleteOrderBump = async (id: string) => {
    await excluirOrderBumpDaBiblioteca(id)
  }
  
  // Handler: Order Bump Library - Aplicar às mensagens selecionadas
  const handleApplyOrderBumpToSelected = (ob: OrderBumpSalvo) => {
    const ids = Array.from(selectedMensagens)
    aplicarOrderBumpEmMassa(ids, ob.orderBump)
  }
  
  // Handler: Order Bump Editor - Salvar
  const handleSaveOrderBump = async (ob: OrderBumpSalvo) => {
    const existeIndex = orderBumpsLibrary.findIndex(item => item.id === ob.id)
    
    if (existeIndex >= 0) {
      // Atualizar existente
      await atualizarOrderBumpNaBiblioteca(ob)
    } else {
      // Adicionar novo
      await adicionarOrderBumpNaBiblioteca(ob)
    }
    
    setShowOrderBumpEditor(false)
    setOrderBumpEditando(null)
  }
  
  // === Handlers: Upsell Library ===
  const handleCreateUpsell = () => {
    setUpsellEditando(null)
    setShowUpsellEditor(true)
  }
  
  const handleEditUpsell = (upsell: UpsellSalvo) => {
    setUpsellEditando(upsell)
    setShowUpsellEditor(true)
  }
  
  const handleDuplicateUpsell = async (upsell: UpsellSalvo) => {
    await duplicarUpsellNaBiblioteca(upsell.id)
  }
  
  const handleDeleteUpsell = async (id: string) => {
    await excluirUpsellDaBiblioteca(id)
  }
  
  const handleSaveUpsell = (upsell: UpsellSalvo) => {
    const existeIndex = (upsellsLibrary || []).findIndex(item => item.id === upsell.id)
    if (existeIndex >= 0) {
      atualizarUpsellNaBiblioteca(upsell)
    } else {
      adicionarUpsellNaBiblioteca(upsell)
    }
    setShowUpsellEditor(false)
    setUpsellEditando(null)
  }
  
  const handleApplyUpsellToSelected = (upsell: UpsellSalvo) => {
    const ids = Array.from(selectedMensagens)
    if (ids.length === 0) return
    aplicarUpsellEmMassa(ids, upsell.id)
    setShowUpsellLibrary(false)
  }
  
  // Handler: Aplicar upsell a todas as mensagens a partir da segunda (condição de compra)
  const handleApplyUpsellToAllFromSecond = (upsell: UpsellSalvo) => {
    // Pegar todas as mensagens exceto a primeira (posição 0)
    const ids = mensagensOrdenadas
      .filter(m => m.posicao > 0)
      .map(m => m.id)
    
    if (ids.length === 0) return
    aplicarUpsellEmMassa(ids, upsell.id)
    setShowUpsellLibrary(false)
  }
  
  // Handler: Editar primeira selecionada
  const handleEditFirst = () => {
    if (selectedMensagens.size === 0) return
    
    const firstId = Array.from(selectedMensagens)[0]
    const mensagem = mensagensOrdenadas.find(m => m.id === firstId)
    if (mensagem) {
      setMensagemEditando(mensagem)
    }
  }
  
  // Handler: Excluir mensagens selecionadas
  const handleDeleteSelected = () => {
    if (selectedMensagens.size === 0) return
    
    if (!confirm(`Excluir ${selectedMensagens.size} mensagens selecionadas?`)) return
    
    const ids = Array.from(selectedMensagens)
    excluirMensagensEmMassa(ids)
  }
  
  // Handler: Duplicar mensagem
  const handleDuplicateMensagem = (id: number) => {
    duplicarMensagem(id)
  }
  
  // === Handlers: Biblioteca de Botões ===
  
  // Handler: Botões Library - Criar novo
  const handleCreateBotao = () => {
    setBotaoEditando(null)
    setShowBotaoEditor(true)
  }
  
  // Handler: Botões Library - Editar
  const handleEditBotao = (botao: BotaoSalvo) => {
    setBotaoEditando(botao)
    setShowBotaoEditor(true)
  }
  
  // Handler: Botões Library - Duplicar
  const handleDuplicateBotao = (botao: BotaoSalvo) => {
    duplicarBotaoNaBiblioteca(botao.id)
  }
  
  // Handler: Botões Library - Excluir
  const handleDeleteBotao = (id: string) => {
    excluirBotaoDaBiblioteca(id)
  }
  
  // Handler: Botões Library - Aplicar às mensagens selecionadas
  const handleApplyBotoesToSelected = (planos: Plano[]) => {
    const ids = Array.from(selectedMensagens)
    aplicarBotoesEmMassa(ids, planos)
  }

  const handleUpdateBotaoReconhecido = (botao: BotaoReconhecido) => {
    atualizarBotoesReconhecidosEmMassa(botao)
  }
  
  // Handler: Botão Editor - Salvar
  const handleSaveBotao = (botao: BotaoSalvo) => {
    if (!fluxo) return
    
    const existeIndex = (fluxo.botoesLibrary || []).findIndex(item => item.id === botao.id)
    
    if (existeIndex >= 0) {
      // Atualizar existente
      atualizarBotaoNaBiblioteca(botao)
    } else {
      // Adicionar novo
      adicionarBotaoNaBiblioteca(botao)
    }
    
    setShowBotaoEditor(false)
    setBotaoEditando(null)
  }
  
  // Handler: Botão Editor - Salvar múltiplos
  const handleSaveMultipleBotoes = (botoes: BotaoSalvo[]) => {
    botoes.forEach(botao => {
      adicionarBotaoNaBiblioteca(botao)
    })
    setShowBotaoEditor(false)
    setBotaoEditando(null)
  }
  
  // Handler: Salvar bots de vendas
  const handleSaveBots = (bots: BotVendas[]) => {
    atualizarBots(bots)
  }
  
  return (
    <div className="min-h-screen -m-6 p-6 bg-[#0d1117] text-gray-200">
      <div className="space-y-4">
        {/* Header */}
        <FluxoHeader
          fluxo={fluxo}
          onImport={(jsonString) => importarFluxo(jsonString)}
          onExport={exportarFluxo}
          onClear={limparFluxo}
          onUpdateName={atualizarNome}
          onOpenDescontoTexto={() => setShowDescontoTextoModal(true)}
          onOpenOrderBump={() => setShowOrderBumpLibrary(true)}
          onOpenUpsell={() => setShowUpsellLibrary(true)}
          onOpenBotoes={() => setShowBotoesLibrary(true)}
          onOpenBulkCopy={() => setShowBulkCopyModal(true)}
          onAddMensagem={handleNovaMensagem}
          onOpenBots={() => setShowBotsManager(true)}
        />
        
        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-300 text-sm">
            <strong>Erro:</strong> {error}
          </div>
        )}
        
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
              <span className="text-sm text-gray-500">Carregando...</span>
            </div>
          </div>
        )}
        
        {/* Estado Vazio */}
        {!fluxo && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            {/* Card de Importação */}
            <div className="bg-[#161b22] border border-gray-800 rounded-lg p-8 max-w-md w-full text-center">
              {/* Ícone */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group w-24 h-24 mx-auto rounded-lg bg-[#0d1117] border-2 border-dashed border-gray-700 hover:border-gray-600 flex items-center justify-center mb-6 transition-all cursor-pointer"
              >
                <Upload className="w-10 h-10 text-gray-500 group-hover:text-gray-400 transition-colors" />
              </button>
              
              <h2 className="text-lg font-semibold text-white mb-2">Importar Fluxo</h2>
              <p className="text-sm text-gray-500 mb-6">
                Selecione um arquivo JSON de fluxo para começar a editar.
              </p>
              
              {/* Botão Principal */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Selecionar Arquivo JSON
              </button>
            </div>
            
            {/* Input de arquivo escondido */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    try {
                      const jsonString = event.target?.result as string
                      importarFluxo(jsonString)
                    } catch (err) {
                      console.error('Erro ao ler arquivo:', err)
                    }
                  }
                  reader.readAsText(file)
                }
                // Limpar o input para permitir selecionar o mesmo arquivo novamente
                e.target.value = ''
              }}
            />
          </div>
        )}
        
        {/* Conteúdo Principal */}
        {fluxo && !isLoading && (
          <>
            {/* Selection Bar */}
            <SelectionBar
              selectedCount={selectedMensagens.size}
              totalCount={mensagensOrdenadas.length}
              onSelectAll={selecionarTodas}
              onClearSelection={desmarcarTodas}
              onEditFirst={handleEditFirst}
              onOpenHorarios={() => setShowHorarioModal(true)}
              onOpenDescontoTexto={() => setShowDescontoTextoModal(true)}
              onOpenOrderBump={() => setShowOrderBumpLibrary(true)}
              onDeleteSelected={handleDeleteSelected}
            />
            
            {/* Grid de Mensagens */}
            <div className="pb-6">
              {mensagensOrdenadas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mensagensOrdenadas.map((mensagem) => (
                    <MensagemCard
                      key={mensagem.id}
                      mensagem={mensagem}
                      isSelected={selectedMensagens.has(mensagem.id)}
                      hasSelections={hasSelections}
                      onClick={() => handleClickCard(mensagem)}
                      onToggleSelect={() => toggleSelecionarMensagem(mensagem.id)}
                      onDuplicate={() => handleDuplicateMensagem(mensagem.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-[#161b22] border border-gray-800 rounded-lg">
                  <div className="w-14 h-14 rounded-lg bg-[#0d1117] flex items-center justify-center mb-4">
                    <FileJson className="w-7 h-7 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Nenhuma Mensagem</h3>
                  <p className="text-xs text-gray-600 mb-4">Este fluxo não possui mensagens</p>
                  <button
                    onClick={handleNovaMensagem}
                    className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Criar Primeira Mensagem
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Modais */}
      {mensagemEditando && (
        <MensagemEditor
          isOpen={true}
          mensagem={mensagemEditando}
          onClose={handleCloseEditor}
          onSave={handleSaveMensagem}
        />
      )}
      
      <HorarioModal
        isOpen={showHorarioModal}
        mensagens={mensagensOrdenadas}
        selectedIds={selectedMensagens}
        onClose={() => setShowHorarioModal(false)}
        onApplyMultiple={handleApplyMultipleHorarios}
      />
      
      <DescontoTextoModal
        isOpen={showDescontoTextoModal}
        mensagens={mensagensOrdenadas}
        selectedIds={selectedMensagens}
        onClose={() => setShowDescontoTextoModal(false)}
        onApply={handleApplyDescontoTexto}
      />
      
      <OrderBumpLibrary
        isOpen={showOrderBumpLibrary}
        orderBumps={orderBumpsLibrary}
        selectedMensagensCount={selectedMensagens.size}
        onClose={() => setShowOrderBumpLibrary(false)}
        onCreate={handleCreateOrderBump}
        onEdit={handleEditOrderBump}
        onDuplicate={handleDuplicateOrderBump}
        onDelete={handleDeleteOrderBump}
        onApplyToSelected={handleApplyOrderBumpToSelected}
      />
      
      <UpsellLibrary
        isOpen={showUpsellLibrary}
        upsells={upsellsLibrary || []}
        selectedMensagensCount={selectedMensagens.size}
        totalMensagens={mensagensOrdenadas.length}
        onClose={() => setShowUpsellLibrary(false)}
        onCreate={handleCreateUpsell}
        onEdit={handleEditUpsell}
        onDuplicate={handleDuplicateUpsell}
        onDelete={handleDeleteUpsell}
        onApplyToSelected={handleApplyUpsellToSelected}
        onApplyToAllFromSecond={handleApplyUpsellToAllFromSecond}
      />
      
      <OrderBumpEditor
        isOpen={showOrderBumpEditor}
        orderBump={orderBumpEditando}
        onClose={() => {
          setShowOrderBumpEditor(false)
          setOrderBumpEditando(null)
        }}
        onSave={handleSaveOrderBump}
      />
      
      <UpsellEditor
        isOpen={showUpsellEditor}
        upsell={upsellEditando}
        onClose={() => {
          setShowUpsellEditor(false)
          setUpsellEditando(null)
        }}
        onSave={handleSaveUpsell}
      />
      
      <BulkCopyModal
        isOpen={showBulkCopyModal}
        planosBase={planosBase}
        onClose={() => setShowBulkCopyModal(false)}
        onAdd={adicionarMensagensEmMassa}
      />
      
      <BotoesLibrary
        isOpen={showBotoesLibrary}
        botoes={fluxo?.botoesLibrary || []}
        botoesReconhecidos={botoesReconhecidos}
        selectedMensagensCount={selectedMensagens.size}
        onClose={() => setShowBotoesLibrary(false)}
        onCreate={handleCreateBotao}
        onEdit={handleEditBotao}
        onDuplicate={handleDuplicateBotao}
        onDelete={handleDeleteBotao}
        onApplyToSelected={handleApplyBotoesToSelected}
        onUpdateReconhecido={handleUpdateBotaoReconhecido}
      />
      
      <BotaoEditor
        isOpen={showBotaoEditor}
        botao={botaoEditando}
        onClose={() => {
          setShowBotaoEditor(false)
          setBotaoEditando(null)
        }}
        onSave={handleSaveBotao}
        onSaveMultiple={handleSaveMultipleBotoes}
      />
      
      <BotsManager
        isOpen={showBotsManager}
        bots={fluxo?.bots || []}
        onClose={() => setShowBotsManager(false)}
        onSave={handleSaveBots}
      />
      
    </div>
  )
}

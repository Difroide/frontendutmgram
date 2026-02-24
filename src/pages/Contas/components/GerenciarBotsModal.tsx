import { useState, useEffect, useMemo } from 'react'
import { X, Trash2, RefreshCw, Plus, Bot, Search, ChevronDown, ChevronRight, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'
import { TrocarBotModal, TrocarBotOptions } from './TrocarBotModal'
import { Conta } from '@/types/Conta'
import { botMidiaService } from '../../BotsMidia/botMidiaService'
import { contaService } from '../contaService'

interface BotEstatistica {
  botUsername: string
  tipos: string[]
  grupos: Array<{
    grupoId: string | number
    grupoNome: string
    contaNumero: string
    membros: number
    linkConvite: string | null
    tipoBot: string
  }>
  totalGrupos: number
  totalContas: number
  contas: string[]
}

interface GerenciarBotsModalProps {
  isOpen: boolean
  onClose: () => void
}

type AcaoTipo = 'adicionar' | 'remover' | 'trocar' | null

export const GerenciarBotsModal = ({ isOpen, onClose }: GerenciarBotsModalProps) => {
  const [acaoAtual, setAcaoAtual] = useState<AcaoTipo>(null)
  const [bots, setBots] = useState<BotEstatistica[]>([])
  const [loading, setLoading] = useState(false)
  const [botSelecionado, setBotSelecionado] = useState<string | null>(null)
  
  // Estados para remoção
  const [maxSessoes, setMaxSessoes] = useState(3)
  const [removendo, setRemovendo] = useState(false)
  
  // Estados para trocar bot
  const [isTrocarBotModalOpen, setIsTrocarBotModalOpen] = useState(false)
  const [contasComBot, setContasComBot] = useState<Conta[]>([])
  const [botsMidia, setBotsMidia] = useState<Array<{ id: string | number; name: string; botUsername?: string }>>([])
  
  // Estados para pesquisa e expansão
  const [pesquisa, setPesquisa] = useState('')
  const [botExpandido, setBotExpandido] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      carregarEstatisticas()
    } else {
      setAcaoAtual(null)
      setBotSelecionado(null)
      setPesquisa('')
      setBotExpandido(null)
    }
  }, [isOpen])

  const carregarEstatisticas = async () => {
    setLoading(true)
    try {
      if (!window.electron?.telegram?.getEstatisticasBotsListas) {
        console.error('Electron API não disponível')
        return
      }

      const resultado = await window.electron.telegram.getEstatisticasBotsListas()
      
      if (resultado.success) {
        setBots(resultado.bots || [])
      } else {
        alert(`Erro ao carregar estatísticas: ${resultado.error}`)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoverBot = async () => {
    if (!botSelecionado) {
      alert('Selecione um bot primeiro')
      return
    }

    const confirmacao = window.confirm(
      `Tem certeza que deseja remover fisicamente o bot @${botSelecionado} de TODOS os grupos?\n\n` +
      `Esta ação irá:\n` +
      `- Conectar nas sessões que possuem grupos com esse bot\n` +
      `- Remover o bot fisicamente de cada grupo no Telegram\n` +
      `- Atualizar os arquivos JSON\n\n` +
      `Sessões paralelas: ${maxSessoes}`
    )

    if (!confirmacao) {
      return
    }

    setRemovendo(true)

    try {
      if (!window.electron?.telegram?.removerBotTodosGrupos) {
        throw new Error('API de remoção física não disponível')
      }

      const resultado = await window.electron.telegram.removerBotTodosGrupos(botSelecionado)

      if (resultado.success) {
        alert(
          `✅ Bot removido com sucesso!\n\n` +
          `- Grupos atualizados: ${resultado.totalGruposAtualizados || 0}\n` +
          `- Contas atualizadas: ${resultado.totalContasAtualizadas || 0}`
        )
        setAcaoAtual(null)
        setBotSelecionado(null)
        await carregarEstatisticas()
      } else {
        alert(`Erro ao remover bot: ${resultado.error}`)
      }
    } catch (error) {
      console.error('Erro ao remover bot:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setRemovendo(false)
    }
  }

  const handleTrocarBot = async () => {
    if (!botSelecionado) {
      alert('Selecione um bot primeiro')
      return
    }

    // Carregar contas que têm esse bot
    try {
      const todasContas = await contaService.getAll()
      const contasComEsteBot = todasContas.filter((conta: Conta) => 
        conta.botsMidiaAdmin?.some((bot: string) => 
          bot.replace(/^@/, '').toLowerCase().trim() === botSelecionado.toLowerCase()
        )
      )
      setContasComBot(contasComEsteBot)
      
      // Carregar bots de mídia
      const bots = await botMidiaService.getAll()
      setBotsMidia(bots.map(bot => ({
        id: bot.id,
        name: bot.nome,
        botUsername: bot.username?.replace(/^@/, '')
      })))
      
      setIsTrocarBotModalOpen(true)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      alert('Erro ao carregar dados para trocar bot')
    }
  }

  const handleConfirmTrocarBot = async (options: TrocarBotOptions) => {
    try {
      if (!window.electron?.grupos?.trocarBots?.executar) {
        throw new Error('API de trocar bots não disponível')
      }

      const accountIds = contasComBot.map(conta => conta.numero)
      
      const payload = {
        accountIds,
        type: options.type,
        botsToRemove: options.botsToRemove || [],
        botsToAdd: options.botsToAdd,
        proxyId: options.proxyId ? String(options.proxyId) : null,
        maxSessoes: 3
      }

      const resultado = await window.electron.grupos.trocarBots.executar(payload)
      
      if (resultado.success) {
        alert(
          `✅ Troca de bots concluída!\n\n` +
          `- Contas processadas: ${resultado.details?.length || 0}\n` +
          `- Bots removidos: ${resultado.botsRemovidos || 0}\n` +
          `- Bots adicionados: ${resultado.botsAdicionados || 0}`
        )
        setIsTrocarBotModalOpen(false)
        setAcaoAtual(null)
        setBotSelecionado(null)
        await carregarEstatisticas()
      } else {
        alert(`Erro ao trocar bots: ${resultado.error}`)
      }
    } catch (error) {
      console.error('Erro ao trocar bots:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const getTipoLabel = (tipos: string[]) => {
    if (tipos.includes('lista') && tipos.includes('midia')) {
      return 'Lista e Mídia'
    }
    if (tipos.includes('lista')) {
      return 'Lista'
    }
    if (tipos.includes('midia')) {
      return 'Mídia'
    }
    return tipos.join(', ')
  }

  const handleCopiarLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopiado(link)
      setTimeout(() => setLinkCopiado(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar link:', error)
      alert('Erro ao copiar link')
    }
  }

  const handleAbrirLink = (link: string) => {
    if (link) {
      window.open(link, '_blank')
    }
  }

  const toggleExpandirBot = (botUsername: string) => {
    setBotExpandido(botExpandido === botUsername ? null : botUsername)
  }

  const botsFiltrados = useMemo(() => {
    if (!pesquisa.trim()) {
      return bots
    }
    
    const pesquisaLower = pesquisa.toLowerCase().trim()
    return bots.filter(bot => {
      if (bot.botUsername.toLowerCase().includes(pesquisaLower)) return true
      if (bot.grupos.some(grupo => grupo.grupoNome.toLowerCase().includes(pesquisaLower))) return true
      if (bot.contas.some(conta => conta.toLowerCase().includes(pesquisaLower))) return true
      if (bot.grupos.some(grupo => grupo.linkConvite?.toLowerCase().includes(pesquisaLower))) return true
      return false
    })
  }, [bots, pesquisa])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-100">Gerenciar Bots nos Grupos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {acaoAtual === null ? (
            // Vista principal - lista de bots
            <>
              <div className="mb-5 flex gap-3">
                <button
                  onClick={() => {
                    setAcaoAtual('adicionar')
                    alert('Funcionalidade de adicionar bot será implementada em breve')
                  }}
                  className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Bot
                </button>
                <button
                  onClick={carregarEstatisticas}
                  disabled={loading}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#21262d]/70 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-300 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* BARRA DE PESQUISA */}
              {bots.length > 0 && (
                <div className="mb-5 bg-[#161b22] p-4 rounded-lg border border-gray-800">
                  <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                    Pesquisar Bots e Grupos
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Digite para pesquisar por bot, grupo, conta ou link..."
                      value={pesquisa}
                      onChange={(e) => setPesquisa(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition-colors"
                    />
                    {pesquisa && (
                      <button
                        onClick={() => setPesquisa('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[#21262d] rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                      </button>
                    )}
                  </div>
                  {pesquisa && (
                    <div className="mt-2 text-xs font-medium">
                      {botsFiltrados.length === 0 ? (
                        <span className="text-red-400">Nenhum resultado encontrado</span>
                      ) : (
                        <span className="text-green-400">
                          {botsFiltrados.length} {botsFiltrados.length === 1 ? 'bot encontrado' : 'bots encontrados'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {loading && bots.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500" />
                  <p className="text-gray-500 mt-4 text-sm">Carregando estatísticas...</p>
                </div>
              ) : bots.length === 0 ? (
                <div className="text-center py-12 bg-[#161b22] rounded-xl border border-gray-800">
                  <Bot className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">Nenhum bot encontrado nos grupos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {botsFiltrados.map((bot) => (
                    <div
                      key={bot.botUsername}
                      className={`bg-[#161b22] rounded-lg border transition-all ${
                        botExpandido === bot.botUsername 
                          ? 'border-blue-500/50' 
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {/* Cabeçalho do Bot - CLICÁVEL PARA EXPANDIR */}
                      <div 
                        onClick={() => toggleExpandirBot(bot.botUsername)}
                        className="p-4 cursor-pointer hover:bg-[#21262d]/50 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {botExpandido === bot.botUsername ? (
                                <ChevronDown className="w-4 h-4 text-blue-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              <h3 className="text-base font-medium text-gray-100">@{bot.botUsername}</h3>
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                                {getTipoLabel(bot.tipos)}
                              </span>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500 ml-7">
                              <span>{bot.totalGrupos} grupo(s)</span>
                              <span>{bot.totalContas} conta(s)</span>
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setBotSelecionado(bot.botUsername)
                                setAcaoAtual('remover')
                              }}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remover
                            </button>
                            <button
                              onClick={() => {
                                setBotSelecionado(bot.botUsername)
                                handleTrocarBot()
                              }}
                              className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Trocar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* LISTA DE GRUPOS - APARECE QUANDO EXPANDIDO */}
                      {botExpandido === bot.botUsername && (
                        <div className="px-4 pb-4 border-t border-gray-800 pt-4">
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-1">
                              <Bot className="w-4 h-4 text-blue-400" />
                              Grupos onde @{bot.botUsername} está presente
                            </h4>
                            <p className="text-xs text-gray-600 ml-6">
                              Total: {bot.grupos.length} grupo(s)
                            </p>
                          </div>
                          {bot.grupos.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm">
                              <p>Nenhum grupo encontrado para este bot</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                              {bot.grupos.map((grupo, idx) => (
                                <div
                                  key={`${grupo.contaNumero}-${grupo.grupoId}-${idx}`}
                                  className="bg-[#0d1117] rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-gray-200 font-medium mb-2 text-sm">
                                        {grupo.grupoNome}
                                      </div>
                                      <div className="flex flex-col gap-1.5 text-xs">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="bg-[#161b22] px-2 py-0.5 rounded text-gray-400 border border-gray-800">
                                            Conta: <span className="text-gray-300">{grupo.contaNumero}</span>
                                          </span>
                                          <span className="bg-[#161b22] px-2 py-0.5 rounded text-gray-400 border border-gray-800">
                                            {grupo.membros} membros
                                          </span>
                                          <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-400 border border-blue-500/30">
                                            {grupo.tipoBot}
                                          </span>
                                        </div>
                                        {grupo.linkConvite ? (
                                          <div className="flex items-center gap-2 mt-1 bg-[#161b22] p-2 rounded border border-gray-800">
                                            <span className="text-gray-600 text-xs">Link:</span>
                                            <a
                                              href={grupo.linkConvite}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-400 hover:text-blue-300 truncate flex items-center gap-1 max-w-xs text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleAbrirLink(grupo.linkConvite || '')
                                              }}
                                            >
                                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">{grupo.linkConvite}</span>
                                            </a>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleCopiarLink(grupo.linkConvite || '')
                                              }}
                                              className="p-1 hover:bg-[#21262d] rounded transition-colors flex-shrink-0"
                                              title="Copiar link"
                                            >
                                              {linkCopiado === grupo.linkConvite ? (
                                                <Check className="w-3.5 h-3.5 text-green-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                                              )}
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-gray-600 italic text-xs mt-1">Sem link de convite</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : acaoAtual === 'remover' && botSelecionado ? (
            // Vista de remoção
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Remover Bot: @{botSelecionado}</h3>
                <p className="text-gray-500 text-sm">
                  Configure quantas sessões paralelas deseja usar para remover o bot de todos os grupos.
                </p>
              </div>

              <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                  Sessões Paralelas
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxSessoes}
                  onChange={(e) => setMaxSessoes(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Quantas sessões processar simultaneamente (1-10)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRemoverBot}
                  disabled={removendo}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {removendo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirmar Remoção
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAcaoAtual(null)
                    setBotSelecionado(null)
                  }}
                  disabled={removendo}
                  className="px-4 py-2.5 bg-[#21262d] hover:bg-[#21262d]/70 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-300 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal Trocar Bot */}
      {isTrocarBotModalOpen && botSelecionado && (
        <TrocarBotModal
          isOpen={isTrocarBotModalOpen}
          onClose={() => {
            setIsTrocarBotModalOpen(false)
            setBotSelecionado(null)
            setAcaoAtual(null)
            setContasComBot([])
          }}
          onConfirm={handleConfirmTrocarBot}
          selectedContas={contasComBot}
          botsMidia={botsMidia}
          botPreSelecionado={botSelecionado}
        />
      )}
    </div>
  )
}

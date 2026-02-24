import { useState, useEffect, useMemo } from 'react'
import { Trash2, RefreshCw, ArrowLeft, Bot, ChevronDown, ChevronRight, ExternalLink, Copy, Check, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TrocarBotModal, TrocarBotOptions } from './components/TrocarBotModal'
import { contaService } from './contaService'
import { Conta } from '@/types/Conta'
import { botMidiaService } from '../BotsMidia/botMidiaService'

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

export default function GerenciarBotsGrupos() {
  const navigate = useNavigate()
  const [bots, setBots] = useState<BotEstatistica[]>([])
  const [loading, setLoading] = useState(false)
  const [isTrocarBotModalOpen, setIsTrocarBotModalOpen] = useState(false)
  const [botSelecionadoParaTrocar, setBotSelecionadoParaTrocar] = useState<string | null>(null)
  const [contasComBot, setContasComBot] = useState<Conta[]>([])
  const [botsMidia, setBotsMidia] = useState<Array<{ id: string | number; name: string; botUsername?: string }>>([])
  const [botExpandido, setBotExpandido] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)
  const [pesquisa, setPesquisa] = useState('')

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

  useEffect(() => {
    carregarEstatisticas()
  }, [])

  const handleRemoverBot = async (botUsername: string) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja remover o bot @${botUsername} de TODOS os grupos?\n\n` +
      `Esta ação removerá o bot dos arquivos JSON, mas NÃO removerá fisicamente do Telegram.\n` +
      `Use a função "Trocar Bot" para remover fisicamente.`
    )

    if (!confirmacao) {
      return
    }

    setLoading(true)
    try {
      if (!window.electron?.telegram?.removerBotTodosGrupos) {
        console.error('Electron API não disponível')
        return
      }

      const resultado = await window.electron.telegram.removerBotTodosGrupos(botUsername)
      
      if (resultado.success) {
        alert(
          `✅ Bot removido com sucesso!\n\n` +
          `- Grupos atualizados: ${resultado.totalGruposAtualizados}\n` +
          `- Contas atualizadas: ${resultado.totalContasAtualizadas}`
        )
        await carregarEstatisticas()
      } else {
        alert(`Erro ao remover bot: ${resultado.error}`)
      }
    } catch (error) {
      console.error('Erro ao remover bot:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTrocarBot = async (botUsername: string) => {
    setBotSelecionadoParaTrocar(botUsername)
    
    try {
      const todasContas = await contaService.getAll()
      const contasComEsteBot = todasContas.filter((conta: Conta) => 
        conta.botsMidiaAdmin?.some((bot: string) => 
          bot.replace(/^@/, '').toLowerCase().trim() === botUsername.toLowerCase()
        )
      )
      setContasComBot(contasComEsteBot)
      
      const bots = await botMidiaService.getAll()
      setBotsMidia(bots.map(bot => ({
        id: bot.id,
        name: bot.nome,
        botUsername: bot.username?.replace(/^@/, '')
      })))
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    }
    
    setIsTrocarBotModalOpen(true)
  }

  const handleConfirmTrocarBot = async (options: TrocarBotOptions) => {
    try {
      if (!window.electron?.grupos?.trocarBots || !window.electron.grupos.trocarBots.executar) {
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
        setBotSelecionadoParaTrocar(null)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/contas')}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Bot className="w-8 h-8" />
                Gerenciar Bots nos Grupos
              </h1>
              <p className="text-gray-400 mt-1">
                Visualize e gerencie bots adicionados aos grupos das contas
              </p>
            </div>
          </div>
          <button
            onClick={carregarEstatisticas}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* BARRA DE PESQUISA - SEMPRE VISÍVEL */}
        <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <label className="block text-sm font-semibold text-white mb-3">
            🔍 Pesquisar Bots e Grupos
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Digite para pesquisar por bot, grupo, conta ou link..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-900 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {pesquisa && (
              <button
                onClick={() => setPesquisa('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>
          {pesquisa && (
            <div className="mt-3 text-sm font-medium">
              {botsFiltrados.length === 0 ? (
                <span className="text-red-400">❌ Nenhum resultado encontrado</span>
              ) : (
                <span className="text-green-400">
                  ✅ {botsFiltrados.length} {botsFiltrados.length === 1 ? 'bot encontrado' : 'bots encontrados'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Resumo */}
        {bots.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Total de Bots</div>
              <div className="text-2xl font-bold text-white mt-1">
                {pesquisa ? botsFiltrados.length : bots.length}
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Total de Grupos</div>
              <div className="text-2xl font-bold text-white mt-1">
                {(pesquisa ? botsFiltrados : bots).reduce((sum, bot) => sum + bot.totalGrupos, 0)}
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Total de Contas</div>
              <div className="text-2xl font-bold text-white mt-1">
                {new Set((pesquisa ? botsFiltrados : bots).flatMap(bot => bot.contas)).size}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Bots */}
        {loading && bots.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-400 mt-4">Carregando estatísticas...</p>
          </div>
        ) : botsFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400">
              {pesquisa ? 'Nenhum bot encontrado para a pesquisa' : 'Nenhum bot encontrado nos grupos'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {botsFiltrados.map((bot) => (
              <div
                key={bot.botUsername}
                className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 transition-all ${
                  botExpandido === bot.botUsername 
                    ? 'border-blue-500 shadow-xl shadow-blue-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Cabeçalho do Bot - CLICÁVEL PARA EXPANDIR */}
                <div 
                  onClick={() => toggleExpandirBot(bot.botUsername)}
                  className="p-6 cursor-pointer hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {botExpandido === bot.botUsername ? (
                          <ChevronDown className="w-6 h-6 text-blue-400" />
                        ) : (
                          <ChevronRight className="w-6 h-6 text-gray-400" />
                        )}
                        <h3 className="text-xl font-bold text-white">@{bot.botUsername}</h3>
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-semibold">
                          {getTipoLabel(bot.tipos)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-400 ml-9">
                        <span className="font-medium">{bot.totalGrupos} grupo(s)</span>
                        <span className="font-medium">{bot.totalContas} conta(s)</span>
                      </div>
                      {botExpandido !== bot.botUsername && (
                        <div className="mt-2 text-xs text-blue-400 ml-9 font-medium animate-pulse">
                          👆 CLIQUE AQUI para ver os {bot.totalGrupos} grupos
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleTrocarBot(bot.botUsername)}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm flex items-center gap-2 transition-colors font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Trocar
                      </button>
                      <button
                        onClick={() => handleRemoverBot(bot.botUsername)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm flex items-center gap-2 transition-colors font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>

                {/* LISTA DE GRUPOS - APARECE QUANDO EXPANDIDO */}
                {botExpandido === bot.botUsername && (
                  <div className="px-6 pb-6 border-t-2 border-blue-500/50 pt-6 bg-gray-900/50">
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                        <Bot className="w-5 h-5 text-blue-400" />
                        Grupos onde @{bot.botUsername} está presente
                      </h4>
                      <p className="text-sm text-gray-400 ml-7">
                        Total: {bot.grupos.length} grupo(s)
                      </p>
                    </div>
                    {bot.grupos.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p>Nenhum grupo encontrado para este bot</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {bot.grupos.map((grupo, idx) => (
                          <div
                            key={`${grupo.contaNumero}-${grupo.grupoId}-${idx}`}
                            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold mb-3 text-base">
                                  {grupo.grupoNome}
                                </div>
                                <div className="flex flex-col gap-2 text-sm text-gray-400">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-gray-700 px-2 py-1 rounded">
                                      Conta: <span className="text-white font-medium">{grupo.contaNumero}</span>
                                    </span>
                                    <span className="bg-gray-700 px-2 py-1 rounded">
                                      {grupo.membros} membros
                                    </span>
                                    <span className="bg-blue-600/20 px-2 py-1 rounded text-blue-300">
                                      {grupo.tipoBot}
                                    </span>
                                  </div>
                                  {grupo.linkConvite ? (
                                    <div className="flex items-center gap-2 mt-2 bg-gray-900/50 p-2 rounded">
                                      <span className="text-gray-500 text-xs">Link:</span>
                                      <a
                                        href={grupo.linkConvite}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 truncate flex items-center gap-1 max-w-md font-medium"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleAbrirLink(grupo.linkConvite || '')
                                        }}
                                      >
                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{grupo.linkConvite}</span>
                                      </a>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCopiarLink(grupo.linkConvite || '')
                                        }}
                                        className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                        title="Copiar link"
                                      >
                                        {linkCopiado === grupo.linkConvite ? (
                                          <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 italic text-xs mt-2">Sem link de convite</span>
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

        {/* Modal Trocar Bot */}
        {isTrocarBotModalOpen && botSelecionadoParaTrocar && (
          <TrocarBotModal
            isOpen={isTrocarBotModalOpen}
            onClose={() => {
              setIsTrocarBotModalOpen(false)
              setBotSelecionadoParaTrocar(null)
              setContasComBot([])
            }}
            onConfirm={handleConfirmTrocarBot}
            selectedContas={contasComBot}
            botsMidia={botsMidia}
          />
        )}
      </div>
    </div>
  )
}

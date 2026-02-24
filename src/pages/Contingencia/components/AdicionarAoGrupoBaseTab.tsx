import { useState, useEffect } from 'react'
import { Plus, Bot, RefreshCw, CheckCircle, Copy, Link as LinkIcon, ExternalLink, Tag } from 'lucide-react'

interface SessaoComGrupoBase {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  dataCriacao: string
  grupoId?: string
  grupoAccessHash?: string
  mensagensLinks?: string[]
  tag?: string | null
  tagsConta?: string[]
}

interface Categoria {
  id: string
  nome: string
  descricao?: string
  rodando?: boolean
}

interface BotCategoria {
  nome: string
  username: string
  token: string | null
  createdAt: string
}

export const AdicionarAoGrupoBaseTab = () => {
  const [sessoesComGrupoBase, setSessoesComGrupoBase] = useState<SessaoComGrupoBase[]>([])
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string>('')
  const [grupoSelecionado, setGrupoSelecionado] = useState<SessaoComGrupoBase | null>(null)
  const [botsInput, setBotsInput] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultado, setResultado] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [linksMensagens, setLinksMensagens] = useState<string[]>([])
  const [carregandoLinks, setCarregandoLinks] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [botsCategoria, setBotsCategoria] = useState<BotCategoria[]>([])
  const [carregandoBots, setCarregandoBots] = useState(false)

  const loadSessoesComGrupoBase = async () => {
    setIsLoading(true)
    try {
      if (!window.electron?.contingencia?.listarSessoesComGrupoBase) {
        console.warn('API contingencia.listarSessoesComGrupoBase não disponível')
        return
      }

      const result = await window.electron.contingencia.listarSessoesComGrupoBase()
      if (result.success) {
        setSessoesComGrupoBase(result.sessoes || [])
        if (result.sessoes && result.sessoes.length > 0 && !sessaoSelecionada) {
          setSessaoSelecionada(result.sessoes[0].sessionPath)
          setGrupoSelecionado(result.sessoes[0])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sessões com grupo base:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessoesComGrupoBase()
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        const categoriasFiltradas = (data || []).filter((cat: Categoria) => !cat.rodando)
        setCategorias(categoriasFiltradas)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  useEffect(() => {
    if (categoriaSelecionada) {
      const loadAndAdd = async () => {
        if (!categoriaSelecionada) return

        setCarregandoBots(true)
        try {
          if ((window as any).electron?.criador?.carregarBotsCategoria) {
            const data = await (window as any).electron.criador.carregarBotsCategoria(categoriaSelecionada)
            setBotsCategoria(data || [])

            if (data && data.length > 0) {
              setBotsInput((botsAtuais) => {
                const botsArrayAtuais = botsAtuais
                  .split(/[,\n]/)
                  .map((b) => b.trim().replace(/^@/, ''))
                  .filter((b) => b.length > 0)
                const novosBots: string[] = []

                data.forEach((bot: any) => {
                  const usernameRaw = bot.username || ''
                  if (!usernameRaw.trim()) return

                  const usernameSemArroba = usernameRaw.trim().replace(/^@/, '')
                  if (!usernameSemArroba) return

                  if (!botsArrayAtuais.includes(usernameSemArroba)) {
                    novosBots.push(`@${usernameSemArroba}`)
                  }
                })

                if (novosBots.length > 0) {
                  if (botsAtuais.trim()) {
                    return `${botsAtuais}\n${novosBots.join('\n')}`
                  } else {
                    return novosBots.join('\n')
                  }
                }

                return botsAtuais
              })
            }
          }
        } catch (error) {
          console.error('Erro ao carregar bots da categoria:', error)
          setBotsCategoria([])
        } finally {
          setCarregandoBots(false)
        }
      }

      loadAndAdd()
    } else {
      setBotsCategoria([])
    }
  }, [categoriaSelecionada])

  const hasValidBots = () => {
    if (!botsInput.trim()) return false
    const botsArray = botsInput
      .split(/[,\n]/)
      .map((b) => b.trim().replace(/^@+/, ''))
      .filter((b) => b.length > 0)
    return botsArray.length > 0
  }

  const loadLinksMensagens = async (sessionPath: string) => {
    setCarregandoLinks(true)
    try {
      if (window.electron?.contingencia?.obterLinksMensagens) {
        const result = await window.electron.contingencia.obterLinksMensagens(sessionPath)
        if (result.success) {
          setLinksMensagens(result.links || [])
        } else {
          setLinksMensagens([])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar links das mensagens:', error)
      setLinksMensagens([])
    } finally {
      setCarregandoLinks(false)
    }
  }

  useEffect(() => {
    if (sessaoSelecionada) {
      const sessao = sessoesComGrupoBase.find((s) => s.sessionPath === sessaoSelecionada)
      if (sessao) {
        setGrupoSelecionado(sessao)
        loadLinksMensagens(sessaoSelecionada)
      }
    } else {
      setLinksMensagens([])
    }
  }, [sessaoSelecionada, sessoesComGrupoBase])

  const copiarLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
    } catch (error) {
      console.error('Erro ao copiar link:', error)
    }
  }

  const copiarTodosLinks = async () => {
    try {
      const todosLinks = linksMensagens.join('\n')
      await navigator.clipboard.writeText(todosLinks)
      alert(`✅ ${linksMensagens.length} link(s) copiado(s)!`)
    } catch (error) {
      console.error('Erro ao copiar todos os links:', error)
    }
  }

  const handleAdicionarBots = async () => {
    if (!grupoSelecionado) {
      alert('Selecione um grupo base primeiro')
      return
    }

    const botsArray = botsInput
      .split(/[,\n]/)
      .map((b) => b.trim().replace(/^@+/, ''))
      .filter((b) => b.length > 0)

    if (botsArray.length === 0) {
      alert('Adicione pelo menos um bot ou usuário')
      return
    }

    setIsProcessing(true)
    setResultado(null)

    try {
      if (!window.electron?.contingencia?.adicionarBotsAoGrupoBase) {
        throw new Error('API não disponível')
      }

      const result = await window.electron.contingencia.adicionarBotsAoGrupoBase({
        sessionPath: grupoSelecionado.sessionPath,
        grupoLink: grupoSelecionado.groupLink,
        bots: botsArray,
      })

      if (result.success) {
        setResultado({
          success: true,
          message: `✅ ${result.botsAdicionados || botsArray.length} bot(s)/usuário(s) adicionado(s) como admin(s)!`,
        })
        setBotsInput('')
        setCategoriaSelecionada('')
      } else {
        setResultado({
          success: false,
          error: result.error || 'Erro desconhecido',
        })
      }
    } catch (error: any) {
      console.error('Erro ao adicionar bots:', error)
      setResultado({
        success: false,
        error: error.message || 'Erro ao adicionar bots',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Informações */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <h2 className="text-lg font-medium text-gray-100 mb-1">Adicionar Bots ao Grupo Base</h2>
        <p className="text-sm text-gray-500">Selecione uma sessão que possui grupo base criado e adicione bots ou usuários como administradores no grupo.</p>
      </div>

      {/* Seleção de Sessão e Grupo */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Sessões com Grupo Base</h3>
          <button
            onClick={loadSessoesComGrupoBase}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-center py-4 text-sm">Carregando sessões...</p>
        ) : sessoesComGrupoBase.length === 0 ? (
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
            <p className="text-amber-300 text-sm">Nenhuma sessão com grupo base encontrada. Crie um grupo base primeiro usando o Clonador Base.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Selecionar Sessão</label>
              <select
                value={sessaoSelecionada}
                onChange={(e) => setSessaoSelecionada(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600"
              >
                <option value="">Selecione uma sessão...</option>
                {sessoesComGrupoBase.map((sessao) => (
                  <option key={sessao.sessionPath} value={sessao.sessionPath}>
                    {sessao.sessionName} - {sessao.grupoNome}
                  </option>
                ))}
              </select>
            </div>

            {grupoSelecionado && (
              <div className="bg-[#0d1117] border border-gray-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-200">Grupo Base Selecionado</h4>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    <span className="text-gray-500">Nome:</span> {grupoSelecionado.grupoNome}
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500">Link:</span>{' '}
                    <a href={grupoSelecionado.groupLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                      {grupoSelecionado.groupLink}
                    </a>
                  </p>
                  <p className="text-xs text-gray-600">Criado em: {new Date(grupoSelecionado.dataCriacao).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adicionar Bots */}
      {grupoSelecionado && (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-500" />
            Adicionar Bots/Usuários como Administradores
          </h3>

          {/* Seleção de Categoria */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Selecionar Categoria (Opcional)
            </label>
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600"
              disabled={isProcessing}
            >
              <option value="">Nenhuma categoria selecionada</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">Selecione uma categoria para adicionar automaticamente os bots no campo abaixo.</p>
          </div>

          {/* Lista de Bots da Categoria */}
          {categoriaSelecionada && (
            <div className="bg-[#0d1117] border border-gray-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Bot className="w-3 h-3" />
                  Bots da Categoria
                  {carregandoBots && <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />}
                </h4>
                {botsCategoria.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-900/30 border border-emerald-800/30 text-emerald-400 rounded">
                    {botsCategoria.length} bot{botsCategoria.length > 1 ? 's' : ''} adicionado{botsCategoria.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {carregandoBots ? (
                <p className="text-gray-500 text-xs text-center py-2">Carregando bots...</p>
              ) : botsCategoria.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-2">Nenhum bot nesta categoria.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                  {botsCategoria.map((bot, index) => {
                    const usernameSemArroba = (bot.username || '').trim().replace(/^@/, '')
                    if (!usernameSemArroba) return null

                    return (
                      <div key={index} className="flex items-center justify-between p-1.5 bg-[#161b22] border border-gray-800 rounded text-xs">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Bot className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-300 truncate">@{usernameSemArroba}</span>
                        </div>
                        <span className="text-emerald-400 text-xs">✓</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Bots ou Usuários (@username)</label>
            <textarea
              value={botsInput}
              onChange={(e) => setBotsInput(e.target.value)}
              placeholder="Ex.: @bot1, @bot2, @usuario1&#10;Ou um por linha:&#10;@bot1&#10;@bot2&#10;@usuario1"
              rows={5}
              className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500 resize-none font-mono"
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-600 mt-1">Separe múltiplos bots/usuários por vírgula ou quebra de linha. O @ é opcional.</p>
          </div>

          <button
            onClick={handleAdicionarBots}
            disabled={isProcessing || !hasValidBots()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Adicionar Bots/Usuários
              </>
            )}
          </button>

          {/* Resultado */}
          {resultado && (
            <div className={`p-3 rounded-lg border ${resultado.success ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-red-900/20 border-red-800/30'}`}>
              <p className={`text-sm ${resultado.success ? 'text-emerald-300' : 'text-red-300'}`}>{resultado.success ? resultado.message : `❌ Erro: ${resultado.error}`}</p>
            </div>
          )}
        </div>
      )}

      {/* Painel de Links das Mensagens */}
      {grupoSelecionado && (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-500" />
              Links das Mensagens do Grupo Base
            </h3>
            {linksMensagens.length > 0 && (
              <button
                onClick={copiarTodosLinks}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Todos ({linksMensagens.length})
              </button>
            )}
          </div>

          {carregandoLinks ? (
            <p className="text-gray-500 text-center py-4 text-sm">Carregando links...</p>
          ) : linksMensagens.length === 0 ? (
            <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
              <p className="text-amber-300 text-sm">Nenhum link de mensagem encontrado.</p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {linksMensagens.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-[#0d1117] border border-gray-700/50 rounded-lg hover:bg-[#21262d] transition-colors group">
                    <span className="flex-1 text-xs text-gray-400 font-mono truncate">{link}</span>
                    <div className="flex items-center gap-1">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Abrir">
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      </a>
                      <button onClick={() => copiarLink(link)} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Copiar">
                        <Copy className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center">Total: {linksMensagens.length} mensagem(ns) clonada(s)</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

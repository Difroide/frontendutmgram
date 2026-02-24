import { useState, useEffect } from 'react'
import {
  UserPlus,
  RefreshCw,
  Search,
  X,
  Users,
  Bot,
  CheckCircle,
  AlertCircle,
  Plus,
  Crown,
  AtSign,
  ExternalLink,
} from 'lucide-react'

interface Sessao {
  path: string
  name: string
  tag?: string | null
}

interface GrupoVip {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  grupoId: string
  grupoAccessHash: string
  dataCriacao?: string
  tag?: string
}

export default function AdicionarAoGrupoVIP() {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [gruposVip, setGruposVip] = useState<GrupoVip[]>([])
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('')
  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('')
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [grupoSearchTerm, setGrupoSearchTerm] = useState<string>('')
  const [showGrupoDropdown, setShowGrupoDropdown] = useState(false)

  // Para adicionar admins
  const [adminSessionPaths, setAdminSessionPaths] = useState<string[]>([])
  const [botUsernames, setBotUsernames] = useState<string>('')
  const [userUsernames, setUserUsernames] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultado, setResultado] = useState<{ success: boolean; mensagem?: string; error?: string } | null>(null)

  const loadSessoes = async () => {
    try {
      const result = await window.electron?.contingencia?.listarSessoes(null)
      if (result?.success) {
        setSessoes((result.sessions || []) as Sessao[])
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    }
  }

  const loadGruposVip = async () => {
    try {
      const result = await window.electron?.contingencia?.listarGruposVip?.()
      if (result?.success) {
        setGruposVip(result.grupos || [])
      }
    } catch (error) {
      console.error('Erro ao carregar grupos VIP:', error)
    }
  }

  useEffect(() => {
    loadSessoes()
    loadGruposVip()
  }, [])

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.session-dropdown-container')) {
        setShowSessionDropdown(false)
      }
      if (!target.closest('.grupo-dropdown-container')) {
        setShowGrupoDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const grupoAtual = gruposVip.find((g) => g.grupoId === grupoSelecionado)

  const handleAdicionarAdmins = async () => {
    if (!grupoAtual) {
      alert('Selecione um grupo VIP')
      return
    }
    if (adminSessionPaths.length === 0 && !botUsernames.trim() && !userUsernames.trim()) {
      alert('Selecione pelo menos uma sessão, digite um username de bot ou usuário')
      return
    }

    setIsProcessing(true)
    setResultado(null)

    try {
      if (!window.electron?.contingencia?.adicionarAdmins) {
        throw new Error('API não disponível')
      }

      const bots = botUsernames
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0)

      const users = userUsernames
        .split(',')
        .map((u) => u.trim().replace('@', ''))
        .filter((u) => u.length > 0)

      const result = await window.electron.contingencia.adicionarAdmins({
        ownerSessionPath: grupoAtual.sessionPath,
        grupoId: grupoAtual.grupoId,
        grupoAccessHash: grupoAtual.grupoAccessHash,
        adminSessionPaths,
        botUsernames: bots,
        userUsernames: users,
      })

      setResultado(result)

      if (result.success) {
        setAdminSessionPaths([])
        setBotUsernames('')
        setUserUsernames('')
      }
    } catch (error) {
      console.error('Erro ao adicionar admins:', error)
      setResultado({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredSessoes = sessionSearchTerm
    ? sessoes.filter((s) => {
        const searchLower = sessionSearchTerm.toLowerCase()
        return s.name.toLowerCase().includes(searchLower) || s.path.toLowerCase().includes(searchLower) || s.tag?.toLowerCase().includes(searchLower)
      })
    : sessoes

  const filteredGrupos = grupoSearchTerm
    ? gruposVip.filter((g) => {
        const searchLower = grupoSearchTerm.toLowerCase()
        return g.grupoNome.toLowerCase().includes(searchLower) || g.sessionName?.toLowerCase().includes(searchLower) || g.tag?.toLowerCase().includes(searchLower)
      })
    : gruposVip

  return (
    <div className="min-h-screen -m-6 p-6 bg-[#0d1117]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-gray-400" />
              Adicionar Admins
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Adicione sessões, bots ou usuários como admins aos grupos VIP</p>
          </div>

          <button
            onClick={() => {
              loadSessoes()
              loadGruposVip()
            }}
            className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] text-gray-300 text-sm border border-gray-700/50 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda - Seleção do Grupo */}
        <div className="space-y-4">
          {/* Seleção de Grupo VIP */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Grupo VIP
            </label>

            <div className="relative grupo-dropdown-container">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={grupoSearchTerm || grupoAtual?.grupoNome || ''}
                  onChange={(e) => {
                    setGrupoSearchTerm(e.target.value)
                    setShowGrupoDropdown(true)
                    if (!e.target.value) {
                      setGrupoSelecionado('')
                    }
                  }}
                  onFocus={() => setShowGrupoDropdown(true)}
                  onClick={() => setShowGrupoDropdown(true)}
                  placeholder="Pesquisar grupo VIP..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                  autoComplete="off"
                  disabled={isProcessing}
                />
                {(grupoSearchTerm || grupoSelecionado) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setGrupoSearchTerm('')
                      setGrupoSelecionado('')
                      setShowGrupoDropdown(true)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showGrupoDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-[#161b22] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredGrupos.length === 0 ? (
                    <div className="px-4 py-3 text-center text-gray-500 text-sm">
                      {gruposVip.length === 0 ? 'Nenhum grupo VIP cadastrado' : 'Nenhum grupo encontrado'}
                    </div>
                  ) : (
                    filteredGrupos.map((grupo) => (
                      <button
                        key={grupo.grupoId}
                        onClick={() => {
                          setGrupoSelecionado(grupo.grupoId)
                          setGrupoSearchTerm(grupo.grupoNome)
                          setShowGrupoDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-[#21262d] text-gray-200 transition-colors border-b border-gray-800 last:border-b-0 ${
                          grupoSelecionado === grupo.grupoId ? 'bg-[#21262d] border-l-2 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="text-sm truncate">{grupo.grupoNome}</div>
                        <div className="text-xs text-gray-500 truncate">por {grupo.sessionName}</div>
                        {grupo.tag && <span className="inline-block mt-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{grupo.tag}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {grupoAtual && (
              <div className="mt-4 bg-[#0d1117] rounded-lg p-3 border border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-200">{grupoAtual.grupoNome}</div>
                    <div className="text-xs text-gray-500 mt-0.5">por {grupoAtual.sessionName}</div>
                  </div>
                  <a href={grupoAtual.groupLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-[#21262d] rounded-lg transition-colors" title="Abrir grupo">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Aviso se não há grupos */}
          {gruposVip.length === 0 && (
            <div className="bg-[#161b22] rounded-lg border border-amber-600/30 p-4">
              <p className="text-amber-300/70 text-sm">Nenhum grupo VIP cadastrado. Use o Clonador VIP primeiro.</p>
            </div>
          )}

          {/* Info do que será adicionado */}
          {(adminSessionPaths.length > 0 || botUsernames.trim() || userUsernames.trim()) && (
            <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Resumo</div>
              <div className="space-y-2 text-sm">
                {adminSessionPaths.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Sessões</span>
                    <span className="text-emerald-400">{adminSessionPaths.length}</span>
                  </div>
                )}
                {userUsernames.trim() && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Usuários</span>
                    <span className="text-purple-400">
                      {
                        userUsernames
                          .split(',')
                          .map((u) => u.trim())
                          .filter((u) => u.length > 0).length
                      }
                    </span>
                  </div>
                )}
                {botUsernames.trim() && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Bots</span>
                    <span className="text-blue-400">
                      {
                        botUsernames
                          .split(',')
                          .map((b) => b.trim())
                          .filter((b) => b.length > 0).length
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita - Adicionar Admins */}
        <div className="space-y-4">
          {/* Selecionar Sessões */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Sessões para admin
            </label>

            <div className="relative session-dropdown-container mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={sessionSearchTerm}
                  onChange={(e) => {
                    setSessionSearchTerm(e.target.value)
                    setShowSessionDropdown(true)
                  }}
                  onFocus={() => setShowSessionDropdown(true)}
                  placeholder="Pesquisar sessão..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                  autoComplete="off"
                  disabled={isProcessing || !grupoSelecionado}
                />
              </div>

              {showSessionDropdown && grupoSelecionado && (
                <div className="absolute z-20 w-full mt-1 bg-[#161b22] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredSessoes.length === 0 ? (
                    <div className="px-4 py-3 text-center text-gray-500 text-sm">Nenhuma sessão encontrada</div>
                  ) : (
                    filteredSessoes
                      .filter((s) => s.path !== grupoAtual?.sessionPath)
                      .slice(0, 30)
                      .map((sessao) => (
                        <button
                          key={sessao.path}
                          onClick={() => {
                            if (!adminSessionPaths.includes(sessao.path)) {
                              setAdminSessionPaths([...adminSessionPaths, sessao.path])
                            }
                            setSessionSearchTerm('')
                            setShowSessionDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-[#21262d] text-gray-200 transition-colors border-b border-gray-800 last:border-b-0 ${
                            adminSessionPaths.includes(sessao.path) ? 'bg-emerald-600/10' : ''
                          }`}
                        >
                          <div className="text-sm truncate flex items-center gap-2">
                            {sessao.name}
                            {adminSessionPaths.includes(sessao.path) && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          {sessao.tag && <span className="text-xs text-gray-500">{sessao.tag}</span>}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* Sessões Selecionadas */}
            {adminSessionPaths.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-emerald-400 mb-2">{adminSessionPaths.length} selecionada(s)</div>
                {adminSessionPaths.map((path) => {
                  const sessao = sessoes.find((s) => s.path === path)
                  return (
                    <div key={path} className="flex items-center justify-between bg-[#0d1117] rounded-lg px-3 py-2 border border-gray-800">
                      <span className="text-sm text-gray-300 truncate">{sessao?.name || path}</span>
                      <button onClick={() => setAdminSessionPaths(adminSessionPaths.filter((p) => p !== path))} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Usuários */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" />
              Usuários para admin
            </label>
            <input
              type="text"
              value={userUsernames}
              onChange={(e) => setUserUsernames(e.target.value)}
              placeholder="@usuario1, @usuario2, @usuario3"
              className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
              disabled={isProcessing || !grupoSelecionado}
            />
            <p className="text-xs text-gray-600 mt-2">Separados por vírgula</p>
          </div>

          {/* Bots */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              Bots para admin
            </label>
            <input
              type="text"
              value={botUsernames}
              onChange={(e) => setBotUsernames(e.target.value)}
              placeholder="@bot1, @bot2, @bot3"
              className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
              disabled={isProcessing || !grupoSelecionado}
            />
            <p className="text-xs text-gray-600 mt-2">Separados por vírgula</p>
          </div>

          {/* Botão Executar */}
          <button
            onClick={handleAdicionarAdmins}
            disabled={isProcessing || !grupoSelecionado || (adminSessionPaths.length === 0 && !botUsernames.trim() && !userUsernames.trim())}
            className="w-full px-4 py-3 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Adicionar Admins
              </>
            )}
          </button>

          {/* Resultado */}
          {resultado && (
            <div className={`bg-[#161b22] rounded-lg border p-4 ${resultado.success ? 'border-emerald-600/30' : 'border-red-600/30'}`}>
              {resultado.success ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-medium text-emerald-400">Sucesso</h3>
                    <p className="text-emerald-300/70 text-sm">{resultado.mensagem || 'Admins adicionados'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-400">Erro</h3>
                    <p className="text-red-300/70 text-sm">{resultado.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

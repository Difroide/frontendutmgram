import { useState, useEffect } from 'react'
import { Users, Edit2, Tag, ExternalLink, RefreshCw, Save, X, Search, Plus, Trash2 } from 'lucide-react'

interface GrupoBase {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  dataCriacao: string
  grupoId: string
  grupoAccessHash: string
  tag: string | null
}

interface SessaoInfo {
  path: string
  name: string
  tag: string | null
  tagsConta?: string[]
}

interface TagItem {
  id: string
  nome: string
  cor: string
  descricao?: string
}

export default function GerenciarGruposBase() {
  const [grupos, setGrupos] = useState<GrupoBase[]>([])
  const [sessoesInfo, setSessoesInfo] = useState<Record<string, SessaoInfo>>({})
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTag, setEditTag] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newSessionPath, setNewSessionPath] = useState('')
  const [newGroupLink, setNewGroupLink] = useState('')
  const [sessoes, setSessoes] = useState<Array<{ path: string; name: string }>>([])
  const [cadastrando, setCadastrando] = useState(false)
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)

  useEffect(() => {
    loadGrupos()
    loadTags()
    loadSessoes()
    loadSessoesInfo()
  }, [])

  const loadSessoesInfo = async () => {
    try {
      if ((window as any).electron?.contingencia?.listarSessoes) {
        const result = await (window as any).electron.contingencia.listarSessoes(null)
        if (result.success && result.sessions) {
          const infoMap: Record<string, SessaoInfo> = {}
          result.sessions.forEach((s: SessaoInfo) => {
            infoMap[s.path] = s
          })
          setSessoesInfo(infoMap)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações das sessões:', error)
    }
  }

  const loadSessoes = async () => {
    try {
      if ((window as any).electron?.contingencia?.listarSessoes) {
        const result = await (window as any).electron.contingencia.listarSessoes(null)
        if (result.success && result.sessions) {
          setSessoes(result.sessions.map((s: any) => ({ path: s.path, name: s.name })))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    }
  }

  const loadGrupos = async () => {
    try {
      setLoading(true)
      // Usar handler de grupos BASE (não VIP)
      if ((window as any).electron?.contingencia?.listarSessoesComGrupoBase) {
        const result = await (window as any).electron.contingencia.listarSessoesComGrupoBase()
        if (result.success) {
          setGrupos(result.sessoes || [])
        }
      }
      await loadSessoesInfo()
    } catch (error) {
      console.error('Erro ao carregar grupos base:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTags = async () => {
    try {
      if ((window as any).electron?.tags?.carregarTodas) {
        const result = await (window as any).electron.tags.carregarTodas()
        if (result.success && result.tags) {
          setTags(result.tags)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    }
  }

  const handleIniciarEdicao = (grupo: GrupoBase) => {
    setEditandoId(grupo.sessionPath)
    setEditNome(grupo.grupoNome)
    setEditTag(grupo.tag)
  }

  const handleCancelarEdicao = () => {
    setEditandoId(null)
    setEditNome('')
    setEditTag(null)
  }

  const handleSalvar = async (grupo: GrupoBase) => {
    try {
      setSalvando(true)
      if ((window as any).electron?.contingencia?.atualizarGrupoVip) {
        const result = await (window as any).electron.contingencia.atualizarGrupoVip({
          sessionPath: grupo.sessionPath,
          grupoNome: editNome.trim() || grupo.grupoNome,
          tag: editTag,
        })

        if (result.success) {
          await loadGrupos()
          setEditandoId(null)
          setEditNome('')
          setEditTag(null)
        } else {
          alert(`Erro ao salvar: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar grupo base:', error)
      alert('Erro ao salvar alterações')
    } finally {
      setSalvando(false)
    }
  }

  const handleOpenLink = (link: string) => {
    if (link && (window as any).electron?.utils?.openExternalUrl) {
      ;(window as any).electron.utils.openExternalUrl(link)
    }
  }

  const handleDeletarGrupo = async (grupo: GrupoBase) => {
    if (!confirm(`Remover "${grupo.grupoNome}" da lista?\n\nIsso NÃO exclui o grupo do Telegram.`)) {
      return
    }

    try {
      if ((window as any).electron?.contingencia?.deletarGrupoBase) {
        const result = await (window as any).electron.contingencia.deletarGrupoBase(grupo.sessionPath)

        if (result.success) {
          await loadGrupos()
        } else {
          alert(`Erro: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error: any) {
      console.error('Erro ao deletar grupo base:', error)
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  const getTagNome = (tagId: string | null) => {
    if (!tagId) return 'Sem tag'
    const tag = tags.find((t) => t.id === tagId)
    return tag ? tag.nome : tagId
  }

  // Agrupar por sessão
  const gruposPorSessao = grupos.reduce(
    (acc, grupo) => {
      const sessionName = grupo.sessionName
      if (!acc[sessionName]) {
        acc[sessionName] = {
          sessionPath: grupo.sessionPath,
          grupos: [],
        }
      }
      acc[sessionName].grupos.push(grupo)
      return acc
    },
    {} as Record<string, { sessionPath: string; grupos: GrupoBase[] }>
  )

  const handleCadastrarGrupo = async () => {
    if (!newSessionPath || !newGroupLink) {
      alert('Por favor, preencha todos os campos')
      return
    }

    try {
      setCadastrando(true)

      if ((window as any).electron?.contingencia?.cadastrarGrupoBase) {
        const result = await (window as any).electron.contingencia.cadastrarGrupoBase({
          sessionPath: newSessionPath,
          groupLink: newGroupLink.trim(),
        })

        if (result.success) {
          alert('Grupo base cadastrado com sucesso!')
          setIsAddModalOpen(false)
          setNewSessionPath('')
          setNewGroupLink('')
          setSessionSearchTerm('')
          setShowSessionDropdown(false)
          await loadGrupos()
        } else {
          alert(`Erro: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar grupo:', error)
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`)
    } finally {
      setCadastrando(false)
    }
  }

  return (
    <div className="space-y-4 min-h-screen">
      {/* Header */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-medium text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Gerenciar Grupos Base
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie os grupos base de cada sessão</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Grupo Base
            </button>
            <button
              onClick={loadGrupos}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 rounded-lg text-gray-200 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Grupos */}
      {loading && grupos.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando grupos base...</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-8 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-2">Nenhum grupo base encontrado</h3>
          <p className="text-sm text-gray-500">Adicione um grupo base para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(gruposPorSessao).map(([sessionName, { sessionPath, grupos: gruposSessao }]) => {
            const sessaoInfo = sessoesInfo[sessionPath]
            const tagSessao = sessaoInfo?.tag
            const tagsConta = sessaoInfo?.tagsConta || []

            return (
              <div key={sessionPath} className="bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden">
                {/* Cabeçalho da Sessão */}
                <div className="bg-[#0d1117] px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <h2 className="text-sm font-medium text-gray-200">{sessionName}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {tagSessao && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-800/30">
                          <Tag className="w-3 h-3 mr-1" />
                          {tagSessao}
                        </span>
                      )}
                      {tagsConta.slice(0, 2).map((tagConta, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                          {tagConta}
                        </span>
                      ))}
                      {tagsConta.length > 2 && <span className="px-2 py-0.5 rounded text-xs text-gray-500">+{tagsConta.length - 2}</span>}
                    </div>
                  </div>
                </div>

                {/* Tabela de Grupos */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[#0d1117]">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome do Grupo</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tag do Grupo</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Link</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {gruposSessao.map((grupo) => {
                        const isEditing = editandoId === grupo.sessionPath
                        return (
                          <tr key={grupo.sessionPath} className="hover:bg-[#21262d] transition-colors">
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editNome}
                                  onChange={(e) => setEditNome(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded bg-[#0d1117] text-gray-200 text-sm border border-gray-700 focus:outline-none focus:border-gray-600"
                                  placeholder="Nome do grupo"
                                />
                              ) : (
                                <div className="text-sm text-gray-200">{grupo.grupoNome}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editTag || ''}
                                  onChange={(e) => setEditTag(e.target.value || null)}
                                  className="px-3 py-1.5 rounded bg-[#0d1117] text-gray-200 text-sm border border-gray-700 focus:outline-none focus:border-gray-600"
                                >
                                  <option value="">Sem tag</option>
                                  {tags.map((tag) => (
                                    <option key={tag.id} value={tag.id}>
                                      {tag.nome}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="px-2.5 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">{getTagNome(grupo.tag)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {grupo.groupLink ? (
                                <button
                                  onClick={() => handleOpenLink(grupo.groupLink)}
                                  className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                  Abrir <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-gray-600 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSalvar(grupo)}
                                    disabled={salvando}
                                    className="p-1.5 bg-[#238636] hover:bg-[#2ea043] rounded text-white transition-colors disabled:opacity-50"
                                    title="Salvar"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelarEdicao}
                                    disabled={salvando}
                                    className="p-1.5 bg-[#21262d] hover:bg-[#30363d] rounded text-gray-300 transition-colors disabled:opacity-50"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleIniciarEdicao(grupo)}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletarGrupo(grupo)}
                                    className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Adicionar Grupo Base */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSessionDropdown(false)
              setIsAddModalOpen(false)
            }
          }}
        >
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-gray-100">Adicionar Grupo Base</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setNewSessionPath('')
                  setNewGroupLink('')
                  setSessionSearchTerm('')
                  setShowSessionDropdown(false)
                }}
                className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Sessão */}
              <div className="relative">
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Sessão</label>
                <div className="relative session-dropdown-container">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={sessionSearchTerm || (newSessionPath ? sessoes.find((s) => s.path === newSessionPath)?.name || '' : '')}
                      onChange={(e) => {
                        setSessionSearchTerm(e.target.value)
                        setShowSessionDropdown(true)
                        if (!e.target.value) {
                          setNewSessionPath('')
                        }
                      }}
                      onFocus={() => {
                        setShowSessionDropdown(true)
                        if (!sessionSearchTerm && newSessionPath) {
                          setSessionSearchTerm(sessoes.find((s) => s.path === newSessionPath)?.name || '')
                        }
                      }}
                      onClick={() => setShowSessionDropdown(true)}
                      placeholder="Pesquisar sessão..."
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                      autoComplete="off"
                    />
                    {(sessionSearchTerm || newSessionPath) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSessionSearchTerm('')
                          setNewSessionPath('')
                          setShowSessionDropdown(true)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showSessionDropdown && sessoes.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-[#161b22] border border-gray-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredSessoes = sessionSearchTerm
                          ? sessoes.filter((sessao) => {
                              const sessaoInfo = sessoesInfo[sessao.path]
                              const searchLower = sessionSearchTerm.toLowerCase()
                              const nameMatch = sessao.name.toLowerCase().includes(searchLower)
                              const pathMatch = sessao.path.toLowerCase().includes(searchLower)
                              const tagMatch = sessaoInfo?.tag?.toLowerCase().includes(searchLower)
                              return nameMatch || pathMatch || tagMatch
                            })
                          : sessoes

                        if (filteredSessoes.length === 0) {
                          return (
                            <div className="px-4 py-4 text-center">
                              <Search className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                              <div className="text-gray-500 text-sm">Nenhuma sessão encontrada</div>
                            </div>
                          )
                        }

                        return filteredSessoes.map((sessao) => {
                          const isSelected = newSessionPath === sessao.path

                          return (
                            <button
                              key={sessao.path}
                              onClick={() => {
                                setNewSessionPath(sessao.path)
                                setSessionSearchTerm(sessao.name)
                                setShowSessionDropdown(false)
                              }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-[#21262d] text-gray-200 transition-colors border-b border-gray-800 last:border-b-0 ${
                                isSelected ? 'bg-[#21262d] border-l-2 border-l-emerald-500' : ''
                              }`}
                            >
                              <div className="text-sm truncate">{sessao.name}</div>
                              <div className="text-xs text-gray-500 truncate">{sessao.path}</div>
                            </button>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
                {newSessionPath && (
                  <div className="mt-2 p-2.5 bg-[#0d1117] border border-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-0.5">Sessão selecionada:</div>
                    <div className="text-sm text-gray-200">{sessoes.find((s) => s.path === newSessionPath)?.name || newSessionPath}</div>
                  </div>
                )}
              </div>

              {/* Link do Grupo */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Link do Grupo Base</label>
                <input
                  type="text"
                  value={newGroupLink}
                  onChange={(e) => setNewGroupLink(e.target.value)}
                  placeholder="https://t.me/+hash ou https://t.me/username"
                  className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                />
                <p className="text-xs text-gray-600 mt-1">Cole o link do grupo (público ou privado)</p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-800">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setNewSessionPath('')
                    setNewGroupLink('')
                    setSessionSearchTerm('')
                    setShowSessionDropdown(false)
                  }}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCadastrarGrupo}
                  disabled={!newSessionPath || !newGroupLink || cadastrando}
                  className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cadastrando ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

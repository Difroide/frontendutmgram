import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { Plus, Trash2, Edit, Search, CheckSquare, Square, ArrowLeft, FolderOpen } from 'lucide-react'

export interface NomeGrupo {
  id: string
  nome: string
  createdAt: string
  updatedAt?: string
}

export interface GrupoNomesInfo {
  id: string
  nome: string
  createdAt: string
  updatedAt?: string
  totalNomes: number
}

interface NomeCardProps {
  nome: NomeGrupo
  isSelected: boolean
  hasAnySelection: boolean
  onToggleSelect: (id: string) => void
  onEdit: (nome: NomeGrupo) => void
  onDelete: (id: string) => void
  formatDate: (dateString: string) => string
}

const NomeCardComponent = ({ nome, isSelected, hasAnySelection, onToggleSelect, onEdit, onDelete, formatDate }: NomeCardProps) => {
  return (
    <div
      onClick={hasAnySelection ? () => onToggleSelect(nome.id) : undefined}
      className={`bg-gray-700/30 backdrop-blur-sm rounded-lg border p-3 transition-all group relative ${
        isSelected
          ? 'bg-blue-600/20 border-blue-400/50 cursor-pointer'
          : hasAnySelection
          ? 'border-gray-600/30 hover:bg-gray-700/50 cursor-pointer'
          : 'border-gray-600/30 hover:bg-gray-700/50'
      }`}
    >
      {hasAnySelection ? (
        <div className="absolute top-3 left-3 z-10">
          {isSelected ? (
            <CheckSquare className="w-6 h-6 text-blue-400" />
          ) : (
            <Square className="w-6 h-6 text-gray-400" />
          )}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(nome.id)
          }}
          className="absolute top-2 left-2 p-1 hover:bg-gray-600/50 rounded transition-colors z-10"
          title="Selecionar"
        >
          <Square className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      <div className={hasAnySelection ? 'pl-10' : 'pr-8'}>
        <p className="text-sm font-medium text-gray-100 break-words">{nome.nome}</p>
        <p className="text-xs text-gray-500 mt-1">
          {nome.updatedAt ? `Atualizado: ${formatDate(nome.updatedAt)}` : `Criado: ${formatDate(nome.createdAt)}`}
        </p>
      </div>

      <div
        className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-600/30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(nome)}
          className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
          title="Editar"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(nome.id)}
          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const areEqual = (prevProps: NomeCardProps, nextProps: NomeCardProps) => {
  return (
    prevProps.nome.id === nextProps.nome.id &&
    prevProps.nome.nome === nextProps.nome.nome &&
    prevProps.nome.createdAt === nextProps.nome.createdAt &&
    prevProps.nome.updatedAt === nextProps.nome.updatedAt &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.hasAnySelection === nextProps.hasAnySelection
  )
}

const NomeCard = memo(NomeCardComponent, areEqual)
NomeCard.displayName = 'NomeCard'

const api = () => (window.electron?.criador as any)

export const NomesTab = () => {
  const [grupos, setGrupos] = useState<GrupoNomesInfo[]>([])
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoNomesInfo | null>(null)
  const [nomes, setNomes] = useState<NomeGrupo[]>([])
  const [isLoadingGrupos, setIsLoadingGrupos] = useState(true)
  const [isLoadingNomes, setIsLoadingNomes] = useState(false)
  const [isModalGrupoOpen, setIsModalGrupoOpen] = useState(false)
  const [isModalNomesOpen, setIsModalNomesOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditGrupoModalOpen, setIsEditGrupoModalOpen] = useState(false)
  const [nomeEditando, setNomeEditando] = useState<NomeGrupo | null>(null)
  const [grupoEditando, setGrupoEditando] = useState<GrupoNomesInfo | null>(null)
  const [novoGrupoNome, setNovoGrupoNome] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [nomesTexto, setNomesTexto] = useState('')
  const [criandoGrupo, setCriandoGrupo] = useState(false)
  const [salvandoGrupo, setSalvandoGrupo] = useState(false)

  const loadGrupos = useCallback(async () => {
    try {
      setIsLoadingGrupos(true)
      if (api()) {
        const list = await api().listarGruposNomes()
        setGrupos(list || [])
      }
    } catch (error) {
      console.error('Erro ao carregar grupos de nomes:', error)
    } finally {
      setIsLoadingGrupos(false)
    }
  }, [])

  useEffect(() => {
    loadGrupos()
  }, [loadGrupos])

  const loadNomes = useCallback(async () => {
    if (!grupoSelecionado || !api()) return
    try {
      setIsLoadingNomes(true)
      const list = await api().carregarNomesDoGrupo(grupoSelecionado.id)
      setNomes(list || [])
    } catch (error) {
      console.error('Erro ao carregar nomes do grupo:', error)
    } finally {
      setIsLoadingNomes(false)
    }
  }, [grupoSelecionado])

  useEffect(() => {
    if (grupoSelecionado) loadNomes()
    else setNomes([])
  }, [grupoSelecionado, loadNomes])

  const nomesFiltrados = useMemo(() => {
    if (!searchTerm) return nomes
    const term = searchTerm.toLowerCase()
    return nomes.filter((nome) => nome.nome.toLowerCase().includes(term))
  }, [nomes, searchTerm])

  const hasAnySelection = useMemo(() => selectedIds.size > 0, [selectedIds.size])

  const handleCriarGrupo = async () => {
    const nome = novoGrupoNome.trim()
    if (!nome) {
      alert('Digite um nome para o grupo')
      return
    }
    try {
      setCriandoGrupo(true)
      const result = await api().criarGrupoNomes(nome)
      if (!result.success) {
        alert(result.error || 'Erro ao criar grupo')
        return
      }
      await loadGrupos()
      setNovoGrupoNome('')
      setIsModalGrupoOpen(false)
    } catch (error) {
      console.error('Erro ao criar grupo:', error)
      alert('Erro ao criar grupo. Tente novamente.')
    } finally {
      setCriandoGrupo(false)
    }
  }

  const handleEditarGrupo = async () => {
    if (!grupoEditando) return
    const nome = grupoEditando.nome?.trim() || ''
    if (!nome) {
      alert('Nome do grupo não pode ser vazio')
      return
    }
    try {
      setSalvandoGrupo(true)
      const result = await api().atualizarGrupoNomes(grupoEditando.id, nome)
      if (!result.success) {
        alert(result.error || 'Erro ao atualizar grupo')
        return
      }
      await loadGrupos()
      if (grupoSelecionado?.id === grupoEditando.id) {
        setGrupoSelecionado((prev) => (prev ? { ...prev, nome } : null))
      }
      setIsEditGrupoModalOpen(false)
      setGrupoEditando(null)
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error)
      alert('Erro ao atualizar grupo. Tente novamente.')
    } finally {
      setSalvandoGrupo(false)
    }
  }

  const handleExcluirGrupo = async (g: GrupoNomesInfo) => {
    if (!window.confirm(`Excluir o grupo "${g.nome}" e todos os ${g.totalNomes} nome(s) dentro dele?`)) return
    try {
      const result = await api().excluirGrupoNomes(g.id)
      if (!result.success) {
        alert(result.error || 'Erro ao excluir grupo')
        return
      }
      await loadGrupos()
      if (grupoSelecionado?.id === g.id) setGrupoSelecionado(null)
    } catch (error) {
      console.error('Erro ao excluir grupo:', error)
      alert('Erro ao excluir grupo. Tente novamente.')
    }
  }

  const handleAdicionarNomes = async () => {
    if (!grupoSelecionado) return
    const nomesArray = nomesTexto
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (nomesArray.length === 0) {
      alert('Adicione pelo menos um nome')
      return
    }
    try {
      const result = await api().adicionarNomesAoGrupo(grupoSelecionado.id, nomesArray)
      if (!result.success) {
        alert(result.error || 'Erro ao adicionar nomes')
        return
      }
      await loadNomes()
      await loadGrupos()
      setNomesTexto('')
      setIsModalNomesOpen(false)
    } catch (error) {
      console.error('Erro ao adicionar nomes:', error)
      alert('Erro ao adicionar nomes. Tente novamente.')
    }
  }

  const handleEditar = useCallback((nome: NomeGrupo) => {
    setNomeEditando(nome)
    setIsEditModalOpen(true)
  }, [])

  const handleSalvarEdicao = async () => {
    if (!nomeEditando || !grupoSelecionado) return
    const novoNome = nomeEditando.nome.trim()
    if (!novoNome) {
      alert('O nome não pode estar vazio')
      return
    }
    try {
      const result = await api().atualizarNomeNoGrupo(grupoSelecionado.id, nomeEditando.id, novoNome)
      if (!result.success) {
        alert(result.error || 'Erro ao atualizar nome')
        return
      }
      await loadNomes()
      await loadGrupos()
      setIsEditModalOpen(false)
      setNomeEditando(null)
    } catch (error) {
      console.error('Erro ao atualizar nome:', error)
      alert('Erro ao atualizar nome. Tente novamente.')
    }
  }

  const handleExcluir = async (id: string) => {
    if (!grupoSelecionado) return
    if (!window.confirm('Tem certeza que deseja excluir este nome?')) return
    try {
      const result = await api().excluirNomesDoGrupo(grupoSelecionado.id, [id])
      if (!result.success) {
        alert(result.error || 'Erro ao excluir nome')
        return
      }
      await loadNomes()
      await loadGrupos()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error) {
      console.error('Erro ao excluir nome:', error)
      alert('Erro ao excluir nome. Tente novamente.')
    }
  }

  const handleExcluirSelecionados = async () => {
    if (!grupoSelecionado || selectedIds.size === 0) {
      alert('Selecione pelo menos um nome para excluir')
      return
    }
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} nome(s)?`)) return
    try {
      const result = await api().excluirNomesDoGrupo(grupoSelecionado.id, Array.from(selectedIds))
      if (!result.success) {
        alert(result.error || 'Erro ao excluir nomes')
        return
      }
      await loadNomes()
      await loadGrupos()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Erro ao excluir nomes:', error)
      alert('Erro ao excluir nomes. Tente novamente.')
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === nomesFiltrados.length) return new Set()
      return new Set(nomesFiltrados.map((n) => n.id))
    })
  }, [nomesFiltrados])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }, [])

  // Vista: lista de grupos
  if (!grupoSelecionado) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <button
                onClick={() => {
                  setNovoGrupoNome('')
                  setIsModalGrupoOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo grupo de nomes
              </button>
              <span className="text-sm text-gray-400">{grupos.length} grupo(s)</span>
            </div>

            {isLoadingGrupos ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : grupos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhum grupo de nomes. Clique em &quot;Novo grupo de nomes&quot; para criar um (ex: VAZADOS).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {grupos.map((g) => (
                  <div
                    key={g.id}
                    className="bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/30 p-4 transition-all hover:bg-gray-700/50 group"
                  >
                    <button
                      onClick={() => setGrupoSelecionado(g)}
                      className="w-full text-left flex items-center gap-3"
                    >
                      <FolderOpen className="w-8 h-8 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{g.nome}</p>
                        <p className="text-xs text-gray-500">{g.totalNomes} nome(s)</p>
                      </div>
                    </button>
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-600/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setGrupoEditando(g)
                          setIsEditGrupoModalOpen(true)
                        }}
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                        title="Editar nome do grupo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExcluirGrupo(g)
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                        title="Excluir grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal novo grupo */}
        {isModalGrupoOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-100">Novo grupo de nomes</h2>
                <button
                  onClick={() => {
                    setIsModalGrupoOpen(false)
                    setNovoGrupoNome('')
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do grupo (ex: VAZADOS)</label>
                  <input
                    type="text"
                    value={novoGrupoNome}
                    onChange={(e) => setNovoGrupoNome(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VAZADOS"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalGrupoOpen(false)
                      setNovoGrupoNome('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCriarGrupo}
                    disabled={criandoGrupo || !novoGrupoNome.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {criandoGrupo ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal editar grupo */}
        {isEditGrupoModalOpen && grupoEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-100">Editar nome do grupo</h2>
                <button
                  onClick={() => {
                    setIsEditGrupoModalOpen(false)
                    setGrupoEditando(null)
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do grupo</label>
                  <input
                    type="text"
                    value={grupoEditando.nome}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, nome: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditGrupoModalOpen(false)
                      setGrupoEditando(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleEditarGrupo}
                    disabled={salvandoGrupo}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {salvandoGrupo ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista: nomes dentro do grupo selecionado
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            setGrupoSelecionado(null)
            setSearchTerm('')
            setSelectedIds(new Set())
          }}
          className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-gray-100 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h2 className="text-lg font-medium text-gray-200 truncate">{grupoSelecionado.nome}</h2>
      </div>

      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg border border-gray-600/30 hover:shadow-xl transition-all">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setNomesTexto('')
                  setIsModalNomesOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Nomes
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleExcluirSelecionados}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Selecionados ({selectedIds.size})
                </button>
              )}
              <span className="text-sm text-gray-400">{nomesFiltrados.length} itens</span>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {isLoadingNomes ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : nomesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum nome neste grupo. Clique em &quot;Adicionar Nomes&quot; para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <div className="col-span-full flex items-center gap-2 pb-2 border-b border-gray-700">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                  title={selectedIds.size === nomesFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {selectedIds.size === nomesFiltrados.length ? (
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : 'Selecionar todos'}
                </span>
              </div>
              {nomesFiltrados.map((nome) => (
                <NomeCard
                  key={nome.id}
                  nome={nome}
                  isSelected={selectedIds.has(nome.id)}
                  hasAnySelection={hasAnySelection}
                  onToggleSelect={toggleSelect}
                  onEdit={handleEditar}
                  onDelete={handleExcluir}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Nomes */}
      {isModalNomesOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-100">Adicionar Nomes ao grupo &quot;{grupoSelecionado.nome}&quot;</h2>
              <button
                onClick={() => {
                  setIsModalNomesOpen(false)
                  setNomesTexto('')
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nomes (um por linha)</label>
                <textarea
                  value={nomesTexto}
                  onChange={(e) => setNomesTexto(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                  placeholder="Nome 1&#10;Nome 2&#10;..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalNomesOpen(false)
                    setNomesTexto('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleAdicionarNomes} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Nome */}
      {isEditModalOpen && nomeEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-100">Editar Nome</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setNomeEditando(null)
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={nomeEditando.nome}
                  onChange={(e) => setNomeEditando({ ...nomeEditando, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setNomeEditando(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleSalvarEdicao} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

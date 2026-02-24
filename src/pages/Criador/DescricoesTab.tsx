import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Edit2, FileText, Search, X } from 'lucide-react'

interface Descricao {
  id: string
  nome: string
  quantidade: number
}

export function DescricoesTab() {
  const [descricoes, setDescricoes] = useState<Descricao[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [newDescricaoNome, setNewDescricaoNome] = useState('')
  const [newDescricaoConteudo, setNewDescricaoConteudo] = useState('')
  const [editingDescricao, setEditingDescricao] = useState<Descricao | null>(null)
  const [selectedDescricao, setSelectedDescricao] = useState<Descricao | null>(null)
  const [descricaoConteudo, setDescricaoConteudo] = useState('')
  const [savingContent, setSavingContent] = useState(false)

  useEffect(() => {
    loadDescricoes()
  }, [])

  const loadDescricoes = async () => {
    try {
      setLoading(true)
      if ((window as any).electron?.descricoes?.carregar) {
        const data = await (window as any).electron.descricoes.carregar()
        setDescricoes(data || [])
      } else {
        console.warn('API descricoes.carregar não disponível')
      }
    } catch (error) {
      console.error('Erro ao carregar descrições:', error)
    } finally {
      setLoading(false)
    }
  }

  const descricoesFiltradas = useMemo(() => {
    if (!searchTerm) return descricoes
    const term = searchTerm.toLowerCase()
    return descricoes.filter((desc) => desc.nome.toLowerCase().includes(term))
  }, [descricoes, searchTerm])

  const handleCreate = async () => {
    if (!newDescricaoNome.trim()) {
      alert('Por favor, informe um nome para a descrição')
      return
    }

    try {
      if ((window as any).electron?.descricoes?.criar) {
        // Criar a descrição primeiro
        const result = await (window as any).electron.descricoes.criar(newDescricaoNome.trim())
        if (result.success) {
          // Se houver conteúdo, salvar também
          if (newDescricaoConteudo.trim()) {
            await (window as any).electron.descricoes.salvarConteudo(result.id, newDescricaoConteudo.trim())
          }
          await loadDescricoes()
          setShowCreateModal(false)
          setNewDescricaoNome('')
          setNewDescricaoConteudo('')
          alert('Descrição criada com sucesso!')
        } else {
          alert(`Erro ao criar descrição: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao criar descrição:', error)
      alert('Erro ao criar descrição. Tente novamente.')
    }
  }

  const handleEdit = async () => {
    if (!editingDescricao || !newDescricaoNome.trim()) {
      alert('Por favor, informe um nome para a descrição')
      return
    }

    try {
      if ((window as any).electron?.descricoes?.atualizar) {
        const result = await (window as any).electron.descricoes.atualizar(
          editingDescricao.id,
          newDescricaoNome.trim()
        )
        if (result.success) {
          await loadDescricoes()
          setShowEditModal(false)
          setEditingDescricao(null)
          setNewDescricaoNome('')
          alert('Descrição atualizada com sucesso!')
        } else {
          alert(`Erro ao atualizar descrição: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar descrição:', error)
      alert('Erro ao atualizar descrição. Tente novamente.')
    }
  }

  const handleDelete = async (descricao: Descricao) => {
    if (!window.confirm(`Tem certeza que deseja excluir a descrição "${descricao.nome}"?`)) {
      return
    }

    try {
      if ((window as any).electron?.descricoes?.deletar) {
        const result = await (window as any).electron.descricoes.deletar(descricao.id)
        if (result.success) {
          await loadDescricoes()
          alert('Descrição excluída com sucesso!')
        } else {
          alert(`Erro ao excluir descrição: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao excluir descrição:', error)
      alert('Erro ao excluir descrição. Tente novamente.')
    }
  }

  const handleOpenContent = async (descricao: Descricao) => {
    try {
      setSelectedDescricao(descricao)
      if ((window as any).electron?.descricoes?.carregarConteudo) {
        const result = await (window as any).electron.descricoes.carregarConteudo(descricao.id)
        if (result.success) {
          setDescricaoConteudo(result.conteudo || '')
          setShowContentModal(true)
        } else {
          alert(`Erro ao carregar conteúdo: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error)
      alert('Erro ao carregar conteúdo. Tente novamente.')
    }
  }

  const handleSaveContent = async () => {
    if (!selectedDescricao) return

    try {
      setSavingContent(true)
      if ((window as any).electron?.descricoes?.salvarConteudo) {
        const result = await (window as any).electron.descricoes.salvarConteudo(
          selectedDescricao.id,
          descricaoConteudo
        )
        if (result.success) {
          await loadDescricoes()
          alert('Conteúdo salvo com sucesso!')
        } else {
          alert(`Erro ao salvar conteúdo: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar conteúdo:', error)
      alert('Erro ao salvar conteúdo. Tente novamente.')
    } finally {
      setSavingContent(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de adicionar e busca */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => {
              setNewDescricaoNome('')
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Descrição
          </button>
          <span className="text-sm text-gray-400">{descricoes.length} itens</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
            />
          </div>
        </div>
      </div>

      {/* Tabela de descrições */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : descricoesFiltradas.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {searchTerm ? 'Nenhuma descrição encontrada' : 'Nenhuma descrição criada ainda'}
        </div>
      ) : (
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50 border-b border-gray-600/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Nome da Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Quantidade de Descrições
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {descricoesFiltradas.map((descricao) => (
                <tr key={descricao.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-200">{descricao.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{descricao.quantidade || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenContent(descricao)}
                        className="p-2 bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 text-blue-200 rounded hover:bg-blue-600/40 transition-all"
                        title="Editar conteúdo"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingDescricao(descricao)
                          setNewDescricaoNome(descricao.nome)
                          setShowEditModal(true)
                        }}
                        className="p-2 bg-yellow-600/30 backdrop-blur-sm border border-yellow-400/30 text-yellow-200 rounded hover:bg-yellow-600/40 transition-all"
                        title="Editar nome"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(descricao)}
                        className="p-2 bg-red-600/30 backdrop-blur-sm border border-red-400/30 text-red-200 rounded hover:bg-red-600/40 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criar Descrição */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-600/30 shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">Criar Nova Descrição</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewDescricaoNome('')
                  setNewDescricaoConteudo('')
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 flex flex-col space-y-4">
              {/* Campo de Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Descrição
                </label>
                <input
                  type="text"
                  value={newDescricaoNome}
                  onChange={(e) => setNewDescricaoNome(e.target.value)}
                  placeholder="Ex.: Descrições de Grupos VIP"
                  className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                />
              </div>
              
              {/* Campo de Conteúdo */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrições (uma por linha)
                </label>
                <textarea
                  value={newDescricaoConteudo}
                  onChange={(e) => setNewDescricaoConteudo(e.target.value)}
                  placeholder="Digite as descrições, uma por linha..."
                  className="w-full flex-1 min-h-[400px] px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 font-mono text-sm resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Cada linha será uma descrição diferente. O sistema selecionará aleatoriamente uma
                  delas ao criar grupos.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewDescricaoNome('')
                    setNewDescricaoConteudo('')
                  }}
                  className="px-4 py-2 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 text-gray-300 rounded-lg hover:bg-gray-700/60 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Descrição */}
      {showEditModal && editingDescricao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-600/30 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">Editar Descrição</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingDescricao(null)
                  setNewDescricaoNome('')
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Descrição
                </label>
                <input
                  type="text"
                  value={newDescricaoNome}
                  onChange={(e) => setNewDescricaoNome(e.target.value)}
                  placeholder="Ex.: Descrições de Grupos VIP"
                  className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit()
                    }
                  }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingDescricao(null)
                    setNewDescricaoNome('')
                  }}
                  className="px-4 py-2 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 text-gray-300 rounded-lg hover:bg-gray-700/60 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Conteúdo */}
      {showContentModal && selectedDescricao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-600/30 shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">Editar Descrição</h2>
              <button
                onClick={() => {
                  setShowContentModal(false)
                  setSelectedDescricao(null)
                  setDescricaoConteudo('')
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 flex flex-col space-y-4">
              {/* Campo de Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Descrição
                </label>
                <input
                  type="text"
                  value={selectedDescricao.nome}
                  onChange={(e) => {
                    setSelectedDescricao({ ...selectedDescricao, nome: e.target.value })
                  }}
                  placeholder="Ex.: Descrições de Grupos VIP"
                  className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                />
              </div>
              
              {/* Campo de Conteúdo */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrições (uma por linha)
                </label>
                <textarea
                  value={descricaoConteudo}
                  onChange={(e) => setDescricaoConteudo(e.target.value)}
                  placeholder="Digite as descrições, uma por linha..."
                  className="w-full flex-1 min-h-[400px] px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 font-mono text-sm resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Cada linha será uma descrição diferente. O sistema selecionará aleatoriamente uma
                  delas ao criar grupos.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowContentModal(false)
                    setSelectedDescricao(null)
                    setDescricaoConteudo('')
                  }}
                  className="px-4 py-2 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 text-gray-300 rounded-lg hover:bg-gray-700/60 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    // Salvar nome primeiro se mudou
                    if (selectedDescricao.nome !== descricoes.find(d => d.id === selectedDescricao.id)?.nome) {
                      const result = await (window as any).electron.descricoes.atualizar(selectedDescricao.id, selectedDescricao.nome)
                      if (!result.success) {
                        alert(`Erro ao atualizar nome: ${result.error || 'Erro desconhecido'}`)
                        return
                      }
                      await loadDescricoes()
                    }
                    // Depois salvar conteúdo
                    await handleSaveContent()
                  }}
                  disabled={savingContent}
                  className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingContent ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


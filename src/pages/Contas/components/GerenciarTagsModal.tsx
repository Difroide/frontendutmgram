import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Tag, Save } from 'lucide-react'

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface GerenciarTagsModalProps {
  isOpen: boolean
  onClose: () => void
  onTagChange?: () => void
}

export const GerenciarTagsModal = ({ isOpen, onClose, onTagChange }: GerenciarTagsModalProps) => {
  const [tags, setTags] = useState<TagConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [novaTag, setNovaTag] = useState({ nome: '', cor: '#6b7280', descricao: '' })
  const [editTag, setEditTag] = useState<TagConfig | null>(null)

  const loadTags = async () => {
    setIsLoading(true)
    try {
      if (!window.electron?.tags?.carregarTodas) {
        console.warn('API tags não disponível')
        return
      }
      const result = await window.electron.tags.carregarTodas()
      if (result.success) {
        setTags(result.tags || [])
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
      alert('Erro ao carregar tags: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTags()
    } else {
      setEditingTag(null)
      setEditTag(null)
      setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
    }
  }, [isOpen])

  const handleCriarTag = async () => {
    if (!novaTag.nome.trim()) {
      alert('Digite um nome para a tag')
      return
    }
    try {
      if (!window.electron?.tags?.criar) {
        alert('API não disponível')
        return
      }
      const result = await window.electron.tags.criar(novaTag)
      if (result.success) {
        await loadTags()
        setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
        onTagChange?.()
        alert('Tag criada com sucesso!')
      } else {
        alert('Erro ao criar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error)
      alert('Erro ao criar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const handleEditarTag = (tag: TagConfig) => {
    setEditingTag(tag.id)
    setEditTag({ ...tag })
  }

  const handleSalvarEdicao = async () => {
    if (!editTag || !editTag.nome.trim()) {
      alert('Digite um nome para a tag')
      return
    }
    try {
      if (!window.electron?.tags?.atualizar) {
        alert('API não disponível')
        return
      }
      const result = await window.electron.tags.atualizar(editTag.id, {
        nome: editTag.nome,
        cor: editTag.cor,
        descricao: editTag.descricao,
      })
      if (result.success) {
        await loadTags()
        setEditingTag(null)
        setEditTag(null)
        onTagChange?.()
        alert('Tag atualizada com sucesso!')
      } else {
        alert('Erro ao atualizar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao atualizar tag:', error)
      alert('Erro ao atualizar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const handleDeletarTag = async (tag: TagConfig) => {
    if (!confirm(`Tem certeza que deseja deletar a tag "${tag.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }
    try {
      if (!window.electron?.tags?.deletar) {
        alert('API não disponível')
        return
      }
      const result = await window.electron.tags.deletar(tag.id)
      if (result.success) {
        await loadTags()
        onTagChange?.()
        alert('Tag deletada com sucesso!')
      } else {
        alert('Erro ao deletar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao deletar tag:', error)
      alert('Erro ao deletar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Gerenciar Tags</h2>
              <p className="text-xs text-gray-500">Crie, edite e organize tags para suas contas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Criar Nova Tag */}
          <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Criar Nova Tag
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Nome</label>
                <input
                  type="text"
                  value={novaTag.nome}
                  onChange={(e) => setNovaTag({ ...novaTag, nome: e.target.value })}
                  placeholder="Ex: Importante, VIP..."
                  className="w-full px-3 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Cor</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={novaTag.cor}
                    onChange={(e) => setNovaTag({ ...novaTag, cor: e.target.value })}
                    className="w-10 h-9 rounded border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={novaTag.cor}
                    onChange={(e) => setNovaTag({ ...novaTag, cor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 px-2 py-2 bg-[#161b22] text-gray-300 text-xs font-mono border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCriarTag}
                  className="w-full px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar
                </button>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Descrição (opcional)</label>
              <input
                type="text"
                value={novaTag.descricao}
                onChange={(e) => setNovaTag({ ...novaTag, descricao: e.target.value })}
                placeholder="Descrição da tag..."
                className="w-full px-3 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Lista de Tags */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              Tags Cadastradas ({tags.length})
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm">Carregando...</p>
              </div>
            ) : tags.length === 0 ? (
              <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-8 text-center">
                <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma tag cadastrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="bg-[#0d1117] rounded-lg border border-gray-800 p-3 hover:border-gray-700 transition-colors">
                    {editingTag === tag.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nome</label>
                          <input
                            type="text"
                            value={editTag?.nome || ''}
                            onChange={(e) => setEditTag({ ...editTag!, nome: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm bg-[#161b22] text-gray-200 border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                            disabled={tag.isSystem}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cor</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editTag?.cor || '#000000'}
                              onChange={(e) => setEditTag({ ...editTag!, cor: e.target.value })}
                              className="w-8 h-7 rounded border border-gray-700 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={editTag?.cor || ''}
                              onChange={(e) => setEditTag({ ...editTag!, cor: e.target.value })}
                              className="flex-1 px-2 py-1 text-xs bg-[#161b22] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600 font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                          <input
                            type="text"
                            value={editTag?.descricao || ''}
                            onChange={(e) => setEditTag({ ...editTag!, descricao: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm bg-[#161b22] text-gray-200 border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSalvarEdicao}
                            className="flex-1 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Salvar
                          </button>
                          <button
                            onClick={() => {
                              setEditingTag(null)
                              setEditTag(null)
                            }}
                            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: tag.cor }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-200 truncate">{tag.nome}</div>
                              {tag.descricao && <div className="text-xs text-gray-500 truncate">{tag.descricao}</div>}
                              {tag.isSystem && <div className="text-xs text-blue-400 mt-0.5">Sistema</div>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditarTag(tag)}
                              className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!tag.isSystem && (
                              <button
                                onClick={() => handleDeletarTag(tag)}
                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                title="Deletar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Preview */}
                        <div className="pt-2 border-t border-gray-800">
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase rounded border"
                            style={{
                              backgroundColor: `${tag.cor}20`,
                              borderColor: `${tag.cor}50`,
                              color: tag.cor,
                            }}
                          >
                            {tag.nome}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

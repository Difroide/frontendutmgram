import { X, Plus, Tag, Check, Loader2, Download } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface ImportarContasModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (tagSelecionada: string | null) => Promise<void>
  contasEncontradas: string[]
  isLoading?: boolean
}

export const ImportarContasModal = ({
  isOpen,
  onClose,
  onConfirm,
  contasEncontradas,
  isLoading = false,
}: ImportarContasModalProps) => {
  const [tags, setTags] = useState<TagConfig[]>([])
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null)
  const [mostrarCriarTag, setMostrarCriarTag] = useState(false)
  const [novaTag, setNovaTag] = useState({ nome: '', cor: '#6b7280', descricao: '' })
  const [criandoTag, setCriandoTag] = useState(false)

  const loadTags = async () => {
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
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTags()
      setTagSelecionada(null)
      setMostrarCriarTag(false)
      setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
    }
  }, [isOpen])

  const handleCriarTag = async () => {
    if (!novaTag.nome.trim()) {
      alert('Digite um nome para a tag')
      return
    }

    setCriandoTag(true)
    try {
      if (!window.electron?.tags?.criar) {
        alert('API não disponível')
        return
      }

      const result = await window.electron.tags.criar(novaTag)
      
      if (result.success && result.tag) {
        await loadTags()
        setTagSelecionada(result.tag.nome) // Selecionar a tag recém-criada
        setMostrarCriarTag(false)
        setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
      } else {
        alert('Erro ao criar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error)
      alert('Erro ao criar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setCriandoTag(false)
    }
  }

  const handleConfirm = async () => {
    await onConfirm(tagSelecionada)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1117] rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Importar Contas</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {contasEncontradas.length} conta(s) encontrada(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Lista de contas encontradas */}
          <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-3">
              Contas encontradas
            </label>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {contasEncontradas.map((conta, idx) => (
                <div key={idx} className="text-xs text-gray-400 px-2 py-1 bg-[#0d1117] rounded border border-gray-800">
                  {conta}
                </div>
              ))}
            </div>
          </div>

          {/* Seleção de Tag */}
          <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
              Adicionar tag específica?
            </label>
            <p className="text-xs text-gray-600 mb-4">
              Selecione uma tag para adicionar a todas as contas importadas, ou deixe em branco.
            </p>

            {/* Lista de tags */}
            <div className="space-y-2 mb-4">
              <div
                onClick={() => setTagSelecionada(null)}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  tagSelecionada === null
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                }`}
              >
                {tagSelecionada === null ? (
                  <Check className="w-4 h-4 text-blue-400" />
                ) : (
                  <div className="w-4 h-4 border border-gray-600 rounded" />
                )}
                <span className="text-sm text-gray-300">Nenhuma tag</span>
              </div>

              {tags.map((tag) => (
                <div
                  key={tag.id}
                  onClick={() => setTagSelecionada(tag.nome)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    tagSelecionada === tag.nome
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {tagSelecionada === tag.nome ? (
                    <Check className="w-4 h-4 text-blue-400" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-600 rounded" />
                  )}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.cor }}
                  />
                  <span className="text-sm text-gray-300">{tag.nome}</span>
                  {tag.descricao && (
                    <span className="text-xs text-gray-600 ml-auto">{tag.descricao}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Botão para criar nova tag */}
            {!mostrarCriarTag ? (
              <button
                onClick={() => setMostrarCriarTag(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0d1117] hover:bg-[#21262d] border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Nova Tag
              </button>
            ) : (
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                    Nome da tag
                  </label>
                  <input
                    type="text"
                    value={novaTag.nome}
                    onChange={(e) => setNovaTag({ ...novaTag, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-[#161b22] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                    placeholder="Digite o nome da tag"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                    Cor
                  </label>
                  <input
                    type="color"
                    value={novaTag.cor}
                    onChange={(e) => setNovaTag({ ...novaTag, cor: e.target.value })}
                    className="w-full h-10 bg-[#161b22] border border-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={novaTag.descricao}
                    onChange={(e) => setNovaTag({ ...novaTag, descricao: e.target.value })}
                    className="w-full px-3 py-2 bg-[#161b22] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                    placeholder="Descrição da tag"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCriarTag}
                    disabled={criandoTag || !novaTag.nome.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {criandoTag ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Tag'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setMostrarCriarTag(false)
                      setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
                    }}
                    className="px-4 py-2 bg-[#21262d] hover:bg-[#21262d]/70 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Tag className="w-4 h-4" />
                Importar {contasEncontradas.length} Conta(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

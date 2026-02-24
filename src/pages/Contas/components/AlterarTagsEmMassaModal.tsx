import { useState, useEffect } from 'react'
import { X, Tag, Plus, Minus, Loader2 } from 'lucide-react'
import { Conta } from '@/types/Conta'

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface AlterarTagsEmMassaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (tagsParaAdicionar: string[], tagsParaRemover: string[]) => Promise<void>
  selectedContas: Conta[]
}

export const AlterarTagsEmMassaModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedContas,
}: AlterarTagsEmMassaModalProps) => {
  const [tags, setTags] = useState<TagConfig[]>([])
  const [tagsParaAdicionar, setTagsParaAdicionar] = useState<Set<string>>(new Set())
  const [tagsParaRemover, setTagsParaRemover] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadTags = async () => {
    setIsLoading(true)
    try {
      if (!window.electron?.tags?.carregarTodas) {
        console.warn('API tags não disponível')
        return
      }

      const result = await window.electron.tags.carregarTodas()
      if (result.success && result.tags) {
        setTags(result.tags)
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTags()
    } else {
      setTagsParaAdicionar(new Set())
      setTagsParaRemover(new Set())
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isProcessing) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, isProcessing, onClose])

  const toggleTagAdicionar = (tagNome: string) => {
    setTagsParaAdicionar((prev) => {
      const novo = new Set(prev)
      if (novo.has(tagNome)) {
        novo.delete(tagNome)
      } else {
        novo.add(tagNome)
        // Remover da lista de remoção se estiver lá
        setTagsParaRemover((prevRemover) => {
          const novoRemover = new Set(prevRemover)
          novoRemover.delete(tagNome)
          return novoRemover
        })
      }
      return novo
    })
  }

  const toggleTagRemover = (tagNome: string) => {
    setTagsParaRemover((prev) => {
      const novo = new Set(prev)
      if (novo.has(tagNome)) {
        novo.delete(tagNome)
      } else {
        novo.add(tagNome)
        // Remover da lista de adição se estiver lá
        setTagsParaAdicionar((prevAdicionar) => {
          const novoAdicionar = new Set(prevAdicionar)
          novoAdicionar.delete(tagNome)
          return novoAdicionar
        })
      }
      return novo
    })
  }

  const handleConfirm = async () => {
    if (tagsParaAdicionar.size === 0 && tagsParaRemover.size === 0) {
      alert('Por favor, selecione pelo menos uma tag para adicionar ou remover')
      return
    }

    setIsProcessing(true)
    try {
      await onConfirm(
        Array.from(tagsParaAdicionar),
        Array.from(tagsParaRemover)
      )
    } catch (error) {
      console.error('Erro ao alterar tags:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Alterar Tags em Massa</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedContas.length} conta(s) selecionada(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500 mb-3" />
              <p className="text-gray-500 text-sm">Carregando tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500">Nenhuma tag disponível</p>
              <p className="text-gray-600 text-sm mt-1">Crie tags no gerenciador de tags</p>
            </div>
          ) : (
            <>
              {/* Adicionar Tags */}
              <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-medium text-gray-200">Adicionar Tags</h3>
                  {tagsParaAdicionar.size > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 border border-green-500/30 text-green-400 rounded-full">
                      {tagsParaAdicionar.size}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagAdicionar(tag.nome)}
                      disabled={isProcessing || tagsParaRemover.has(tag.nome)}
                      className={`px-3 py-1.5 rounded-lg border transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                        tagsParaAdicionar.has(tag.nome)
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-gray-700 bg-[#161b22] hover:border-gray-600'
                      }`}
                      style={
                        tagsParaAdicionar.has(tag.nome)
                          ? {
                              borderColor: `${tag.cor}80`,
                              backgroundColor: `${tag.cor}15`,
                              color: tag.cor,
                            }
                          : { color: '#9ca3af' }
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.cor }}
                        />
                        {tag.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Remover Tags */}
              <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Minus className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-medium text-gray-200">Remover Tags</h3>
                  {tagsParaRemover.size > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 rounded-full">
                      {tagsParaRemover.size}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagRemover(tag.nome)}
                      disabled={isProcessing || tagsParaAdicionar.has(tag.nome)}
                      className={`px-3 py-1.5 rounded-lg border transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                        tagsParaRemover.has(tag.nome)
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-gray-700 bg-[#161b22] hover:border-gray-600'
                      }`}
                      style={
                        tagsParaRemover.has(tag.nome)
                          ? {
                              borderColor: `${tag.cor}80`,
                              backgroundColor: `${tag.cor}15`,
                              color: tag.cor,
                            }
                          : { color: '#9ca3af' }
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.cor }}
                        />
                        {tag.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              {(tagsParaAdicionar.size > 0 || tagsParaRemover.size > 0) && (
                <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Resumo da operação</h4>
                  <div className="space-y-2 text-sm">
                    {tagsParaAdicionar.size > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 font-medium">+ Adicionar:</span>
                        <span className="text-gray-400">
                          {Array.from(tagsParaAdicionar).join(', ')}
                        </span>
                      </div>
                    )}
                    {tagsParaRemover.size > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 font-medium">- Remover:</span>
                        <span className="text-gray-400">
                          {Array.from(tagsParaRemover).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || (tagsParaAdicionar.size === 0 && tagsParaRemover.size === 0)}
            className="px-4 py-2 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

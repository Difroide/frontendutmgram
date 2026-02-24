import { useState, useEffect } from 'react'
import { X, Tag, Check, Loader2 } from 'lucide-react'

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface EditarTagsContaModalProps {
  isOpen: boolean
  onClose: () => void
  numeroConta: string
  tagsAtuais: string[]
  onTagsChange?: () => void
}

export const EditarTagsContaModal = ({
  isOpen,
  onClose,
  numeroConta,
  tagsAtuais,
  onTagsChange,
}: EditarTagsContaModalProps) => {
  const [tags, setTags] = useState<TagConfig[]>([])
  const [tagsSelecionadas, setTagsSelecionadas] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
        
        // Mapear tags atuais para IDs
        const idsSelecionados = new Set<string>()
        result.tags.forEach((tag: TagConfig) => {
          if (tagsAtuais.includes(tag.nome)) {
            idsSelecionados.add(tag.id)
          }
        })
        setTagsSelecionadas(idsSelecionados)
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && numeroConta) {
      loadTags()
    } else {
      setTagsSelecionadas(new Set())
    }
  }, [isOpen, numeroConta, tagsAtuais])

  const toggleTag = (tagId: string) => {
    setTagsSelecionadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(tagId)) {
        novo.delete(tagId)
      } else {
        novo.add(tagId)
      }
      return novo
    })
  }

  const handleSalvar = async () => {
    setIsSaving(true)
    try {
      if (!window.electron?.tags?.adicionarConta || !window.electron?.tags?.removerConta) {
        alert('API não disponível')
        return
      }

      // Obter tags atuais por ID
      const tagsAtuaisIds = new Set<string>()
      tags.forEach((tag) => {
        if (tagsAtuais.includes(tag.nome)) {
          tagsAtuaisIds.add(tag.id)
        }
      })

      // Remover tags que foram desmarcadas
      for (const tagId of tagsAtuaisIds) {
        if (!tagsSelecionadas.has(tagId)) {
          await window.electron.tags.removerConta(numeroConta, tagId)
        }
      }

      // Adicionar tags que foram marcadas
      for (const tagId of tagsSelecionadas) {
        if (!tagsAtuaisIds.has(tagId)) {
          await window.electron.tags.adicionarConta(numeroConta, tagId)
        }
      }

      onTagsChange?.()
      onClose()
      // Tags atualizadas com sucesso (sem alerta)
    } catch (error) {
      console.error('Erro ao salvar tags:', error)
      alert('Erro ao salvar tags: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsSaving(false)
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
              <h2 className="text-lg font-semibold text-gray-100">Editar Tags</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Conta: {numeroConta}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tags.map((tag) => {
                const isSelected = tagsSelecionadas.has(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-gray-700 bg-[#0d1117] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-3 h-3 rounded flex-shrink-0"
                        style={{ backgroundColor: tag.cor }}
                      />
                      <span
                        className={`text-sm font-medium truncate flex-1 ${
                          isSelected ? 'text-white' : 'text-gray-300'
                        }`}
                      >
                        {tag.nome}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    {tag.descricao && (
                      <p className="text-xs text-gray-500 line-clamp-2">{tag.descricao}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {tagsSelecionadas.size} tag(s) selecionada(s)
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={isSaving}
              className="px-4 py-2 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Tags
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { FiltroTag } from '@/types/Conta'
import { Tag, X, Filter, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Categoria {
  id: string
  nome: string
  rodando?: boolean
}

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface FiltrosModalProps {
  isOpen: boolean
  onClose: () => void
  filtrosTags: Set<FiltroTag>
  onTagChange: (tag: FiltroTag) => void
  onLimparFiltros?: () => void
  categoriaFiltro: string
  onCategoriaFiltroChange: (categoriaId: string) => void
  categorias: Categoria[]
  onGerenciarTags?: () => void
}

const tagsPrincipais = ['Todas', 'Sem tags', 'Pronta para uso']
const tagsStatus = ['Com grupos', 'Sem grupos', 'Grupos sem membros', 'Grupos com erro', 'Com bots', 'Sem lista', 'SEM LISTA-URGENTE', 'Sem membros suficientes']
const tagsProblemas = ['Usuário restrito', 'Congeladas', 'Banidas']
const tagsBots = ['Bots Criados', 'Verificador disparo', 'Verificador Bots'] // Filtro exclusivo para contas que criaram bots + verificadoras

const getTagColor = (tag: string): { bg: string; border: string; text: string } => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    'Todas': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    'Sem tags': { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
    'Pronta para uso': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    'Com grupos': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    'Sem grupos': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    'Grupos sem membros': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    'Grupos com erro': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    'Com bots': { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    'Sem lista': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    'SEM LISTA-URGENTE': { bg: 'bg-red-600/10', border: 'border-red-600/30', text: 'text-red-400' },
    'Sem membros suficientes': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    'Usuário restrito': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    'Congeladas': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    'Banidas': { bg: 'bg-red-700/10', border: 'border-red-700/30', text: 'text-red-500' },
    'Bots Criados': { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
    'Verificador disparo': { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
    'Verificador Bots': { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  }
  return colors[tag] || { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' }
}

export const FiltrosModal = ({
  isOpen,
  onClose,
  filtrosTags,
  onTagChange,
  onLimparFiltros,
  categoriaFiltro,
  onCategoriaFiltroChange,
  categorias,
  onGerenciarTags,
}: FiltrosModalProps) => {
  const [tagsPersonalizadas, setTagsPersonalizadas] = useState<TagConfig[]>([])

  const loadTags = async () => {
    try {
      if (!(window as any).electron?.tags?.carregarTodas) {
        console.warn('API tags não disponível')
        return
      }

      const result = await (window as any).electron.tags.carregarTodas()
      if (result.success && result.tags) {
        // Filtrar apenas tags não-sistema (tags personalizadas)
        const tagsNaoSistema = result.tags.filter((tag: TagConfig) => !tag.isSystem)
        setTagsPersonalizadas(tagsNaoSistema || [])
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTags()
    }
  }, [isOpen])

  if (!isOpen) return null

  const filtrosAtivos = filtrosTags.has('Todas') ? 0 : filtrosTags.size

  const renderTagButton = (tag: string, isSelected: boolean) => {
    const colors = getTagColor(tag)
    return (
      <button
        key={tag}
        onClick={() => onTagChange(tag as FiltroTag)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSelected
            ? `${colors.bg} ${colors.border} ${colors.text} ring-1 ring-offset-1 ring-offset-[#0d1117]`
            : 'bg-[#161b22] border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        style={isSelected ? { ringColor: colors.border.replace('border-', '').replace('/30', '') } : {}}
      >
        {tag}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header - Liquid glass + azul */}
        <div className="sticky top-0 bg-gray-800/30 backdrop-blur-sm border-b border-gray-600/30 border-blue-500/10 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-100">Filtros</h2>
          </div>
          <div className="flex items-center gap-2">
            {filtrosAtivos > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full">
                {filtrosAtivos} ativo{filtrosAtivos > 1 ? 's' : ''}
              </span>
            )}
            {filtrosAtivos > 0 && onLimparFiltros && (
              <button
                onClick={onLimparFiltros}
                className="px-2 py-1 text-xs font-medium bg-[#21262d] border border-gray-700 text-gray-300 rounded hover:bg-[#21262d]/70 transition-all"
              >
                Limpar
              </button>
            )}
            {onGerenciarTags && (
              <button
                onClick={() => {
                  onGerenciarTags()
                  onClose()
                }}
                className="px-2 py-1 text-xs bg-[#21262d] border border-gray-700 text-gray-300 rounded hover:bg-[#21262d]/70 transition-all flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Gerenciar Tags
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Categoria */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-2">Categoria</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => onCategoriaFiltroChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d1117] text-gray-300 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Principais */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-3">Tags Principais</label>
            <div className="flex flex-wrap gap-2">
              {tagsPrincipais.map((tag) => {
                const isSelected = filtrosTags.has(tag as FiltroTag)
                return renderTagButton(tag, isSelected)
              })}
            </div>
          </div>

          {/* Tags de Status */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-3">Status</label>
            <div className="flex flex-wrap gap-2">
              {tagsStatus.map((tag) => {
                const isSelected = filtrosTags.has(tag as FiltroTag)
                return renderTagButton(tag, isSelected)
              })}
            </div>
          </div>

          {/* Tags de Problemas */}
          <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
            <label className="block text-xs text-gray-500 uppercase font-medium mb-3">Problemas</label>
            <div className="flex flex-wrap gap-2">
              {tagsProblemas.map((tag) => {
                const isSelected = filtrosTags.has(tag as FiltroTag)
                return renderTagButton(tag, isSelected)
              })}
            </div>
          </div>

          {/* Sessões com Bots & Verificadores - Filtro exclusivo */}
          <div className="bg-[#161b22] rounded-lg border border-violet-500/20 p-4">
            <label className="block text-xs text-violet-400 uppercase font-medium mb-3">Sessões com Bots</label>
            <p className="text-xs text-gray-500 mb-3">Contas que criaram bots e sessões verificadoras</p>
            <div className="flex flex-wrap gap-2">
              {tagsBots.map((tag) => {
                const isSelected = filtrosTags.has(tag as FiltroTag)
                return renderTagButton(tag, isSelected)
              })}
            </div>
          </div>

          {/* Tags Personalizadas */}
          {tagsPersonalizadas.length > 0 && (
            <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
              <label className="block text-xs text-gray-500 uppercase font-medium mb-3">Tags Personalizadas</label>
              <div className="flex flex-wrap gap-2">
                {tagsPersonalizadas.map((tag) => {
                  const tagValue = tag.nome as FiltroTag
                  const isSelected = filtrosTags.has(tagValue)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onTagChange(tagValue)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${isSelected
                          ? 'ring-1 ring-offset-1 ring-offset-[#0d1117]'
                          : 'bg-[#161b22] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      style={
                        isSelected
                          ? {
                            backgroundColor: `${tag.cor}15`,
                            borderColor: `${tag.cor}50`,
                            color: tag.cor,
                          }
                          : {}
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.cor }}
                      />
                      {tag.nome}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0d1117] border-t border-gray-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

import { Conta } from '@/types/Conta'
import { Search, Play, Trash2, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Tag, ChevronDown, X, Bot, Circle, AlertTriangle } from 'lucide-react'
import { useRef, useEffect, useState, useMemo } from 'react'
import { DetalhesContaModal } from './components/DetalhesContaModal'
import { useTags } from '@/hooks/useTags'

const ITEMS_PER_PAGE = 50

interface ContasTableProps {
  contas: Conta[]
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedContas: Set<number>
  onToggleSelect: (id: number) => void
  onDeselectAll: () => void
  onExecutarTelegram: (pastaPath: string) => void
  onExcluirNumero: (numero: string) => void
  onAdicionarContas: () => void
  onExcluirContas: () => void
  onExecutarTelegramContas: () => void
  onEditarTags?: (conta: Conta) => void
  onAlterarCategoria?: () => void
  onAlterarTags?: () => void
  categorias?: Array<{ id: string; nome: string; rodando?: boolean }>
  filtrosTags?: Set<string>
  categoriaFiltro?: string
  onCategoriaFiltroChange?: (categoriaId: string) => void
  onAbrirFiltros?: () => void
  onGerenciarTags?: () => void
  abrirDetalhesNumero?: string | null
  onDetalhesAberto?: () => void
}

export const ContasTable = ({
  contas,
  searchTerm,
  onSearchChange,
  selectedContas,
  onToggleSelect,
  onExecutarTelegram,
  onExcluirNumero,
  onEditarTags,
  categorias = [],
  filtrosTags = new Set(),
  categoriaFiltro = '',
  onCategoriaFiltroChange,
  onAbrirFiltros,
  abrirDetalhesNumero,
  onDetalhesAberto,
}: ContasTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState<string | null>(null)
  const { getTagStyle: getTagStyleFromHook } = useTags()

  const getTagStyle = (tag: string) => {
    const result = getTagStyleFromHook(tag)
    if (result && 'className' in result) {
      return result
    }
    return {
      className: '',
      style: result || {},
    }
  }

  const totalPages = Math.ceil(contas.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const contasPaginated = useMemo(() => {
    return contas.slice(startIndex, endIndex)
  }, [contas, startIndex, endIndex])

  useEffect(() => {
    setCurrentPage(1)
  }, [contas.length, searchTerm])

  useEffect(() => {
    if (abrirDetalhesNumero) {
      setContaSelecionada(abrirDetalhesNumero)
      setDetalhesModalOpen(true)
      onDetalhesAberto?.()
    }
  }, [abrirDetalhesNumero])

  const allSelectedInPage = contasPaginated.length > 0 && contasPaginated.every((conta) => selectedContas.has(conta.id))
  const someSelectedInPage = contasPaginated.some((conta) => selectedContas.has(conta.id)) && !allSelectedInPage

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelectedInPage
    }
  }, [someSelectedInPage])

  const handleSelectAllInPage = () => {
    contasPaginated.forEach((conta) => {
      if (!selectedContas.has(conta.id)) {
        onToggleSelect(conta.id)
      }
    })
  }

  const handleDeselectAllInPage = () => {
    contasPaginated.forEach((conta) => {
      if (selectedContas.has(conta.id)) {
        onToggleSelect(conta.id)
      }
    })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  const filtrosAtivos = filtrosTags.has('Todas') ? 0 : filtrosTags.size
  const temFiltrosAtivos = categoriaFiltro || filtrosAtivos > 0

  return (
    <div className="bg-[#161b22] rounded-lg border border-gray-800">
      {/* Barra de Busca e Filtros */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por número ou nome..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <select
              className="appearance-none px-3 py-2 bg-[#0d1117] text-gray-400 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 cursor-pointer pr-8"
              defaultValue=""
            >
              <option value="" className="bg-[#161b22]">Todos os Status</option>
            </select>

            {onCategoriaFiltroChange && (
              <div className="relative">
                <select
                  value={categoriaFiltro}
                  onChange={(e) => onCategoriaFiltroChange(e.target.value)}
                  className="appearance-none px-3 py-2 bg-[#0d1117] text-gray-400 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 cursor-pointer pr-8 min-w-[140px]"
                >
                  <option value="" className="bg-[#161b22]">Todas Categorias</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id} className="bg-[#161b22] text-gray-300">
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
              </div>
            )}

            {onAbrirFiltros && (
              <button
                onClick={onAbrirFiltros}
                className="relative px-3 py-2 bg-[#0d1117] text-gray-400 text-sm border border-gray-700/50 rounded-lg hover:border-gray-600 flex items-center gap-2"
              >
                <span>Todas Tags</span>
                <ChevronDown className="w-4 h-4" />
                {filtrosAtivos > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 rounded-full flex items-center justify-center">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
            )}

            {temFiltrosAtivos && (
              <button
                onClick={() => {
                  if (onCategoriaFiltroChange) onCategoriaFiltroChange('')
                  if (onSearchChange) onSearchChange('')
                }}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
                title="Limpar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header com info e paginação */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{contas.length} Contas</span>
          {contas.length > ITEMS_PER_PAGE && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  currentPage === 1 ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400' : 'bg-[#0d1117] border-gray-700/50 text-gray-400 hover:bg-[#21262d]'
                }`}
              >
                Todos
              </button>
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1.5 text-gray-600 text-xs">
                      ...
                    </span>
                  )
                }
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page as number)}
                    className={`px-2 py-1 text-xs rounded border transition-all ${
                      currentPage === page ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400' : 'bg-[#0d1117] border-gray-700/50 text-gray-400 hover:bg-[#21262d]'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <button
          onClick={allSelectedInPage ? handleDeselectAllInPage : handleSelectAllInPage}
          className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 bg-[#0d1117] border border-gray-700/50 rounded-lg hover:bg-[#21262d] transition-colors"
        >
          Selecionar Página
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0d1117]">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (allSelectedInPage) {
                        handleDeselectAllInPage()
                      } else {
                        handleSelectAllInPage()
                      }
                    }}
                  >
                    <input ref={checkboxRef} type="checkbox" checked={allSelectedInPage} onChange={() => {}} className="sr-only" />
                    <div
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        allSelectedInPage ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {allSelectedInPage && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                  </div>
                  <span>Número</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Uso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                  Nenhuma conta encontrada
                </td>
              </tr>
            ) : (
              contasPaginated.map((conta) => {
                const isOnline = conta.sessaoCompleta === true
                const isSelected = selectedContas.has(conta.id)

                return (
                  <tr
                    key={conta.id}
                    className={`border-b border-gray-800 transition-colors ${isSelected ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap cursor-pointer" onClick={() => onToggleSelect(conta.id)}>
                      <div className="flex items-center gap-2">
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleSelect(conta.id)
                          }}
                        >
                          <input type="checkbox" checked={isSelected} onChange={() => {}} className="sr-only" />
                          <div
                            className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                              isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                        </div>
                        <Bot className="w-4 h-4 text-gray-500" />
                        <span className="font-mono text-sm text-gray-200">{conta.numero}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">{conta.grupos}</span>
                        {conta.sessaoAlerta && (
                          <AlertTriangle
                            className="w-4 h-4 text-amber-500 flex-shrink-0"
                            title="Todos os grupos desta sessão caíram – possível sessão caiu"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {conta.categoriaId ? (
                        (() => {
                          const categoria = categorias.find((c) => String(c.id) === String(conta.categoriaId))
                          return categoria ? (
                            <span className="text-sm text-gray-300">{categoria.nome}</span>
                          ) : (
                            <span className="text-sm text-gray-600">-</span>
                          )
                        })()
                      ) : (
                        <span className="text-sm text-gray-600">Sem categoria</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {conta.tags && conta.tags.length > 0 ? (
                          conta.tags.map((tag, index) => {
                            const tagStyleResult = getTagStyle(tag)
                            return (
                              <span
                                key={index}
                                className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border ${tagStyleResult.className}`}
                                style={tagStyleResult.style}
                                title={tag}
                              >
                                {tag}
                              </span>
                            )
                          })
                        ) : (
                          <span className="text-[10px] text-gray-600">Sem tags</span>
                        )}
                        {onEditarTags && (
                          <button
                            onClick={() => onEditarTags(conta)}
                            className="ml-1 p-0.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded transition-colors"
                            title="Editar tags"
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {conta.ultimoUso ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-300">{new Date(conta.ultimoUso).toLocaleDateString('pt-BR')}</span>
                          <span className="text-xs text-gray-500">{new Date(conta.ultimoUso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Circle className={`w-2 h-2 ${isOnline ? 'text-emerald-500 fill-emerald-500' : 'text-gray-600 fill-gray-600'}`} />
                        <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {conta.sessaoCompleta === true && (
                          <button
                            onClick={() => onExecutarTelegram(conta.pastaPath)}
                            className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-[#21262d] rounded transition-colors"
                            title="Executar Telegram (portátil)"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setContaSelecionada(conta.numero)
                            setDetalhesModalOpen(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-[#21262d] rounded transition-colors"
                          title="Ver Detalhes"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onExcluirNumero(conta.numero)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#21262d] rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação inferior */}
      {contas.length > ITEMS_PER_PAGE && (
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {startIndex + 1} - {Math.min(endIndex, contas.length)} de {contas.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <DetalhesContaModal
        isOpen={detalhesModalOpen}
        onClose={() => {
          setDetalhesModalOpen(false)
          setContaSelecionada(null)
        }}
        numero={contaSelecionada || ''}
      />
    </div>
  )
}

import { X, FolderOpen, Plus, ChevronLeft, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'

interface Categoria {
  id: string
  nome: string
  descricao?: string
  rodando?: boolean
}

interface AlterarCategoriaEmMassaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (categoriaId: string | null) => Promise<void>
  selectedContas: Conta[]
  categorias: Categoria[]
  onCategoriaCriada?: () => Promise<void> // Callback para recarregar categorias
}

export const AlterarCategoriaEmMassaModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedContas,
  categorias,
  onCategoriaCriada,
}: AlterarCategoriaEmMassaModalProps) => {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [mostrarCriarCategoria, setMostrarCriarCategoria] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [novaCategoriaDescricao, setNovaCategoriaDescricao] = useState('')
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCategoriaSelecionada('')
      setMostrarCriarCategoria(false)
      setNovaCategoriaNome('')
      setNovaCategoriaDescricao('')
      setCriandoCategoria(false)
      setIsProcessing(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isProcessing && !criandoCategoria) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, isProcessing, criandoCategoria, onClose])

  const handleCriarCategoria = async () => {
    if (!novaCategoriaNome.trim()) {
      alert('Por favor, informe o nome da categoria')
      return
    }

    setCriandoCategoria(true)
    try {
      if (!(window as any).electron?.criador?.criarCategoria) {
        alert('API para criar categoria não disponível')
        return
      }

      const result = await (window as any).electron.criador.criarCategoria(
        novaCategoriaNome.trim(),
        novaCategoriaDescricao.trim()
      )

      if (result && result.id) {
        // Recarregar categorias do componente pai
        if (onCategoriaCriada) {
          await onCategoriaCriada()
        }
        
        // Selecionar a categoria recém-criada
        setCategoriaSelecionada(result.id)
        setMostrarCriarCategoria(false)
        setNovaCategoriaNome('')
        setNovaCategoriaDescricao('')
        
        alert(`Categoria "${result.nome}" criada com sucesso!`)
        return result.id // Retornar o ID para uso posterior
      } else {
        alert('Erro ao criar categoria')
        return null
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      alert(`Erro ao criar categoria: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return null
    } finally {
      setCriandoCategoria(false)
    }
  }

  const handleConfirm = async () => {
    if (!mostrarCriarCategoria && !categoriaSelecionada && categoriaSelecionada !== 'remover') {
      alert('Por favor, selecione uma categoria ou crie uma nova')
      return
    }

    setIsProcessing(true)
    try {
      let categoriaIdFinal: string | null = null

      // Se estiver criando categoria, criar primeiro
      if (mostrarCriarCategoria && novaCategoriaNome.trim()) {
        const novaCategoriaId = await handleCriarCategoria()
        if (!novaCategoriaId) {
          // Erro ao criar categoria, não continuar
          setIsProcessing(false)
          return
        }
        categoriaIdFinal = novaCategoriaId
      } else {
        // Usar categoria selecionada ou null para remover
        categoriaIdFinal = categoriaSelecionada === 'remover' 
          ? null 
          : categoriaSelecionada
      }

      // Confirmar alteração com o ID final
      await onConfirm(categoriaIdFinal)
    } catch (error) {
      console.error('Erro ao alterar categoria:', error)
      alert(`Erro ao alterar categoria: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-gray-600/30 border-blue-500/20 shadow-2xl w-full max-w-md"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header - Liquid glass + azul */}
        <div className="flex items-center justify-between p-5 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-100">Alterar Categoria em Massa</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing || criandoCategoria}
            className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-400">
            Alterando categoria de <span className="font-medium text-white">{selectedContas.length}</span> conta(s) selecionada(s).
          </div>

          {!mostrarCriarCategoria ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                  Selecionar Categoria
                </label>
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <option value="">Selecione uma categoria...</option>
                  <option value="remover">❌ Remover categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={() => setMostrarCriarCategoria(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Criar nova categoria
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  disabled={isProcessing || criandoCategoria}
                  placeholder="Digite o nome da categoria"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase font-medium mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={novaCategoriaDescricao}
                  onChange={(e) => setNovaCategoriaDescricao(e.target.value)}
                  disabled={isProcessing || criandoCategoria}
                  placeholder="Digite a descrição da categoria"
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed resize-none text-sm"
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setMostrarCriarCategoria(false)
                    setNovaCategoriaNome('')
                    setNovaCategoriaDescricao('')
                  }}
                  disabled={isProcessing || criandoCategoria}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar para selecionar categoria
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={isProcessing || criandoCategoria}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || criandoCategoria || (!mostrarCriarCategoria && !categoriaSelecionada && categoriaSelecionada !== 'remover') || (mostrarCriarCategoria && !novaCategoriaNome.trim())}
            className="px-4 py-2 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing || criandoCategoria ? (
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

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { useOperacao } from '../contexts/OperacaoContext'

interface OperacaoSelectorProps {
  isCollapsed?: boolean
}

export function OperacaoSelector({ isCollapsed = false }: OperacaoSelectorProps) {
  const { operacaoAtual, operacoes, setOperacaoAtual, criarOperacao, isLoading } = useOperacao()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debug: log operações
  useEffect(() => {
    if (operacoes.length > 0) {
      console.log('[OperacaoSelector] Operações disponíveis:', operacoes)
    }
    if (operacaoAtual) {
      console.log('[OperacaoSelector] Operação atual:', operacaoAtual)
    }
  }, [operacoes, operacaoAtual])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNovoNome('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCriar = async () => {
    if (novoNome.trim()) {
      try {
        await criarOperacao(novoNome.trim())
        setNovoNome('')
        setIsCreating(false)
        setIsOpen(false)
      } catch (error) {
        console.error('Erro ao criar operação:', error)
        alert(`Erro ao criar operação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }
  }

  if (isLoading) {
    return (
      <div className={`px-3 py-2 bg-gray-700/50 rounded-lg text-gray-400 text-sm ${isCollapsed ? 'text-center' : ''}`}>
        {isCollapsed ? '...' : 'Carregando...'}
      </div>
    )
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/30 rounded-lg text-gray-200 transition-colors ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <>
            <span className="font-medium text-sm truncate flex-1 text-left">
              {operacaoAtual?.nome || 'Selecione operação'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${
          isCollapsed ? 'left-full ml-2 w-64' : 'left-0 w-full'
        }`}>
          <div className="p-2">
            {operacoes.length === 0 && !isCreating && (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">
                Nenhuma operação encontrada
              </div>
            )}
            
            {operacoes.map((op) => (
              <button
                key={op.path}
                onClick={() => {
                  setOperacaoAtual(op)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  operacaoAtual?.path === op.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-200 hover:bg-gray-700'
                }`}
              >
                {op.nome}
              </button>
            ))}
            
            {isCreating ? (
              <div className="p-2 border-t border-gray-700 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300 font-medium">Nova Operação</span>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNovoNome('')
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCriar()
                    } else if (e.key === 'Escape') {
                      setIsCreating(false)
                      setNovoNome('')
                    }
                  }}
                  placeholder="Nome da operação"
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCriar}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNovoNome('')
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full text-left px-3 py-2 rounded-md text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2 mt-2 border-t border-gray-700"
              >
                <Plus className="w-4 h-4" />
                <span>Criar nova operação</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


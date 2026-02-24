import { useState, useMemo } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { NichoModal } from './NichoModal'
import { useCriador } from './CriadorContext'

export interface Nicho {
  id: string
  nome: string
  createdAt: string
}

export const NichosTab = () => {
  const { nichos, addNicho, removeNicho, reloadNichos } = useCriador()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const nichosFiltrados = useMemo(() => {
    if (!searchTerm) return nichos
    const term = searchTerm.toLowerCase()
    return nichos.filter((nicho) => nicho.nome.toLowerCase().includes(term))
  }, [nichos, searchTerm])

  const handleAddNicho = async (nome: string) => {
    try {
      // Criar pasta no sistema de arquivos via Electron
      if (window.electron?.criador) {
        const result = await window.electron.criador.criarPastaNicho(nome)
        if (!result.success) {
          alert(`Erro ao criar pasta: ${result.error || 'Erro desconhecido'}`)
          return
        }
        console.log('Pasta criada:', result.path)
        
        // Recarregar a lista de nichos para pegar os dados atualizados
        await reloadNichos()
      } else {
        console.warn('Electron API não disponível - pasta não será criada')
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error('Erro ao criar nicho:', error)
      alert('Erro ao criar nicho. Tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este nicho? A pasta também será removida.')) {
      try {
        // Encontrar o nicho pelo ID para pegar o nome
        const nicho = nichos.find((n) => n.id === id)
        if (!nicho) {
          alert('Nicho não encontrado')
          return
        }

        // Excluir a pasta via Electron
        if (window.electron?.criador) {
          const result = await window.electron.criador.excluirPastaNicho(nicho.nome)
          if (!result.success) {
            alert(`Erro ao excluir pasta: ${result.error || 'Erro desconhecido'}`)
            return
          }
        }

        // Remover do estado e recarregar
        removeNicho(id)
        await reloadNichos()
      } catch (error) {
        console.error('Erro ao excluir nicho:', error)
        alert('Erro ao excluir nicho. Tente novamente.')
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Card com Tabela */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg border border-gray-600/30 hover:shadow-xl transition-all">
        <div className="p-6">
          {/* Botões, Busca e Contador */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Nicho
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{nichosFiltrados.length} itens</span>
              </div>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nicho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Nome do Nicho</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Data de criação</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {nichosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      Nenhum nicho cadastrado
                    </td>
                  </tr>
                ) : (
                  nichosFiltrados.map((nicho) => (
                    <tr
                      key={nicho.id}
                      className="border-b border-gray-700 hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-100">{nicho.nome}</td>
                      <td className="py-3 px-4 text-gray-400">{formatDate(nicho.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDelete(nicho.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <NichoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddNicho}
      />
    </div>
  )
}


import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Eye, Search, Edit, Star, Shuffle, Download } from 'lucide-react'
import { ListaBotsModal } from './ListaBotsModal'
import { ViewBotsModal } from './ViewBotsModal'

export interface ListaBots {
  id: string
  listName: string
  bots: string[]
  prioritaria?: boolean
  createdAt: string
}

export const ListasTab = () => {
  const [listas, setListas] = useState<ListaBots[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedLista, setSelectedLista] = useState<ListaBots | null>(null)
  const [listaParaEditar, setListaParaEditar] = useState<ListaBots | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [quantidadePrioritarias, setQuantidadePrioritarias] = useState<string>('2')
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [modalPrioritaria, setModalPrioritaria] = useState<boolean | null>(null)

  // Carregar listas e configuração ao montar o componente
  useEffect(() => {
    loadListas()
    loadConfigPrioritarias()
  }, [])
  
  const loadConfigPrioritarias = async () => {
    try {
      if ((window as any).electron?.criador?.carregarConfigListasPrioritarias) {
        const result = await (window as any).electron.criador.carregarConfigListasPrioritarias()
        if (result.success && result.quantidade !== undefined) {
          setQuantidadePrioritarias(result.quantidade.toString())
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de listas prioritárias:', error)
    }
  }
  
  const handleSaveConfigPrioritarias = async () => {
    try {
      setIsLoadingConfig(true)
      if ((window as any).electron?.criador?.salvarConfigListasPrioritarias) {
        const quantidade = parseInt(quantidadePrioritarias) || 0
        if (quantidade < 0) {
          alert('A quantidade deve ser maior ou igual a 0')
          return
        }
        
        const result = await (window as any).electron.criador.salvarConfigListasPrioritarias(quantidade)
        if (result.success) {
          alert('Configuração salva com sucesso!')
        } else {
          alert(`Erro ao salvar configuração: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      alert('Erro ao salvar configuração')
    } finally {
      setIsLoadingConfig(false)
    }
  }


  const loadListas = async () => {
    try {
      if ((window as any).electron?.criador) {
        const listasCarregadas = await (window as any).electron.criador.carregarTodasListas()
        setListas(listasCarregadas || [])
        console.log('Listas carregadas:', listasCarregadas.length)
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error)
    }
  }

  // Primeiro definir listasPrioritarias e listasNormais
  const listasPrioritarias = useMemo(() => {
    return listas.filter(lista => lista.prioritaria === true)
  }, [listas])

  const listasNormais = useMemo(() => {
    return listas.filter(lista => lista.prioritaria !== true)
  }, [listas])

  // Depois definir as versões filtradas
  const listasFiltradasPrioritarias = useMemo(() => {
    if (!searchTerm) return listasPrioritarias
    const term = searchTerm.toLowerCase()
    return listasPrioritarias.filter((lista) => 
      lista.listName.toLowerCase().includes(term) || 
      `@${lista.listName}`.toLowerCase().includes(term)
    )
  }, [listasPrioritarias, searchTerm])

  const listasFiltradasNormais = useMemo(() => {
    if (!searchTerm) return listasNormais
    const term = searchTerm.toLowerCase()
    return listasNormais.filter((lista) => 
      lista.listName.toLowerCase().includes(term) || 
      `@${lista.listName}`.toLowerCase().includes(term)
    )
  }, [listasNormais, searchTerm])

  const handleAddLista = async (_listName: string, bots: string[], prioritaria: boolean) => {
    try {
      if ((window as any).electron?.criador) {
        // NOVO: Salvar cada @ como uma lista separada
        // O nome da lista será o próprio @ (sem o @)
        let sucessos = 0
        let erros = 0
        
        for (const bot of bots) {
          // Usar o @ como nome da lista (sem o @)
          const nomeLista = bot.trim()
          
          try {
            const result = await (window as any).electron.criador.salvarListaBots(nomeLista, [bot], prioritaria)
            if (result.success) {
              sucessos++
            } else {
              erros++
              console.warn(`Erro ao salvar lista ${nomeLista}:`, result.error)
            }
          } catch (error) {
            erros++
            console.error(`Erro ao salvar lista ${nomeLista}:`, error)
          }
        }
        
        if (sucessos > 0) {
          if (erros > 0) {
            alert(`${sucessos} lista(s) cadastrada(s) com sucesso. ${erros} erro(s).`)
          } else {
            alert(`${sucessos} lista(s) cadastrada(s) com sucesso!`)
          }
        } else {
          alert(`Erro ao cadastrar listas: ${erros} erro(s)`)
        }
        
        // Recarregar a lista
        await loadListas()
      } else {
        console.warn('Electron API não disponível')
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error('Erro ao adicionar lista:', error)
      alert('Erro ao adicionar lista. Tente novamente.')
    }
  }

  const handleEdit = (lista: ListaBots) => {
    setListaParaEditar(lista)
    setIsEditModalOpen(true)
  }

  const handleUpdateLista = async (_listNameNovo: string, bots: string[], prioritaria: boolean) => {
    try {
      if (!listaParaEditar) return

      if ((window as any).electron?.criador) {
        // NOVO: Para edição, usar o primeiro bot como nome (se houver)
        const nomeFinal = bots.length > 0 ? bots[0] : listaParaEditar.listName
        
        const result = await (window as any).electron.criador.atualizarListaBots(
          listaParaEditar.listName,
          nomeFinal,
          bots.length > 0 ? [bots[0]] : listaParaEditar.bots,
          prioritaria
        )
        if (!result.success) {
          alert(`Erro ao atualizar lista: ${result.error || 'Erro desconhecido'}`)
          return
        }
        console.log('Lista atualizada:', result.lista)
        
        // Recarregar a lista
        await loadListas()
      }
      setIsEditModalOpen(false)
      setListaParaEditar(null)
    } catch (error) {
      console.error('Erro ao atualizar lista:', error)
      alert('Erro ao atualizar lista. Tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta lista? O arquivo será removido permanentemente.')) {
      try {
        // Encontrar a lista para pegar o nome
        const lista = listas.find((l) => l.id === id)
        if (!lista) {
          alert('Lista não encontrada')
          return
        }

        if (window.electron?.criador) {
          const result = await window.electron.criador.excluirListaBots(lista.listName)
          if (!result.success) {
            alert(`Erro ao excluir lista: ${result.error || 'Erro desconhecido'}`)
            return
          }
        }

        // Recarregar a lista
        await loadListas()
      } catch (error) {
        console.error('Erro ao excluir lista:', error)
        alert('Erro ao excluir lista. Tente novamente.')
      }
    }
  }

  const handleView = (lista: ListaBots) => {
    setSelectedLista(lista)
    setViewModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleExportarTodasListas = () => {
    if (listas.length === 0) {
      alert('Nenhuma lista cadastrada para exportar')
      return
    }
    const exportData = {
      exportadoEm: new Date().toISOString(),
      totalListas: listas.length,
      listasPrioritarias: listasPrioritarias.length,
      listasNormais: listasNormais.length,
      listas: listas.map((l) => ({
        id: l.id,
        listName: l.listName,
        bots: l.bots,
        prioritaria: l.prioritaria ?? false,
        createdAt: l.createdAt,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listas-todas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 bg-[#0b0e14] min-h-screen p-4">
      {/* Botão Exportar Todas as Listas */}
      <div className="flex justify-end">
        <button
          onClick={handleExportarTodasListas}
          disabled={listas.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600/40 backdrop-blur-md border border-emerald-400/30 text-white rounded-lg hover:bg-emerald-600/60 hover:border-emerald-400/50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
        >
          <Download className="w-4 h-4" />
          Exportar Todas as Listas
        </button>
      </div>

      {/* Aba de Listas Prioritárias */}
      <div className="bg-[#11151d] backdrop-blur-md rounded-lg shadow-lg border border-slate-800/60 hover:shadow-xl transition-all">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <h3 className="text-lg font-semibold text-gray-100">Listas Prioritárias</h3>
              <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-400/30 rounded text-xs text-yellow-300">
                {listasPrioritarias.length}
              </span>
            </div>
            <button
              onClick={() => {
                setModalPrioritaria(true)
                setListaParaEditar(null)
                setIsModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600/40 backdrop-blur-md border border-yellow-400/30 text-white rounded-lg hover:bg-yellow-600/50 hover:border-yellow-400/50 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Lista Prioritária
            </button>
          </div>

          {/* Configuração de quantidade */}
          <div className="mb-4 p-4 bg-[#0b0e14] rounded-lg border border-slate-800/60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Quantidade de Listas Prioritárias por Grupo
                </label>
                <input
                  type="number"
                  min="0"
                  max={listasPrioritarias.length}
                  value={quantidadePrioritarias}
                  onChange={(e) => {
                    const value = e.target.value
                    const num = parseInt(value) || 0
                    const max = listasPrioritarias.length
                    if (value === '' || (num >= 0 && num <= max)) {
                      setQuantidadePrioritarias(value)
                    }
                  }}
                  className="w-full px-4 py-2 bg-[#11151d] backdrop-blur-sm text-slate-300 border border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-400/50 text-sm"
                  placeholder="Ex: 2"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Quantas listas prioritárias serão adicionadas aleatoriamente em cada grupo.
                  {listasPrioritarias.length > 0 && (
                    <span className="block mt-1">
                      Máximo disponível: {listasPrioritarias.length} lista(s) prioritária(s)
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleSaveConfigPrioritarias}
                  disabled={isLoadingConfig || parseInt(quantidadePrioritarias) < 0 || (listasPrioritarias.length > 0 && parseInt(quantidadePrioritarias) > listasPrioritarias.length)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 backdrop-blur-md border border-yellow-400/50 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-500 hover:border-yellow-400/70 transition-all text-sm font-medium shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingConfig ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lista prioritária..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#11151d] backdrop-blur-sm text-slate-300 border border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-400/50 text-sm"
              />
            </div>
          </div>

          {/* Tabela de Listas Prioritárias */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">@ da Lista</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Data</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listasFiltradasPrioritarias.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      {listasPrioritarias.length === 0 
                        ? 'Nenhuma lista prioritária cadastrada' 
                        : 'Nenhuma lista encontrada na busca'}
                    </td>
                  </tr>
                ) : (
                  listasFiltradasPrioritarias.map((lista) => (
                    <tr
                      key={lista.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-100">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-mono">@{lista.listName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">-</td>
                      <td className="py-3 px-4 text-gray-400">{formatDate(lista.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(lista)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                            title="Ver bots"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(lista)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lista.id)}
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

      {/* Aba de Listas Normais */}
      <div className="bg-[#11151d] backdrop-blur-md rounded-lg shadow-lg border border-slate-800/60 hover:shadow-xl transition-all">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shuffle className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Listas Normais</h3>
              <span className="px-2 py-1 bg-blue-600/20 border border-blue-400/30 rounded text-xs text-blue-300">
                {listasNormais.length}
              </span>
            </div>
            <button
              onClick={() => {
                setModalPrioritaria(false)
                setListaParaEditar(null)
                setIsModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 backdrop-blur-md border border-blue-400/50 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 hover:border-blue-400/70 transition-all text-sm font-medium shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              Adicionar Lista Normal
            </button>
          </div>

          {/* Informação sobre listas normais */}
          <div className="mb-4 p-3 bg-[#0b0e14] border border-slate-800/60 rounded-lg">
            <p className="text-xs text-slate-400">
              <strong>Como funciona:</strong> As listas normais serão adicionadas aleatoriamente aos grupos após as listas prioritárias. 
              Isso ajuda a distribuir melhor as listas e evitar que um grupo tenha lista demais.
            </p>
          </div>

          {/* Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lista normal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#11151d] backdrop-blur-sm text-slate-300 border border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 text-sm"
              />
            </div>
          </div>

          {/* Tabela de Listas Normais */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">@ da Lista</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Data</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listasFiltradasNormais.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      {listasNormais.length === 0 
                        ? 'Nenhuma lista normal cadastrada' 
                        : 'Nenhuma lista encontrada na busca'}
                    </td>
                  </tr>
                ) : (
                  listasFiltradasNormais.map((lista) => (
                    <tr
                      key={lista.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2 px-4 text-slate-100 text-sm">
                        <div className="flex items-center gap-2">
                          <Shuffle className="w-4 h-4 text-blue-400" />
                          <span className="font-mono">@{lista.listName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-slate-400 text-sm">-</td>
                      <td className="py-2 px-4 text-slate-400 text-sm">{formatDate(lista.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(lista)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                            title="Ver bots"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(lista)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lista.id)}
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

      {/* Modais */}
      <ListaBotsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalPrioritaria(null)
        }}
        onSave={handleAddLista}
        forcarPrioritaria={modalPrioritaria === true}
        forcarNormal={modalPrioritaria === false}
      />
      <ListaBotsModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setListaParaEditar(null)
        }}
        onSave={handleUpdateLista}
        lista={listaParaEditar}
        isEdit={true}
      />
      <ViewBotsModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        lista={selectedLista}
      />
    </div>
  )
}


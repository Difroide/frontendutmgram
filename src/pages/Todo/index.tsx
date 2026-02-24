import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, Circle, Clock, Filter, Search } from 'lucide-react'
import { todoService, type Todo, type Urgencia } from '@/services/todoService'

const URGENCIAS: Urgencia[] = ['Baixa', 'Média', 'Alta', 'Crítica']

const URGENCIA_COLORS = {
  Baixa: 'bg-green-500/20 border-green-400/50 text-green-300',
  Média: 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300',
  Alta: 'bg-orange-500/20 border-orange-400/50 text-orange-300',
  Crítica: 'bg-red-500/20 border-red-400/50 text-red-300',
}

const STATUS_COLORS = {
  pendente: 'bg-gray-500/20 border-gray-400/50 text-gray-300',
  'em-andamento': 'bg-blue-500/20 border-blue-400/50 text-blue-300',
  concluida: 'bg-green-500/20 border-green-400/50 text-green-300',
  cancelada: 'bg-red-500/20 border-red-400/50 text-red-300',
}

interface TodoFormData {
  tarefa: string
  descricao: string
  urgencia: Urgencia
  nomes: string
  tags: string
}

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todas' | Todo['status']>('todas')
  const [filterUrgencia, setFilterUrgencia] = useState<'todas' | Urgencia>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState<TodoFormData>({
    tarefa: '',
    descricao: '',
    urgencia: 'Média',
    nomes: '',
    tags: '',
  })

  useEffect(() => {
    // Carregar tarefas iniciais
    setTodos(todoService.getAll())

    // Inscrever-se em mudanças
    const unsubscribe = todoService.subscribe((newTodos) => {
      setTodos(newTodos)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleOpenModal = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo)
      setFormData({
        tarefa: todo.tarefa,
        descricao: todo.descricao || '',
        urgencia: todo.urgencia,
        nomes: todo.nomes?.join(', ') || '',
        tags: todo.tags?.join(', ') || '',
      })
    } else {
      setEditingTodo(null)
      setFormData({
        tarefa: '',
        descricao: '',
        urgencia: 'Média',
        nomes: '',
        tags: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTodo(null)
    setIsSaving(false) // Resetar estado de salvamento
    setFormData({
      tarefa: '',
      descricao: '',
      urgencia: 'Média',
      nomes: '',
      tags: '',
    })
  }

  const handleSave = async () => {
    // Prevenir duplo clique
    if (isSaving) return

    if (!formData.tarefa.trim()) {
      alert('Preencha o campo "Tarefa"')
      return
    }

    setIsSaving(true)

    try {
      const nomesArray = formData.nomes.split(',').map(n => n.trim()).filter(n => n.length > 0)
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)

      if (editingTodo) {
        todoService.update(editingTodo.id, {
          tarefa: formData.tarefa,
          descricao: formData.descricao || undefined,
          urgencia: formData.urgencia,
          nomes: nomesArray.length > 0 ? nomesArray : undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        })
      } else {
        todoService.create({
          tarefa: formData.tarefa,
          descricao: formData.descricao || undefined,
          urgencia: formData.urgencia,
          nomes: nomesArray.length > 0 ? nomesArray : undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        })
      }

      handleCloseModal()
    } finally {
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        setIsSaving(false)
      }, 500)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir esta tarefa?')) {
      todoService.delete(id)
    }
  }

  const handleStatusChange = (id: string, newStatus: Todo['status']) => {
    todoService.update(id, { status: newStatus })
  }

  const filteredTodos = todos.filter((todo) => {
    // Filtro de status
    if (filterStatus !== 'todas' && todo.status !== filterStatus) return false
    
    // Filtro de urgência
    if (filterUrgencia !== 'todas' && todo.urgencia !== filterUrgencia) return false
    
    // Busca por texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        todo.tarefa.toLowerCase().includes(searchLower) ||
        todo.descricao?.toLowerCase().includes(searchLower) ||
        todo.nomes?.some(n => n.toLowerCase().includes(searchLower)) ||
        todo.tags?.some(t => t.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  const stats = todoService.getStats()

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Todo List</h1>
            <p className="text-gray-400 mt-2">Gerencie suas tarefas e atividades</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Estatísticas - Clicáveis para Filtrar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <button
          onClick={() => {
            setFilterStatus('todas')
            setFilterUrgencia('todas')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterStatus === 'todas' && filterUrgencia === 'todas'
              ? 'border-blue-500/50 shadow-lg shadow-blue-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-100">{stats.total}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('pendente')
            setFilterUrgencia('todas')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterStatus === 'pendente' && filterUrgencia === 'todas'
              ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pendentes}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('em-andamento')
            setFilterUrgencia('todas')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterStatus === 'em-andamento' && filterUrgencia === 'todas'
              ? 'border-blue-500/50 shadow-lg shadow-blue-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Em Andamento</div>
          <div className="text-2xl font-bold text-blue-400">{stats.emAndamento}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('concluida')
            setFilterUrgencia('todas')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterStatus === 'concluida' && filterUrgencia === 'todas'
              ? 'border-green-500/50 shadow-lg shadow-green-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Concluídas</div>
          <div className="text-2xl font-bold text-green-400">{stats.concluidas}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('todas')
            setFilterUrgencia('Crítica')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterUrgencia === 'Crítica' && filterStatus === 'todas'
              ? 'border-red-500/50 shadow-lg shadow-red-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Críticas</div>
          <div className="text-2xl font-bold text-red-400">{stats.criticas}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('todas')
            setFilterUrgencia('Alta')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterUrgencia === 'Alta' && filterStatus === 'todas'
              ? 'border-orange-500/50 shadow-lg shadow-orange-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Altas</div>
          <div className="text-2xl font-bold text-orange-400">{stats.altas}</div>
        </button>
        <button
          onClick={() => {
            setFilterStatus('cancelada')
            setFilterUrgencia('todas')
          }}
          className={`bg-gray-800/40 backdrop-blur-md rounded-lg border p-4 text-left transition-all hover:shadow-xl cursor-pointer ${
            filterStatus === 'cancelada' && filterUrgencia === 'todas'
              ? 'border-gray-500/50 shadow-lg shadow-gray-500/20'
              : 'border-gray-600/30 hover:border-gray-500/50'
          }`}
        >
          <div className="text-sm text-gray-400">Canceladas</div>
          <div className="text-2xl font-bold text-gray-400">{stats.canceladas}</div>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Busca */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tarefas por nome, descrição, nomes ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtro Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as typeof filterStatus)
                  // Resetar filtro de urgência quando mudar status
                  if (e.target.value !== 'todas') {
                    setFilterUrgencia('todas')
                  }
                }}
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas</option>
                <option value="pendente">Pendentes</option>
                <option value="em-andamento">Em Andamento</option>
                <option value="concluida">Concluídas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          </div>

          {/* Filtro Urgência */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Urgência
            </label>
            <select
              value={filterUrgencia}
              onChange={(e) => {
                setFilterUrgencia(e.target.value as typeof filterUrgencia)
                // Resetar filtro de status quando mudar urgência (exceto se for "todas")
                if (e.target.value !== 'todas') {
                  setFilterStatus('todas')
                }
              }}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas Urgências</option>
              {URGENCIAS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Botão Limpar Filtros */}
          {(filterStatus !== 'todas' || filterUrgencia !== 'todas' || searchTerm) && (
            <button
              onClick={() => {
                setFilterStatus('todas')
                setFilterUrgencia('todas')
                setSearchTerm('')
              }}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors text-sm font-medium"
              title="Limpar todos os filtros"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 p-12 text-center text-gray-400">
            Nenhuma tarefa encontrada
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => {
                        const newStatus = todo.status === 'concluida' ? 'pendente' : 'concluida'
                        handleStatusChange(todo.id, newStatus)
                      }}
                      className="flex-shrink-0"
                    >
                      {todo.status === 'concluida' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-green-400" />
                      )}
                    </button>
                    <h3 className={`text-lg font-semibold ${todo.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                      {todo.tarefa}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${URGENCIA_COLORS[todo.urgencia]}`}>
                      {todo.urgencia}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[todo.status]}`}>
                      {todo.status === 'pendente' ? 'Pendente' : 
                       todo.status === 'em-andamento' ? 'Em Andamento' :
                       todo.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                    </span>
                  </div>
                  
                  {todo.descricao && (
                    <p className="text-gray-400 text-sm mb-3 ml-8">{todo.descricao}</p>
                  )}

                  <div className="flex flex-wrap gap-2 ml-8">
                    {todo.nomes && todo.nomes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Nomes:</span>
                        {todo.nomes.map((nome, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-xs text-blue-300">
                            {nome}
                          </span>
                        ))}
                      </div>
                    )}
                    {todo.tags && todo.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Tags:</span>
                        {todo.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-xs text-purple-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3 ml-8 text-xs text-gray-500">
                    <span>Criada: {new Date(todo.dataCriacao).toLocaleDateString('pt-BR')}</span>
                    {todo.dataConclusao && (
                      <span>Concluída: {new Date(todo.dataConclusao).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(todo.id, 'em-andamento')}
                    disabled={todo.status === 'em-andamento' || todo.status === 'concluida'}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Marcar como em andamento"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleOpenModal(todo)}
                    className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-600/30 shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">
              {editingTodo ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>

            <div className="space-y-4">
              {/* Tarefa */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Tarefa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tarefa}
                  onChange={(e) => setFormData({ ...formData, tarefa: e.target.value })}
                  placeholder="Digite o nome da tarefa"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a tarefa em detalhes"
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Urgência */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Urgência
                </label>
                <select
                  value={formData.urgencia}
                  onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as Urgencia })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {URGENCIAS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Nomes */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nomes (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.nomes}
                  onChange={(e) => setFormData({ ...formData, nomes: e.target.value })}
                  placeholder="Ex: João, Maria, Pedro"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Separe múltiplos nomes com vírgula</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Ex: urgente, cliente, projeto"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Separe múltiplas tags com vírgula</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingTodo ? 'Salvar Alterações' : 'Criar Tarefa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


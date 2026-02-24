/**
 * Serviço para gerenciar tarefas TODO
 * Armazena dados no localStorage
 */

export type Urgencia = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export interface Todo {
  id: string
  tarefa: string
  descricao?: string
  urgencia: Urgencia
  nomes?: string[] // Lista de nomes relacionados
  status: 'pendente' | 'em-andamento' | 'concluida' | 'cancelada'
  dataCriacao: string
  dataConclusao?: string
  tags?: string[]
}

const STORAGE_KEY = 'todos'

// Subscribers para atualizações
let subscribers: Array<(todos: Todo[]) => void> = []

function notifySubscribers() {
  const todos = getAll()
  subscribers.forEach((callback) => callback(todos))
}

export const todoService = {
  /**
   * Buscar todas as tarefas
   */
  getAll(): Todo[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      return JSON.parse(stored)
    } catch (error) {
      console.error('[todoService] Erro ao carregar TODOs:', error)
      return []
    }
  },

  /**
   * Buscar tarefa por ID
   */
  getById(id: string): Todo | null {
    const todos = this.getAll()
    return todos.find((todo) => todo.id === id) || null
  },

  /**
   * Criar nova tarefa
   */
  create(data: Omit<Todo, 'id' | 'dataCriacao' | 'status'>): Todo {
    const todos = this.getAll()
    const newTodo: Todo = {
      ...data,
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataCriacao: new Date().toISOString(),
      status: 'pendente',
      nomes: data.nomes || [],
      tags: data.tags || [],
    }
    
    todos.push(newTodo)
    this.save(todos)
    this.notifySubscribers()
    return newTodo
  },

  /**
   * Atualizar tarefa
   */
  update(id: string, updates: Partial<Todo>): Todo | null {
    const todos = this.getAll()
    const index = todos.findIndex((todo) => todo.id === id)
    
    if (index === -1) return null
    
    const updatedTodo = {
      ...todos[index],
      ...updates,
    }
    
    // Se mudou para concluída, adicionar data de conclusão
    if (updates.status === 'concluida' && !updatedTodo.dataConclusao) {
      updatedTodo.dataConclusao = new Date().toISOString()
    }
    
    // Se mudou de concluída para outro status, remover data de conclusão
    if (updates.status && updates.status !== 'concluida' && updatedTodo.dataConclusao) {
      updatedTodo.dataConclusao = undefined
    }
    
    todos[index] = updatedTodo
    this.save(todos)
    this.notifySubscribers()
    return updatedTodo
  },

  /**
   * Deletar tarefa
   */
  delete(id: string): boolean {
    const todos = this.getAll()
    const filtered = todos.filter((todo) => todo.id !== id)
    
    if (filtered.length === todos.length) return false
    
    this.save(filtered)
    this.notifySubscribers()
    return true
  },

  /**
   * Salvar tarefas no localStorage
   */
  save(todos: Todo[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    } catch (error) {
      console.error('[todoService] Erro ao salvar TODOs:', error)
    }
  },

  /**
   * Inscrever-se em mudanças
   */
  subscribe(callback: (todos: Todo[]) => void): () => void {
    subscribers.push(callback)
    // Retornar função de unsubscribe
    return () => {
      subscribers = subscribers.filter((cb) => cb !== callback)
    }
  },

  /**
   * Obter estatísticas
   */
  getStats() {
    const todos = this.getAll()
    return {
      total: todos.length,
      pendentes: todos.filter((t) => t.status === 'pendente').length,
      emAndamento: todos.filter((t) => t.status === 'em-andamento').length,
      concluidas: todos.filter((t) => t.status === 'concluida').length,
      canceladas: todos.filter((t) => t.status === 'cancelada').length,
      criticas: todos.filter((t) => t.urgencia === 'Crítica' && t.status !== 'concluida' && t.status !== 'cancelada').length,
      altas: todos.filter((t) => t.urgencia === 'Alta' && t.status !== 'concluida' && t.status !== 'cancelada').length,
    }
  },
}


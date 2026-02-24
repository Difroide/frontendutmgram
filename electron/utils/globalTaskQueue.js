/**
 * Fila Global de Tarefas Críticas
 * Gerencia todas as operações que usam multi sessões para evitar conflitos
 * Operações: criar grupos, adicionar listas, verificar contas, etc.
 */

import path from 'path'
import { PATHS } from '../config/paths.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

class GlobalTaskQueue {
  constructor() {
    this.queue = [] // Array de tarefas pendentes
    this.isProcessing = false
    this.currentTask = null
    this.progressCallbacks = new Map() // Map<processId, callback>
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      currentOperation: null
    }
  }

  /**
   * Adiciona uma tarefa à fila global
   * @param {Object} task - Tarefa a ser adicionada
   * @param {string} task.type - Tipo da operação ('criar-grupos', 'adicionar-listas', 'verificar-contas', etc.)
   * @param {string} task.processId - ID único do processo
   * @param {Function} task.workerFunction - Função que executa a tarefa
   * @param {Function} task.sendProgress - Callback para enviar progresso
   * @param {number} task.maxWorkers - Número máximo de workers simultâneos
   * @param {Object} task.taskData - Dados específicos da tarefa
   */
  enqueue(task) {
    this.queue.push({
      ...task,
      queuedAt: Date.now(),
      status: 'pending'
    })
    console.log(`[Fila Global] ✅ Tarefa "${task.type}" (${task.processId}) adicionada à fila. Total na fila: ${this.queue.length}`)
    
    // Se não estiver processando, iniciar processamento
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Registra callback de progresso para um processo
   */
  registerProgressCallback(processId, sendProgress) {
    this.progressCallbacks.set(processId, sendProgress)
    console.log(`[Fila Global] Callback de progresso registrado para ${processId}`)
  }

  /**
   * Remove callback de progresso
   */
  unregisterProgressCallback(processId) {
    this.progressCallbacks.delete(processId)
    console.log(`[Fila Global] Callback de progresso removido para ${processId}`)
  }

  /**
   * Processa a fila global (uma tarefa por vez)
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log(`[Fila Global] Já está processando. Aguardando...`)
      return
    }

    if (this.queue.length === 0) {
      console.log(`[Fila Global] Fila vazia`)
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      this.currentTask = task
      this.stats.currentOperation = task.type

      console.log(`[Fila Global] 🚀 Iniciando processamento: ${task.type} (${task.processId})`)
      console.log(`[Fila Global] 📊 Tarefas restantes na fila: ${this.queue.length}`)

      try {
        // Registrar callback de progresso se fornecido
        if (task.sendProgress) {
          this.registerProgressCallback(task.processId, task.sendProgress)
        }

        // Executar a tarefa
        const result = await task.workerFunction(task)

        this.stats.totalProcessed++
        console.log(`[Fila Global] ✅ Tarefa "${task.type}" (${task.processId}) concluída com sucesso`)
        
        // Chamar callback de sucesso se fornecido (passar resultado se disponível)
        if (task.onComplete) {
          task.onComplete(result)
        }

      } catch (error) {
        this.stats.totalErrors++
        console.error(`[Fila Global] ❌ Erro ao processar tarefa "${task.type}" (${task.processId}):`, error.message)
        
        // Enviar erro via callback se disponível
        if (task.sendProgress) {
          try {
            task.sendProgress({
              completed: 0,
              total: 0,
              message: `Erro: ${error.message}`,
              error: error.message,
              activeWorkers: 0
            })
          } catch (progressError) {
            console.warn(`[Fila Global] Erro ao enviar progresso de erro:`, progressError.message)
          }
        }
        
        // Chamar callback de erro se fornecido
        if (task.onError) {
          task.onError(error)
        }
      } finally {
        // Limpar callback de progresso
        this.unregisterProgressCallback(task.processId)
        this.currentTask = null
        this.stats.currentOperation = null
      }
    }

    this.isProcessing = false
    console.log(`[Fila Global] ✅ Fila processada completamente`)
  }

  /**
   * Obtém estatísticas da fila
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentOperation: this.stats.currentOperation,
      currentProcessId: this.currentTask?.processId || null,
      totalProcessed: this.stats.totalProcessed,
      totalErrors: this.stats.totalErrors
    }
  }

  /**
   * Obtém IDs de categorias que estão rodando (na fila ou sendo processadas)
   * @returns {Set<string>} Set com IDs de categorias rodando
   */
  getCategoriasRodando() {
    const categoriasRodando = new Set()
    
    // Verificar tarefa atual sendo processada (mais importante - está em execução agora)
    if (this.currentTask && this.currentTask.taskData?.categoriaId) {
      categoriasRodando.add(this.currentTask.taskData.categoriaId)
    }
    
    // Verificar tarefas na fila (aguardando processamento)
    for (const task of this.queue) {
      if (task.taskData?.categoriaId) {
        categoriasRodando.add(task.taskData.categoriaId)
      }
    }
    
    return categoriasRodando
  }

  /**
   * Limpa a fila (útil para testes ou reset)
   */
  clear() {
    this.queue = []
    this.progressCallbacks.clear()
    this.isProcessing = false
    this.currentTask = null
    console.log(`[Fila Global] Fila limpa`)
  }
}

// Exportar instância única (Singleton)
export const globalTaskQueue = new GlobalTaskQueue()


/**
 * Hook para gerenciar a biblioteca de Order Bumps (persistente)
 * Salva em arquivo JSON via Electron
 */

import { useState, useEffect, useCallback } from 'react'
import { OrderBumpSalvo } from '../types/Fluxo'

// Tipagem da API do Electron
declare global {
  interface Window {
    electron?: {
      orderBumpLibrary?: {
        load: () => Promise<{ success: boolean; data: OrderBumpSalvo[]; error?: string }>
        save: (orderBumps: OrderBumpSalvo[]) => Promise<{ success: boolean; error?: string }>
        add: (orderBump: OrderBumpSalvo) => Promise<{ success: boolean; data: OrderBumpSalvo[]; error?: string }>
        update: (orderBump: OrderBumpSalvo) => Promise<{ success: boolean; data: OrderBumpSalvo[]; error?: string }>
        delete: (id: string) => Promise<{ success: boolean; data: OrderBumpSalvo[]; error?: string }>
      }
    }
  }
}

export interface UseOrderBumpLibraryReturn {
  orderBumps: OrderBumpSalvo[]
  isLoading: boolean
  error: string | null
  
  // CRUD
  adicionar: (ob: OrderBumpSalvo) => Promise<void>
  atualizar: (ob: OrderBumpSalvo) => Promise<void>
  duplicar: (id: string) => Promise<void>
  excluir: (id: string) => Promise<void>
  
  // Reload
  recarregar: () => Promise<void>
}

export function useOrderBumpLibrary(): UseOrderBumpLibraryReturn {
  const [orderBumps, setOrderBumps] = useState<OrderBumpSalvo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Carregar ao montar
  const carregarBiblioteca = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electron?.orderBumpLibrary) {
        const result = await window.electron.orderBumpLibrary.load()
        if (result.success) {
          setOrderBumps(result.data || [])
        } else {
          setError(result.error || 'Erro ao carregar biblioteca')
          setOrderBumps([])
        }
      } else {
        // Fallback para ambiente de desenvolvimento sem Electron
        console.warn('[useOrderBumpLibrary] Electron API não disponível, usando memória local')
        setOrderBumps([])
      }
    } catch (err) {
      console.error('[useOrderBumpLibrary] Erro:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setOrderBumps([])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Carregar ao montar
  useEffect(() => {
    carregarBiblioteca()
  }, [carregarBiblioteca])
  
  // Adicionar Order Bump
  const adicionar = useCallback(async (ob: OrderBumpSalvo) => {
    try {
      if (window.electron?.orderBumpLibrary) {
        const result = await window.electron.orderBumpLibrary.add(ob)
        if (result.success) {
          setOrderBumps(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        // Fallback local
        setOrderBumps(prev => [...prev, ob])
      }
    } catch (err) {
      console.error('[useOrderBumpLibrary] Erro ao adicionar:', err)
      throw err
    }
  }, [])
  
  // Atualizar Order Bump
  const atualizar = useCallback(async (ob: OrderBumpSalvo) => {
    try {
      if (window.electron?.orderBumpLibrary) {
        const result = await window.electron.orderBumpLibrary.update(ob)
        if (result.success) {
          setOrderBumps(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        // Fallback local
        setOrderBumps(prev => prev.map(item => item.id === ob.id ? ob : item))
      }
    } catch (err) {
      console.error('[useOrderBumpLibrary] Erro ao atualizar:', err)
      throw err
    }
  }, [])
  
  // Duplicar Order Bump
  const duplicar = useCallback(async (id: string) => {
    const original = orderBumps.find(ob => ob.id === id)
    if (!original) return
    
    const novoOB: OrderBumpSalvo = {
      ...original,
      id: `ob-${Date.now()}`,
      nome: `${original.nome} (cópia)`,
    }
    
    await adicionar(novoOB)
  }, [orderBumps, adicionar])
  
  // Excluir Order Bump
  const excluir = useCallback(async (id: string) => {
    try {
      if (window.electron?.orderBumpLibrary) {
        const result = await window.electron.orderBumpLibrary.delete(id)
        if (result.success) {
          setOrderBumps(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        // Fallback local
        setOrderBumps(prev => prev.filter(ob => ob.id !== id))
      }
    } catch (err) {
      console.error('[useOrderBumpLibrary] Erro ao excluir:', err)
      throw err
    }
  }, [])
  
  return {
    orderBumps,
    isLoading,
    error,
    adicionar,
    atualizar,
    duplicar,
    excluir,
    recarregar: carregarBiblioteca,
  }
}

/**
 * Hook para gerenciar a biblioteca de Upsells (persistente)
 * Salva em arquivo JSON via Electron
 */

import { useState, useEffect, useCallback } from 'react'
import { UpsellSalvo } from '../types/Fluxo'

declare global {
  interface Window {
    electron?: {
      upsellLibrary?: {
        load: () => Promise<{ success: boolean; data: UpsellSalvo[]; error?: string }>
        save: (upsells: UpsellSalvo[]) => Promise<{ success: boolean; error?: string }>
        add: (upsell: UpsellSalvo) => Promise<{ success: boolean; data: UpsellSalvo[]; error?: string }>
        update: (upsell: UpsellSalvo) => Promise<{ success: boolean; data: UpsellSalvo[]; error?: string }>
        delete: (id: string) => Promise<{ success: boolean; data: UpsellSalvo[]; error?: string }>
      }
    }
  }
}

export interface UseUpsellLibraryReturn {
  upsells: UpsellSalvo[]
  isLoading: boolean
  error: string | null
  adicionar: (upsell: UpsellSalvo) => Promise<void>
  atualizar: (upsell: UpsellSalvo) => Promise<void>
  duplicar: (id: string) => Promise<void>
  excluir: (id: string) => Promise<void>
  recarregar: () => Promise<void>
}

export function useUpsellLibrary(): UseUpsellLibraryReturn {
  const [upsells, setUpsells] = useState<UpsellSalvo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarBiblioteca = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (window.electron?.upsellLibrary) {
        const result = await window.electron.upsellLibrary.load()
        if (result.success) {
          setUpsells(result.data || [])
        } else {
          setError(result.error || 'Erro ao carregar biblioteca')
          setUpsells([])
        }
      } else {
        console.warn('[useUpsellLibrary] Electron API não disponível, usando memória local')
        setUpsells([])
      }
    } catch (err) {
      console.error('[useUpsellLibrary] Erro:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUpsells([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarBiblioteca()
  }, [carregarBiblioteca])

  const adicionar = useCallback(async (upsell: UpsellSalvo) => {
    try {
      if (window.electron?.upsellLibrary) {
        const result = await window.electron.upsellLibrary.add(upsell)
        if (result.success) {
          setUpsells(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        setUpsells(prev => [...prev, upsell])
      }
    } catch (err) {
      console.error('[useUpsellLibrary] Erro ao adicionar:', err)
      throw err
    }
  }, [])

  const atualizar = useCallback(async (upsell: UpsellSalvo) => {
    try {
      if (window.electron?.upsellLibrary) {
        const result = await window.electron.upsellLibrary.update(upsell)
        if (result.success) {
          setUpsells(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        setUpsells(prev => prev.map(item => item.id === upsell.id ? upsell : item))
      }
    } catch (err) {
      console.error('[useUpsellLibrary] Erro ao atualizar:', err)
      throw err
    }
  }, [])

  const duplicar = useCallback(async (id: string) => {
    const original = upsells.find(item => item.id === id)
    if (!original) return

    const novoUpsell: UpsellSalvo = {
      ...original,
      id: `up-${Date.now()}`,
      nome: `${original.nome} (cópia)`,
    }

    await adicionar(novoUpsell)
  }, [upsells, adicionar])

  const excluir = useCallback(async (id: string) => {
    try {
      if (window.electron?.upsellLibrary) {
        const result = await window.electron.upsellLibrary.delete(id)
        if (result.success) {
          setUpsells(result.data || [])
        } else {
          throw new Error(result.error)
        }
      } else {
        setUpsells(prev => prev.filter(item => item.id !== id))
      }
    } catch (err) {
      console.error('[useUpsellLibrary] Erro ao excluir:', err)
      throw err
    }
  }, [])

  return {
    upsells,
    isLoading,
    error,
    adicionar,
    atualizar,
    duplicar,
    excluir,
    recarregar: carregarBiblioteca,
  }
}

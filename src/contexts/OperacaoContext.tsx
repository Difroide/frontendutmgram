import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { waitForElectronAPI } from '@/utils/waitForElectron'

interface Operacao {
  nome: string
  path: string
}

type OperacaoChangeCallback = (operacao: Operacao | null) => void

interface OperacaoContextType {
  operacaoAtual: Operacao | null
  operacoes: Operacao[]
  setOperacaoAtual: (operacao: Operacao) => Promise<void>
  criarOperacao: (nome: string) => Promise<void>
  carregarOperacoes: () => Promise<void>
  isLoading: boolean
  onOperacaoChange: (callback: OperacaoChangeCallback) => () => void
}

const OperacaoContext = createContext<OperacaoContextType | undefined>(undefined)

export function OperacaoProvider({ children }: { children: ReactNode }) {
  const [operacaoAtual, setOperacaoAtualState] = useState<Operacao | null>(null)
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [changeListeners, setChangeListeners] = useState<Set<OperacaoChangeCallback>>(new Set())

  const carregarOperacoes = async () => {
    const startTime = Date.now()
    const MIN_LOADING_TIME = 6000 // Mínimo de 6 segundos para exibir todas as animações
    
    try {
      // Aguardar API do Electron estar disponível
      const isAvailable = await waitForElectronAPI('operacoes', 20, 200)
      
      if (isAvailable && window.electron?.operacoes?.listar) {
        const ops = await window.electron.operacoes.listar()
        console.log('Operações carregadas:', ops)
        setOperacoes(ops)
        
        // Se não há operação atual, seleciona a primeira ou a salva
        if (!operacaoAtual && ops.length > 0) {
          const saved = localStorage.getItem('operacaoAtual')
          if (saved) {
            try {
              const savedOp = JSON.parse(saved)
              const found = ops.find(op => op.path === savedOp.path)
              if (found) {
                console.log('Operação salva encontrada:', found)
                setOperacaoAtualState(found)
                await window.electron?.operacoes?.setAtual?.(found)
              } else {
                console.log('Operação salva não encontrada, usando primeira:', ops[0])
                setOperacaoAtualState(ops[0])
                await window.electron?.operacoes?.setAtual?.(ops[0])
              }
            } catch (e) {
              console.log('Erro ao parsear operação salva, usando primeira:', ops[0])
              setOperacaoAtualState(ops[0])
              await window.electron?.operacoes?.setAtual?.(ops[0])
            }
          } else {
            console.log('Nenhuma operação salva, usando primeira:', ops[0])
            setOperacaoAtualState(ops[0])
            await window.electron?.operacoes?.setAtual?.(ops[0])
          }
        } else if (ops.length === 0) {
          console.log('Nenhuma operação encontrada')
        }
      } else {
        console.warn('Handlers de operações não disponíveis após tentativas')
      }
    } catch (error) {
      console.error('Erro ao carregar operações:', error)
    } finally {
      // Garantir que a tela de carregamento fique visível pelo tempo mínimo
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime)
      
      if (remainingTime > 0) {
        console.log(`Aguardando ${remainingTime}ms para completar animação da tela de carregamento...`)
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      setIsLoading(false)
    }
  }

  const setOperacaoAtual = async (operacao: Operacao) => {
    // Sincronizar com Electron primeiro; só atualizar UI após sucesso
    if (window.electron?.operacoes?.setAtual) {
      await window.electron.operacoes.setAtual(operacao)
    }
    setOperacaoAtualState(operacao)
    localStorage.setItem('operacaoAtual', JSON.stringify(operacao))
    changeListeners.forEach(callback => callback(operacao))
  }

  const onOperacaoChange = useCallback((callback: OperacaoChangeCallback) => {
    setChangeListeners(prev => new Set(prev).add(callback))
    return () => {
      setChangeListeners(prev => {
        const next = new Set(prev)
        next.delete(callback)
        return next
      })
    }
  }, [])

  const criarOperacao = async (nome: string) => {
    if (window.electron?.operacoes?.criar) {
      const novaOperacao = await window.electron.operacoes.criar(nome)
      await carregarOperacoes()
      await setOperacaoAtual(novaOperacao)
    }
  }

  useEffect(() => {
    carregarOperacoes()
  }, [])

  return (
    <OperacaoContext.Provider
      value={{
        operacaoAtual,
        operacoes,
        setOperacaoAtual,
        criarOperacao,
        carregarOperacoes,
        isLoading,
        onOperacaoChange,
      }}
    >
      {children}
    </OperacaoContext.Provider>
  )
}

export function useOperacao() {
  const context = useContext(OperacaoContext)
  if (!context) {
    throw new Error('useOperacao deve ser usado dentro de OperacaoProvider')
  }
  return context
}

// Hook helper para recarregar dados quando a operação mudar
export function useOperacaoEffect(callback: () => void | Promise<void>, deps: React.DependencyList = []) {
  const { operacaoAtual, onOperacaoChange } = useOperacao()
  const { useEffect } = require('react')

  useEffect(() => {
    const unsubscribe = onOperacaoChange(() => {
      callback()
    })
    return unsubscribe
  }, [onOperacaoChange])

  useEffect(() => {
    if (operacaoAtual) {
      callback()
    }
  }, [operacaoAtual, ...deps])
}

// Tipos para window.electron estão definidos em contaService.ts


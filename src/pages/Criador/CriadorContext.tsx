import { createContext, useContext, ReactNode } from 'react'

interface CriadorContextType {
  // Contexto simplificado - nichos removidos
}

const CriadorContext = createContext<CriadorContextType | undefined>(undefined)

export const CriadorProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CriadorContext.Provider value={{}}>
      {children}
    </CriadorContext.Provider>
  )
}

export const useCriador = () => {
  const context = useContext(CriadorContext)
  if (!context) {
    throw new Error('useCriador must be used within CriadorProvider')
  }
  return context
}


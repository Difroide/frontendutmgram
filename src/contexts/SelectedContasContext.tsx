import { createContext, useContext, useState, ReactNode } from 'react'

interface SelectedContasContextType {
  selectedCount: number
  setSelectedCount: (count: number) => void
}

const SelectedContasContext = createContext<SelectedContasContextType | undefined>(undefined)

export const SelectedContasProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCount, setSelectedCount] = useState(0)

  return (
    <SelectedContasContext.Provider value={{ selectedCount, setSelectedCount }}>
      {children}
    </SelectedContasContext.Provider>
  )
}

export const useSelectedContas = () => {
  const context = useContext(SelectedContasContext)
  if (context === undefined) {
    throw new Error('useSelectedContas must be used within a SelectedContasProvider')
  }
  return context
}


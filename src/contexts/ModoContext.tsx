import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export type ModoUsuario = 'ryu' | 'difroide' | 'ruivo'

const MODO_USUARIO_KEY = 'modoUsuario'

export interface ThemeColors {
  primary: string
  primaryDark: string
  primaryLight: string
  accent: string
  background: string
  backgroundDark: string
  text: string
  textSecondary: string
  border: string
  hover: string
  active: string
}

export interface LayoutConfig {
  sidebarWidth: string
  sidebarCollapsedWidth: string
  cardRadius: string
  buttonRadius: string
}

export interface EffectiveTheme {
  colors: ThemeColors
  layout: LayoutConfig
}

const RYU_LAYOUT: LayoutConfig = {
  sidebarWidth: '256px',
  sidebarCollapsedWidth: '80px',
  cardRadius: '0.5rem',
  buttonRadius: '0.5rem',
}

interface ModoContextType {
  modo: ModoUsuario
  setModo: (modo: ModoUsuario) => void
  effectiveTheme: EffectiveTheme
}

const ModoContext = createContext<ModoContextType | undefined>(undefined)

export const ModoProvider = ({ children }: { children: ReactNode }) => {
  const { currentTheme } = useTheme()
  const [modo, setModoState] = useState<ModoUsuario>(() => {
    try {
      const saved = localStorage.getItem(MODO_USUARIO_KEY)
      if (saved === 'ryu' || saved === 'difroide' || saved === 'ruivo') return saved
    } catch (_) {}
    return 'ryu'
  })

  const effectiveTheme: EffectiveTheme = {
    colors: currentTheme.colors,
    layout: RYU_LAYOUT,
  }

  useEffect(() => {
    try {
      localStorage.setItem(MODO_USUARIO_KEY, modo)
    } catch (_) {}
    if ((window as any).electron?.database?.saveConfig) {
      ;(window as any).electron.database.saveConfig('modoUsuario', modo).catch(() => {})
    }
  }, [modo])

  useEffect(() => {
    document.documentElement.setAttribute('data-modo', modo)
  }, [modo])

  const setModo = (m: ModoUsuario) => setModoState(m)

  return (
    <ModoContext.Provider value={{ modo, setModo, effectiveTheme }}>
      {children}
    </ModoContext.Provider>
  )
}

export const useModo = () => {
  const context = useContext(ModoContext)
  if (!context) {
    throw new Error('useModo must be used within ModoProvider')
  }
  return context
}

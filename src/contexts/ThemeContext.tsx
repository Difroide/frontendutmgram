import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { themes, type Theme, type ThemeName } from '@/contexts/themesConfig'

export type { ThemeName, Theme }
export { themes }

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeName: ThemeName) => void
  themeName: ThemeName
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    try {
      const saved = localStorage.getItem('app-theme')
      if (saved === 'vermelho' || saved === 'azul' || saved === 'amarelo' || saved === 'padrao') return saved
    } catch (_) {}
    return 'vermelho'
  })
  const [isLoading, setIsLoading] = useState(true)

  const currentTheme = themes[themeName]

  // Carregar tema do banco de dados ao montar
  useEffect(() => {
    const loadThemeFromDatabase = async () => {
      try {
        if ((window as any).electron?.database?.getConfig) {
          const result = await (window as any).electron.database.getConfig('theme', null)
          if (result && result.success && result.data) {
            const savedTheme = result.data
            if (savedTheme && (savedTheme === 'vermelho' || savedTheme === 'azul' || savedTheme === 'amarelo' || savedTheme === 'padrao')) {
              setThemeName(savedTheme as ThemeName)
              localStorage.setItem('app-theme', savedTheme)
            }
          } else {
            // Se não há tema salvo, usar vermelho como padrão e salvar
            setThemeName('vermelho')
            localStorage.setItem('app-theme', 'vermelho')
            if ((window as any).electron?.database?.saveConfig) {
              await (window as any).electron.database.saveConfig('theme', 'vermelho')
            }
          }
        }
      } catch (error) {
        console.error('[ThemeContext] Erro ao carregar tema do banco de dados:', error)
        // Em caso de erro, manter vermelho como padrão
        setThemeName('vermelho')
        localStorage.setItem('app-theme', 'vermelho')
      } finally {
        setIsLoading(false)
      }
    }

    loadThemeFromDatabase()
  }, [])

  useEffect(() => {
    if (isLoading) return // Não aplicar tema enquanto carrega

    const root = document.documentElement
    const theme = currentTheme.colors

    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-primary-dark', theme.primaryDark)
    root.style.setProperty('--theme-primary-light', theme.primaryLight)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-background-dark', theme.backgroundDark)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-text-secondary', theme.textSecondary)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-hover', theme.hover)
    root.style.setProperty('--theme-active', theme.active)

    root.style.setProperty('--sidebar-width', '256px')
    root.style.setProperty('--sidebar-collapsed-width', '80px')
    root.style.setProperty('--card-radius', '0.5rem')
    root.style.setProperty('--button-radius', '0.5rem')

    // Salvar no localStorage (fallback)
    localStorage.setItem('app-theme', themeName)

    // Salvar no banco de dados (apenas quando não estiver carregando pela primeira vez)
    if (!isLoading && (window as any).electron?.database?.saveConfig) {
      ;(window as any).electron.database.saveConfig('theme', themeName).then((result: any) => {
        if (result && result.success) {
          console.log('[ThemeContext] Tema salvo com sucesso:', themeName)
        } else {
          console.warn('[ThemeContext] Erro ao salvar tema:', result?.error)
        }
      }).catch((error: any) => {
        console.error('[ThemeContext] Erro ao salvar tema no banco de dados:', error)
      })
    }
  }, [themeName, currentTheme, isLoading])

  const setTheme = (name: ThemeName) => {
    console.log('[ThemeContext] Alterando tema para:', name)
    setThemeName(name)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themeName }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}


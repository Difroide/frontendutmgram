/**
 * Configuração de temas (Ryu) – sem dependência de outros contextos
 * para evitar dependência circular com ModoContext/ThemeContext.
 */
export type ThemeName = 'vermelho' | 'azul' | 'amarelo' | 'padrao'

export interface Theme {
  name: ThemeName
  displayName: string
  colors: {
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
}

export const themes: Record<ThemeName, Theme> = {
  padrao: {
    name: 'padrao',
    displayName: 'Padrão',
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      primaryLight: '#60a5fa',
      accent: '#60a5fa',
      background: '#0f172a',
      backgroundDark: '#020617',
      text: '#ffffff',
      textSecondary: '#e5e7eb',
      border: '#374151',
      hover: '#374151',
      active: '#1e40af',
    },
  },
  vermelho: {
    name: 'vermelho',
    displayName: 'Vermelho & Preto',
    colors: {
      primary: '#dc2626',
      primaryDark: '#b91c1c',
      primaryLight: '#ef4444',
      accent: '#ef4444',
      background: '#0f172a',
      backgroundDark: '#020617',
      text: '#ffffff',
      textSecondary: '#fca5a5',
      border: '#7f1d1d',
      hover: '#991b1b',
      active: '#b91c1c',
    },
  },
  azul: {
    name: 'azul',
    displayName: 'Azul & Preto',
    colors: {
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      primaryLight: '#3b82f6',
      accent: '#3b82f6',
      background: '#0f172a',
      backgroundDark: '#020617',
      text: '#ffffff',
      textSecondary: '#93c5fd',
      border: '#1e3a8a',
      hover: '#1e40af',
      active: '#1d4ed8',
    },
  },
  amarelo: {
    name: 'amarelo',
    displayName: 'Amarelo & Preto',
    colors: {
      primary: '#eab308',
      primaryDark: '#ca8a04',
      primaryLight: '#facc15',
      accent: '#facc15',
      background: '#0f172a',
      backgroundDark: '#020617',
      text: '#ffffff',
      textSecondary: '#fde047',
      border: '#713f12',
      hover: '#854d0e',
      active: '#ca8a04',
    },
  },
}

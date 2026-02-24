import { Theme } from '@/contexts/ThemeContext'

/**
 * Gera classes CSS dinâmicas baseadas no tema
 */
export const getThemeClasses = (theme: Theme) => {
  return {
    // Botões primários
    buttonPrimary: {
      backgroundColor: `${theme.colors.primary}30`,
      borderColor: `${theme.colors.primary}50`,
      color: theme.colors.text,
    },
    buttonPrimaryHover: {
      backgroundColor: `${theme.colors.primary}40`,
      borderColor: `${theme.colors.primary}60`,
    },
    // Botões secundários
    buttonSecondary: {
      backgroundColor: `${theme.colors.primary}20`,
      borderColor: `${theme.colors.primary}30`,
      color: theme.colors.text,
    },
    // Links ativos
    linkActive: {
      backgroundColor: `${theme.colors.primary}30`,
      borderColor: `${theme.colors.primary}50`,
      color: theme.colors.text,
    },
    // Inputs com foco
    inputFocus: {
      borderColor: `${theme.colors.primary}50`,
      boxShadow: `0 0 0 3px ${theme.colors.primary}20`,
    },
    // Badges
    badgePrimary: {
      backgroundColor: `${theme.colors.primary}20`,
      borderColor: `${theme.colors.primary}30`,
      color: theme.colors.primaryLight,
    },
    // Cards destacados
    cardHighlight: {
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}30`,
    },
  }
}

/**
 * Converte cor hex para rgba com opacidade
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}


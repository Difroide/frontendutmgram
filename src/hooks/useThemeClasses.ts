import { useTheme } from '@/contexts/ThemeContext'

/**
 * Hook que retorna funções helper para gerar classes e estilos baseados no tema
 * Substitui classes azuis hardcoded por cores dinâmicas do tema
 */
export const useThemeClasses = () => {
  const { currentTheme } = useTheme()

  /**
   * Converte uma cor hex para rgba com opacidade
   */
  const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  /**
   * Retorna estilos para botão primário
   */
  const getButtonPrimaryStyles = () => ({
    backgroundColor: hexToRgba(currentTheme.colors.primary, 0.3),
    borderColor: hexToRgba(currentTheme.colors.primary, 0.5),
    color: currentTheme.colors.text,
  })

  /**
   * Retorna estilos para botão primário no hover
   */
  const getButtonPrimaryHoverStyles = () => ({
    backgroundColor: hexToRgba(currentTheme.colors.primary, 0.4),
    borderColor: hexToRgba(currentTheme.colors.primary, 0.6),
  })

  /**
   * Retorna estilos para texto primário
   */
  const getTextPrimaryStyles = () => ({
    color: currentTheme.colors.primaryLight,
  })

  /**
   * Retorna estilos para badge primário
   */
  const getBadgePrimaryStyles = () => ({
    backgroundColor: hexToRgba(currentTheme.colors.primary, 0.2),
    borderColor: hexToRgba(currentTheme.colors.primary, 0.3),
    color: currentTheme.colors.primaryLight,
  })

  /**
   * Retorna estilos para input com foco
   */
  const getInputFocusStyles = () => ({
    borderColor: hexToRgba(currentTheme.colors.primary, 0.5),
    boxShadow: `0 0 0 3px ${hexToRgba(currentTheme.colors.primary, 0.2)}`,
  })

  /**
   * Substitui classes azuis do Tailwind por estilos dinâmicos
   * Use isso quando encontrar classes como "bg-blue-500/30", "text-blue-400", etc.
   */
  const replaceBlueClasses = (baseClasses: string): { className: string; style?: React.CSSProperties } => {
    let className = baseClasses
    const style: React.CSSProperties = {}

    // Substituir classes de background azul
    if (className.includes('bg-blue-500/20') || className.includes('bg-blue-600/20')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.2)
      className = className.replace(/bg-blue-\d+\/20/g, '')
    }
    if (className.includes('bg-blue-500/30') || className.includes('bg-blue-600/30')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.3)
      className = className.replace(/bg-blue-\d+\/30/g, '')
    }
    if (className.includes('bg-blue-500/40') || className.includes('bg-blue-600/40')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.4)
      className = className.replace(/bg-blue-\d+\/40/g, '')
    }
    if (className.includes('bg-blue-500/50') || className.includes('bg-blue-600/50')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.5)
      className = className.replace(/bg-blue-\d+\/50/g, '')
    }
    if (className.includes('bg-blue-500/70') || className.includes('bg-blue-600/70')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.7)
      className = className.replace(/bg-blue-\d+\/70/g, '')
    }
    if (className.includes('bg-blue-500/80') || className.includes('bg-blue-600/80')) {
      style.backgroundColor = hexToRgba(currentTheme.colors.primary, 0.8)
      className = className.replace(/bg-blue-\d+\/80/g, '')
    }
    if (className.includes('bg-blue-500') && !className.includes('/')) {
      style.backgroundColor = currentTheme.colors.primary
      className = className.replace(/bg-blue-500/g, '')
    }
    if (className.includes('bg-blue-600') && !className.includes('/')) {
      style.backgroundColor = currentTheme.colors.primaryDark
      className = className.replace(/bg-blue-600/g, '')
    }

    // Substituir classes de texto azul
    if (className.includes('text-blue-400')) {
      style.color = currentTheme.colors.primaryLight
      className = className.replace(/text-blue-400/g, '')
    }
    if (className.includes('text-blue-500')) {
      style.color = currentTheme.colors.primary
      className = className.replace(/text-blue-500/g, '')
    }
    if (className.includes('text-blue-300')) {
      style.color = currentTheme.colors.primaryLight
      style.opacity = 0.8
      className = className.replace(/text-blue-300/g, '')
    }

    // Substituir classes de border azul
    if (className.includes('border-blue-400/30') || className.includes('border-blue-500/30')) {
      style.borderColor = hexToRgba(currentTheme.colors.primary, 0.3)
      className = className.replace(/border-blue-\d+\/30/g, '')
    }
    if (className.includes('border-blue-400/50') || className.includes('border-blue-500/50')) {
      style.borderColor = hexToRgba(currentTheme.colors.primary, 0.5)
      className = className.replace(/border-blue-\d+\/50/g, '')
    }
    if (className.includes('border-blue-500') && !className.includes('/')) {
      style.borderColor = currentTheme.colors.primary
      className = className.replace(/border-blue-500/g, '')
    }

    // Substituir hover states
    if (className.includes('hover:bg-blue-500/30') || className.includes('hover:bg-blue-600/40')) {
      // Isso será tratado via onMouseEnter/onMouseLeave
      className = className.replace(/hover:bg-blue-\d+\/\d+/g, '')
    }
    if (className.includes('hover:text-blue-400')) {
      // Isso será tratado via onMouseEnter/onMouseLeave
      className = className.replace(/hover:text-blue-400/g, '')
    }

    return {
      className: className.trim(),
      style: Object.keys(style).length > 0 ? style : undefined,
    }
  }

  return {
    currentTheme,
    hexToRgba,
    getButtonPrimaryStyles,
    getButtonPrimaryHoverStyles,
    getTextPrimaryStyles,
    getBadgePrimaryStyles,
    getInputFocusStyles,
    replaceBlueClasses,
  }
}


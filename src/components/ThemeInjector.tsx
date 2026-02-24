import { useEffect } from 'react'
import { useModo } from '@/contexts/ModoContext'

/**
 * Componente que injeta estilos globais dinamicamente para substituir
 * todas as classes azuis do Tailwind por cores do tema efetivo (modo usuário)
 */
export const ThemeInjector = () => {
  const { effectiveTheme } = useModo()
  const currentTheme = { colors: effectiveTheme.colors }

  useEffect(() => {
    // Criar ou atualizar o style tag com estilos dinâmicos
    let styleElement = document.getElementById('theme-dynamic-styles')
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = 'theme-dynamic-styles'
      document.head.appendChild(styleElement)
    }

    // Converter hex para rgba
    const hexToRgba = (hex: string, opacity: number): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }

    const primary = currentTheme.colors.primary
    const primaryDark = currentTheme.colors.primaryDark
    const primaryLight = currentTheme.colors.primaryLight

    // Gerar CSS que sobrescreve classes azuis do Tailwind
    const css = `
      /* Sobrescrever classes de texto azul */
      .text-blue-400 { color: ${primaryLight} !important; }
      .text-blue-500 { color: ${primary} !important; }
      .text-blue-600 { color: ${primaryDark} !important; }
      .text-blue-300 { color: ${primaryLight} !important; opacity: 0.8; }
      .text-blue-200 { color: ${primaryLight} !important; opacity: 0.6; }
      .text-blue-100 { color: ${primaryLight} !important; opacity: 0.4; }

      /* Sobrescrever classes de background azul com opacidade */
      .bg-blue-500\\/10 { background-color: ${hexToRgba(primary, 0.1)} !important; }
      .bg-blue-500\\/20 { background-color: ${hexToRgba(primary, 0.2)} !important; }
      .bg-blue-500\\/30 { background-color: ${hexToRgba(primary, 0.3)} !important; }
      .bg-blue-500\\/40 { background-color: ${hexToRgba(primary, 0.4)} !important; }
      .bg-blue-500\\/50 { background-color: ${hexToRgba(primary, 0.5)} !important; }
      .bg-blue-500\\/70 { background-color: ${hexToRgba(primary, 0.7)} !important; }
      .bg-blue-500\\/80 { background-color: ${hexToRgba(primary, 0.8)} !important; }
      
      .bg-blue-600\\/20 { background-color: ${hexToRgba(primaryDark, 0.2)} !important; }
      .bg-blue-600\\/30 { background-color: ${hexToRgba(primaryDark, 0.3)} !important; }
      .bg-blue-600\\/40 { background-color: ${hexToRgba(primaryDark, 0.4)} !important; }
      .bg-blue-600\\/50 { background-color: ${hexToRgba(primaryDark, 0.5)} !important; }
      .bg-blue-600\\/70 { background-color: ${hexToRgba(primaryDark, 0.7)} !important; }
      .bg-blue-600\\/80 { background-color: ${hexToRgba(primaryDark, 0.8)} !important; }

      /* Sobrescrever classes de background azul sólido */
      .bg-blue-500 { background-color: ${primary} !important; }
      .bg-blue-600 { background-color: ${primaryDark} !important; }
      .bg-blue-700 { background-color: ${primaryDark} !important; opacity: 0.9; }
      .bg-blue-400 { background-color: ${primaryLight} !important; }

      /* Sobrescrever classes de border azul */
      .border-blue-400\\/30 { border-color: ${hexToRgba(primaryLight, 0.3)} !important; }
      .border-blue-400\\/40 { border-color: ${hexToRgba(primaryLight, 0.4)} !important; }
      .border-blue-400\\/50 { border-color: ${hexToRgba(primaryLight, 0.5)} !important; }
      .border-blue-400\\/60 { border-color: ${hexToRgba(primaryLight, 0.6)} !important; }
      .border-blue-400\\/80 { border-color: ${hexToRgba(primaryLight, 0.8)} !important; }
      
      .border-blue-500\\/30 { border-color: ${hexToRgba(primary, 0.3)} !important; }
      .border-blue-500\\/50 { border-color: ${hexToRgba(primary, 0.5)} !important; }
      .border-blue-500\\/80 { border-color: ${hexToRgba(primary, 0.8)} !important; }
      
      .border-blue-500 { border-color: ${primary} !important; }
      .border-blue-600 { border-color: ${primaryDark} !important; }
      .border-blue-400 { border-color: ${primaryLight} !important; }

      /* Hover states */
      .hover\\:bg-blue-500\\/30:hover { background-color: ${hexToRgba(primary, 0.3)} !important; }
      .hover\\:bg-blue-500\\/40:hover { background-color: ${hexToRgba(primary, 0.4)} !important; }
      .hover\\:bg-blue-500\\/50:hover { background-color: ${hexToRgba(primary, 0.5)} !important; }
      .hover\\:bg-blue-500\\/80:hover { background-color: ${hexToRgba(primary, 0.8)} !important; }
      
      .hover\\:bg-blue-600\\/40:hover { background-color: ${hexToRgba(primaryDark, 0.4)} !important; }
      .hover\\:bg-blue-600\\/50:hover { background-color: ${hexToRgba(primaryDark, 0.5)} !important; }
      .hover\\:bg-blue-600\\/80:hover { background-color: ${hexToRgba(primaryDark, 0.8)} !important; }
      .hover\\:bg-blue-700:hover { background-color: ${primaryDark} !important; opacity: 0.9; }
      
      .hover\\:text-blue-400:hover { color: ${primaryLight} !important; }
      .hover\\:text-blue-300:hover { color: ${primaryLight} !important; opacity: 0.8; }
      
      .hover\\:border-blue-300:hover { border-color: ${primaryLight} !important; opacity: 0.8; }
      .hover\\:border-blue-400:hover { border-color: ${primaryLight} !important; }
      .hover\\:border-blue-500:hover { border-color: ${primary} !important; }

      /* Focus rings */
      .focus\\:ring-blue-500:focus { --tw-ring-color: ${primary} !important; }
      .focus\\:ring-blue-500\\/50:focus { --tw-ring-color: ${hexToRgba(primary, 0.5)} !important; }
      
      .focus\\:border-blue-400\\/50:focus { border-color: ${hexToRgba(primaryLight, 0.5)} !important; }
      .focus\\:border-blue-500:focus { border-color: ${primary} !important; }

      /* Shadow colors */
      .shadow-blue-500\\/50 { box-shadow: 0 0 0 1px ${hexToRgba(primary, 0.5)} !important; }
      .shadow-blue-600\\/50 { box-shadow: 0 0 0 1px ${hexToRgba(primaryDark, 0.5)} !important; }

      /* Gradients */
      .from-blue-500 { --tw-gradient-from: ${primary} !important; }
      .to-blue-500 { --tw-gradient-to: ${primary} !important; }
      .from-blue-600 { --tw-gradient-from: ${primaryDark} !important; }
      .to-blue-600 { --tw-gradient-to: ${primaryDark} !important; }
    `

    styleElement.textContent = css
  }, [currentTheme])

  return null // Este componente não renderiza nada
}


import { useState, useEffect } from 'react'

export interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

export function useTags() {
  const [tags, setTags] = useState<TagConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTags = async () => {
    setIsLoading(true)
    try {
      if (!window.electron?.tags?.carregarTodas) {
        console.warn('[useTags] API tags não disponível')
        setTags([])
        return
      }

      const result = await window.electron.tags.carregarTodas()
      if (result?.success && result?.tags) {
        setTags(result.tags)
      } else {
        setTags([])
      }
    } catch (error) {
      console.error('[useTags] Erro ao carregar tags:', error)
      setTags([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTags().catch((error) => {
      console.error('[useTags] Erro no useEffect:', error)
      setIsLoading(false)
      setTags([])
    })
  }, [])

  const getTagByNome = (nome: string): TagConfig | undefined => {
    return tags.find(tag => tag.nome === nome)
  }

  // Mapear cores hex para classes Tailwind com opacidade
  const getTagColorClasses = (corHex: string) => {
    // Se a cor já tem opacidade (formato #RRGGBBAA), remover
    const cleanColor = corHex.length === 9 ? corHex.slice(0, 7) : corHex
    
    // Mapear cores comuns para classes Tailwind
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      '#10b981': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' }, // verde
      '#3b82f6': { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' }, // azul
      '#f59e0b': { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' }, // laranja
      '#ef4444': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' }, // vermelho
      '#8b5cf6': { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' }, // roxo
      '#06b6d4': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' }, // ciano
      '#f97316': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' }, // laranja escuro
    }
    
    // Tentar encontrar cor mapeada
    const mapped = colorMap[cleanColor.toLowerCase()]
    if (mapped) {
      return mapped
    }
    
    // Fallback: converter hex para aproximação Tailwind
    // Para cores não mapeadas, usar estilo inline
    return null
  }

  const getTagStyle = (nome: string) => {
    const tag = getTagByNome(nome)
    if (tag) {
      const colorClasses = getTagColorClasses(tag.cor)
      
      if (colorClasses) {
        // Retornar classes Tailwind
        return {
          className: `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`,
          style: {}
        }
      }
      
      // Fallback para cores customizadas: usar estilo inline
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      
      const cleanColor = tag.cor.length === 9 ? tag.cor.slice(0, 7) : tag.cor
      
      return {
        className: '',
        style: {
          backgroundColor: hexToRgba(cleanColor, 0.1),
          borderColor: hexToRgba(cleanColor, 0.2),
          color: cleanColor,
        }
      }
    }
    return {
      className: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
      style: {}
    }
  }

  return {
    tags,
    isLoading,
    loadTags,
    getTagByNome,
    getTagStyle,
    getTagColorClasses,
  }
}


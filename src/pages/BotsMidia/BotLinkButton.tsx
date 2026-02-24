import { Link2, Copy, ExternalLink, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface BotLinkButtonProps {
  username?: string
  className?: string
}

export const BotLinkButton = ({ username, className = '' }: BotLinkButtonProps) => {
  const { currentTheme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const cleanUsername = username?.replace('@', '') || ''
  const botLink = `https://t.me/${cleanUsername}`

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const measure = () => {
      const wrapper = dropdownRef.current
      const menu = menuRef.current
      if (!wrapper || !menu) return
      const wrapperRect = wrapper.getBoundingClientRect()
      const menuHeight = menu.offsetHeight
      const spaceBelow = window.innerHeight - wrapperRect.bottom
      const spaceAbove = wrapperRect.top
      const shouldOpenUp = spaceBelow < menuHeight + 8 && spaceAbove > menuHeight + 8
      setOpenUp(shouldOpenUp)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [showDropdown])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(botLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
      alert('Erro ao copiar link')
    }
  }

  const handleOpen = () => {
    if ((window as any).electron?.utils?.openExternalUrl) {
      (window as any).electron.utils.openExternalUrl(botLink)
    } else {
      window.open(botLink, '_blank')
    }
    setShowDropdown(false)
  }

  if (!cleanUsername) {
    return null
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-lg transition-all"
        style={{
          backgroundColor: `${currentTheme.colors.primary}15`,
          borderWidth: '1px',
          borderColor: `${currentTheme.colors.primary}30`,
          color: currentTheme.colors.primary
        }}
        title="Link do bot"
      >
        <Link2 className="w-4 h-4" />
      </button>

      {showDropdown && (
        <div
          ref={menuRef}
          className={`absolute right-0 w-48 bg-[#161b22] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden ${
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Link preview */}
          <div className="px-3 py-2 border-b border-gray-800">
            <p className="text-xs text-gray-400 truncate font-mono">
              t.me/{cleanUsername}
            </p>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
            <button
              onClick={handleOpen}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir no Telegram</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

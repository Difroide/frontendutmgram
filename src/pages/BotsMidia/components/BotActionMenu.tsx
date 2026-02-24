import { useEffect, useRef, useState } from 'react'
import { Hexagon, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'
import { BotMidia } from '@/types/BotMidia'

interface BotActionMenuProps {
  bot: BotMidia
  onVerificarIndividual: (bot: BotMidia) => Promise<void>
  onCadastrarNoFunil: (bot: BotMidia) => void
  onDelete: (id: string | number) => void
}

export function BotActionMenu({
  bot,
  onVerificarIndividual,
  onCadastrarNoFunil,
  onDelete,
}: BotActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
    return
  }, [open])

  useEffect(() => {
    if (!open) return
    const wrapper = ref.current
    const menu = menuRef.current
    if (!wrapper || !menu) return
    const rect = wrapper.getBoundingClientRect()
    const menuH = menu.offsetHeight
    const spaceBelow = window.innerHeight - rect.bottom
    setOpenUp(spaceBelow < menuH + 16 && rect.top > menuH + 16)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-[#1c2536] hover:text-gray-300"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute right-0 z-50 w-52 overflow-hidden rounded-xl border border-gray-800 bg-[#161b22] shadow-2xl ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <div className="p-1">
            <button
              onClick={() => { onVerificarIndividual(bot); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 transition-all hover:bg-[#21262d]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
              Verificar bot
            </button>
            <button
              onClick={() => { onCadastrarNoFunil(bot); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 transition-all hover:bg-[#21262d]"
            >
              <Hexagon className="h-3.5 w-3.5 text-violet-400" />
              Cadastrar no funil
            </button>
            <div className="my-1 border-t border-gray-800" />
            <button
              onClick={() => { onDelete(bot.id); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-all hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir bot
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

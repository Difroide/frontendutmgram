import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export const Accordion = ({ title, children, defaultOpen = false }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="border border-gray-600/30 rounded-lg overflow-hidden bg-gray-800/40 backdrop-blur-md shadow-lg">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700/70 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        type="button"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title}`}
      >
        <span id={`accordion-header-${title}`} className="font-semibold text-gray-100">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div 
          id={`accordion-content-${title}`}
          className="p-4 border-t border-gray-600/30 bg-gray-800/20"
          role="region"
          aria-labelledby={`accordion-header-${title}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}


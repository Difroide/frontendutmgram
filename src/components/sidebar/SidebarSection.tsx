import { ReactNode } from 'react'

interface SidebarSectionProps {
  children: ReactNode
  title?: string
}

export const SidebarSection = ({ children, title }: SidebarSectionProps) => {
  return (
    <div className="mb-4">
      {title && (
        <h3 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}


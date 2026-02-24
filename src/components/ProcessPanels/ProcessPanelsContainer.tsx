import { useState, useEffect } from 'react'
import { X, Clock, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { ProcessPanel } from './ProcessPanel'

export interface ProcessInfo {
  id: string
  type: 'criar-grupos' | 'adicionar-listas' | 'encher-grupos'
  title: string
  status: 'running' | 'completed' | 'error' | 'paused'
  progress: {
    completed: number
    total: number
    current?: string
  }
  stats: {
    startedAt: string
    elapsedTime: number
    estimatedTimeRemaining: number
    averageTimePerItem: number
    activeWorkers: number
    errors: number
  }
  details?: any
}

interface ProcessPanelsContainerProps {
  processes: ProcessInfo[]
  onClose?: (processId: string) => void
}

export const ProcessPanelsContainer = ({ processes, onClose }: ProcessPanelsContainerProps) => {
  const [minimized, setMinimized] = useState<Set<string>>(new Set())

  const toggleMinimize = (id: string) => {
    setMinimized(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  if (processes.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md">
      {processes.map((process) => (
        <ProcessPanel
          key={process.id}
          process={process}
          minimized={minimized.has(process.id)}
          onMinimize={() => toggleMinimize(process.id)}
          onClose={() => onClose?.(process.id)}
        />
      ))}
    </div>
  )
}


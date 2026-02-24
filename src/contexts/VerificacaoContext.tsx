import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { useData } from './DataContext'
import type { VerificacaoMembrosProgress } from '@/types/electron'

export interface BotLogOffline {
  url?: string
  username?: string
  tituloLido?: string
  tituloNormalizado?: string
  usernameNormalizado?: string
  motivo?: string
}

interface VerificacaoContextType {
  lastProgress: VerificacaoMembrosProgress | null
  verificacaoRodando: boolean
  iniciarVerificacao: () => Promise<void>
  botLogsOffline: BotLogOffline[]
}

const VerificacaoContext = createContext<VerificacaoContextType | null>(null)

export function useVerificacao() {
  const ctx = useContext(VerificacaoContext)
  if (!ctx) {
    throw new Error('useVerificacao deve ser usado dentro de VerificacaoProvider')
  }
  return ctx
}

interface VerificacaoProviderProps {
  children: ReactNode
}

export function VerificacaoProvider({ children }: VerificacaoProviderProps) {
  const { refreshContas } = useData()
  const [lastProgress, setLastProgress] = useState<VerificacaoMembrosProgress | null>(null)
  const [verificacaoRodando, setVerificacaoRodando] = useState(false)
  const [botLogsOffline, setBotLogsOffline] = useState<BotLogOffline[]>([])

  // Load saved membros results on mount
  useEffect(() => {
    const db = (window as any).electron?.database
    if (!db?.carregarVerificacaoDiaria) return
    db.carregarVerificacaoDiaria().then((res: any) => {
      if (res?.success && res.data?.membros?.lastProgress) {
        setLastProgress(res.data.membros.lastProgress)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const api = (window as any).electron?.verificarMembros
    if (!api?.onVerificacaoProgress || !api?.removeVerificacaoProgress) return
    api.onVerificacaoProgress((data: VerificacaoMembrosProgress) => {
      setLastProgress(data)
      // Persistir sempre (incremental) para não perder ao sair da aba
      const db = (window as any).electron?.database
      if (db?.salvarVerificacaoDiariaMembros) {
        db.salvarVerificacaoDiariaMembros(data).catch(() => {})
      }
      if (data.concluido) {
        setVerificacaoRodando(false)
        refreshContas()
      }
    })
    return () => api.removeVerificacaoProgress()
  }, [refreshContas])

  useEffect(() => {
    const api = (window as any).electron?.verificarMembros
    if (!api?.onVerificacaoBotLogOffline || !api?.removeVerificacaoBotLogOffline) return
    api.onVerificacaoBotLogOffline((data: BotLogOffline) => {
      setBotLogsOffline((prev) => [...prev, data])
    })
    return () => api.removeVerificacaoBotLogOffline()
  }, [])

  const iniciarVerificacao = useCallback(async () => {
    const api = (window as any).electron?.verificarMembros
    if (!api?.iniciarVerificacao || verificacaoRodando) return
    setVerificacaoRodando(true)
    setBotLogsOffline([])
    setLastProgress({
      grupos: { total: 0, verificados: 0, faltam: 0, online: 0 },
      bots: { total: 0, verificados: 0, faltam: 0, online: 0 },
    })
    try {
      await api.iniciarVerificacao()
    } catch {
      setVerificacaoRodando(false)
    }
  }, [verificacaoRodando])

  const value = useMemo(
    () => ({ lastProgress, verificacaoRodando, iniciarVerificacao, botLogsOffline }),
    [lastProgress, verificacaoRodando, iniciarVerificacao, botLogsOffline]
  )

  return (
    <VerificacaoContext.Provider value={value}>
      {children}
    </VerificacaoContext.Provider>
  )
}

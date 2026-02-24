import { useState, useEffect } from 'react'
import { Power, PowerOff } from 'lucide-react'
import { fixadorService } from '../fixadorService'

export function DispararButton() {
  const [loading, setLoading] = useState(false)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    fixadorService.getStatus().then((res) => setAtivo(res.ativo)).catch(() => {})
  }, [])

  const handleAtivar = async () => {
    setLoading(true)
    try {
      await fixadorService.ativar()
      setAtivo(true)
    } catch (e) {
      console.error('[Fixador] Erro ao ativar:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDesativar = async () => {
    setLoading(true)
    try {
      await fixadorService.desativar()
      setAtivo(false)
    } catch (e) {
      console.error('[Fixador] Erro ao desativar:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {ativo ? (
        <button
          onClick={handleDesativar}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          <PowerOff className={`h-5 w-5 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Desativando...' : 'Desativar'}
        </button>
      ) : (
        <button
          onClick={handleAtivar}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Power className={`h-5 w-5 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Ativando...' : 'Ativar'}
        </button>
      )}
      <span className="text-xs text-gray-500">
        {ativo ? 'Sistema ativo - ciclo automático em execução' : 'Sistema parado'}
      </span>
    </div>
  )
}

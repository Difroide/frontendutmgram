import { useState, useEffect } from 'react'
import { Network } from 'lucide-react'
import { Proxy } from '@/types/Proxy'

interface ProxySelectorProps {
  selectedProxyId: number | null
  onSelect: (proxyId: number | null) => void
  disabled?: boolean
  label?: string
  showDefault?: boolean
}

export const ProxySelector = ({
  selectedProxyId,
  onSelect,
  disabled = false,
  label = 'Proxy',
  showDefault = true,
}: ProxySelectorProps) => {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProxies()
  }, [])

  const loadProxies = async () => {
    try {
      if ((window as any).electron?.proxy?.carregarTodos) {
        const data = await (window as any).electron.proxy.carregarTodos()
        setProxies(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar proxies:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mostrar TODAS as proxies disponíveis (não apenas ativas)
  // O sistema de reserva de proxy já filtra por status "Ativo" automaticamente
  const proxiesDisponiveis = proxies

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
        <Network className="w-4 h-4" />
        {label}
      </label>
      <select
        value={selectedProxyId || ''}
        onChange={(e) => {
          const value = e.target.value
          onSelect(value === '' || value === 'auto' ? null : Number(value))
        }}
        disabled={disabled || loading}
        className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {showDefault && (
          <option value="auto">Automático (padrão) - Sistema escolhe automaticamente</option>
        )}
        {loading ? (
          <option value="">Carregando proxies...</option>
        ) : proxiesDisponiveis.length === 0 ? (
          <option value="">Nenhum proxy cadastrado</option>
        ) : (
          proxiesDisponiveis.map((proxy) => (
            <option key={proxy.id} value={proxy.id}>
              {proxy.padrao ? '⭐ ' : ''}{proxy.nome || `${proxy.endereco}:${proxy.porta}`} ({proxy.tipo}) {proxy.status !== 'Ativo' ? `[${proxy.status}]` : ''}
            </option>
          ))
        )}
      </select>
      {selectedProxyId && (
        <p className="text-xs text-gray-400">
          Proxy selecionado: {proxies.find(p => p.id === selectedProxyId)?.endereco}:{proxies.find(p => p.id === selectedProxyId)?.porta}
        </p>
      )}
      {!selectedProxyId && showDefault && (
        <p className="text-xs text-gray-400">
          Usando seleção automática: o sistema escolherá uma proxy disponível automaticamente
        </p>
      )}
      {proxiesDisponiveis.length > 0 && (
        <p className="text-xs text-gray-500">
          {proxiesDisponiveis.filter(p => p.status === 'Ativo').length} proxy(s) ativa(s) de {proxiesDisponiveis.length} cadastrada(s)
        </p>
      )}
    </div>
  )
}


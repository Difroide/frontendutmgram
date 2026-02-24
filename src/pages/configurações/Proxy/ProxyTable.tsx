import { Network, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Proxy as ProxyType } from '@/types/Proxy'

interface ProxyTableProps {
  proxies: ProxyType[]
  onEdit: (proxy: ProxyType) => void
  onDelete: (id: number) => void
  onVerificar: (id: number) => void
}

export const ProxyTable = ({ proxies, onEdit, onDelete, onVerificar }: ProxyTableProps) => {
  return (
    <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg border border-gray-600/30 hover:shadow-xl transition-all">
      <div className="p-6">
        <div className="space-y-4">
          {proxies.map((proxy) => (
            <div
              key={proxy.id}
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-900 rounded-lg">
                  <Network className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-100">
                    {proxy.endereco}:{proxy.porta}
                  </p>
                  <p className="text-sm text-gray-400">{proxy.tipo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {proxy.status === 'Ativo' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-green-300 font-medium">Ativo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-red-300 font-medium">Inativo</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => onVerificar(proxy.id)}
                  className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                  title="Verificar proxy"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


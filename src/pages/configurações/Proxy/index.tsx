import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { ProxyTable } from './ProxyTable'
import { ProxyModal } from './ProxyModal'
import { proxyService } from '../../Proxy/proxyService'
import { Proxy as ProxyType, ProxyFormData } from '@/types/Proxy'
import { useModal } from '@/hooks/useModal'

export default function Proxy() {
  const [proxies, setProxies] = useState<ProxyType[]>([])
  const [selectedProxy, setSelectedProxy] = useState<ProxyType | null>(null)
  const modal = useModal()

  useEffect(() => {
    loadProxies()
  }, [])

  const loadProxies = async () => {
    const data = await proxyService.getAll()
    setProxies(data)
  }

  const handleCreate = () => {
    setSelectedProxy(null)
    modal.open()
  }

  const handleEdit = (proxy: ProxyType) => {
    setSelectedProxy(proxy)
    modal.open()
  }

  const handleSave = async (data: ProxyFormData) => {
    if (selectedProxy) {
      await proxyService.update(selectedProxy.id, data)
    } else {
      await proxyService.create(data)
    }
    await loadProxies()
  }

  const handleVerificar = async (id: number) => {
    await proxyService.verificar(id)
    await loadProxies()
  }

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
          <h1 className="text-3xl font-bold text-gray-100">Proxy</h1>
          <p className="text-gray-400 mt-2">Gerenciar proxies do sistema</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Proxy
        </button>
      </div>

      <ProxyTable
        proxies={proxies}
        onEdit={handleEdit}
        onDelete={(id) => console.log('Delete', id)}
        onVerificar={handleVerificar}
      />

      <ProxyModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        onSave={handleSave}
        proxy={selectedProxy}
      />
    </div>
  )
}


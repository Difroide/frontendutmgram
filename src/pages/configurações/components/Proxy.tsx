import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { ProxyTable } from '../Proxy/ProxyTable'
import { ProxyModal } from '../Proxy/ProxyModal'
import { proxyService } from '../../Proxy/proxyService'
import { Proxy as ProxyType, ProxyFormData } from '@/types/Proxy'
import { useModal } from '@/hooks/useModal'

export const Proxy = () => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all shadow-lg"
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


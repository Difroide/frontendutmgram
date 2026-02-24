import { useState, useEffect } from 'react'
import { Network, CheckCircle, XCircle } from 'lucide-react'
import { ProxyTable } from './ProxyTable'
import { ProxyModal } from './ProxyModal'
import { proxyService } from './proxyService'
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

  const handleSave = async (data: ProxyFormData | ProxyFormData[]) => {
    if (selectedProxy) {
      await proxyService.update(selectedProxy.id, data as ProxyFormData)
    } else if (Array.isArray(data)) {
      // Criação em lote
      for (const proxyData of data) {
        await proxyService.create(proxyData)
      }
    } else {
      await proxyService.create(data)
    }
    await loadProxies()
  }

  const handleVerificar = async (id: number) => {
    await proxyService.verificar(id)
    await loadProxies()
  }

  const handleDelete = async (id: number) => {
    await proxyService.delete(id)
    await loadProxies()
  }

  const handleDeleteSelected = async (ids: number[]) => {
    for (const id of ids) {
      await proxyService.delete(id)
    }
    await loadProxies()
  }

  const handleDeleteAll = async () => {
    for (const proxy of proxies) {
      await proxyService.delete(proxy.id)
    }
    await loadProxies()
  }

  const handleSetDefault = async (id: number) => {
    await proxyService.setDefault(id)
    await loadProxies()
  }

  // Calcular estatísticas
  const totalProxies = proxies.length
  const proxiesEmUso = proxies.filter(p => p.status === 'Ativo').length
  const proxiesComErro = proxies.filter(p => p.status === 'Erro').length

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100">Proxy</h1>
        <p className="text-gray-400 mt-2">Gerenciar proxies do sistema</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total de Proxies</p>
              <p className="text-3xl font-bold text-gray-100 mt-2">{totalProxies}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Network className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Em Uso</p>
              <p className="text-3xl font-bold text-gray-100 mt-2">{proxiesEmUso}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Com Erros</p>
              <p className="text-3xl font-bold text-gray-100 mt-2">{proxiesComErro}</p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <ProxyTable
        proxies={proxies}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDeleteSelected={handleDeleteSelected}
        onDeleteAll={handleDeleteAll}
        onVerificar={handleVerificar}
        onAdd={handleCreate}
        onSetDefault={handleSetDefault}
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


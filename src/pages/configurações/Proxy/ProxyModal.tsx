import { X } from 'lucide-react'
import { Proxy as ProxyType, ProxyFormData } from '@/types/Proxy'

interface ProxyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProxyFormData) => void
  proxy?: ProxyType | null
}

export const ProxyModal = ({ isOpen, onClose, onSave, proxy }: ProxyModalProps) => {
  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: ProxyFormData = {
      endereco: formData.get('endereco') as string,
      porta: parseInt(formData.get('porta') as string),
      tipo: (formData.get('tipo') as ProxyType['tipo']) || 'HTTP',
      usuario: formData.get('usuario') as string,
      senha: formData.get('senha') as string,
      status: (formData.get('status') as ProxyType['status']) || 'Inativo',
    }
    onSave(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">
            {proxy ? 'Editar Proxy' : 'Adicionar Proxy'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Endereço</label>
            <input
              type="text"
              name="endereco"
              defaultValue={proxy?.endereco}
              required
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: 192.168.1.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Porta</label>
            <input
              type="number"
              name="porta"
              defaultValue={proxy?.porta}
              required
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
            <select
              name="tipo"
              defaultValue={proxy?.tipo || 'HTTP'}
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HTTP">HTTP</option>
              <option value="HTTPS">HTTPS</option>
              <option value="SOCKS4">SOCKS4</option>
              <option value="SOCKS5">SOCKS5</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Usuário (opcional)</label>
            <input
              type="text"
              name="usuario"
              defaultValue={proxy?.usuario}
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Senha (opcional)</label>
            <input
              type="password"
              name="senha"
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


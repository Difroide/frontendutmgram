import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Proxy as ProxyType, ProxyFormData } from '@/types/Proxy'

interface ProxyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProxyFormData | ProxyFormData[]) => void
  proxy?: ProxyType | null
}

export const ProxyModal = ({ isOpen, onClose, onSave, proxy }: ProxyModalProps) => {
  const [bulkMode, setBulkMode] = useState(!proxy)
  const [bulkInput, setBulkInput] = useState('')
  const [senhaAlterada, setSenhaAlterada] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setBulkInput('')
      setBulkMode(!proxy)
      setSenhaAlterada(false)
    } else {
      setBulkMode(!proxy)
      setSenhaAlterada(false)
    }
  }, [isOpen, proxy])

  if (!isOpen) return null

  const handleClose = () => {
    setBulkInput('')
    setBulkMode(!proxy)
    onClose()
  }

  const parseBulkProxies = (input: string): ProxyFormData[] => {
    const lines = input.split('\n').filter(line => line.trim())
    const proxies: ProxyFormData[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Tentar parsear formato de URL: socks5://usuario:senha@endereco:porta
      const urlMatch = trimmedLine.match(/^(https?|socks4|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i)
      if (urlMatch) {
        const [, tipoProtocolo, usuario, senha, endereco, portaStr] = urlMatch
        const porta = parseInt(portaStr)
        
        if (endereco && !isNaN(porta)) {
          // Mapear tipo de protocolo
          let tipo: ProxyFormData['tipo'] = 'HTTP'
          const tipoLower = tipoProtocolo.toLowerCase()
          if (tipoLower === 'socks5') tipo = 'SOCKS5'
          else if (tipoLower === 'socks4') tipo = 'SOCKS4'
          else if (tipoLower === 'https') tipo = 'HTTPS'
          else tipo = 'HTTP'

          proxies.push({
            endereco,
            porta,
            tipo,
            usuario: usuario || '',
            senha: senha || '',
            status: 'Inativo',
          })
          continue
        }
      }

      // Fallback: formato antigo endereco:porta:usuario:senha
      const parts = trimmedLine.split(':')
      if (parts.length >= 2) {
        const endereco = parts[0]
        const porta = parseInt(parts[1])
        const usuario = parts[2] || ''
        const senha = parts[3] || ''

        if (endereco && !isNaN(porta)) {
          proxies.push({
            endereco,
            porta,
            tipo: 'HTTP',
            usuario,
            senha,
            status: 'Inativo',
          })
        }
      }
    }

    return proxies
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (bulkMode && !proxy) {
      // Modo bulk: processar textarea
      const proxies = parseBulkProxies(bulkInput)
      if (proxies.length > 0) {
        onSave(proxies)
        setBulkInput('')
        handleClose()
      }
    } else {
      // Modo individual: processar formulário normal
      const formData = new FormData(e.currentTarget)
      const nomeValue = formData.get('nome') as string
      const senhaValue = formData.get('senha') as string
      const data: ProxyFormData = {
        nome: nomeValue && nomeValue.trim() ? nomeValue.trim() : undefined,
        endereco: formData.get('endereco') as string,
        porta: parseInt(formData.get('porta') as string),
        tipo: (formData.get('tipo') as ProxyType['tipo']) || 'HTTP',
        usuario: formData.get('usuario') as string,
        // Se estiver editando: só enviar senha se foi alterada (preenchida)
        // Se estiver criando: enviar senha se foi preenchida
        senha: proxy 
          ? (senhaAlterada && senhaValue && senhaValue.trim() ? senhaValue.trim() : undefined)
          : (senhaValue && senhaValue.trim() ? senhaValue.trim() : undefined),
        status: (formData.get('status') as ProxyType['status']) || 'Inativo',
        padrao: proxy?.padrao || false, // Manter status padrão ao editar
      }
      onSave(data)
      handleClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-gray-800 rounded-lg shadow-xl w-full p-6 border border-gray-700 ${
        bulkMode && !proxy ? 'max-w-2xl' : 'max-w-md'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">
            {proxy ? 'Editar Proxy' : 'Adicionar Proxy'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!proxy && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  bulkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Adicionar em Lote
              </button>
              <button
                type="button"
                onClick={() => setBulkMode(false)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  !bulkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Adicionar Individual
              </button>
            </div>
          )}

          {bulkMode && !proxy ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proxies (um por linha)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Formatos aceitos:
                <br />
                • URL: socks5://usuario:senha@endereco:porta
                <br />
                • Simples: endereco:porta:usuario:senha
                <br />
                Exemplos:
                <br />
                socks5://user:pass@geo.iproyal.com:11200
                <br />
                gate.decodo.com:10001:spzc558uq3:Cj6yT8dxg+hkEw94Qw
              </p>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="gate.decodo.com:10001:spzc558uq3:Cj6yT8dxg+hkEw94Qw&#10;192.168.1.1:8080:user:pass"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome (opcional)</label>
                <input
                  type="text"
                  name="nome"
                  defaultValue={proxy?.nome}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Proxy Principal"
                />
              </div>

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
                  placeholder={proxy?.senha ? 'Deixe vazio para manter a senha atual' : 'Digite a senha'}
                  onChange={() => setSenhaAlterada(true)}
                />
                {proxy?.senha && !senhaAlterada && (
                  <p className="text-xs text-gray-400 mt-1">
                    ℹ️ Há uma senha salva. Preencha apenas se quiser alterá-la.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
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


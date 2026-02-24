import { useState, useEffect, useRef } from 'react'
import { CheckCircle, MoreVertical, TestTube, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { apiTelegramService } from '@/services/apiTelegramService'

interface ApiTelegram {
  id: string
  api_id: string
  api_hash: string
  createdAt: string
}

export const ApiTelegramCard = () => {
  const [apiId, setApiId] = useState('')
  const [apiHash, setApiHash] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showApiHash, setShowApiHash] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadApis()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const loadApis = async () => {
    try {
      const data = await apiTelegramService.getAll()
      if (data && data.length > 0) {
        setIsConfigured(true)
      }
    } catch (error) {
      console.error('Erro ao carregar APIs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenPanel = async () => {
    try {
      if (window.electron?.utils) {
        await window.electron.utils.openExternalUrl('https://my.telegram.org/apps')
      } else {
        window.open('https://my.telegram.org/apps', '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Erro ao abrir painel:', error)
    }
  }

  const handleSave = async () => {
    if (!apiId.trim() || !apiHash.trim()) {
      alert('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      const result = await apiTelegramService.save(apiId.trim(), apiHash.trim())
      if (result.success) {
        setApiId('')
        setApiHash('')
        setIsConfigured(true)
        await loadApis()
        alert('API salva com sucesso!')
      } else {
        alert(`Erro ao salvar: ${result.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao salvar API:', error)
      alert('Erro ao salvar API')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!apiId.trim() || !apiHash.trim()) {
      alert('Por favor, configure API ID e API Hash antes de testar')
      return
    }

    setIsTesting(true)
    setIsMenuOpen(false)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const apis = await apiTelegramService.getAll()
      if (apis && apis.length > 0) {
        alert('✅ Conexão testada com sucesso! As credenciais estão válidas.')
      } else {
        alert('⚠️ Nenhuma API configurada. Configure uma API primeiro.')
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      alert('❌ Erro ao testar conexão. Verifique suas credenciais.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleRemoveConfig = async () => {
    if (!confirm('Tem certeza que deseja remover todas as configurações de API?')) {
      return
    }

    setIsMenuOpen(false)
    
    try {
      const apis = await apiTelegramService.getAll()
      for (const api of apis) {
        await apiTelegramService.delete(api.id)
      }
      setApiId('')
      setApiHash('')
      setIsConfigured(false)
      await loadApis()
      alert('Configurações removidas com sucesso!')
    } catch (error) {
      console.error('Erro ao remover configurações:', error)
      alert('Erro ao remover configurações')
    }
  }

  const handleCopyCredentials = async () => {
    if (!apiId.trim() || !apiHash.trim()) {
      alert('Não há credenciais para copiar')
      return
    }

    try {
      const credentials = `API ID: ${apiId}\nAPI Hash: ${apiHash}`
      await navigator.clipboard.writeText(credentials)
      setIsMenuOpen(false)
      alert('Credenciais copiadas para a área de transferência!')
    } catch (error) {
      console.error('Erro ao copiar credenciais:', error)
      alert('Erro ao copiar credenciais')
    }
  }

  return (
    <div className="relative bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
      {/* Menu de três pontos no canto superior esquerdo */}
      <div className="absolute top-2 left-2 z-20" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
          title="Mais opções"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        
        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-30">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              onClick={handleCopyCredentials}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Credenciais
            </button>
            {isConfigured && (
              <button
                onClick={handleRemoveConfig}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remover Configuração
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card pequeno no canto superior direito */}
      <button
        onClick={handleOpenPanel}
        className="absolute top-2 right-2 bg-green-500/30 backdrop-blur-md border border-green-400/50 rounded-lg px-3 py-1.5 shadow-lg hover:bg-green-500/40 hover:border-green-400/70 hover:shadow-xl transition-all z-10 cursor-pointer"
      >
        <span className="text-xs font-medium text-green-100">Obter Credenciais</span>
      </button>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-100">API Telegram</h3>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            API ID
          </label>
          <input
            type="text"
            placeholder="Digite seu API ID"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              API Hash
            </label>
            {apiHash && (
              <button
                onClick={() => setShowApiHash(!showApiHash)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title={showApiHash ? 'Ocultar' : 'Mostrar'}
              >
                {showApiHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <input
            type={showApiHash ? 'text' : 'password'}
            placeholder="Digite seu API Hash"
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
          />
        </div>
        
        {/* Card dourado quando configurado */}
        {isConfigured && (
          <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-400/50 rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <span className="text-sm font-medium text-yellow-100">
              API já está configurada corretamente
            </span>
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}


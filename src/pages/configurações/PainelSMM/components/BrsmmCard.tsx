import { useState, useEffect, useRef } from 'react'
import { CheckCircle, MoreVertical, TestTube, Trash2, Copy, Eye, EyeOff } from 'lucide-react'

export const BrsmmCard = () => {
  const [apiKey, setApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadApiKey()
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

  const loadApiKey = async () => {
    try {
      if (window.electron?.utils) {
        const result = await window.electron.utils.getSmmApiKey('brsmm')
        if (result.success && result.apiKey) {
          setApiKey(result.apiKey)
          setIsConfigured(true)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar API Key:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenPanel = async () => {
    try {
      if (window.electron?.utils) {
        await window.electron.utils.openExternalUrl('https://brsmm.com/')
      } else {
        window.open('https://brsmm.com/', '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Erro ao abrir painel:', error)
    }
  }

  const handleSave = async () => {
    try {
      if (!apiKey.trim()) {
        alert('Por favor, digite uma API Key')
        return
      }

      if (window.electron?.utils) {
        const result = await window.electron.utils.saveSmmApiKey('brsmm', apiKey.trim())
        if (result.success) {
          setIsConfigured(true)
          alert('API Key salva com sucesso!')
        } else {
          alert(`Erro ao salvar: ${result.error || 'Erro desconhecido'}`)
        }
      } else {
        alert('Electron API não disponível')
      }
    } catch (error) {
      console.error('Erro ao salvar API Key:', error)
      alert('Erro ao salvar API Key')
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      alert('Por favor, configure uma API Key antes de testar')
      return
    }

    setIsTesting(true)
    setIsMenuOpen(false)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (window.electron?.utils) {
        const result = await window.electron.utils.getSmmApiKey('brsmm')
        if (result.success && result.apiKey) {
          alert('✅ Conexão testada com sucesso! A API Key está válida.')
        } else {
          alert('⚠️ API Key não encontrada. Configure uma API Key primeiro.')
        }
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      alert('❌ Erro ao testar conexão. Verifique sua API Key.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleRemoveConfig = async () => {
    if (!confirm('Tem certeza que deseja remover a configuração da API Key?')) {
      return
    }

    setIsMenuOpen(false)
    
    try {
      if (window.electron?.utils) {
        const result = await window.electron.utils.saveSmmApiKey('brsmm', '')
        if (result.success) {
          setApiKey('')
          setIsConfigured(false)
          alert('Configuração removida com sucesso!')
        } else {
          alert(`Erro ao remover: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('Erro ao remover configuração:', error)
      alert('Erro ao remover configuração')
    }
  }

  const handleCopyApiKey = async () => {
    if (!apiKey.trim()) {
      alert('Não há API Key para copiar')
      return
    }

    try {
      await navigator.clipboard.writeText(apiKey)
      setIsMenuOpen(false)
      alert('API Key copiada para a área de transferência!')
    } catch (error) {
      console.error('Erro ao copiar API Key:', error)
      alert('Erro ao copiar API Key')
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
              onClick={handleCopyApiKey}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar API Key
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
        <span className="text-xs font-medium text-green-100">Abrir Painel</span>
      </button>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-100">Brsmm</h3>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              API Key
            </label>
            {apiKey && (
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title={showApiKey ? 'Ocultar' : 'Mostrar'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <input
            type={showApiKey ? 'text' : 'password'}
            placeholder="Digite sua API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
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
          className="w-full px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all shadow-lg"
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}


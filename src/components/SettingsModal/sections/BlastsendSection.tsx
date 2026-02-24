import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Loader2, Wifi } from 'lucide-react'

export const BlastsendSection = () => {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      if ((window as any).electron?.blastsendApi) {
        const result = await (window as any).electron.blastsendApi.loadConfig()
        if (result.success && result.config) {
          setUrl(result.config.url || '')
          setToken(result.config.token || '')
          setIsConfigured(result.config.enabled || false)
          if (result.config.enabled) setConnectionStatus('connected')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração Blastsend:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!url.trim() || !token.trim()) {
      alert('Preencha a URL e o Token')
      return
    }
    setIsTesting(true)
    setConnectionStatus('unknown')
    setConnectedEmail(null)
    try {
      if ((window as any).electron?.blastsendApi) {
        const result = await (window as any).electron.blastsendApi.testConnection({ url: url.trim(), token: token.trim() })
        if (result.success) {
          setConnectionStatus('connected')
          if (result.email) setConnectedEmail(result.email)
        } else {
          setConnectionStatus('error')
          alert(result.error || 'Erro ao conectar')
        }
      } else {
        alert('API não disponível')
      }
    } catch (error) {
      setConnectionStatus('error')
      alert('Erro ao testar conexão')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!url.trim() || !token.trim()) {
      alert('Preencha a URL e o Token')
      return
    }
    setIsSaving(true)
    try {
      if ((window as any).electron?.blastsendApi) {
        const result = await (window as any).electron.blastsendApi.saveConfig({ url: url.trim(), token: token.trim() })
        if (result.success) {
          setIsConfigured(true)
          alert('Configuração salva com sucesso!')
        } else {
          alert(result.error || 'Erro ao salvar')
        }
      } else {
        alert('API não disponível')
      }
    } catch (error) {
      alert('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {connectionStatus === 'connected' && (
        <div className="bg-green-600/20 border border-green-400/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-200">Blastsend conectado</span>
            {connectedEmail && <span className="text-xs text-green-300">Conectado como: {connectedEmail}</span>}
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="bg-red-600/20 border border-red-400/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-200">Erro na conexão com Blastsend</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">URL DA API</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://seu-app.herokuapp.com/api"
          className="w-full px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">TOKEN DA API</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Encontre em Preferências no Blastsend"
          className="w-full px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {isConfigured && (
        <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-100">Blastsend está configurado e ativo</span>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleTestConnection}
          disabled={isTesting || !url || !token}
          className="flex-1 px-4 py-2 bg-gray-600/30 border border-gray-500/30 text-white rounded-lg hover:bg-gray-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Testando...</> : <><Wifi className="w-4 h-4" /> Testar Conexão</>}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !url || !token}
          className="flex-1 px-4 py-2 bg-purple-600/30 border border-purple-400/30 text-white rounded-lg hover:bg-purple-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar Configuração'}
        </button>
      </div>
    </div>
  )
}

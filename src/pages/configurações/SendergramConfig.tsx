import { useState, useEffect } from 'react'
import { Save, Link2, Key, Info, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { sendergramService } from '@/services/sendergramService'

declare global {
    interface Window {
        eletron: {
            ipcRenderer: {
                invoke(channel: string, ...args: any[]): Promise<any>
            }
        }
    }
}

export default function SendergramConfig() {
    const [apiUrl, setApiUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [showToken, setShowToken] = useState(false)
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'testing'>('idle')
    const [message, setMessage] = useState('')

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            setStatus('loading')
            // Carregar via IPC
            const config = await window.eletron.ipcRenderer.invoke('sendergram:carregar-config')
            if (config) {
                setApiUrl(config.apiUrl || 'https://nuebasendergram-production.up.railway.app')
                setApiKey(config.apiKey || '')

                // Configurar servico
                sendergramService.configure({
                    apiUrl: config.apiUrl,
                    apiKey: config.apiKey
                })
            }
            setStatus('idle')
        } catch (error) {
            console.error('Erro ao carregar config:', error)
            setStatus('error')
            setMessage('Erro ao carregar configurações')
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setMessage('')

        try {
            // 1. Salvar via IPC (persistencia)
            await window.eletron.ipcRenderer.invoke('sendergram:salvar-config', {
                apiUrl,
                apiKey
            })

            // 2. Atualizar serviço em memória
            sendergramService.configure({ apiUrl, apiKey })

            setStatus('success')
            setMessage('Configurações salvas com sucesso!')

            setTimeout(() => {
                setStatus('idle')
                setMessage('')
            }, 3000)

        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            setStatus('error')
            setMessage(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
        }
    }

    const handleTestConnection = async () => {
        setStatus('testing')
        setMessage('Testando conexão...')

        try {
            // Configurar temporariamente para teste
            sendergramService.configure({ apiUrl, apiKey })

            // Tentar buscar grupos (endpoint leve)
            const groups = await sendergramService.getDetectedGroups()

            setStatus('success')
            setMessage(`Conexão OK! ${groups.length} grupos encontrados.`)
        } catch (error: any) {
            console.error('Erro no teste:', error)
            setStatus('error')
            setMessage(`Falha na conexão: ${error.message || 'Verifique URL/Token'}`)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                    <Link2 className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Configuração SenderGRAM</h1>
                    <p className="text-gray-400">Gerencie a conexão com a API de envios</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-[#0d1117]/50">
                    <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                        <Info className="w-5 h-5 text-gray-500" />
                        Credenciais de Acesso
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure a URL base e o Token de autenticação fornecidos pelo administrador.
                    </p>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {/* API URL */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">URL da API</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Link2 className="h-5 w-5 text-gray-600" />
                            </div>
                            <input
                                type="url"
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="https://api.exemplo.com"
                                className="w-full bg-[#0d1117] border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block pl-10 p-2.5 placeholder-gray-600 font-mono"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-600">URL base do servidor SenderGRAM (padrão: Railway)</p>
                    </div>

                    {/* API Token */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Token de API (Chave de Acesso)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Key className="h-5 w-5 text-gray-600" />
                            </div>
                            <input
                                type={showToken ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk_..."
                                className="w-full bg-[#0d1117] border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block pl-10 pr-10 p-2.5 placeholder-gray-600 font-mono"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 ${status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''
                            }`}>
                            {status === 'success' && <CheckIcon className="w-5 h-5 flex-shrink-0" />}
                            {status === 'error' && <AlertIcon className="w-5 h-5 flex-shrink-0" />}
                            <span className="text-sm font-medium">{message}</span>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={loadConfig}
                            disabled={status === 'loading'}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-transparent hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
                            Recarregar
                        </button>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={status === 'loading' || status === 'testing' || !apiUrl}
                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${status === 'testing' ? 'animate-spin' : ''}`} />
                            {status === 'testing' ? 'Testando...' : 'Testar Conexão'}
                        </button>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-6 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {status === 'loading' ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Icon helpers
function CheckIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    )
}

function AlertIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
    )
}

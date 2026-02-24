import React, { useState, useEffect } from 'react'
import { X, Send, Eye, EyeOff, Loader2 } from 'lucide-react'
import { sendergramService } from '../../../services/sendergramService'

interface SendergramModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (token: string) => Promise<void>
}

export function SendergramModal({ isOpen, onClose, onConfirm }: SendergramModalProps) {
    const [token, setToken] = useState('')
    const [showToken, setShowToken] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [saveToken, setSaveToken] = useState(true)

    useEffect(() => {
        if (isOpen) {
            loadConfig()
        }
    }, [isOpen])

    const loadConfig = async () => {
        try {
            const config = await sendergramService.loadConfig()
            if (config.apiKey) {
                setToken(config.apiKey)
            }
        } catch (err) {
            console.error('Erro ao carregar config:', err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token.trim()) {
            setError('Por favor, insira o Token da API')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Salvar token se solicitado
            if (saveToken) {
                await sendergramService.saveConfig({
                    apiUrl: 'https://nuebasendergram-production.up.railway.app',
                    apiKey: token,
                    enabled: true
                })
            }

            await onConfirm(token)
            onClose()
        } catch (err) {
            console.error('Erro ao enviar:', err)
            setError(err instanceof Error ? err.message : 'Erro ao processar envio')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        Enviar para API
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Token da API (SenderGRAM/EPSENDER)
                        </label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Cole seu token aqui..."
                                className="w-full pl-4 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors"
                            >
                                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="saveToken"
                            checked={saveToken}
                            onChange={(e) => setSaveToken(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500/50"
                        />
                        <label htmlFor="saveToken" className="text-sm text-slate-400 cursor-pointer select-none">
                            Salvar token para próximos envios
                        </label>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
                        A campanha será enviada para o servidor remoto. Certifique-se de que os bots e grupos já estejam sincronizados ou serão processados automaticamente pelo servidor.
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !token.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Confirmar Envio
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

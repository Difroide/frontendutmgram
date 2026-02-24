import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export const CraftPaySection = () => {
  const { currentTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [configurado, setConfigurado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    const carregar = async () => {
      const electron = (window as any).electron
      if (!electron?.craftpay?.carregarConfig) return

      try {
        const result = await electron.craftpay.carregarConfig()
        if (result.success && result.configurado && result.email) {
          setEmail(result.email)
          setConfigurado(true)
        }
      } catch (error) {
        console.warn('[CraftPaySection] Erro ao carregar config:', error)
      }
    }
    carregar()
  }, [])

  const handleSalvar = async () => {
    const electron = (window as any).electron
    if (!electron?.craftpay?.salvarCredenciais) {
      setMensagem({ tipo: 'erro', texto: 'Módulo CraftPay não disponível' })
      return
    }

    if (!email.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o email' })
      return
    }

    if (!senha && !configurado) {
      setMensagem({ tipo: 'erro', texto: 'Informe a senha' })
      return
    }

    setSalvando(true)
    setMensagem(null)

    try {
      const result = await electron.craftpay.salvarCredenciais({
        email: email.trim(),
        senha,
      })

      if (result.success) {
        setConfigurado(true)
        setMensagem({ tipo: 'sucesso', texto: 'Credenciais salvas com sucesso' })
        setTimeout(() => setMensagem(null), 3000)
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao salvar' })
      }
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error?.message || 'Erro ao salvar credenciais' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Configure suas credenciais do CraftPay para exibir as estatísticas do dia na dashboard.
          Os dados são salvos localmente e nunca são enviados a servidores externos.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">E-mail ou Usuário</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
          />
          {configurado && (
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para manter a senha atual
            </p>
          )}
        </div>

        {mensagem && (
          <div
            className={`p-3 rounded-lg text-sm ${
              mensagem.tipo === 'sucesso'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
          style={{
            backgroundColor: currentTheme.colors.primary,
          }}
        >
          {salvando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar credenciais'
          )}
        </button>
      </div>
    </div>
  )
}

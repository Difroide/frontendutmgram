import { useState, useEffect } from 'react'
import { FolderOpen, Save } from 'lucide-react'
import { soundNotificationService } from '@/services/soundNotificationService'

interface ConfiguracoesGerais {
  pastaNotas?: string
  pastaFotos?: string
}

export default function ConfiguracoesGerais() {
  const [config, setConfig] = useState<ConfiguracoesGerais>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificacoesSonoras, setNotificacoesSonoras] = useState(true)

  useEffect(() => {
    loadConfig()
    // Carregar preferência de notificações sonoras
    soundNotificationService.loadPreference()
    setNotificacoesSonoras(soundNotificationService.isEnabled())
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      if ((window as any).electron?.configuracoes) {
        const configData = await (window as any).electron.configuracoes.carregar()
        setConfig(configData || {})
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      
      if ((window as any).electron?.configuracoes) {
        await (window as any).electron.configuracoes.salvar(config)
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      } else {
        throw new Error('API Electron não disponível')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  const handleSelectFolder = async (field: keyof ConfiguracoesGerais) => {
    try {
      if ((window as any).electron?.utils) {
        const folderPath = await (window as any).electron.utils.selecionarPasta()
        if (folderPath) {
          setConfig((prev) => ({ ...prev, [field]: folderPath }))
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error)
      setMessage({ type: 'error', text: 'Erro ao selecionar pasta' })
    }
  }


  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100">Configurações Gerais</h1>
        <p className="text-gray-400 mt-2">Configure as pastas e opções gerais do sistema</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-600/20 border-green-400/30 text-green-200'
              : 'bg-red-600/20 border-red-400/30 text-red-200'
          }`}
        >
          <div className="whitespace-pre-line">{message.text}</div>
        </div>
      )}

      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">Pastas do Sistema</h2>

        <div className="space-y-6">
          {/* Pasta de Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              PASTA PARA ARQUIVOS DE NOTAS
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Pasta onde serão salvos os arquivos de notas com links, @ e tokens dos bots criados
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={config.pastaNotas || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, pastaNotas: e.target.value }))}
                placeholder="Selecione a pasta para salvar os arquivos de notas"
                className="flex-1 px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                readOnly
              />
              <button
                onClick={() => handleSelectFolder('pastaNotas')}
                className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Selecionar
              </button>
            </div>
          </div>

          {/* Pasta de Fotos */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              PASTA PARA FOTOS DE GRUPOS
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Pasta onde estão as fotos que serão usadas aleatoriamente nos grupos criados
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={config.pastaFotos || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, pastaFotos: e.target.value }))}
                placeholder="Selecione a pasta com as fotos para grupos"
                className="flex-1 px-4 py-2 bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                readOnly
              />
              <button
                onClick={() => handleSelectFolder('pastaFotos')}
                className="px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Selecionar
              </button>
            </div>
          </div>

          {/* Notificações Sonoras */}
          <div className="bg-gray-700/30 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  NOTIFICAÇÕES SONORAS
                </label>
                <p className="text-xs text-gray-400">
                  Reproduz sons quando tarefas importantes terminam (2 bips rápidos para sucesso, 3 bips longos para erro)
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => {
                    const novoEstado = !notificacoesSonoras
                    setNotificacoesSonoras(novoEstado)
                    if (novoEstado) {
                      soundNotificationService.enable()
                    } else {
                      soundNotificationService.disable()
                    }
                    // Testar o som quando habilitar
                    if (novoEstado) {
                      soundNotificationService.playSuccess()
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificacoesSonoras ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificacoesSonoras ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-green-600/30 backdrop-blur-md border border-green-400/30 text-white rounded-lg hover:bg-green-600/40 hover:border-green-400/50 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { FolderOpen, Save, FileCode } from 'lucide-react'
import { soundNotificationService } from '@/services/soundNotificationService'
import { useTheme } from '@/contexts/ThemeContext'

interface ConfiguracoesGerais {
  pastaNotas?: string
  pastaFotos?: string
  pastaBaseTelegram?: string
  pastaTelegramPortatil?: string
  megaDownloadBaseDir?: string
  megadlPath?: string
}

export const GeneralSection = () => {
  const [config, setConfig] = useState<ConfiguracoesGerais>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificacoesSonoras, setNotificacoesSonoras] = useState(true)
  const { currentTheme } = useTheme()

  useEffect(() => {
    loadConfig()
    soundNotificationService.loadPreference()
    setNotificacoesSonoras(soundNotificationService.isEnabled())
  }, [])

  const loadConfig = async () => {
    try {
      if ((window as any).electron?.configuracoes) {
        const configData = await (window as any).electron.configuracoes.carregar()
        const data = configData || {}
        // Compatibilidade: pastaTelegramPortatil -> pastaBaseTelegram
        if (data.pastaTelegramPortatil && !data.pastaBaseTelegram) {
          data.pastaBaseTelegram = data.pastaTelegramPortatil
        }
        setConfig(data)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      
      if ((window as any).electron?.configuracoes) {
        // Garantir compatibilidade: pastaBaseTelegram e pastaTelegramPortatil
        const configToSave = { ...config }
        if (configToSave.pastaBaseTelegram) {
          configToSave.pastaTelegramPortatil = configToSave.pastaBaseTelegram
        }
        await (window as any).electron.configuracoes.salvar(configToSave)
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
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
          setConfig((prev) => {
            const updated = { ...prev, [field]: folderPath }
            // Compatibilidade: pastaBaseTelegram e pastaTelegramPortatil são a mesma coisa
            if (field === 'pastaBaseTelegram') {
              updated.pastaTelegramPortatil = folderPath
            }
            return updated
          })
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error)
    }
  }

  const handleSelectFile = async (field: keyof ConfiguracoesGerais) => {
    try {
      if ((window as any).electron?.utils?.selecionarArquivo) {
        const filePath = await (window as any).electron.utils.selecionarArquivo(['exe'])
        if (filePath) {
          setConfig((prev) => ({ ...prev, [field]: filePath }))
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-600/20 border-green-400/30 text-green-200'
              : 'bg-red-600/20 border-red-400/30 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-600/30">
          <h4 className="text-sm font-bold text-gray-200">
            PASTAS DO SISTEMA
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Configure os caminhos conforme o seu computador. Esses caminhos são salvos localmente e não afetam outros usuários.
          </p>
        </div>

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
              placeholder="Selecione a pasta para salvar os arquivos de notas"
              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none"
              onFocus={(e) => {
                e.target.style.borderColor = `${currentTheme.colors.primary}80`
                e.target.style.boxShadow = `0 0 0 3px ${currentTheme.colors.primary}30`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = ''
                e.target.style.boxShadow = ''
              }}
              readOnly
            />
            <button
              onClick={() => handleSelectFolder('pastaNotas')}
              className="px-4 py-2 border text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}50`
              }}
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
              placeholder="Selecione a pasta com as fotos para grupos"
              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none"
              onFocus={(e) => {
                e.target.style.borderColor = `${currentTheme.colors.primary}80`
                e.target.style.boxShadow = `0 0 0 3px ${currentTheme.colors.primary}30`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = ''
                e.target.style.boxShadow = ''
              }}
              readOnly
            />
            <button
              onClick={() => handleSelectFolder('pastaFotos')}
              className="px-4 py-2 border text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}50`
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Selecionar
            </button>
          </div>
        </div>

        {/* Pasta Telegram Portátil */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            PASTA DO TELEGRAM PORTÁTIL
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Pasta que contém Telegram.exe e a pasta modules (usada para copiar nas contas)
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={config.pastaBaseTelegram || config.pastaTelegramPortatil || ''}
              placeholder="Selecione a pasta do Telegram portátil"
              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none"
              onFocus={(e) => {
                e.target.style.borderColor = `${currentTheme.colors.primary}80`
                e.target.style.boxShadow = `0 0 0 3px ${currentTheme.colors.primary}30`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = ''
                e.target.style.boxShadow = ''
              }}
              readOnly
            />
            <button
              onClick={() => handleSelectFolder('pastaBaseTelegram')}
              className="px-4 py-2 border text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}50`
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Selecionar
            </button>
          </div>
        </div>

        {/* Pasta para Downloads MEGA */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            PASTA PARA DOWNLOADS (MEGA)
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Pasta onde serão baixadas as contas do MEGA (se não configurar, usa pasta ao lado do sistema)
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={config.megaDownloadBaseDir || ''}
              placeholder="Selecione a pasta para downloads"
              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none"
              onFocus={(e) => {
                e.target.style.borderColor = `${currentTheme.colors.primary}80`
                e.target.style.boxShadow = `0 0 0 3px ${currentTheme.colors.primary}30`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = ''
                e.target.style.boxShadow = ''
              }}
              readOnly
            />
            <button
              onClick={() => handleSelectFolder('megaDownloadBaseDir')}
              className="px-4 py-2 border text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}50`
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Selecionar
            </button>
          </div>
        </div>

        {/* Megadl (executável) */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            MEGADL (EXECUTÁVEL)
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Caminho do megadl.exe (ferramenta para download do MEGA via linha de comando)
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={config.megadlPath || ''}
              placeholder="Selecione o arquivo megadl.exe"
              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none"
              onFocus={(e) => {
                e.target.style.borderColor = `${currentTheme.colors.primary}80`
                e.target.style.boxShadow = `0 0 0 3px ${currentTheme.colors.primary}30`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = ''
                e.target.style.boxShadow = ''
              }}
              readOnly
            />
            <button
              onClick={() => handleSelectFile('megadlPath')}
              className="px-4 py-2 border text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
                e.currentTarget.style.borderColor = `${currentTheme.colors.primary}50`
              }}
            >
              <FileCode className="w-4 h-4" />
              Selecionar
            </button>
          </div>
        </div>

        {/* Notificações Sonoras */}
        <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                NOTIFICAÇÕES SONORAS
              </label>
              <p className="text-xs text-gray-400">
                Reproduz sons quando tarefas importantes terminam
              </p>
            </div>
            <button
              onClick={() => {
                const novoEstado = !notificacoesSonoras
                setNotificacoesSonoras(novoEstado)
                if (novoEstado) {
                  soundNotificationService.enable()
                  soundNotificationService.playSuccess()
                } else {
                  soundNotificationService.disable()
                }
              }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: notificacoesSonoras ? currentTheme.colors.primary : '#4b5563',
              }}
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

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600/30 border border-green-400/30 text-white rounded-lg hover:bg-green-600/40 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}


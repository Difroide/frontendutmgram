import { useState, useEffect } from 'react'
import { RefreshCw, Save, X, FileText } from 'lucide-react'

interface Sessao {
  path: string
  name: string
  tag: string
}

export const GerenciarTagsTab = () => {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [tagsEditing, setTagsEditing] = useState<Record<string, string>>({})

  const loadSessoes = async () => {
    setIsLoading(true)
    try {
      if (!window.electron?.contingencia?.listarSessoes) {
        console.warn('API contingencia não disponível')
        return
      }

      const result = await window.electron.contingencia.listarSessoes(null)
      if (result.success) {
        const sessionsWithTags = (result.sessions || []).map((s: Sessao) => ({
          ...s,
          tag: s.tag || '',
        }))
        setSessoes(sessionsWithTags)
        
        // Inicializar tags em edição
        const initialTags: Record<string, string> = {}
        sessionsWithTags.forEach((s: Sessao) => {
          initialTags[s.path] = s.tag || ''
        })
        setTagsEditing(initialTags)
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      alert('Erro ao carregar sessões: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessoes()
  }, [])

  const handleSaveTag = async (sessionPath: string) => {
    try {
      const tagText = tagsEditing[sessionPath]?.trim() || ''
      
      if (!window.electron?.contingencia?.definirTag) {
        alert('API não disponível')
        return
      }

      const result = await window.electron.contingencia.definirTag(sessionPath, tagText)
      
      if (result.success) {
        // Atualizar lista
        await loadSessoes()
        alert('Tag salva com sucesso!')
      } else {
        alert('Erro ao salvar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao salvar tag:', error)
      alert('Erro ao salvar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const handleRemoveTag = async (sessionPath: string) => {
    if (!confirm('Tem certeza que deseja remover a tag desta sessão?')) {
      return
    }

    try {
      if (!window.electron?.contingencia?.definirTag) {
        alert('API não disponível')
        return
      }

      const result = await window.electron.contingencia.definirTag(sessionPath, '')
      
      if (result.success) {
        // Atualizar lista
        await loadSessoes()
        alert('Tag removida com sucesso!')
      } else {
        alert('Erro ao remover tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao remover tag:', error)
      alert('Erro ao remover tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Informações */}
      <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Sobre as Tags</h3>
        <p className="text-xs text-gray-300 leading-relaxed">
          Organize suas sessões com tags personalizadas. As tags aparecem ao lado do nome da sessão
          em todos os seletores, facilitando a identificação e organização das suas contas.
        </p>
      </div>

      {/* Header com botão atualizar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-200">Sessões Cadastradas</h2>
        <button
          onClick={loadSessoes}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 text-blue-200 rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Carregando...' : 'Atualizar Lista'}
        </button>
      </div>

      {/* Lista de Sessões */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Carregando sessões...</p>
        </div>
      ) : sessoes.length === 0 ? (
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma sessão encontrada.</p>
          <p className="text-sm text-gray-500 mt-2">
            As sessões são procuradas automaticamente nos diretórios de contas.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Sessão
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Tag Atual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Nova Tag
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {sessoes.map((sessao) => (
                  <tr key={sessao.path} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 font-mono">{sessao.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-md" title={sessao.path}>
                        {sessao.path}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sessao.tag ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-600/30 text-orange-200 border border-orange-500/30">
                          {sessao.tag}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Sem tag</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={tagsEditing[sessao.path] || ''}
                        onChange={(e) => {
                          setTagsEditing({
                            ...tagsEditing,
                            [sessao.path]: e.target.value,
                          })
                        }}
                        placeholder="Digite uma tag..."
                        className="w-full px-3 py-1.5 text-sm bg-gray-700/50 backdrop-blur-sm text-gray-300 border border-gray-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSaveTag(sessao.path)}
                          className="p-2 bg-green-600/30 backdrop-blur-sm border border-green-400/30 text-green-200 rounded-lg hover:bg-green-600/40 hover:border-green-400/50 transition-all"
                          title="Salvar tag"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        {sessao.tag && (
                          <button
                            onClick={() => handleRemoveTag(sessao.path)}
                            className="p-2 bg-red-600/30 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-lg hover:bg-red-600/40 hover:border-red-400/50 transition-all"
                            title="Remover tag"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-700/30 px-4 py-3 border-t border-gray-600/30">
            <p className="text-xs text-gray-400">
              Total: <span className="text-gray-300 font-medium">{sessoes.length}</span> sessão(ões)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


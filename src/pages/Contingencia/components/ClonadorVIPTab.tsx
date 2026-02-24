import { useState, useEffect } from 'react'
import { Rocket, RefreshCw, FileText, Tag, Plus, Search, X } from 'lucide-react'

interface Sessao {
  path: string
  name: string
  tag?: string | null
  tagsConta?: string[]
}

export const ClonadorVIPTab = () => {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string>('')
  const [sessaoManual, setSessaoManual] = useState<string>('')
  const [linkGrupo, setLinkGrupo] = useState<string>('')
  const [tagNova, setTagNova] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('')
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [resultado, setResultado] = useState<{
    success: boolean
    groupLink?: string
    totalMensagens?: number
    mensagensLinks?: string[]
    grupoNome?: string
    grupoOrigemNome?: string
    grupoOrigemTipo?: string
    error?: string
  } | null>(null)

  const loadSessoes = async () => {
    try {
      if (!window.electron?.contingencia?.listarSessoes) {
        console.warn('API contingencia não disponível')
        return
      }

      const result = await window.electron?.contingencia?.listarSessoes(null)
      if (result?.success) {
        setSessoes((result.sessions || []) as Sessao[])
        if (result.sessions && result.sessions.length > 0 && !sessaoSelecionada) {
          const sessaoComTag = result.sessions.find((s: Sessao) => s.tag) || result.sessions[0]
          setSessaoSelecionada(sessaoComTag.path)
        }

        if (sessaoSelecionada) {
          const sessao = result.sessions?.find((s: Sessao) => s.path === sessaoSelecionada)
          if (sessao && sessao.tag) {
            setTagNova(sessao.tag)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    }
  }

  useEffect(() => {
    loadSessoes()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSessionDropdown && !target.closest('.session-dropdown-container')) {
        setShowSessionDropdown(false)
      }
    }

    if (showSessionDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showSessionDropdown])

  const handleExecutar = async () => {
    if (isProcessing) return

    const sessaoFinal = sessaoSelecionada || sessaoManual.trim()

    if (!sessaoFinal) {
      alert('Selecione ou digite o caminho de uma sessão')
      return
    }

    if (!linkGrupo.trim()) {
      alert('Digite o link do grupo origem')
      return
    }

    setIsProcessing(true)
    setResultado(null)

    try {
      if (!window.electron?.contingencia?.clonarVIP) {
        throw new Error('API não disponível')
      }

      const result = await window.electron.contingencia.clonarVIP({
        sessionPath: sessaoFinal,
        sourceLink: linkGrupo.trim(),
        proxy: null,
      })

      setResultado(result)
    } catch (error) {
      console.error('Erro ao executar clonagem:', error)
      setResultado({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Informações */}
      <div className="bg-[#161b22] border border-blue-800/30 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
          <span className="text-blue-400">ℹ️</span>
          Sobre o Clonador Base
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          O Clonador VIP reconhece todas as mensagens de um grupo (público ou privado) e cria um novo grupo
          clonando todas as mensagens <strong className="text-gray-200">ocultando a origem</strong>.
          As mensagens aparecerão como se fossem enviadas diretamente, sem mostrar de onde vieram.
        </p>
      </div>

      {/* Seleção de Sessão */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">Sessão</label>

        <div className="space-y-3">
          {/* Campo de pesquisa de sessões */}
          <div className="relative session-dropdown-container">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={sessionSearchTerm || (sessaoSelecionada ? sessoes.find((s) => s.path === sessaoSelecionada)?.name || '' : '')}
                onChange={(e) => {
                  setSessionSearchTerm(e.target.value)
                  setShowSessionDropdown(true)
                  if (!e.target.value) {
                    setSessaoSelecionada('')
                    setTagNova('')
                  }
                }}
                onFocus={() => {
                  setShowSessionDropdown(true)
                  if (!sessionSearchTerm && sessaoSelecionada) {
                    setSessionSearchTerm(sessoes.find((s) => s.path === sessaoSelecionada)?.name || '')
                  }
                }}
                onClick={() => setShowSessionDropdown(true)}
                placeholder="Pesquisar sessão..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                autoComplete="off"
              />
              {(sessionSearchTerm || sessaoSelecionada) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSessionSearchTerm('')
                    setSessaoSelecionada('')
                    setTagNova('')
                    setShowSessionDropdown(true)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Limpar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showSessionDropdown && sessoes.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-[#161b22] border border-gray-800 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {(() => {
                  const filteredSessoes = sessionSearchTerm
                    ? sessoes.filter((sessao) => {
                        const searchLower = sessionSearchTerm.toLowerCase()
                        const nameMatch = sessao.name.toLowerCase().includes(searchLower)
                        const pathMatch = sessao.path.toLowerCase().includes(searchLower)
                        const tagMatch = sessao.tag?.toLowerCase().includes(searchLower)
                        const tagsContaMatch = sessao.tagsConta?.some((tag) => tag.toLowerCase().includes(searchLower))
                        return nameMatch || pathMatch || tagMatch || tagsContaMatch
                      })
                    : sessoes

                  if (filteredSessoes.length === 0) {
                    return (
                      <div className="px-4 py-6 text-center">
                        <Search className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                        <div className="text-gray-500 text-sm">Nenhuma sessão encontrada</div>
                      </div>
                    )
                  }

                  return filteredSessoes.map((sessao) => {
                    const isSelected = sessaoSelecionada === sessao.path

                    return (
                      <button
                        key={sessao.path}
                        onClick={() => {
                          setSessaoSelecionada(sessao.path)
                          setSessionSearchTerm(sessao.name)
                          setSessaoManual('')
                          setShowSessionDropdown(false)
                          setTagNova(sessao.tag || '')
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-[#21262d] text-gray-200 transition-colors border-b border-gray-800 last:border-b-0 ${
                          isSelected ? 'bg-[#21262d] border-l-2 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="text-sm truncate">{sessao.name}</div>
                        <div className="text-xs text-gray-500 truncate">{sessao.path}</div>
                        {sessao.tag && <span className="inline-block mt-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{sessao.tag}</span>}
                      </button>
                    )
                  })
                })()}
              </div>
            )}

            {sessaoSelecionada && (
              <div className="mt-2 p-2.5 bg-[#0d1117] border border-gray-700/50 rounded-lg">
                <div className="text-xs text-gray-500 mb-0.5">Sessão selecionada:</div>
                <div className="text-sm text-gray-200 font-medium">{sessoes.find((s) => s.path === sessaoSelecionada)?.name || sessaoSelecionada}</div>
              </div>
            )}

            <button
              onClick={loadSessoes}
              className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#30363d] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar Lista
            </button>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#161b22] px-2 text-gray-600">ou</span>
            </div>
          </div>

          {/* Campo manual */}
          <input
            type="text"
            value={sessaoManual}
            onChange={(e) => {
              setSessaoManual(e.target.value)
              if (e.target.value) {
                setSessaoSelecionada('')
              }
            }}
            placeholder="Caminho completo do arquivo .session"
            className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Link do Grupo */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">Link do Grupo Origem</label>
        <input
          type="text"
          value={linkGrupo}
          onChange={(e) => setLinkGrupo(e.target.value)}
          placeholder="https://t.me/grupo ou https://t.me/joinchat/..."
          className="w-full px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
          disabled={isProcessing}
        />
        <p className="text-xs text-gray-600 mt-2">Funciona com grupos públicos e privados</p>
      </div>

      {/* Tag para Sessão */}
      {(sessaoSelecionada || sessaoManual) && (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Tag className="w-3 h-3" />
            Tag para esta sessão (opcional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagNova}
              onChange={(e) => setTagNova(e.target.value)}
              placeholder="Digite uma tag para esta sessão..."
              className="flex-1 px-4 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
              disabled={isProcessing}
            />
            <button
              onClick={async () => {
                const sessaoFinal = sessaoSelecionada || sessaoManual.trim()
                if (!sessaoFinal) {
                  alert('Selecione uma sessão primeiro')
                  return
                }

                try {
                  if (!window.electron?.contingencia?.definirTag) {
                    alert('API não disponível')
                    return
                  }

                  const result = await window.electron.contingencia.definirTag(sessaoFinal, tagNova.trim())

                  if (result.success) {
                    alert('Tag salva com sucesso!')
                    setTagNova('')
                    await loadSessoes()
                  } else {
                    alert('Erro ao salvar tag: ' + (result.error || 'Erro desconhecido'))
                  }
                } catch (error) {
                  console.error('Erro ao salvar tag:', error)
                  alert('Erro ao salvar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
                }
              }}
              disabled={isProcessing || !tagNova.trim()}
              className="px-4 py-2.5 bg-[#21262d] border border-gray-700 text-gray-200 text-sm rounded-lg hover:bg-[#30363d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Salvar Tag
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">Adicione uma tag para facilitar a identificação desta sessão</p>
        </div>
      )}

      {/* Botão Executar */}
      <button
        onClick={handleExecutar}
        disabled={isProcessing}
        className="w-full px-4 py-3 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Clonando...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            Iniciar Clonagem
          </>
        )}
      </button>

      {/* Terminal de Logs */}
      <div className="bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden">
        <div className="bg-[#0d1117] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-gray-400">Terminal - Clonador Base</span>
          </div>
          <button onClick={() => setResultado(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors" disabled={isProcessing}>
            Limpar
          </button>
        </div>
        <div className="p-4">
          <div className="bg-[#0d1117] rounded border border-gray-800 p-4 min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-xs">
            {isProcessing && !resultado && (
              <div className="space-y-1 text-emerald-400">
                <div className="animate-pulse">⏳ Iniciando clonagem...</div>
                <div className="text-gray-500">Conectando ao Telegram...</div>
              </div>
            )}
            {resultado && (
              <div className="space-y-2">
                {resultado.success ? (
                  <>
                    <div className="text-emerald-400 font-medium">✅ CLONAGEM CONCLUÍDA COM SUCESSO</div>
                    <div className="text-gray-400 space-y-1">
                      <div className="border-t border-gray-800 my-2"></div>
                      <div className="text-gray-500">📋 Grupo Origem:</div>
                      <div className="pl-3">
                        Nome: <span className="text-gray-300">{resultado.grupoOrigemNome}</span>
                      </div>
                      <div className="pl-3">
                        Tipo: <span className="text-gray-300">{resultado.grupoOrigemTipo}</span>
                      </div>
                      <div className="text-gray-500 mt-2">📋 Grupo Criado:</div>
                      <div className="pl-3">
                        Nome: <span className="text-gray-300">{resultado.grupoNome}</span>
                      </div>
                      <div className="pl-3">
                        Link:{' '}
                        <a href={resultado.groupLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline break-all">
                          {resultado.groupLink}
                        </a>
                      </div>
                      <div className="text-gray-500 mt-2">📊 Estatísticas:</div>
                      <div className="pl-3">
                        Total de Mensagens: <span className="text-emerald-400 font-medium">{resultado.totalMensagens}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-red-400 font-medium">❌ ERRO NA CLONAGEM</div>
                    <div className="text-red-300">{resultado.error || 'Erro desconhecido'}</div>
                  </>
                )}
              </div>
            )}
            {!isProcessing && !resultado && <div className="text-gray-600 italic">Aguardando início da clonagem...</div>}
          </div>
        </div>
      </div>

      {/* Card de Resultado Expandido */}
      {resultado && resultado.success && (
        <div className="bg-[#161b22] rounded-lg border border-emerald-800/30 p-4">
          <h3 className="text-base font-medium text-emerald-400 mb-4 flex items-center gap-2">✅ Clonagem Concluída</h3>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500">Grupo Origem:</span>
              <span className="text-gray-200">{resultado.grupoOrigemNome}</span>
              <span className="text-gray-600">({resultado.grupoOrigemTipo})</span>
            </div>

            <div className="flex gap-2">
              <span className="text-gray-500">Grupo Criado:</span>
              <span className="text-gray-200">{resultado.grupoNome}</span>
            </div>

            <div>
              <span className="text-gray-500">Link do Grupo:</span>
              <div className="mt-1 p-2.5 bg-[#0d1117] rounded-lg border border-gray-800">
                <a href={resultado.groupLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 break-all text-sm">
                  {resultado.groupLink}
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="text-gray-500">Total de Mensagens:</span>
              <span className="text-emerald-400 font-medium">{resultado.totalMensagens}</span>
            </div>
          </div>

          {/* Links das Mensagens */}
          {resultado.mensagensLinks && resultado.mensagensLinks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Links das Mensagens ({resultado.mensagensLinks.length})
              </h4>
              <div className="max-h-64 overflow-y-auto bg-[#0d1117] rounded-lg border border-gray-800 p-3">
                <div className="space-y-1 font-mono text-xs">
                  {resultado.mensagensLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 py-0.5 hover:bg-[#21262d] rounded px-1 -mx-1">
                      <span className="text-gray-600 w-6 text-right flex-shrink-0">{index + 1}.</span>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 break-all flex-1">
                        {link}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { X, ExternalLink, Users, Bot, List, Loader2, Phone, AlertTriangle, AtSign } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Grupo {
  nome: string
  link_convite?: string
  id: number
  membros: number
  caido?: boolean
  bot_midia_admin?: string
  bots_lista_admin?: string[]
}

interface DetalhesConta {
  numero?: string
  username?: string
  grupos?: Grupo[]
  quantidade_grupos?: number
  tags?: string[]
  frozen?: boolean
  sessaoAlerta?: boolean
  [key: string]: any
}

interface DetalhesContaModalProps {
  isOpen: boolean
  onClose: () => void
  numero: string
}

export const DetalhesContaModal = ({ isOpen, onClose, numero }: DetalhesContaModalProps) => {
  const [detalhes, setDetalhes] = useState<DetalhesConta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && numero) {
      loadDetalhes()
    } else {
      setDetalhes(null)
      setError(null)
    }
  }, [isOpen, numero])

  // Adicionar atalho ESC para fechar o modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, onClose])

  const loadDetalhes = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!window.electron) {
        setError('Electron não está disponível. Certifique-se de que está rodando no Electron.')
        return
      }
      
      if (!window.electron.telegram) {
        setError('API do Telegram não está disponível.')
        return
      }
      
      if (!window.electron.telegram.getDetalhesConta) {
        setError('Função getDetalhesConta não está disponível. Reinicie o Electron para carregar as atualizações.')
        return
      }
      
      const result = await window.electron.telegram.getDetalhesConta(numero)
      
      if (result.success && result.detalhes) {
        setDetalhes(result.detalhes)
      } else {
        setError(result.error || 'Erro ao carregar detalhes da conta')
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err)
      setError(err.message || 'Erro ao carregar detalhes')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenLink = (link: string) => {
    if (link && (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('t.me/'))) {
      const fullLink = link.startsWith('t.me/') ? `https://${link}` : link
      window.open(fullLink, '_blank')
    }
  }

  if (!isOpen) return null

  const grupos = detalhes?.grupos || []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-gray-800/40 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] border border-gray-600/30 border-blue-500/20 flex flex-col"
        style={{ backgroundColor: 'rgba(31, 41, 55, 0.45)', backdropFilter: 'blur(24px) saturate(160%)' }}
      >
        {/* Header - Liquid glass + azul */}
        <div className="flex items-center justify-between p-5 border-b border-gray-600/30 border-blue-500/10 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Detalhes da Conta
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-2 hover:bg-[#21262d] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500 mr-3" />
              <span className="text-gray-500">Carregando detalhes...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          ) : detalhes ? (
            <div className="space-y-5">
              {detalhes.sessaoAlerta && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Possível sessão caiu</p>
                    <p className="text-sm text-amber-400/90">Todos os grupos desta sessão caíram. Verifique se a sessão ainda está ativa.</p>
                  </div>
                </div>
              )}
              {/* Informações Gerais */}
              <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">
                  Informações Gerais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {detalhes.username && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Username</p>
                      <a
                        href={`https://t.me/${detalhes.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-400 hover:text-gray-300 font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <AtSign className="w-3.5 h-3.5 text-gray-500" />
                        @{detalhes.username}
                        <ExternalLink className="w-3 h-3 text-gray-600 hover:text-gray-500" />
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total de Grupos</p>
                    <p className="text-xl font-semibold text-gray-200">
                      {detalhes.quantidade_grupos || grupos.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Status</p>
                    <p className="text-xl font-semibold">
                      {detalhes.frozen ? (
                        <span className="text-cyan-400">Congelada</span>
                      ) : (
                        <span className="text-green-400">Ativa</span>
                      )}
                    </p>
                  </div>
                </div>
                {detalhes.tags && detalhes.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-600 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {detalhes.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded bg-gray-700/50 border border-gray-700 text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Grupos */}
              {grupos.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Grupos ({grupos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {grupos.map((grupo, index) => (
                      <div
                        key={index}
                        className="bg-[#161b22] rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-all relative"
                      >
                        {/* Botão de Link no canto superior direito */}
                        {grupo.link_convite && (
                          <button
                            onClick={() => handleOpenLink(grupo.link_convite!)}
                            className="absolute top-3 right-3 p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all"
                            title="Abrir link de convite"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        )}

                        {/* Nome do Grupo - vermelho se caído */}
                        <h4
                          className={`text-base font-medium mb-3 pr-10 ${
                            grupo.caido
                              ? 'text-red-400 font-semibold'
                              : 'text-gray-100'
                          }`}
                        >
                          {grupo.nome || `Grupo ${index + 1}`}
                          {grupo.caido && (
                            <span className="ml-2 text-xs text-red-500/80">(caído)</span>
                          )}
                        </h4>

                        {/* Informações do Grupo */}
                        <div className="space-y-2.5">
                          {/* Quantidade de Membros */}
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-green-500/10 rounded">
                              <Users className="w-3.5 h-3.5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase">Membros</p>
                              <p className="text-sm font-medium text-gray-300">
                                {grupo.membros || 0}
                              </p>
                            </div>
                          </div>

                          {/* Bot de Mídia */}
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-purple-500/10 rounded">
                              <Bot className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] text-gray-600 uppercase">Bot de Mídia</p>
                              <p className="text-sm font-medium text-gray-300">
                                {grupo.bot_midia_admin || (
                                  <span className="text-gray-600 italic">Nenhum</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Bots de Lista */}
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 bg-orange-500/10 rounded mt-0.5">
                              <List className="w-3.5 h-3.5 text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] text-gray-600 uppercase mb-1">
                                Bots de Lista 
                                {grupo.bots_lista_admin && grupo.bots_lista_admin.length > 0 && (
                                  <span className="ml-1 text-orange-400">
                                    ({grupo.bots_lista_admin.length})
                                  </span>
                                )}
                              </p>
                              {grupo.bots_lista_admin && grupo.bots_lista_admin.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {grupo.bots_lista_admin.map((bot, botIndex) => (
                                    <span
                                      key={botIndex}
                                      className="px-1.5 py-0.5 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded"
                                    >
                                      {bot}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600 italic">Nenhum</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#161b22] rounded-lg p-8 text-center border border-gray-800">
                  <p className="text-gray-500">Nenhum grupo encontrado para esta conta</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12">
              Nenhum detalhe encontrado
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

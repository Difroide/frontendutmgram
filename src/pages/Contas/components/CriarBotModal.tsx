import { X, Bot, FolderOpen, Loader2, ChevronLeft, DollarSign, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Conta } from '@/types/Conta'
import { ProxySelector } from '@/components/ProxySelector'

interface Categoria {
  id: string
  nome: string
  rodando?: boolean
}

interface CriarBotModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (botName: string, botUsername: string, fotoBase64: string | null, accountId: string, proxyId?: number | null, tipoBot?: 'vendas' | 'disparo', categoriaId?: string) => Promise<void>
  selectedContas: Conta[]
  onSuccess?: () => void // Callback chamado após criar todos os bots com sucesso
}

export const CriarBotModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedContas,
  onSuccess,
}: CriarBotModalProps) => {
  const [botName, setBotName] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [proxyId, setProxyId] = useState<number | null>(null)
  const [fotoInfo, setFotoInfo] = useState<string | null>(null)
  const [tipoBot, setTipoBot] = useState<'vendas' | 'disparo'>('vendas')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  
  // Estados para galeria de fotos
  const [showGaleria, setShowGaleria] = useState(false)
  const [fotosDisponiveis, setFotosDisponiveis] = useState<string[]>([])
  const [isLoadingFotos, setIsLoadingFotos] = useState(false)
  const [fotoSelecionadaIndex, setFotoSelecionadaIndex] = useState<number | null>(null)
  const [fotosPreview, setFotosPreview] = useState<Record<string, string>>({})

  // Carregar categorias ao abrir
  useEffect(() => {
    if (isOpen) {
      loadCategorias()
    }
  }, [isOpen])

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true)
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        const categoriasFiltradas = (data || []).filter((cat: Categoria) => !cat.rodando)
        setCategorias(categoriasFiltradas)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoadingCategorias(false)
    }
  }

  // Resetar quando modal fecha
  const handleClose = () => {
    if (!isProcessing) {
      setBotName('')
      setBotUsername('')
      setFotoPreview(null)
      setFotoBase64(null)
      setProxyId(null)
      setFotoInfo(null)
      setTipoBot('vendas')
      setCategoriaId('')
      setShowGaleria(false)
      setFotosDisponiveis([])
      setFotoSelecionadaIndex(null)
      setFotosPreview({})
      onClose()
    }
  }

  // Atalho ESC para fechar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) {
      if (showGaleria) {
        setShowGaleria(false)
      } else {
        handleClose()
      }
    }
  }

  // Abrir galeria de fotos da pasta configurada
  const handleAbrirGaleria = async () => {
    try {
      setIsLoadingFotos(true)
      setShowGaleria(true)
      
      if (!(window as any).electron?.utils?.listarFotosPasta) {
        alert('Função não disponível')
        setShowGaleria(false)
        return
      }
      
      const result = await (window as any).electron.utils.listarFotosPasta()
      
      if (!result.success) {
        alert(result.error || 'Erro ao listar fotos')
        setShowGaleria(false)
        return
      }
      
      setFotosDisponiveis(result.fotos)
      setIsLoadingFotos(false)
      
      // Carregar TODAS as fotos de forma assíncrona, mas sem bloquear a UI
      carregarFotosProgressivamente(result.fotos)
    } catch (error) {
      console.error('Erro ao abrir galeria:', error)
      alert('Erro ao abrir galeria de fotos')
      setShowGaleria(false)
      setIsLoadingFotos(false)
    }
  }

  // Carregar fotos progressivamente em lotes
  const carregarFotosProgressivamente = async (todasFotos: string[]) => {
    const LOTE_SIZE = 12 // Carregar 12 fotos por vez
    const previews: Record<string, string> = {}
    
    for (let i = 0; i < todasFotos.length; i += LOTE_SIZE) {
      const lote = todasFotos.slice(i, i + LOTE_SIZE)
      
      // Carregar lote em paralelo
      const promessas = lote.map(async (foto) => {
        try {
          const fotoResult = await (window as any).electron.utils.obterFotoEspecifica(null, foto)
          if (fotoResult.success) {
            return { foto, base64: fotoResult.fotoBase64 }
          }
        } catch (err) {
          console.error('Erro ao carregar preview:', foto, err)
        }
        return null
      })
      
      const resultados = await Promise.all(promessas)
      
      // Atualizar estado com as fotos carregadas neste lote
      resultados.forEach(resultado => {
        if (resultado) {
          previews[resultado.foto] = resultado.base64
        }
      })
      
      // Atualizar UI incrementalmente
      setFotosPreview({ ...previews })
      
      // Pequeno delay entre lotes para não travar a UI
      if (i + LOTE_SIZE < todasFotos.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  // Selecionar foto da galeria
  const handleSelecionarFotoDaGaleria = async (foto: string, index: number) => {
    try {
      setFotoSelecionadaIndex(index)
      
      // Se já temos o preview, usar ele
      if (fotosPreview[foto]) {
        setFotoBase64(fotosPreview[foto])
        setFotoPreview(fotosPreview[foto])
        setFotoInfo(`Foto: ${foto}`)
        setShowGaleria(false)
        return
      }
      
      // Caso contrário, carregar a foto
      const result = await (window as any).electron.utils.obterFotoEspecifica(null, foto)
      
      if (!result.success) {
        alert(result.error || 'Erro ao carregar foto')
        setFotoSelecionadaIndex(null)
        return
      }
      
      setFotoBase64(result.fotoBase64)
      setFotoPreview(result.fotoBase64)
      setFotoInfo(`Foto: ${result.fileName}`)
      setShowGaleria(false)
    } catch (error) {
      console.error('Erro ao selecionar foto:', error)
      alert('Erro ao carregar foto')
    } finally {
      setFotoSelecionadaIndex(null)
    }
  }

  // Remover foto
  const handleRemoveFoto = () => {
    setFotoPreview(null)
    setFotoBase64(null)
    setFotoInfo(null)
  }

  // Confirmar criação
  const handleConfirm = async () => {
    if (!botName.trim()) {
      alert('Por favor, preencha o nome do bot')
      return
    }

    if (!botUsername.trim()) {
      alert('Por favor, preencha o @ do bot')
      return
    }

    // Remover @ se o usuário digitou
    const usernameLimpo = botUsername.trim().replace(/^@/, '')

    if (selectedContas.length === 0) {
      alert('Por favor, selecione pelo menos uma conta')
      return
    }

    setIsProcessing(true)
    try {
      // Criar bot para cada conta selecionada
      for (const conta of selectedContas) {
        await onConfirm(botName, usernameLimpo, fotoBase64, conta.numero, proxyId, tipoBot, categoriaId || undefined)
      }
      // Chamar callback de sucesso antes de fechar (para navegar para aba de Bots)
      if (onSuccess) {
        onSuccess()
      }
      handleClose()
    } catch (error) {
      console.error('Erro ao criar bot:', error)
      alert(`Erro ao criar bot: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  // Renderizar galeria de fotos
  if (showGaleria) {
    return (
      <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="bg-[#161b22] rounded-xl border border-gray-800 shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGaleria(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-100">Selecionar Foto</h2>
              <span className="text-sm text-gray-500">({fotosDisponiveis.length} fotos)</span>
            </div>
            <button
              onClick={() => setShowGaleria(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingFotos ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500">Carregando fotos...</p>
              </div>
            ) : fotosDisponiveis.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 text-center">Nenhuma foto encontrada na pasta configurada</p>
                <p className="text-gray-600 text-sm mt-2">Configure a pasta em Configurações → Geral</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {fotosDisponiveis.map((foto, index) => (
                  <button
                    key={foto}
                    onClick={() => handleSelecionarFotoDaGaleria(foto, index)}
                    disabled={fotoSelecionadaIndex !== null}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      fotoSelecionadaIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-700 hover:border-blue-500/50'
                    }`}
                  >
                    {fotosPreview[foto] ? (
                      <img
                        src={fotosPreview[foto]}
                        alt={foto}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                      </div>
                    )}
                    {fotoSelecionadaIndex === index && (
                      <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
                      <p className="text-[10px] text-gray-400 truncate">{foto}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-[#161b22] rounded-xl border border-gray-800 shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-100">Criar Bot</h2>
          </div>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Criar bot para <span className="text-white font-medium">{selectedContas.length}</span>{' '}
            {selectedContas.length === 1 ? 'conta selecionada' : 'contas selecionadas'}.
          </p>

          {/* Nome do Bot */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 uppercase font-medium">
              Nome do Bot *
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-[#0d1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="ex: Meu Bot"
              autoFocus
            />
          </div>

          {/* @ do Bot */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 uppercase font-medium">
              @ do Bot *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                value={botUsername}
                onChange={(e) => setBotUsername(e.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, ''))}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-[#0d1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                placeholder="ex: meu_bot"
              />
            </div>
            <p className="text-xs text-gray-600">
              Apenas letras, números e underscore. O @ será adicionado automaticamente.
            </p>
          </div>

          {/* Foto do Bot */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 uppercase font-medium">
              Foto do Bot (Opcional)
            </label>
            {fotoPreview ? (
              <div className="relative">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg border border-gray-700"
                />
                <button
                  onClick={handleRemoveFoto}
                  disabled={isProcessing}
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
                {fotoInfo && (
                  <div className="absolute bottom-2 left-2 right-2 px-3 py-1 bg-black/70 rounded text-xs text-gray-400 truncate">
                    {fotoInfo}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleAbrirGaleria}
                disabled={isProcessing}
                className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-[#0d1117] border-2 border-dashed border-gray-700 text-gray-400 rounded-lg hover:border-blue-500/50 hover:text-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderOpen className="w-6 h-6" />
                <span className="text-sm font-medium">Escolher Foto</span>
                <span className="text-xs text-gray-600">Da pasta configurada</span>
              </button>
            )}
          </div>

          {/* Tipo de Bot */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 uppercase font-medium">
              Tipo de Bot *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoBot('vendas')}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  tipoBot === 'vendas' 
                    ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                    : 'bg-[#0d1117] border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Vendas</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoBot('disparo')}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  tipoBot === 'disparo' 
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                    : 'bg-[#0d1117] border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium">Disparo</span>
              </button>
            </div>
          </div>

          {/* Categoria (opcional) */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 uppercase font-medium">
              Categoria (Opcional)
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={isProcessing || loadingCategorias}
              className="w-full px-3 py-2 bg-[#0d1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm disabled:opacity-50"
            >
              <option value="">Nenhuma categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600">
              Vincule o bot a uma categoria para organizar
            </p>
          </div>

          {/* Lista de contas selecionadas */}
          <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-800 max-h-28 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2 uppercase font-medium">Contas selecionadas</p>
            <div className="space-y-1">
              {selectedContas.slice(0, 10).map((conta) => (
                <div key={conta.id} className="text-sm text-gray-400">
                  • {conta.numero}
                </div>
              ))}
              {selectedContas.length > 10 && (
                <div className="text-sm text-gray-600">
                  ... e mais {selectedContas.length - 10} conta(s)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seleção de Proxy */}
        <div className="pt-3 border-t border-gray-800">
          <ProxySelector
            selectedProxyId={proxyId}
            onSelect={setProxyId}
            label="Proxy (Opcional)"
            showDefault={true}
            disabled={isProcessing}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t border-gray-800">
          {!isProcessing ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-[#21262d] border border-gray-700 text-gray-300 rounded-lg hover:bg-[#21262d]/70 transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!botName.trim() || !botUsername.trim()}
                className="flex-1 px-4 py-2.5 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Bot
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 py-2.5">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">
                Criando bot{selectedContas.length > 1 ? 's' : ''}... Aguarde...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

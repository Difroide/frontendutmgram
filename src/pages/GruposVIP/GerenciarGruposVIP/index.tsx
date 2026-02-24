import { useState, useEffect, useRef } from 'react'
import {
  Crown,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  CheckCircle,
  Tag,
  Save,
  X,
  Calendar,
  User,
  Link as LinkIcon,
  MessageSquare,
  Hash,
  Plus,
  Play,
  FolderTree,
  UserPlus,
  AlertTriangle,
} from 'lucide-react'

interface GrupoVip {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  grupoId: string
  grupoAccessHash: string
  dataCriacao?: string
  tag?: string
  totalMensagens?: number
}

export default function GerenciarGruposVIP() {
  const [grupos, setGrupos] = useState<GrupoVip[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ nome: string; tag: string }>({ nome: '', tag: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Estados para modal de adicionar mídia
  const [showAddMidiaModal, setShowAddMidiaModal] = useState(false)
  const [grupoParaAdicionar, setGrupoParaAdicionar] = useState<GrupoVip | null>(null)
  const [linkOrigem, setLinkOrigem] = useState('')
  const [isClonando, setIsClonando] = useState(false)
  const [clonagemLogs, setClonagemLogs] = useState<string[]>([])
  const [criarTopicosAuto, setCriarTopicosAuto] = useState(true)
  const [midiasPorTopico, setMidiasPorTopico] = useState(2000)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Estados para modal de transferir posse
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [grupoParaTransferir, setGrupoParaTransferir] = useState<GrupoVip | null>(null)
  const [novoDonoUsername, setNovoDonoUsername] = useState('')
  const [isTransferindo, setIsTransferindo] = useState(false)

  // Scroll automático nos logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [clonagemLogs])

  // Listener para logs da clonagem
  useEffect(() => {
    const handleLog = (log: string) => {
      setClonagemLogs((prev) => [...prev, log])
    }

    window.electron?.onClonagemVipAvancadaLog?.(handleLog)

    return () => {
      window.electron?.offClonagemVipAvancadaLog?.()
    }
  }, [])

  const loadGrupos = async () => {
    setLoading(true)
    try {
      const result = await window.electron?.contingencia?.listarGruposVip?.()
      if (result?.success) {
        setGrupos(result.grupos || [])
      }
    } catch (error) {
      console.error('Erro ao carregar grupos VIP:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGrupos()
  }, [])

  const handleDelete = async (grupoId: string, grupoNome: string) => {
    if (!confirm(`Remover "${grupoNome}" da lista?\n\nIsso NÃO exclui o grupo do Telegram.`)) {
      return
    }

    try {
      const result = await window.electron?.contingencia?.removerGrupoVip?.(grupoId)
      if (result?.success) {
        setGrupos(grupos.filter((g) => g.grupoId !== grupoId))
      } else {
        alert(`Erro: ${result?.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao remover grupo:', error)
      alert('Erro ao remover grupo')
    }
  }

  const handleEdit = (grupo: GrupoVip) => {
    setEditingId(grupo.grupoId)
    setEditValues({ nome: grupo.grupoNome, tag: grupo.tag || '' })
  }

  const handleSave = async (grupoId: string) => {
    try {
      const result = await window.electron?.contingencia?.editarGrupoVip?.({
        grupoId,
        novoNome: editValues.nome,
        novaTag: editValues.tag,
      })
      if (result?.success) {
        setGrupos(grupos.map((g) => (g.grupoId === grupoId ? { ...g, grupoNome: editValues.nome, tag: editValues.tag } : g)))
        setEditingId(null)
      } else {
        alert(`Erro: ${result?.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar')
    }
  }

  const handleCopy = (text: string, grupoId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(grupoId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Abrir modal de adicionar mídia
  const handleOpenAddMidia = (grupo: GrupoVip) => {
    setGrupoParaAdicionar(grupo)
    setLinkOrigem('')
    setClonagemLogs([])
    setShowAddMidiaModal(true)
  }

  // Fechar modal
  const handleCloseAddMidia = () => {
    if (isClonando) {
      if (!confirm('A clonagem está em andamento. Deseja realmente fechar?')) {
        return
      }
    }
    setShowAddMidiaModal(false)
    setGrupoParaAdicionar(null)
    setLinkOrigem('')
    setClonagemLogs([])
  }

  // Abrir modal de transferir posse
  const handleOpenTransfer = (grupo: GrupoVip) => {
    setGrupoParaTransferir(grupo)
    setNovoDonoUsername('')
    setShowTransferModal(true)
  }

  // Executar transferência de posse
  const handleTransferirPosse = async () => {
    if (!grupoParaTransferir || !novoDonoUsername.trim()) {
      alert('Preencha o @ do novo dono')
      return
    }

    if (!confirm(`Tem certeza que deseja transferir a posse de "${grupoParaTransferir.grupoNome}" para @${novoDonoUsername.replace('@', '')}?\n\nISTO NÃO PODE SER DESFEITO!`)) {
      return
    }

    setIsTransferindo(true)

    try {
      const result = await window.electron?.contingencia?.transferirPosseVip?.({
        grupoId: grupoParaTransferir.grupoId,
        sessionPath: grupoParaTransferir.sessionPath,
        novoDonoUsername: novoDonoUsername.trim(),
      })

      if (result?.success) {
        alert(result.message || 'Posse transferida com sucesso!')
        setShowTransferModal(false)
        loadGrupos()
      } else {
        alert(`Erro: ${result?.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao transferir posse:', error)
      alert('Erro ao transferir posse')
    } finally {
      setIsTransferindo(false)
    }
  }

  // Executar adição de mídias
  const handleAdicionarMidias = async () => {
    if (!grupoParaAdicionar || !linkOrigem.trim()) {
      alert('Preencha o link do grupo de origem')
      return
    }

    setIsClonando(true)
    setClonagemLogs(['Iniciando adição de mídias...'])

    try {
      const result = await window.electron?.contingencia?.adicionarMidiasVip?.({
        sessionPath: grupoParaAdicionar.sessionPath,
        sourceLink: linkOrigem.trim(),
        grupoDestinoId: grupoParaAdicionar.grupoId,
        grupoDestinoAccessHash: grupoParaAdicionar.grupoAccessHash,
        clonarTopicos: true,
        criarTopicosAuto,
        midiasPorTopico,
        retomar: false,
      })

      if (result?.success) {
        setClonagemLogs((prev) => [...prev, `✅ Concluído! ${result.totalMensagens || 0} mídias adicionadas.`])
        loadGrupos() // Recarregar para atualizar contagem
        alert(`Sucesso! ${result.totalMensagens || 0} mídias adicionadas ao grupo.`)
      } else {
        setClonagemLogs((prev) => [...prev, `❌ Erro: ${result?.error || 'Erro desconhecido'}`])
        alert(`Erro: ${result?.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao adicionar mídias:', error)
      setClonagemLogs((prev) => [...prev, `❌ Erro: ${error instanceof Error ? error.message : 'Erro'}`])
      alert('Erro ao adicionar mídias')
    } finally {
      setIsClonando(false)
    }
  }

  const filteredGrupos = searchTerm
    ? grupos.filter((g) => {
        const searchLower = searchTerm.toLowerCase()
        return g.grupoNome.toLowerCase().includes(searchLower) || g.sessionName?.toLowerCase().includes(searchLower) || g.tag?.toLowerCase().includes(searchLower) || g.groupLink?.toLowerCase().includes(searchLower)
      })
    : grupos

  const totalMensagens = grupos.reduce((acc, g) => acc + (g.totalMensagens || 0), 0)
  const sessoesUnicas = new Set(grupos.map((g) => g.sessionName)).size

  return (
    <div className="min-h-screen -m-6 p-6 bg-[#0d1117]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Crown className="w-6 h-6 text-gray-400" />
              Gerenciar Grupos VIP
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Visualize e gerencie seus grupos clonados</p>
          </div>

          {/* Estatísticas */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-xl font-semibold text-white">{grupos.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Grupos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-emerald-400">{totalMensagens.toLocaleString()}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Mensagens</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-blue-400">{sessoesUnicas}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Sessões</div>
            </div>
          </div>

          <button
            onClick={loadGrupos}
            disabled={loading}
            className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] text-gray-300 text-sm border border-gray-700/50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, sessão ou tag..."
            className="w-full pl-10 pr-4 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Lista de Grupos */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : filteredGrupos.length === 0 ? (
        <div className="bg-[#161b22] rounded-lg border border-gray-800 p-8 text-center">
          <Crown className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-2">{grupos.length === 0 ? 'Nenhum grupo VIP' : 'Nenhum resultado'}</h3>
          <p className="text-sm text-gray-500">{grupos.length === 0 ? 'Use o Clonador VIP para criar grupos' : 'Tente ajustar a busca'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGrupos.map((grupo) => (
            <div key={grupo.grupoId} className="bg-[#161b22] rounded-lg border border-gray-800 overflow-hidden">
              {editingId === grupo.grupoId ? (
                // Modo edição
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Nome</label>
                      <input
                        type="text"
                        value={editValues.nome}
                        onChange={(e) => setEditValues({ ...editValues, nome: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Tag</label>
                      <input
                        type="text"
                        value={editValues.tag}
                        onChange={(e) => setEditValues({ ...editValues, tag: e.target.value })}
                        placeholder="marketing, curso..."
                        className="w-full px-3 py-2 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors">
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                    <button onClick={() => handleSave(grupo.grupoId)} className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg flex items-center gap-2 transition-colors">
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualização
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Nome e Tag */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-100 truncate">{grupo.grupoNome}</h3>
                        {grupo.tag && <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{grupo.tag}</span>}
                      </div>

                      {/* Detalhes */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {grupo.sessionName}
                        </span>

                        {grupo.totalMensagens !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {grupo.totalMensagens?.toLocaleString()} msgs
                          </span>
                        )}

                        {grupo.dataCriacao && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(grupo.dataCriacao).toLocaleDateString('pt-BR')}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          {grupo.grupoId}
                        </span>
                      </div>

                      {/* Link */}
                      <div className="mt-2 flex items-center gap-2">
                        <LinkIcon className="w-3.5 h-3.5 text-gray-500" />
                        <a href={grupo.groupLink} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 truncate">
                          {grupo.groupLink}
                        </a>
                        <button
                          onClick={() => handleCopy(grupo.groupLink, grupo.grupoId)}
                          className="p-1 hover:bg-[#21262d] rounded transition-colors"
                          title="Copiar link"
                        >
                          {copiedId === grupo.grupoId ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAddMidia(grupo)}
                        className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-emerald-400 rounded-lg transition-colors"
                        title="Adicionar Mídias"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenTransfer(grupo)}
                        className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                        title="Transferir Posse"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <a
                        href={grupo.groupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                        title="Abrir no Telegram"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => handleEdit(grupo)} className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-amber-400 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(grupo.grupoId, grupo.grupoNome)}
                        className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Transferir Posse */}
      {showTransferModal && grupoParaTransferir && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] rounded-xl border border-gray-800 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-medium text-gray-100">Transferir Posse</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-[#21262d] rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Aviso */}
              <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="font-medium mb-1">Atenção!</p>
                  <p>Esta ação transfere a propriedade do grupo para outro usuário. Você perderá o controle total do grupo e NÃO poderá desfazer esta ação.</p>
                </div>
              </div>

              {/* Info do grupo */}
              <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-700/50">
                <div className="text-sm text-gray-300 mb-1">Grupo:</div>
                <div className="text-sm text-white font-medium">{grupoParaTransferir.grupoNome}</div>
              </div>

              {/* Input do novo dono */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">@ do novo dono</label>
                <input
                  type="text"
                  value={novoDonoUsername}
                  onChange={(e) => setNovoDonoUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                  disabled={isTransferindo}
                />
                <p className="text-xs text-gray-600 mt-1">O usuário precisa ser membro do grupo</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex gap-2 justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={isTransferindo}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferirPosse}
                disabled={isTransferindo || !novoDonoUsername.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransferindo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Transferir Posse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Mídias */}
      {showAddMidiaModal && grupoParaAdicionar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-100">Adicionar Mídias</h3>
                <p className="text-xs text-gray-500 mt-0.5">Destino: {grupoParaAdicionar.grupoNome}</p>
              </div>
              <button onClick={handleCloseAddMidia} className="p-2 hover:bg-[#21262d] rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Info da sessão */}
              <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>Sessão:</span>
                  <span className="font-mono text-emerald-400">{grupoParaAdicionar.sessionName}</span>
                </div>
              </div>

              {/* Link de origem */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Link do Grupo/Canal de Origem</label>
                <input
                  type="text"
                  value={linkOrigem}
                  onChange={(e) => setLinkOrigem(e.target.value)}
                  placeholder="https://t.me/+abc123 ou @canal"
                  className="w-full px-3 py-2.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 placeholder-gray-500"
                  disabled={isClonando}
                />
                <p className="text-xs text-gray-600 mt-1">Cole o link do grupo/canal de onde as mídias serão copiadas</p>
              </div>

              {/* Opções de tópicos */}
              <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-300">Criar tópicos automaticamente</span>
                  </div>
                  <button
                    onClick={() => setCriarTopicosAuto(!criarTopicosAuto)}
                    disabled={isClonando}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                      criarTopicosAuto ? 'bg-emerald-600' : 'bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${criarTopicosAuto ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {criarTopicosAuto && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Mídias por tópico</label>
                    <input
                      type="number"
                      value={midiasPorTopico}
                      onChange={(e) => setMidiasPorTopico(Math.max(100, parseInt(e.target.value) || 2000))}
                      className="w-full px-3 py-2 bg-[#161b22] text-gray-200 text-sm border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600"
                      disabled={isClonando}
                      min={100}
                      step={100}
                    />
                  </div>
                )}
              </div>

              {/* Logs */}
              {clonagemLogs.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Logs</label>
                  <div className="bg-[#0d1117] rounded-lg p-3 border border-gray-700/50 h-48 overflow-y-auto font-mono text-xs">
                    {clonagemLogs.map((log, i) => (
                      <div key={i} className={`py-0.5 ${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-red-400' : 'text-gray-400'}`}>
                        {log}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex gap-2 justify-end">
              <button
                onClick={handleCloseAddMidia}
                disabled={isClonando}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Fechar
              </button>
              <button
                onClick={handleAdicionarMidias}
                disabled={isClonando || !linkOrigem.trim()}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClonando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Clonando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Iniciar Clonagem
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

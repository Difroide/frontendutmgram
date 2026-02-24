import { 
  X, 
  Star, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Code,
  Loader2,
  Settings,
  Tag,
  FolderOpen,
  Sparkles
} from 'lucide-react'
import React, { useState, useEffect, useMemo, useRef } from 'react'

interface ListaBotsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (listName: string, bots: string[], prioritaria: boolean) => void
  lista?: { listName: string; bots: string[]; prioritaria?: boolean } | null
  isEdit?: boolean
  forcarPrioritaria?: boolean
  forcarNormal?: boolean
}

interface Categoria {
  id: string
  nome: string
  descricao?: string
  rodando?: boolean
}

export const ListaBotsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  lista, 
  isEdit = false, 
  forcarPrioritaria = false, 
  forcarNormal = false 
}: ListaBotsModalProps) => {
  const [prioritaria, setPrioritaria] = useState<boolean>(lista?.prioritaria || false)
  const [botsText, setBotsText] = useState<string>('')
  const [delimitador, setDelimitador] = useState<string>('\n')
  const [ignorarDuplicados, setIgnorarDuplicados] = useState<boolean>(true)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (lista) {
      setPrioritaria(lista.prioritaria || false)
      setBotsText(lista.bots.map(bot => `@${bot}`).join('\n'))
    } else if (forcarPrioritaria) {
      setPrioritaria(true)
    } else if (forcarNormal) {
      setPrioritaria(false)
    } else {
      setPrioritaria(false)
    }
    if (!isEdit) {
      setBotsText('')
    }
  }, [lista, isOpen, forcarPrioritaria, forcarNormal, isEdit])

  useEffect(() => {
    if (isOpen) {
      loadCategorias()
    }
  }, [isOpen])

  const loadCategorias = async () => {
    try {
      if ((window as any).electron?.criador?.carregarCategorias) {
        const data = await (window as any).electron.criador.carregarCategorias()
        const categoriasFiltradas = (data || []).filter((cat: Categoria) => !cat.rodando)
        setCategorias(categoriasFiltradas)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  // Processar texto e gerar preview em tempo real
  const previewData = useMemo(() => {
    if (!botsText.trim()) {
      return {
        total: 0,
        validos: 0,
        duplicados: 0,
        invalidos: 0,
        numeros: []
      }
    }

    const linhas = botsText.split(delimitador === '\n' ? /\r?\n/ : delimitador)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const numeros = linhas.map(line => {
      const botName = line.replace(/^@/, '').trim()
      return botName
    }).filter(bot => bot.length > 0)

    const unicos = ignorarDuplicados ? Array.from(new Set(numeros)) : numeros
    const duplicados = ignorarDuplicados ? numeros.length - unicos.length : 0

    return {
      total: linhas.length,
      validos: unicos.length,
      duplicados: duplicados,
      invalidos: linhas.length - numeros.length,
      numeros: unicos
    }
  }, [botsText, delimitador, ignorarDuplicados])

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text()
      setBotsText(text)
    } catch (error) {
      console.error('Erro ao ler arquivo:', error)
      alert('Erro ao ler arquivo. Verifique o formato.')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt'))) {
      handleFileUpload(file)
    } else {
      alert('Por favor, selecione um arquivo de texto (.txt)')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Calcular número de linhas para numeração
  const lineCount = useMemo(() => {
    return Math.max(botsText.split(/\r?\n/).length, 1)
  }, [botsText])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const botsList = previewData.numeros

    if (botsList.length === 0) {
      alert('Adicione pelo menos um @ de bot de lista')
      return
    }

    onSave('', botsList, prioritaria)
    if (!isEdit) {
      setBotsText('')
      setPrioritaria(false)
    }
  }

  if (!isOpen) return null

  const isReady = previewData.validos > 0

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-[#0b0e14] border border-slate-800/60 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-7xl h-full sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header - Compacto */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-slate-800/60 flex-shrink-0 bg-[#11151d]/50">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 truncate">
                {isEdit ? 'Editar Lista' : 'Adicionar Lista'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Importe ou cole os @ de bots de lista
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors p-1.5 hover:bg-slate-800/50 rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content - Layout Duas Colunas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          {/* Coluna Esquerda (60%) - Área de Input */}
          <div className="flex-1 sm:flex-[0.6] p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 border-b sm:border-b-0 sm:border-r border-slate-800/60">
            {/* Drag & Drop Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Upload de Arquivo
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-all
                  ${isDragging
                    ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-slate-800/60 hover:border-slate-700/60 bg-black/40'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <UploadCloud className={`
                  w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 transition-transform
                  ${isDragging ? 'text-blue-400 animate-bounce' : 'text-slate-600'}
                `} />
                <p className="text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-500">
                  Arquivos .txt são suportados
                </p>
              </div>
            </div>

            {/* Terminal de Código - Textarea com Numeração */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Lista de Bots
              </label>
              <div className="relative bg-black/40 border border-slate-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all">
                {/* Numeração de Linhas */}
                <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 bg-slate-900/50 border-r border-slate-800/60 flex flex-col items-end pr-2 py-2 text-xs text-slate-500 font-mono select-none overflow-hidden">
                  {Array.from({ length: Math.max(lineCount, 15) }, (_, i) => (
                    <div key={i} className="leading-5 sm:leading-6 text-[10px] sm:text-xs">
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={botsText}
                  onChange={(e) => setBotsText(e.target.value)}
                  rows={12}
                  className="w-full pl-11 sm:pl-14 pr-3 sm:pr-4 py-2 bg-transparent text-slate-200 font-mono text-xs sm:text-sm resize-none focus:outline-none leading-5 sm:leading-6"
                  placeholder="Cole os @ de bots de lista (um por linha):&#10;@Villanprivlis_bot&#10;@ArchlistaDivulgabot&#10;@HeroListas_bot&#10;..."
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {isEdit 
                  ? 'Edite o @ da lista. Cada @ é uma lista separada.'
                  : 'Cada @ será cadastrado como uma lista separada.'}
              </p>
            </div>
          </div>

          {/* Coluna Direita (40%) - Configurações e Resumo */}
          <div className="flex-1 sm:flex-[0.4] p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 bg-[#11151d]/30">
            {/* Status de Processamento em Tempo Real */}
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-200">Status de Processamento</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-800/30 rounded border border-slate-800/40">
                  <div className="text-xs text-slate-400 mb-0.5">Total</div>
                  <div className="text-sm sm:text-base font-bold text-slate-200">{previewData.total}</div>
                </div>
                <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                  <div className="text-xs text-slate-400 mb-0.5">Válidos</div>
                  <div className="text-sm sm:text-base font-bold text-green-400">{previewData.validos}</div>
                </div>
                {previewData.duplicados > 0 && (
                  <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                    <div className="text-xs text-slate-400 mb-0.5">Duplicados</div>
                    <div className="text-sm sm:text-base font-bold text-yellow-400">{previewData.duplicados}</div>
                  </div>
                )}
                {previewData.invalidos > 0 && (
                  <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                    <div className="text-xs text-slate-400 mb-0.5">Inválidos</div>
                    <div className="text-sm sm:text-base font-bold text-red-400">{previewData.invalidos}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Cards de Configuração - Glass Effect */}
            <div className="space-y-3">
              {/* Delimitador */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <label className="text-xs font-semibold text-slate-400">Delimitador</label>
                </div>
                <select
                  value={delimitador}
                  onChange={(e) => setDelimitador(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                >
                  <option value="\n">Quebra de linha</option>
                  <option value=",">Vírgula</option>
                  <option value=";">Ponto e vírgula</option>
                  <option value=" ">Espaço</option>
                </select>
              </div>

              {/* Ignorar Duplicados */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <label className="text-xs font-semibold text-slate-400">Ignorar Duplicados</label>
                </div>
                <button
                  type="button"
                  onClick={() => setIgnorarDuplicados(!ignorarDuplicados)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border transition-all ${
                    ignorarDuplicados
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-black/40 border-slate-800/60 text-slate-300'
                  }`}
                >
                  {ignorarDuplicados ? 'Sim' : 'Não'}
                </button>
              </div>

              {/* Categoria */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <label className="text-xs font-semibold text-slate-400">Categoria (Opcional)</label>
                </div>
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-black/40 border border-slate-800/60 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                >
                  <option value="">Nenhuma</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista Prioritária */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                  <label className="text-xs font-semibold text-slate-400">Tipo de Lista</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="prioritaria"
                    checked={prioritaria}
                    onChange={(e) => setPrioritaria(e.target.checked)}
                    disabled={forcarPrioritaria || forcarNormal}
                    className="w-4 h-4 text-blue-600 bg-black/40 border-slate-700 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label htmlFor="prioritaria" className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 cursor-pointer flex-1">
                    <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${prioritaria ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                    <span>Lista Prioritária</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {forcarPrioritaria 
                    ? 'Esta será uma lista prioritária' 
                    : forcarNormal 
                    ? 'Esta será uma lista normal'
                    : 'Listas prioritárias são adicionadas primeiro'}
                </p>
              </div>
            </div>

            {/* Botão de Importar - Gradiente com Efeito Pulsante */}
            <div className="pt-3 border-t border-slate-800/60">
              <button
                type="submit"
                disabled={!isReady}
                className={`
                  w-full px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all relative overflow-hidden
                  ${isReady
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }
                `}
              >
                {isReady ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Importar {previewData.validos} Lista(s)
                  </span>
                ) : (
                  <span className="relative z-10">Adicione números válidos</span>
                )}
                {isReady && (
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 hover:opacity-100 transition-opacity animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 px-4 py-2 text-xs sm:text-sm bg-slate-800/50 border border-slate-800/60 text-slate-300 rounded-lg hover:border-slate-700 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

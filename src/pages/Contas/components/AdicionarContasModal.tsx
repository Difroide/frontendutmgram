import { X, FileText, FolderOpen, Loader2, CheckCircle2, AlertCircle, Plus, Check, Smartphone, ArrowLeft, KeyRound, ShieldCheck, Download } from 'lucide-react'
import { useState, useEffect } from 'react'

interface AdicionarContasModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type ImportType = 'session' | 'portatil' | 'login' | 'mega' | null
type LoginStep = 'numero' | 'codigo' | 'senha' | 'loading' | 'success'

interface SessionFile {
  path: string
  name: string
  folder: string
}

interface TagConfig {
  id: string
  nome: string
  cor: string
  descricao: string
  isSystem?: boolean
}

interface LoginState {
  step: LoginStep
  loginId: string | null
  phoneNumber: string
  phoneCode: string
  password: string
  error: string | null
  isLoading: boolean
  accountInfo: {
    accountNumber: string
    firstName: string
    lastName: string
    username: string
  } | null
}

export const AdicionarContasModal = ({ isOpen, onClose, onSuccess }: AdicionarContasModalProps) => {
  const [importType, setImportType] = useState<ImportType>(null)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [sessionsFound, setSessionsFound] = useState<SessionFile[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<TagConfig[]>([])
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null)
  const [mostrarCriarTag, setMostrarCriarTag] = useState(false)
  const [novaTag, setNovaTag] = useState({ nome: '', cor: '#6b7280', descricao: '' })
  const [criandoTag, setCriandoTag] = useState(false)
  const [listaLinksMega, setListaLinksMega] = useState<string>('')
  const [isBaixandoMega, setIsBaixandoMega] = useState(false)
  const [adicionarExtrasMega, setAdicionarExtrasMega] = useState(false)
  
  // Estado do Login Manual
  const [loginState, setLoginState] = useState<LoginState>({
    step: 'numero',
    loginId: null,
    phoneNumber: '',
    phoneCode: '',
    password: '',
    error: null,
    isLoading: false,
    accountInfo: null,
  })

  const loadTags = async () => {
    try {
      if (!(window as any).electron?.tags?.carregarTodas) return
      const result = await (window as any).electron.tags.carregarTodas()
      if (result.success) setTags(result.tags || [])
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTags()
      setTagSelecionada(null)
      setMostrarCriarTag(false)
      setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
      setListaLinksMega('')
      setIsBaixandoMega(false)
      // Reset login state
      setLoginState({
        step: 'numero',
        loginId: null,
        phoneNumber: '',
        phoneCode: '',
        password: '',
        error: null,
        isLoading: false,
        accountInfo: null,
      })
    }
  }, [isOpen])

  const handleCriarTag = async () => {
    if (!novaTag.nome.trim()) {
      alert('Digite um nome para a tag')
      return
    }
    setCriandoTag(true)
    try {
      if (!(window as any).electron?.tags?.criar) {
        alert('API não disponível')
        return
      }
      const result = await (window as any).electron.tags.criar(novaTag)
      if (result.success && result.tag) {
        await loadTags()
        setTagSelecionada(result.tag.nome)
        setMostrarCriarTag(false)
        setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
      } else {
        alert('Erro ao criar tag: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error)
      alert('Erro ao criar tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setCriandoTag(false)
    }
  }

  const handleSelectType = (type: ImportType) => {
    setImportType(type)
    setSelectedPath('')
    setSessionsFound([])
    setListaLinksMega('')
    setError(null)
    // Reset login state when changing type
    if (type === 'login') {
      setLoginState({
        step: 'numero',
        loginId: null,
        phoneNumber: '',
        phoneCode: '',
        password: '',
        error: null,
        isLoading: false,
        accountInfo: null,
      })
    }
  }

  const handleSelectFolder = async () => {
    try {
      if (!(window as any).electron?.utils?.selecionarPasta) {
        alert('API não disponível')
        return
      }
      const folderPath = await (window as any).electron.utils.selecionarPasta()
      if (!folderPath) return
      setSelectedPath(folderPath)
      setSessionsFound([])
      setError(null)
      if (importType === 'session') {
        await scanForSessions(folderPath)
      }
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error)
      setError('Erro ao selecionar pasta: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const scanForSessions = async (folderPath: string) => {
    setIsScanning(true)
    setError(null)
    try {
      if (!(window as any).electron?.telegram?.buscarSessoesRecursivamente) {
        throw new Error('API de busca recursiva não disponível')
      }
      const result = await (window as any).electron.telegram.buscarSessoesRecursivamente(folderPath)
      if (result.success && result.sessoes) {
        setSessionsFound(result.sessoes)
      } else {
        setError(result.error || 'Nenhuma sessão encontrada')
        setSessionsFound([])
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
      setError('Erro ao buscar sessões: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
      setSessionsFound([])
    } finally {
      setIsScanning(false)
    }
  }

  const handleImport = async () => {
    if (!importType || !selectedPath) {
      setError('Selecione um tipo de importação e uma pasta')
      return
    }
    if (importType === 'session' && sessionsFound.length === 0) {
      setError('Nenhuma sessão encontrada para importar')
      return
    }
    setIsImporting(true)
    setError(null)
    try {
      let result
      if (importType === 'session') {
        if (!(window as any).electron?.telegram?.importarSessoes) {
          throw new Error('API de importação de sessões não disponível')
        }
        const sessionPaths = sessionsFound.map((s) => s.path)
        result = await (window as any).electron.telegram.importarSessoes(sessionPaths, tagSelecionada)
      } else {
        if (!(window as any).electron?.telegram?.importarPastaPortatil) {
          throw new Error('API de importação portátil não disponível')
        }
        result = await (window as any).electron.telegram.importarPastaPortatil(selectedPath, tagSelecionada)
      }
      if (result.success) {
        const count = result.contasImportadas?.length || 0
        alert(`${count} conta(s) importada(s) com sucesso!`)
        handleClose()
        onSuccess()
      } else {
        setError(result.error || 'Erro ao importar contas')
      }
    } catch (error) {
      console.error('Erro ao importar:', error)
      setError('Erro ao importar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsImporting(false)
    }
  }

  // ========== HANDLERS DE LOGIN MANUAL ==========
  
  const handleLoginSendCode = async () => {
    if (!loginState.phoneNumber.trim()) {
      setLoginState(prev => ({ ...prev, error: 'Digite o número de telefone' }))
      return
    }
    
    setLoginState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      if (!(window as any).electron?.telegram?.loginSendCode) {
        throw new Error('API de login não disponível')
      }
      
      const result = await (window as any).electron.telegram.loginSendCode(loginState.phoneNumber)
      
      if (result.success) {
        setLoginState(prev => ({
          ...prev,
          loginId: result.loginId,
          phoneNumber: result.phoneNumber,
          step: 'codigo',
          isLoading: false,
          error: null,
        }))
      } else {
        setLoginState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Erro ao enviar código',
        }))
      }
    } catch (error) {
      setLoginState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }))
    }
  }
  
  const handleLoginVerifyCode = async () => {
    if (!loginState.phoneCode.trim()) {
      setLoginState(prev => ({ ...prev, error: 'Digite o código de verificação' }))
      return
    }
    
    setLoginState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      if (!(window as any).electron?.telegram?.loginVerifyCode) {
        throw new Error('API de login não disponível')
      }
      
      const result = await (window as any).electron.telegram.loginVerifyCode(
        loginState.loginId,
        loginState.phoneCode
      )
      
      if (result.success) {
        // Login bem sucedido!
        setLoginState(prev => ({
          ...prev,
          step: 'success',
          isLoading: false,
          accountInfo: {
            accountNumber: result.accountNumber,
            firstName: result.firstName,
            lastName: result.lastName,
            username: result.username,
          },
        }))
        
        // Adicionar tag se selecionada
        if (tagSelecionada && result.accountNumber) {
          try {
            await (window as any).electron.telegram.loginAddTag(result.accountNumber, tagSelecionada)
          } catch (tagError) {
            console.error('Erro ao adicionar tag:', tagError)
          }
        }
      } else if (result.needsPassword) {
        // Precisa de senha 2FA
        setLoginState(prev => ({
          ...prev,
          step: 'senha',
          isLoading: false,
          error: null,
        }))
      } else {
        setLoginState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Código inválido',
        }))
      }
    } catch (error) {
      setLoginState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }))
    }
  }
  
  const handleLoginPassword = async () => {
    if (!loginState.password.trim()) {
      setLoginState(prev => ({ ...prev, error: 'Digite sua senha' }))
      return
    }
    
    setLoginState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      if (!(window as any).electron?.telegram?.loginPassword) {
        throw new Error('API de login não disponível')
      }
      
      const result = await (window as any).electron.telegram.loginPassword(
        loginState.loginId,
        loginState.password
      )
      
      if (result.success) {
        // Login bem sucedido!
        setLoginState(prev => ({
          ...prev,
          step: 'success',
          isLoading: false,
          accountInfo: {
            accountNumber: result.accountNumber,
            firstName: result.firstName,
            lastName: result.lastName,
            username: result.username,
          },
        }))
        
        // Adicionar tag se selecionada
        if (tagSelecionada && result.accountNumber) {
          try {
            await (window as any).electron.telegram.loginAddTag(result.accountNumber, tagSelecionada)
          } catch (tagError) {
            console.error('Erro ao adicionar tag:', tagError)
          }
        }
      } else {
        setLoginState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Senha incorreta',
        }))
      }
    } catch (error) {
      setLoginState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }))
    }
  }
  
  const handleLoginBack = () => {
    if (loginState.step === 'codigo') {
      // Cancelar login e voltar para número
      if (loginState.loginId && (window as any).electron?.telegram?.loginCancel) {
        (window as any).electron.telegram.loginCancel(loginState.loginId)
      }
      setLoginState(prev => ({
        ...prev,
        step: 'numero',
        loginId: null,
        phoneCode: '',
        error: null,
      }))
    } else if (loginState.step === 'senha') {
      // Voltar para código (não cancela login)
      setLoginState(prev => ({
        ...prev,
        step: 'codigo',
        password: '',
        error: null,
      }))
    }
  }
  
  const handleLoginFinish = () => {
    handleClose()
    onSuccess()
  }

  const handleClose = () => {
    // Cancelar login em andamento se houver
    if (loginState.loginId && (window as any).electron?.telegram?.loginCancel) {
      (window as any).electron.telegram.loginCancel(loginState.loginId)
    }
    
    setImportType(null)
    setSelectedPath('')
    setSessionsFound([])
    setError(null)
    setIsScanning(false)
    setIsImporting(false)
    setTagSelecionada(null)
    setMostrarCriarTag(false)
    setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
    setListaLinksMega('')
    setIsBaixandoMega(false)
    setAdicionarExtrasMega(false)
    setLoginState({
      step: 'numero',
      loginId: null,
      phoneNumber: '',
      phoneCode: '',
      password: '',
      error: null,
      isLoading: false,
      accountInfo: null,
    })
    onClose()
  }

  const handleBaixarEImportarMega = async () => {
    const urls = listaLinksMega
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && (s.includes('mega.nz') || s.includes('mega.co.nz')))
    if (urls.length === 0) {
      setError('Cole pelo menos um link MEGA.nz válido (um por linha).')
      return
    }
    setIsBaixandoMega(true)
    setError(null)
    try {
      if (!(window as any).electron?.telegram?.baixarLinksMega) {
        throw new Error('API de download MEGA não disponível')
      }
      const result = await (window as any).electron.telegram.baixarLinksMega({ urls, adicionarExtras: adicionarExtrasMega })
      if (result.success) {
        const count = result.sucesso ?? 0
        alert(count > 0
          ? `Download concluído. ${count} link(s) salvo(s) em C:\\Users\\Samuel\\Downloads\\numeros (ou na pasta configurada). As pastas foram nomeadas com o número da conta quando possível.`
          : 'Download concluído.')
        handleClose()
        onSuccess()
      } else {
        const msg = result.error || (result.erros?.length ? result.erros.join('\n') : 'Erro ao baixar.')
        setError(msg)
      }
    } catch (err) {
      console.error('Erro ao baixar/importar MEGA:', err)
      setError(err instanceof Error ? err.message : 'Erro ao baixar ou importar.')
    } finally {
      setIsBaixandoMega(false)
    }
  }

  if (!isOpen) return null

  // ========== RENDERIZAÇÃO DO WIZARD DE LOGIN ==========
  const renderLoginWizard = () => {
    switch (loginState.step) {
      case 'numero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Número de Telefone</label>
              <input
                type="tel"
                value={loginState.phoneNumber}
                onChange={(e) => setLoginState(prev => ({ ...prev, phoneNumber: e.target.value, error: null }))}
                placeholder="+5511999999999"
                disabled={loginState.isLoading}
                className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Use o formato internacional com o código do país (ex: +55 para Brasil)
              </p>
            </div>
            
            {loginState.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{loginState.error}</p>
              </div>
            )}
          </div>
        )
        
      case 'codigo':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleLoginBack}
                disabled={loginState.isLoading}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">Voltar</span>
            </div>
            
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-400">
                Enviamos um código de verificação para <span className="font-medium">{loginState.phoneNumber}</span>
              </p>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Código de Verificação</label>
              <input
                type="text"
                value={loginState.phoneCode}
                onChange={(e) => setLoginState(prev => ({ ...prev, phoneCode: e.target.value, error: null }))}
                placeholder="12345"
                disabled={loginState.isLoading}
                maxLength={6}
                className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm text-center tracking-widest font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Verifique o código no seu Telegram ou SMS
              </p>
            </div>
            
            {loginState.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{loginState.error}</p>
              </div>
            )}
          </div>
        )
        
      case 'senha':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleLoginBack}
                disabled={loginState.isLoading}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">Voltar</span>
            </div>
            
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                Esta conta possui verificação em duas etapas. Digite sua senha para continuar.
              </p>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Senha 2FA</label>
              <input
                type="password"
                value={loginState.password}
                onChange={(e) => setLoginState(prev => ({ ...prev, password: e.target.value, error: null }))}
                placeholder="Sua senha de verificação em duas etapas"
                disabled={loginState.isLoading}
                className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                autoFocus
              />
            </div>
            
            {loginState.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{loginState.error}</p>
              </div>
            )}
          </div>
        )
        
      case 'success':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-1">Login Realizado!</h3>
              <p className="text-sm text-gray-400 text-center">
                Conta adicionada com sucesso
              </p>
            </div>
            
            {loginState.accountInfo && (
              <div className="p-4 bg-[#0d1117] border border-gray-800 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Número:</span>
                  <span className="text-xs text-gray-300 font-mono">+{loginState.accountInfo.accountNumber}</span>
                </div>
                {loginState.accountInfo.firstName && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Nome:</span>
                    <span className="text-xs text-gray-300">
                      {loginState.accountInfo.firstName} {loginState.accountInfo.lastName}
                    </span>
                  </div>
                )}
                {loginState.accountInfo.username && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Username:</span>
                    <span className="text-xs text-gray-300">@{loginState.accountInfo.username}</span>
                  </div>
                )}
                {tagSelecionada && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Tag:</span>
                    <span className="text-xs text-gray-300">{tagSelecionada}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
        
      default:
        return null
    }
  }
  
  const getLoginButtonConfig = () => {
    switch (loginState.step) {
      case 'numero':
        return {
          text: loginState.isLoading ? 'Enviando...' : 'Enviar Código',
          onClick: handleLoginSendCode,
          disabled: loginState.isLoading || !loginState.phoneNumber.trim(),
          icon: loginState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />,
        }
      case 'codigo':
        return {
          text: loginState.isLoading ? 'Verificando...' : 'Verificar Código',
          onClick: handleLoginVerifyCode,
          disabled: loginState.isLoading || !loginState.phoneCode.trim(),
          icon: loginState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />,
        }
      case 'senha':
        return {
          text: loginState.isLoading ? 'Verificando...' : 'Confirmar Senha',
          onClick: handleLoginPassword,
          disabled: loginState.isLoading || !loginState.password.trim(),
          icon: loginState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />,
        }
      case 'success':
        return {
          text: 'Concluir',
          onClick: handleLoginFinish,
          disabled: false,
          icon: <CheckCircle2 className="w-4 h-4" />,
        }
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl border border-gray-700 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Adicionar Contas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {importType === 'login'
                ? `Login Manual - ${loginState.step === 'numero' ? 'Passo 1: Número' : loginState.step === 'codigo' ? 'Passo 2: Código' : loginState.step === 'senha' ? 'Passo 3: Senha 2FA' : 'Concluído'}`
                : importType === 'mega'
                  ? 'Links MEGA - Cole os links e baixe para a pasta'
                  : 'Escolha o tipo de importação'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Tipo de Importação */}
          {importType !== 'login' || loginState.step === 'numero' ? (
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Tipo de Importação</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectType('session')}
                  disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    importType === 'session'
                      ? 'bg-blue-600/20 border-blue-500/50'
                      : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className={`w-5 h-5 ${importType === 'session' ? 'text-blue-400' : 'text-gray-500'}`} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Arquivo .session</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Busca recursiva</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectType('portatil')}
                  disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    importType === 'portatil'
                      ? 'bg-blue-600/20 border-blue-500/50'
                      : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <FolderOpen className={`w-5 h-5 ${importType === 'portatil' ? 'text-blue-400' : 'text-gray-500'}`} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Número Portátil</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Pasta tdata</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectType('login')}
                  disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    importType === 'login'
                      ? 'bg-emerald-600/20 border-emerald-500/50'
                      : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <Smartphone className={`w-5 h-5 ${importType === 'login' ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Login Manual</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Número e código</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectType('mega')}
                  disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    importType === 'mega'
                      ? 'bg-amber-600/20 border-amber-500/50'
                      : 'bg-[#0d1117] border-gray-700 hover:border-gray-600'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <Download className={`w-5 h-5 ${importType === 'mega' ? 'text-amber-400' : 'text-gray-500'}`} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Links MEGA</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Baixar para pasta</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : null}

          {/* Conteúdo específico do Login Manual */}
          {importType === 'login' && renderLoginWizard()}

          {/* Links MEGA (apenas para tipo mega) */}
          {importType === 'mega' && (
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Links MEGA.nz</label>
              <textarea
                value={listaLinksMega}
                onChange={(e) => { setListaLinksMega(e.target.value); setError(null) }}
                placeholder="Cole um link MEGA.nz por linha"
                disabled={isBaixandoMega}
                rows={6}
                className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-200 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50 resize-y"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Os links serão baixados para a pasta C:\Users\Samuel\Downloads\numeros (ou a pasta configurada em configurações). Cada pasta será nomeada com o número da conta quando houver apenas uma conta no link.
              </p>
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adicionarExtrasMega}
                  onChange={(e) => setAdicionarExtrasMega(e.target.checked)}
                  disabled={isBaixandoMega}
                  className="mt-1 rounded border-gray-600 bg-[#0d1117] text-amber-500 focus:ring-amber-500/50"
                />
                <span className="text-xs text-gray-300">
                  Adicionar Telegram portátil e pasta modules na pasta do número. Serão copiados apenas o executável (Telegram ou Telegram.exe) e a pasta modules da pasta configurada em Configurações gerais. O conteúdo baixado (zip/pasta) já vem com tdata.
                </span>
              </label>
            </div>
          )}

          {/* Seleção de Pasta (apenas para session e portatil) */}
          {importType && importType !== 'login' && importType !== 'mega' && (
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-2">Selecionar Pasta</label>
              <button
                onClick={handleSelectFolder}
                disabled={isImporting || isScanning}
                className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 text-sm hover:border-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Selecionar Pasta
              </button>
              {selectedPath && (
                <div className="mt-2 p-2 bg-[#0d1117] border border-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-0.5">Pasta:</p>
                  <p className="text-xs text-gray-300 font-mono truncate">{selectedPath}</p>
                </div>
              )}
            </div>
          )}

          {/* Resultados da Busca */}
          {importType === 'session' && (
            <>
              {isScanning && (
                <div className="flex items-center justify-center gap-2 p-6 bg-[#0d1117] border border-gray-800 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-gray-400">Buscando sessões...</span>
                </div>
              )}
              {!isScanning && sessionsFound.length > 0 && (
                <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase">Sessões Encontradas</span>
                    <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/30">
                      {sessionsFound.length}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {sessionsFound.map((session, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-[#161b22] border border-gray-800 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-200 truncate">{session.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{session.folder}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Seleção de Tag (para todos os tipos, exceto quando login está em success) */}
          {importType && !(importType === 'login' && loginState.step === 'success') && (
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-3">
              <label className="block text-xs text-gray-500 uppercase mb-2">Adicionar Tag (opcional)</label>
              <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                <div
                  onClick={() => setTagSelecionada(null)}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    tagSelecionada === null ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#161b22] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {tagSelecionada === null ? <Check className="w-4 h-4 text-blue-400" /> : <div className="w-4 h-4 border border-gray-600 rounded" />}
                  <span className="text-sm text-gray-300">Nenhuma tag</span>
                </div>
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    onClick={() => setTagSelecionada(tag.nome)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      tagSelecionada === tag.nome ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#161b22] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {tagSelecionada === tag.nome ? <Check className="w-4 h-4 text-blue-400" /> : <div className="w-4 h-4 border border-gray-600 rounded" />}
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.cor }} />
                    <span className="text-sm text-gray-300">{tag.nome}</span>
                    {tag.descricao && <span className="text-xs text-gray-500 ml-auto">{tag.descricao}</span>}
                  </div>
                ))}
              </div>
              {!mostrarCriarTag ? (
                <button
                  onClick={() => setMostrarCriarTag(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Nova Tag
                </button>
              ) : (
                <div className="bg-[#161b22] border border-gray-700 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={novaTag.nome}
                    onChange={(e) => setNovaTag({ ...novaTag, nome: e.target.value })}
                    placeholder="Nome da tag"
                    className="w-full px-3 py-1.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={novaTag.cor}
                      onChange={(e) => setNovaTag({ ...novaTag, cor: e.target.value })}
                      className="w-10 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={novaTag.descricao}
                      onChange={(e) => setNovaTag({ ...novaTag, descricao: e.target.value })}
                      placeholder="Descrição (opcional)"
                      className="flex-1 px-3 py-1.5 bg-[#0d1117] text-gray-200 text-sm border border-gray-700 rounded-lg focus:outline-none focus:border-gray-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCriarTag}
                      disabled={criandoTag || !novaTag.nome.trim()}
                      className="flex-1 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {criandoTag ? 'Criando...' : 'Criar'}
                    </button>
                    <button
                      onClick={() => {
                        setMostrarCriarTag(false)
                        setNovaTag({ nome: '', cor: '#6b7280', descricao: '' })
                      }}
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs rounded-lg border border-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erro (apenas para importação de arquivos) */}
          {error && importType !== 'login' && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800">
          <button
            onClick={handleClose}
            disabled={isImporting || isScanning || loginState.isLoading || isBaixandoMega}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          {/* Botão para Login Manual */}
          {importType === 'login' && (
            (() => {
              const config = getLoginButtonConfig()
              if (!config) return null
              return (
                <button
                  onClick={config.onClick}
                  disabled={config.disabled}
                  className={`px-5 py-2 ${loginState.step === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#238636] hover:bg-[#2ea043]'} text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {config.icon}
                  {config.text}
                </button>
              )
            })()
          )}

          {/* Botão para MEGA: Baixar para pasta */}
          {importType === 'mega' && (
            <button
              onClick={handleBaixarEImportarMega}
              disabled={isBaixandoMega || !listaLinksMega.trim()}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isBaixandoMega ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar
                </>
              )}
            </button>
          )}
          
          {/* Botão para Importação de Arquivos (session e portatil) */}
          {importType && importType !== 'login' && importType !== 'mega' && (
            <button
              onClick={handleImport}
              disabled={isImporting || isScanning || !importType || !selectedPath || (importType === 'session' && sessionsFound.length === 0)}
              className="px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Importar {importType === 'session' && sessionsFound.length > 0 ? `${sessionsFound.length} Sessões` : 'Conta(s)'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

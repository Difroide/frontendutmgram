import { useEffect, useState, useRef } from 'react'
import { User, ChevronDown, Plus, X, Check, Building2 } from 'lucide-react'
import { useOperacao } from '@/contexts/OperacaoContext'
import { useTheme } from '@/contexts/ThemeContext'

interface ProfileData {
  photo: string | null
  name: string
}

export const TitlebarProfile = () => {
  const [profile, setProfile] = useState<ProfileData>({ photo: null, name: '' })
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { currentTheme } = useTheme()
  const { operacaoAtual, operacoes, setOperacaoAtual, criarOperacao, isLoading } = useOperacao()

  useEffect(() => {
    const loadProfile = async () => {
      if (window.electron?.dashboard?.carregarProfile) {
        try {
          const result = await window.electron.dashboard.carregarProfile()
          if (result.success && result.profile) {
            setProfile(result.profile)
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error)
        }
      }
    }
    
    loadProfile()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNovoNome('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCriar = async () => {
    if (novoNome.trim()) {
      try {
        await criarOperacao(novoNome.trim())
        setNovoNome('')
        setIsCreating(false)
      } catch (error) {
        console.error('Erro ao criar operação:', error)
        alert(`Erro ao criar operação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef} style={{ WebkitAppRegion: 'no-drag' }}>
      {/* Botão do perfil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-700/50 transition-colors"
      >
        {/* Foto de perfil */}
        {profile.photo ? (
          <img
            src={profile.photo}
            alt="Perfil"
            className="w-7 h-7 rounded-full object-cover border border-gray-600"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-400" />
          </div>
        )}
        
        {/* Nome da operação */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-200 max-w-[100px] truncate">
            {isLoading ? '...' : operacaoAtual?.nome || 'Selecionar'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header do dropdown */}
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-3">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Perfil"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {profile.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">Utmgram</p>
              </div>
            </div>
          </div>

          {/* Seção de Operações */}
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Operações</span>
            </div>

            {/* Lista de operações */}
            <div className="max-h-48 overflow-y-auto">
              {operacoes.length === 0 && !isCreating && (
                <div className="px-3 py-2 text-sm text-gray-400 text-center">
                  Nenhuma operação encontrada
                </div>
              )}
              
              {operacoes.map((op) => (
                <button
                  key={op.path}
                  onClick={async () => {
                    try {
                      await setOperacaoAtual(op)
                      setIsOpen(false)
                    } catch (error) {
                      console.error('Erro ao trocar operação:', error)
                      alert(`Não foi possível trocar para "${op.nome}". Tente novamente.`)
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                    operacaoAtual?.path === op.path
                      ? 'text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{
                    backgroundColor: operacaoAtual?.path === op.path ? `${currentTheme.colors.primary}40` : undefined,
                  }}
                >
                  <span className="flex-1 truncate">{op.nome}</span>
                  {operacaoAtual?.path === op.path && (
                    <Check className="w-4 h-4" style={{ color: currentTheme.colors.primary }} />
                  )}
                </button>
              ))}
            </div>

            {/* Criar nova operação */}
            {isCreating ? (
              <div className="p-2 border-t border-gray-700 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300 font-medium">Nova Operação</span>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNovoNome('')
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCriar()
                    } else if (e.key === 'Escape') {
                      setIsCreating(false)
                      setNovoNome('')
                    }
                  }}
                  placeholder="Nome da operação"
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:outline-none focus:ring-2 text-sm"
                  style={{ 
                    '--tw-ring-color': currentTheme.colors.primary 
                  } as React.CSSProperties}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCriar}
                    className="flex-1 px-3 py-1.5 text-white rounded-md text-sm transition-colors"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNovoNome('')
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 mt-1 border-t border-gray-700 pt-2"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Criar nova operação</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type WallpaperTarget = 'dashboard' | 'contas' | 'loading'

export const WallpapersSection = () => {
  const [dashboardWallpaper, setDashboardWallpaper] = useState<string | null>(null)
  const [contasWallpaper, setContasWallpaper] = useState<string | null>(null)
  const [loadingWallpaper, setLoadingWallpaper] = useState<string | null>(null)
  const { currentTheme } = useTheme()

  // Carregar wallpapers salvos do banco de dados
  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        // Tentar carregar do banco de dados primeiro
        if ((window as any).electron?.database?.getWallpaper) {
          const [dashboardResult, contasResult, loadingResult] = await Promise.all([
            (window as any).electron.database.getWallpaper('dashboard', null),
            (window as any).electron.database.getWallpaper('contas', null),
            (window as any).electron.database.getWallpaper('loading', null),
          ])

          // Se encontrou no banco, usar do banco
          if (dashboardResult?.success && dashboardResult.data) {
            setDashboardWallpaper(dashboardResult.data)
            localStorage.setItem('dashboard-card-wallpaper', dashboardResult.data)
          } else {
            // Fallback para localStorage
            const savedDashboard = localStorage.getItem('dashboard-card-wallpaper')
            if (savedDashboard) setDashboardWallpaper(savedDashboard)
          }

          if (contasResult?.success && contasResult.data) {
            setContasWallpaper(contasResult.data)
            localStorage.setItem('contas-card-wallpaper', contasResult.data)
          } else {
            const savedContas = localStorage.getItem('contas-card-wallpaper')
            if (savedContas) setContasWallpaper(savedContas)
          }

          if (loadingResult?.success && loadingResult.data) {
            setLoadingWallpaper(loadingResult.data)
            localStorage.setItem('loading-screen-wallpaper', loadingResult.data)
          } else {
            const savedLoading = localStorage.getItem('loading-screen-wallpaper')
            if (savedLoading) setLoadingWallpaper(savedLoading)
          }
        } else {
          // Fallback para localStorage se handlers não disponíveis
          const savedDashboard = localStorage.getItem('dashboard-card-wallpaper')
          const savedContas = localStorage.getItem('contas-card-wallpaper')
          const savedLoading = localStorage.getItem('loading-screen-wallpaper')
          
          if (savedDashboard) setDashboardWallpaper(savedDashboard)
          if (savedContas) setContasWallpaper(savedContas)
          if (savedLoading) setLoadingWallpaper(savedLoading)
        }
      } catch (error) {
        console.error('[WallpapersSection] Erro ao carregar wallpapers:', error)
        // Fallback para localStorage em caso de erro
        const savedDashboard = localStorage.getItem('dashboard-card-wallpaper')
        const savedContas = localStorage.getItem('contas-card-wallpaper')
        const savedLoading = localStorage.getItem('loading-screen-wallpaper')
        
        if (savedDashboard) setDashboardWallpaper(savedDashboard)
        if (savedContas) setContasWallpaper(savedContas)
        if (savedLoading) setLoadingWallpaper(savedLoading)
      }
    }

    loadWallpapers()
  }, [])

  const handleUpload = (target: WallpaperTarget) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*,.gif'
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Limite maior para vídeos e GIFs (20MB)
      const maxSize = file.type.startsWith('video/') ? 20 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const maxSizeMB = file.type.startsWith('video/') ? '20MB' : '10MB'
        alert(`Arquivo muito grande! Tamanho máximo: ${maxSizeMB}`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        const result = reader.result as string
        
        // Salvar no localStorage como fallback
        if (target === 'dashboard') {
          localStorage.setItem('dashboard-card-wallpaper', result)
          setDashboardWallpaper(result)
        } else if (target === 'contas') {
          localStorage.setItem('contas-card-wallpaper', result)
          setContasWallpaper(result)
        } else if (target === 'loading') {
          localStorage.setItem('loading-screen-wallpaper', result)
          setLoadingWallpaper(result)
        }

        // Salvar no banco de dados
        try {
          if ((window as any).electron?.database?.saveWallpaper) {
            const saveResult = await (window as any).electron.database.saveWallpaper(target, result)
            if (saveResult?.success) {
              console.log(`[WallpapersSection] ✅ Wallpaper salvo no banco de dados: ${target}`)
              
              // Disparar evento customizado para atualizar wallpapers em tempo real
              window.dispatchEvent(new CustomEvent('wallpaper-changed', {
                detail: { target, wallpaper: result }
              }))
            } else {
              console.warn(`[WallpapersSection] ⚠️ Erro ao salvar wallpaper no banco: ${saveResult?.error}`)
            }
          }
        } catch (error) {
          console.error('[WallpapersSection] Erro ao salvar wallpaper no banco:', error)
        }
      }
      reader.readAsDataURL(file)
    }
    
    input.click()
  }

  const handleRemove = async (target: WallpaperTarget) => {
    // Remover do localStorage
    if (target === 'dashboard') {
      localStorage.removeItem('dashboard-card-wallpaper')
      setDashboardWallpaper(null)
    } else if (target === 'contas') {
      localStorage.removeItem('contas-card-wallpaper')
      setContasWallpaper(null)
    } else if (target === 'loading') {
      localStorage.removeItem('loading-screen-wallpaper')
      setLoadingWallpaper(null)
    }

    // Remover do banco de dados
    try {
      if ((window as any).electron?.database?.removeWallpaper) {
        const removeResult = await (window as any).electron.database.removeWallpaper(target)
        if (removeResult?.success) {
          console.log(`[WallpapersSection] ✅ Wallpaper removido do banco de dados: ${target}`)
          
          // Disparar evento customizado para atualizar wallpapers em tempo real
          window.dispatchEvent(new CustomEvent('wallpaper-changed', {
            detail: { target, wallpaper: null }
          }))
        } else {
          console.warn(`[WallpapersSection] ⚠️ Erro ao remover wallpaper do banco: ${removeResult?.error}`)
        }
      }
    } catch (error) {
      console.error('[WallpapersSection] Erro ao remover wallpaper do banco:', error)
    }
  }

  const WallpaperCard = ({ 
    title, 
    target, 
    wallpaper 
  }: { 
    title: string
    target: WallpaperTarget
    wallpaper: string | null 
  }) => {
    const { currentTheme } = useTheme()
    return (
    <div className="bg-gray-700/30 rounded-lg border border-gray-600/20 p-4">
      <h5 className="text-sm font-medium text-gray-300 mb-3">{title}</h5>
      
      {/* Preview */}
      <div className="relative aspect-video bg-gray-800/50 rounded-lg border border-gray-600/20 mb-3 overflow-hidden">
        {wallpaper ? (
          <>
            {wallpaper.startsWith('data:video/') ? (
              <video
                src={wallpaper}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img 
                src={wallpaper} 
                alt={`Wallpaper ${title}`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Nenhum wallpaper configurado</p>
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => handleUpload(target)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border text-white rounded-lg transition-all"
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
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Upload</span>
        </button>
        
        {wallpaper && (
          <button
            onClick={() => handleRemove(target)}
            className="px-4 py-2 bg-red-600/30 border border-red-400/30 text-red-200 rounded-lg hover:bg-red-600/40 transition-all"
            title="Remover wallpaper"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Formatos: JPG, PNG, GIF, WebP, MP4, WebM • Imagens: 10MB • Vídeos: 20MB
      </p>
    </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Configurar Wallpapers
        </h4>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <WallpaperCard 
            title="Dashboard" 
            target="dashboard" 
            wallpaper={dashboardWallpaper}
          />
          
          <WallpaperCard 
            title="Contas" 
            target="contas" 
            wallpaper={contasWallpaper}
          />
          
          <WallpaperCard 
            title="Tela de Carregamento" 
            target="loading" 
            wallpaper={loadingWallpaper}
          />
        </div>
      </div>

      <div 
        className="border rounded-lg p-4"
        style={{
          backgroundColor: `${currentTheme.colors.primary}15`,
          borderColor: `${currentTheme.colors.primary}30`,
        }}
      >
        <p 
          className="text-sm mb-2"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          💡 <strong>Dicas:</strong>
        </p>
        <ul 
          className="text-sm space-y-1 ml-4 list-disc"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          <li>Dashboard e Contas: Aparecem na parte superior dos cards</li>
          <li>Tela de Carregamento: Aparece em tela cheia ao trocar de operação</li>
          <li>Suporte completo: Imagens (JPG, PNG, GIF, WebP) e Vídeos (MP4, WebM)</li>
          <li>GIFs e vídeos são reproduzidos automaticamente em loop</li>
        </ul>
      </div>
    </div>
  )
}


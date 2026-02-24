import { useEffect, useState } from 'react'
import './LoadingScreen.css'

interface LoadingScreenProps {
  isVisible: boolean
}

export const LoadingScreen = ({ isVisible }: LoadingScreenProps) => {
  const [displayedText, setDisplayedText] = useState('')
  const [showModoRyuk, setShowModoRyuk] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const [toggleEnabled, setToggleEnabled] = useState(false)
  const [wallpaper, setWallpaper] = useState<string | null>(null)
  
  const fullText = 'Utmgram.'
  const typingSpeed = 200 // ms por letra (mais lento para melhor visualização)

  // Carregar wallpaper do banco de dados sempre que a tela for exibida
  useEffect(() => {
    if (isVisible) {
      const loadWallpaper = async () => {
        try {
          // Tentar carregar do banco de dados primeiro
          if ((window as any).electron?.database?.getWallpaper) {
            const result = await (window as any).electron.database.getWallpaper('loading', null)
            if (result?.success && result.data) {
              setWallpaper(result.data)
              localStorage.setItem('loading-screen-wallpaper', result.data)
            } else {
              // Fallback para localStorage
              const savedWallpaper = localStorage.getItem('loading-screen-wallpaper')
              if (savedWallpaper) {
                setWallpaper(savedWallpaper)
              }
            }
          } else {
            // Fallback para localStorage se handlers não disponíveis
            const savedWallpaper = localStorage.getItem('loading-screen-wallpaper')
            if (savedWallpaper) {
              setWallpaper(savedWallpaper)
            }
          }
        } catch (error) {
          console.error('[LoadingScreen] Erro ao carregar wallpaper:', error)
          // Fallback para localStorage em caso de erro
          const savedWallpaper = localStorage.getItem('loading-screen-wallpaper')
          if (savedWallpaper) {
            setWallpaper(savedWallpaper)
          }
        }
      }

      loadWallpaper()
    }
  }, [isVisible])

  // Detectar se é vídeo
  const isVideo = wallpaper?.startsWith('data:video/') || false

  useEffect(() => {
    if (!isVisible) {
      // Resetar tudo quando a tela desaparecer
      setDisplayedText('')
      setShowModoRyuk(false)
      setShowToggle(false)
      setToggleEnabled(false)
      return
    }

    // Resetar o texto quando a tela aparecer
    setDisplayedText('')
    setShowModoRyuk(false)
    setShowToggle(false)
    setToggleEnabled(false)
    
    // Sequência de animações
    let currentIndex = 0
    
    // 1. Efeito de digitação "Utmgram."
    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(typingInterval)
        
        // 2. Após terminar a digitação, mostrar "Modo RYUK" após 600ms
        setTimeout(() => {
          setShowModoRyuk(true)
          
          // 3. Após mostrar "Modo RYUK", mostrar toggle desativado após 600ms
          setTimeout(() => {
            setShowToggle(true)
            
            // 4. Após mostrar toggle, ativá-lo após 800ms
            setTimeout(() => {
              setToggleEnabled(true)
            }, 800)
          }, 600)
        }, 600)
      }
    }, typingSpeed)

    return () => clearInterval(typingInterval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="loading-screen">
      {/* Fundo da interface ou wallpaper */}
      {wallpaper ? (
        isVideo ? (
          <>
            <video
              className="loading-background-video"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={wallpaper} />
            </video>
            <div className="loading-video-overlay" />
          </>
        ) : (
          <>
            <div 
              className="loading-background loading-wallpaper" 
              style={{
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="loading-wallpaper-overlay" />
          </>
        )
      ) : (
        <div className="loading-background" />
      )}
      
      {/* Conteúdo centralizado */}
      <div className="loading-content">
        {/* Logo com efeito de digitação */}
        <h1 className="loading-logo">
          <span className="loading-logo-utm">{displayedText.substring(0, 3)}</span>
          <span className={`loading-logo-gram ${toggleEnabled ? 'ryuk-active' : ''}`}>
            {displayedText.substring(3)}
          </span>
          {displayedText.length > 0 && displayedText.length < fullText.length && (
            <span className="loading-cursor">|</span>
          )}
        </h1>
        
        {/* "Modo RYUK" aparece após digitação */}
        {showModoRyuk && (
          <div className="loading-modo-ryuk">
            <p className={`loading-modo-ryuk-text ${toggleEnabled ? 'ryuk-active' : ''}`}>
              Modo RYUK
            </p>
          </div>
        )}
        
        {/* Toggle Switch */}
        {showToggle && (
          <div className="loading-toggle-container">
            <button
              type="button"
              onClick={() => setToggleEnabled(!toggleEnabled)}
              className={`loading-toggle ${toggleEnabled ? 'enabled' : 'disabled'}`}
              aria-label="Ativar Modo RYUK"
            >
              <span className="loading-toggle-track">
                <span className="loading-toggle-handle" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


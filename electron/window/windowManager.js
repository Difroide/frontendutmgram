import { app, BrowserWindow, session } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null

// Configurar Content Security Policy
function setupCSP() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // CSP mais restritiva para produção, mais permissiva para desenvolvimento
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' http://localhost:* https: ws: wss:;"
      : "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https:;"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

export function createWindow() {
  console.log('🔧 Configurando CSP...')
  // Configurar CSP antes de criar a janela
  setupCSP()

  console.log('🪟 Criando BrowserWindow...')

  // Configurações específicas para Windows frameless
  const isWindows = process.platform === 'win32'

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 900,
    show: false, // Não mostrar até carregar
    frame: false, // Remove COMPLETAMENTE a borda e titlebar padrão do Windows
    titleBarStyle: isWindows ? undefined : 'hidden', // No Windows, frame:false já remove tudo
    backgroundColor: '#040913', // Cor de fundo escura
    transparent: false, // Garantir que não seja transparente
    hasShadow: true, // Manter sombra da janela
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.cjs'),
      devTools: true, // Permite abrir o console com F12 (em dev sempre; em build pode desativar se quiser)
    },
  })

  // Garantir que a janela não tenha frame mesmo após mostrar
  if (isWindows) {
    // Forçar remoção do frame no Windows
    mainWindow.setMenuBarVisibility(false)
    console.log('✅ Janela frameless configurada para Windows (frame: false)')
  } else {
    console.log('✅ Janela frameless configurada (frame: false, titleBarStyle: hidden)')
  }

  // Configurar DevTools para não mostrar banner de idioma
  // Interceptar antes de abrir e configurar localStorage
  mainWindow.webContents.on('devtools-opened', () => {
    // Aguardar um pouco para o DevTools carregar completamente
    setTimeout(() => {
      // Tentar acessar o DevTools webContents e configurar localStorage
      const devToolsWebContents = mainWindow.webContents.devToolsWebContents
      if (devToolsWebContents) {
        // Configurar localStorage do DevTools para desabilitar o banner
        devToolsWebContents.executeJavaScript(`
          (function() {
            try {
              // Tentar desabilitar o banner via localStorage
              localStorage.setItem('devtools-language-banner-dismissed', 'true');
              localStorage.setItem('devtools-language-banner-shown', 'true');
              
              // Remover banner de forma agressiva
              const removeBanner = () => {
                // Seletores mais específicos baseados na estrutura real do DevTools
                const selectors = [
                  'div[class*="banner"]',
                  'div[class*="infobar"]',
                  '[role="banner"]',
                  '[class*="language"]',
                  '[id*="language"]',
                  '[data-testid*="language"]',
                  'div:has-text("Portuguese")',
                  'div:has-text("Português")',
                  'div:has-text("DevTools is now available")',
                  '.devtools-banner',
                  '.language-banner',
                  '.infobar',
                  '[class*="infobar"]'
                ];
                
                selectors.forEach(selector => {
                  try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                      const text = (el.textContent || '').toLowerCase();
                      if (text.includes('portuguese') || 
                          text.includes('português') || 
                          text.includes('language') || 
                          text.includes('devtools is now available') ||
                          text.includes('always match') ||
                          text.includes('switch devtools')) {
                        el.style.display = 'none';
                        el.remove();
                      }
                    });
                  } catch (e) {}
                });
                
                // Procurar por elementos com texto específico
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                  const text = (el.textContent || '').toLowerCase();
                  if ((text.includes('devtools is now available') || 
                       text.includes('portuguese') ||
                       text.includes('always match chrome')) && 
                      el.offsetHeight > 0 && 
                      el.offsetWidth > 0) {
                    el.style.display = 'none';
                    el.remove();
                  }
                });
              };
              
              // Executar múltiplas vezes com intervalos
              removeBanner();
              const interval = setInterval(() => {
                removeBanner();
                // Parar após 5 segundos
                setTimeout(() => clearInterval(interval), 5000);
              }, 100);
              
              // Observer mais agressivo
              const observer = new MutationObserver(() => {
                removeBanner();
              });
              observer.observe(document.documentElement, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
              });
              
              // Limpar observer após 10 segundos
              setTimeout(() => observer.disconnect(), 10000);
            } catch (e) {
              console.error('Erro ao remover banner:', e);
            }
          })();
        `).catch(() => { });
      }

      // Também tentar no contexto principal (caso o banner apareça lá)
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const removeBanner = () => {
            const selectors = [
              'div[class*="banner"]',
              'div[class*="infobar"]',
              '[role="banner"]'
            ];
            
            selectors.forEach(selector => {
              try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                  const text = (el.textContent || '').toLowerCase();
                  if (text.includes('portuguese') || 
                      text.includes('português') || 
                      text.includes('devtools is now available')) {
                    el.style.display = 'none';
                    el.remove();
                  }
                });
              } catch (e) {}
            });
          };
          
          removeBanner();
          setInterval(removeBanner, 200);
        })();
      `).catch(() => { });
    }, 200);
  })

  // Também interceptar quando o DevTools está prestes a abrir
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences) => {
    // Configurar preferências do DevTools
    webPreferences.preload = webPreferences.preload || path.join(__dirname, '../preload.cjs')
  })

  // Carrega a aplicação
  if (isDev) {
    // Porta padrão do Vite (veja vite.config.ts)
    const ports = [5180, 5177, 5173, 5174, 5175, 5176]
    let currentPortIndex = 0
    let hasShown = false

    // Carregar direto via loadURL - BrowserWindow conecta mesmo quando Node http falha
    const tryLoadURL = () => {
      if (hasShown) return
      const port = ports[currentPortIndex]
      const url = `http://localhost:${port}`
      console.log(`🌐 Carregando: ${url}`)
      mainWindow.loadURL(url)
    }

    const tryNextPort = () => {
      if (currentPortIndex < ports.length - 1) {
        currentPortIndex++
        setTimeout(() => {
          tryLoadURL()
        }, 1000)
      } else {
        // Todas as portas falharam, mostrar mensagem de erro
        console.error('❌ Não foi possível conectar ao servidor Vite')
        if (!hasShown) {
          hasShown = true
          mainWindow.show()
          mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Servidor não encontrado</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #1a1a1a;
                  color: #e0e0e0;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                  background: #2a2a2a;
                  border-radius: 8px;
                  max-width: 500px;
                }
                h1 { color: #ff6b6b; margin-top: 0; }
                p { line-height: 1.6; }
                code {
                  background: #1a1a1a;
                  padding: 0.2rem 0.4rem;
                  border-radius: 4px;
                  font-family: 'Courier New', monospace;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⚠️ Servidor de Desenvolvimento Não Encontrado</h1>
                <p>O Electron não conseguiu conectar ao servidor Vite.</p>
                <p><strong>1.</strong> Abra o terminal na pasta <strong>front</strong> do projeto (onde está o package.json)</p>
                <p><strong>2.</strong> Execute: <code>npm run electron:dev</code></p>
                <p style="margin-top: 1.5rem; font-size: 0.9em; color: #888;">Ou use o <strong>iniciar.bat</strong> na raiz do projeto.</p>
              </div>
            </body>
            </html>
          `))
          // DevTools desabilitadas por padrão - use F12 para abrir manualmente
          // mainWindow.webContents.openDevTools()
        }
      }
    }

    // Mostrar janela quando carregar (use F12 ou electron.toggleDevTools() para abrir DevTools)
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Página carregada com sucesso')
      hasShown = true
      mainWindow.show()
    })

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (hasShown) return
      if (event.isMainFrame) {
        tryNextPort()
      }
    })

    // Carregar após handlers estarem prontos
    setTimeout(tryLoadURL, 1000)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    mainWindow.show()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow() {
  return mainWindow
}

export function recreateWindowIfNeeded() {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
}


/**
 * Aguarda a API do Electron estar disponível
 * @param maxAttempts Número máximo de tentativas (padrão: 20)
 * @param delayMs Delay entre tentativas em ms (padrão: 200)
 * @returns Promise que resolve quando a API está disponível ou rejeita após maxAttempts
 */
export async function waitForElectron(maxAttempts = 20, delayMs = 200): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if ((window as any).electron) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

/**
 * Aguarda uma API específica do Electron estar disponível
 * @param apiPath Caminho da API (ex: 'telegram', 'criador.carregarCategorias')
 * @param maxAttempts Número máximo de tentativas (padrão: 20)
 * @param delayMs Delay entre tentativas em ms (padrão: 200)
 * @returns Promise que resolve quando a API está disponível ou rejeita após maxAttempts
 */
export async function waitForElectronAPI(apiPath: string, maxAttempts = 20, delayMs = 200): Promise<boolean> {
  const pathParts = apiPath.split('.')
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let api = (window as any).electron
    let found = true
    
    for (const part of pathParts) {
      if (!api || !api[part]) {
        found = false
        break
      }
      api = api[part]
    }
    
    if (found) {
      return true
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  
  return false
}


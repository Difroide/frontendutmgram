import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PATHS } from '../config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function registerSmmHandlers() {
  // Handler IPC para verificar quais painéis SMM estão configurados
  ipcMain.handle('verificar-paineis-smm', async () => {
    try {
      // O PATHS.BASE já deve apontar para a raiz (INTERFACEZINHA)
      // Mas vamos tentar múltiplos caminhos para garantir
      const possiblePaths = [
        path.join(PATHS.BASE, '.env'), // Raiz do projeto (INTERFACEZINHA/.env)
        path.resolve(PATHS.BASE, '..', '.env'), // Um nível acima
        path.resolve(PATHS.BASE, '..', '..', '.env'), // Dois níveis acima
        path.resolve(__dirname, '..', '..', '..', '.env'), // A partir de handlers/ (handlers -> electron -> front -> raiz)
      ]
      
      console.log('[SMM Handler] Verificando painéis SMM...')
      console.log('[SMM Handler] BASE path:', PATHS.BASE)
      console.log('[SMM Handler] __dirname:', __dirname)
      
      let envPath = null
      for (const possiblePath of possiblePaths) {
        const normalizedPath = path.normalize(possiblePath)
        console.log('[SMM Handler] Tentando caminho:', normalizedPath)
        if (fs.existsSync(normalizedPath)) {
          envPath = normalizedPath
          console.log('[SMM Handler] ✅ Arquivo .env encontrado em:', envPath)
          break
        } else {
          console.log('[SMM Handler] ❌ Arquivo não existe:', normalizedPath)
        }
      }
      
      const paineis = []

      if (!envPath) {
        console.log('[SMM Handler] ⚠️ Arquivo .env não encontrado!')
        console.log('[SMM Handler] Caminhos testados:')
        possiblePaths.forEach(p => console.log(`  - ${p}`))
        console.log('[SMM Handler] Crie o arquivo .env na raiz do projeto com as chaves:')
        console.log('[SMM Handler]   MEASMM_API_KEY=...')
        console.log('[SMM Handler]   SMMPROVIDER_API_KEY=...')
        console.log('[SMM Handler]   BRSMM_API_KEY=...')
        return []
      }

      console.log('[SMM Handler] Arquivo .env encontrado, lendo...')
      const envContent = fs.readFileSync(envPath, 'utf-8')
      const lines = envContent.split('\n')
      console.log('[SMM Handler] Total de linhas no .env:', lines.length)

      // Verificar cada painel
      const paineisConfig = [
        { key: 'MEASMM_API_KEY', nome: 'Measmm', id: 'measmm' },
        { key: 'SMMPROVIDER_API_KEY', nome: 'SmmProvider', id: 'smmprovider' },
        { key: 'BRSMM_API_KEY', nome: 'Brsmm', id: 'brsmm' },
      ]

      for (const painel of paineisConfig) {
        let encontrado = false
        for (const line of lines) {
          const trimmed = line.trim()
          // Ignorar comentários e linhas vazias
          if (trimmed.startsWith('#') || trimmed === '') continue
          
          if (trimmed.startsWith(`${painel.key}=`)) {
            const apiKey = trimmed.substring(painel.key.length + 1).trim()
            // Remover aspas se houver
            const cleanApiKey = apiKey.replace(/^["']|["']$/g, '')
            if (cleanApiKey && cleanApiKey.length > 0 && !cleanApiKey.includes('COLOQUE')) {
              paineis.push({
                id: painel.id,
                nome: painel.nome,
                apiKey: cleanApiKey,
              })
              console.log(`[SMM Handler] Painel ${painel.nome} encontrado e configurado`)
              encontrado = true
              break
            }
          }
        }
        if (!encontrado) {
          console.log(`[SMM Handler] Painel ${painel.nome} não encontrado ou não configurado`)
        }
      }

      console.log(`[SMM Handler] Total de painéis configurados: ${paineis.length}`)
      return paineis
    } catch (error) {
      console.error('[SMM Handler] Erro ao verificar painéis SMM:', error)
      console.error('[SMM Handler] Stack:', error.stack)
      return []
    }
  })

  // Handler IPC para obter API Telegram configurada
  ipcMain.handle('obter-api-telegram-ativa', async () => {
    try {
      if (!fs.existsSync(PATHS.APIS_TELEGRAM_FILE)) {
        return null
      }

      const data = fs.readFileSync(PATHS.APIS_TELEGRAM_FILE, 'utf-8')
      const json = JSON.parse(data)
      const apis = json.apis || []

      // Retornar a primeira API disponível (ou a última adicionada)
      if (apis.length > 0) {
        return apis[apis.length - 1]
      }

      return null
    } catch (error) {
      console.error('Erro ao obter API Telegram:', error)
      return null
    }
  })
}


import { ipcMain, shell, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'
import { getMainWindow } from '../window/windowManager.js'

export function registerUtilsHandlers() {
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Erro ao abrir URL externa:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar API Key no .env
  ipcMain.handle('save-smm-api-key', async (event, provider, apiKey) => {
    try {
      const envPath = path.join(PATHS.BASE, '.env')
      
      // Ler o arquivo .env se existir
      let envContent = ''
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8')
      }

      // Nome da variável no .env (ex: MEASMM_API_KEY, SMMPROVIDER_API_KEY, BRSMM_API_KEY)
      const envKey = `${provider.toUpperCase()}_API_KEY`
      
      // Verificar se a chave já existe
      const lines = envContent.split('\n')
      let keyExists = false
      const newLines = lines.map(line => {
        if (line.trim().startsWith(`${envKey}=`)) {
          keyExists = true
          return `${envKey}=${apiKey}`
        }
        return line
      })

      // Se não existe, adicionar
      if (!keyExists) {
        newLines.push(`${envKey}=${apiKey}`)
      }

      // Escrever de volta no arquivo
      fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8')
      
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar API Key:', error)
      return { success: false, error: error.message }
    }
  })

  // Ler API Key do .env
  ipcMain.handle('get-smm-api-key', async (event, provider) => {
    try {
      const envPath = path.join(PATHS.BASE, '.env')
      
      if (!fs.existsSync(envPath)) {
        return { success: true, apiKey: null }
      }

      const envContent = fs.readFileSync(envPath, 'utf-8')
      const envKey = `${provider.toUpperCase()}_API_KEY`
      
      // Procurar a chave no arquivo
      const lines = envContent.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith(`${envKey}=`)) {
          const apiKey = trimmed.substring(envKey.length + 1).trim()
          return { success: true, apiKey: apiKey || null }
        }
      }

      return { success: true, apiKey: null }
    } catch (error) {
      console.error('Erro ao ler API Key:', error)
      return { success: false, error: error.message, apiKey: null }
    }
  })

  // Selecionar pasta
  ipcMain.handle('selecionar-pasta', async (event) => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openDirectory'],
        title: 'Selecione a pasta',
      })
      
      if (result.canceled) {
        return null
      }
      
      return result.filePaths[0] || null
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error)
      return null
    }
  })

  // Selecionar arquivo (ex: executável .exe)
  ipcMain.handle('selecionar-arquivo', async (event, extensions = ['exe']) => {
    try {
      const mainWindow = getMainWindow()
      const filters = extensions.length > 0
        ? [{ name: 'Executáveis', extensions }, { name: 'Todos os arquivos', extensions: ['*'] }]
        : [{ name: 'Todos os arquivos', extensions: ['*'] }]
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openFile'],
        title: 'Selecione o arquivo',
        filters
      })
      if (result.canceled || !result.filePaths?.length) return null
      return result.filePaths[0]
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error)
      return null
    }
  })

  // Selecionar arquivo JSON
  ipcMain.handle('selecionar-arquivo-json', async (event) => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openFile'],
        title: 'Selecione o arquivo JSON da campanha',
        filters: [
          { name: 'Arquivos JSON', extensions: ['json'] },
          { name: 'Todos os arquivos', extensions: ['*'] }
        ]
      })
      
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null
      }
      
      const filePath = result.filePaths[0]
      
      // Ler o conteúdo do arquivo
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        return { path: filePath, content: content }
      }
      
      return null
    } catch (error) {
      console.error('Erro ao selecionar arquivo JSON:', error)
      return null
    }
  })
}

// Handler para fotos da pasta configurada
export function registerFotoAleatoriaHandler() {
  // Obter foto aleatória (para grupos)
  ipcMain.handle('obter-foto-aleatoria', async (event, pastaFotos) => {
    try {
      if (!pastaFotos) {
        // Tentar carregar a pasta das configurações gerais
        const configFile = path.join(PATHS.BASE, 'configuracoes-gerais.json')
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
          pastaFotos = config.pastaFotos
        }
      }
      
      if (!pastaFotos || !fs.existsSync(pastaFotos)) {
        return { success: false, error: 'Pasta de fotos não configurada ou não existe' }
      }
      
      // Listar arquivos de imagem na pasta
      const arquivos = fs.readdirSync(pastaFotos, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .filter(dirent => {
          const ext = path.extname(dirent.name).toLowerCase()
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
        })
      
      if (arquivos.length === 0) {
        return { success: false, error: 'Nenhuma imagem encontrada na pasta' }
      }
      
      // Selecionar uma foto aleatória
      const fotoAleatoria = arquivos[Math.floor(Math.random() * arquivos.length)]
      const fotoPath = path.join(pastaFotos, fotoAleatoria.name)
      
      // Ler a foto e converter para base64
      const fotoBuffer = fs.readFileSync(fotoPath)
      const ext = path.extname(fotoAleatoria.name).toLowerCase()
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }
      const mimeType = mimeTypes[ext] || 'image/jpeg'
      const fotoBase64 = `data:${mimeType};base64,${fotoBuffer.toString('base64')}`
      
      return { 
        success: true, 
        fotoBase64,
        fileName: fotoAleatoria.name,
        totalFotos: arquivos.length
      }
    } catch (error) {
      console.error('Erro ao obter foto aleatória:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Listar todas as fotos da pasta (para seleção específica - bots)
  ipcMain.handle('listar-fotos-pasta', async (event, pastaFotos) => {
    try {
      if (!pastaFotos) {
        // Tentar carregar a pasta das configurações gerais
        const configFile = path.join(PATHS.BASE, 'configuracoes-gerais.json')
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
          pastaFotos = config.pastaFotos
        }
      }
      
      if (!pastaFotos || !fs.existsSync(pastaFotos)) {
        return { success: false, error: 'Pasta de fotos não configurada ou não existe', fotos: [] }
      }
      
      // Listar arquivos de imagem na pasta
      const arquivos = fs.readdirSync(pastaFotos, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .filter(dirent => {
          const ext = path.extname(dirent.name).toLowerCase()
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
        })
        .map(dirent => dirent.name)
        .sort()
      
      return { 
        success: true, 
        fotos: arquivos,
        pasta: pastaFotos,
        totalFotos: arquivos.length
      }
    } catch (error) {
      console.error('Erro ao listar fotos:', error)
      return { success: false, error: error.message, fotos: [] }
    }
  })
  
  // Obter uma foto específica pelo nome (para bots)
  ipcMain.handle('obter-foto-especifica', async (event, pastaFotos, nomeArquivo) => {
    try {
      if (!pastaFotos) {
        // Tentar carregar a pasta das configurações gerais
        const configFile = path.join(PATHS.BASE, 'configuracoes-gerais.json')
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
          pastaFotos = config.pastaFotos
        }
      }
      
      if (!pastaFotos || !fs.existsSync(pastaFotos)) {
        return { success: false, error: 'Pasta de fotos não configurada ou não existe' }
      }
      
      const fotoPath = path.join(pastaFotos, nomeArquivo)
      
      if (!fs.existsSync(fotoPath)) {
        return { success: false, error: 'Arquivo não encontrado' }
      }
      
      // Ler a foto e converter para base64
      const fotoBuffer = fs.readFileSync(fotoPath)
      const ext = path.extname(nomeArquivo).toLowerCase()
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }
      const mimeType = mimeTypes[ext] || 'image/jpeg'
      const fotoBase64 = `data:${mimeType};base64,${fotoBuffer.toString('base64')}`
      
      return { 
        success: true, 
        fotoBase64,
        fileName: nomeArquivo
      }
    } catch (error) {
      console.error('Erro ao obter foto específica:', error)
      return { success: false, error: error.message }
    }
  })
}

// Handler para configurações gerais
export function registerConfiguracoesHandlers() {
  const CONFIG_FILE = path.join(PATHS.BASE, 'configuracoes-gerais.json')

  // Salvar configurações (faz merge com existente para preservar campos não exibidos)
  ipcMain.handle('salvar-configuracoes-gerais', async (event, config) => {
    try {
      let finalConfig = {}
      if (fs.existsSync(CONFIG_FILE)) {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
        finalConfig = JSON.parse(content)
      }
      // Mesclar novo config sobre o existente
      finalConfig = { ...finalConfig, ...config }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(finalConfig, null, 2), 'utf-8')
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar configurações gerais:', error)
      return { success: false, error: error.message }
    }
  })

  // Carregar configurações
  ipcMain.handle('carregar-configuracoes-gerais', async () => {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return {}
      }
      
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Erro ao carregar configurações gerais:', error)
      return {}
    }
  })
}


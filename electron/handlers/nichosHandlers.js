import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'
import { validateNichoName } from '../utils/pathValidator.js'

export function registerNichosHandlers() {
  // Handler IPC para carregar nichos (lê as pastas dentro de banco/nichos/)
  ipcMain.handle('carregar-nichos', async () => {
    try {
      // Verificar se a pasta nichos existe, se não, criar
      if (!fs.existsSync(PATHS.NICHOS_DIR)) {
        fs.mkdirSync(PATHS.NICHOS_DIR, { recursive: true })
        console.log('Pasta "nichos" criada em:', PATHS.NICHOS_DIR)
        return []
      }

      // Listar todas as pastas dentro de banco/nichos/
      const pastas = fs.readdirSync(PATHS.NICHOS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const nomePasta = dirent.name
          const pastaPath = path.join(PATHS.NICHOS_DIR, nomePasta)
          
          // Tentar ler informações da pasta (se houver arquivo de metadata, senão usar nome da pasta)
          // Por enquanto, vamos usar o nome da pasta como nome do nicho
          return {
            id: nomePasta, // Usar nome da pasta como ID
            nome: nomePasta,
            createdAt: fs.statSync(pastaPath).birthtime.toISOString(), // Data de criação da pasta
          }
        })

      console.log(`Carregados ${pastas.length} nichos de: ${PATHS.NICHOS_DIR}`)
      return pastas
    } catch (error) {
      console.error('Erro ao carregar nichos:', error)
      return []
    }
  })

  // Handler IPC para criar pasta de nicho
  ipcMain.handle('criar-pasta-nicho', async (event, nomeNicho) => {
    try {
      // Validar nome do nicho (apenas letras, números, espaços e hífens)
      if (!validateNichoName(nomeNicho)) {
        throw new Error('Nome do nicho inválido. Use apenas letras, números, espaços, hífens e underscores.')
      }

      const nomeLimpo = nomeNicho.trim()
      const pastaNichoPath = path.join(PATHS.NICHOS_DIR, nomeLimpo)

      // Verificar se a pasta banco/nichos existe, se não, criar
      if (!fs.existsSync(PATHS.NICHOS_DIR)) {
        fs.mkdirSync(PATHS.NICHOS_DIR, { recursive: true })
        console.log('Pasta "nichos" criada em:', PATHS.NICHOS_DIR)
      }

      // Verificar se a pasta do nicho já existe
      if (fs.existsSync(pastaNichoPath)) {
        console.log(`Pasta do nicho "${nomeLimpo}" já existe em: ${pastaNichoPath}`)
        return { success: true, message: 'Pasta já existe', path: pastaNichoPath }
      }

      // Criar a pasta do nicho dentro de banco/nichos/
      fs.mkdirSync(pastaNichoPath, { recursive: true })
      console.log(`Pasta do nicho "${nomeLimpo}" criada em: ${pastaNichoPath}`)

      return { success: true, message: 'Pasta criada com sucesso', path: pastaNichoPath }
    } catch (error) {
      console.error('Erro ao criar pasta do nicho:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para excluir pasta de nicho
  ipcMain.handle('excluir-pasta-nicho', async (event, nomeNicho) => {
    try {
      const pastaNichoPath = path.join(PATHS.NICHOS_DIR, nomeNicho)
      
      if (!fs.existsSync(pastaNichoPath)) {
        return { success: false, error: 'Pasta não encontrada' }
      }

      // Remover a pasta recursivamente
      fs.rmSync(pastaNichoPath, { recursive: true, force: true })
      console.log(`Pasta do nicho "${nomeNicho}" excluída: ${pastaNichoPath}`)

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir pasta do nicho:', error)
      return { success: false, error: error.message }
    }
  })
}


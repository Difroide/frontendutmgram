import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS, setOperacaoAtual } from '../config/paths.js'

const OPERACOES_DIR = path.join(PATHS.BASE, 'operações')

// Garantir que a pasta operações existe
if (!fs.existsSync(OPERACOES_DIR)) {
  fs.mkdirSync(OPERACOES_DIR, { recursive: true })
}

export function registerOperacaoHandlers() {
  // Listar todas as operações
  ipcMain.handle('listar-operacoes', async () => {
    try {
      if (!fs.existsSync(OPERACOES_DIR)) {
        fs.mkdirSync(OPERACOES_DIR, { recursive: true })
        return []
      }

      const pastas = fs.readdirSync(OPERACOES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          nome: dirent.name,
          path: dirent.name
        }))

      return pastas
    } catch (error) {
      console.error('Erro ao listar operações:', error)
      return []
    }
  })

  // Criar nova operação
  ipcMain.handle('criar-operacao', async (event, nome) => {
    try {
      // Validar nome (remover caracteres inválidos)
      const nomeLimpo = nome.replace(/[<>:"/\\|?*]/g, '_').trim()
      
      if (!nomeLimpo) {
        throw new Error('Nome da operação não pode estar vazio')
      }

      const operacaoPath = path.join(OPERACOES_DIR, nomeLimpo)

      if (fs.existsSync(operacaoPath)) {
        throw new Error(`Operação "${nomeLimpo}" já existe`)
      }

      // Criar estrutura de pastas
      // Nota: APIs Telegram e Proxies não são criados aqui, pois são compartilhados da pasta principal
      fs.mkdirSync(operacaoPath, { recursive: true })
      fs.mkdirSync(path.join(operacaoPath, 'banco'), { recursive: true })
      fs.mkdirSync(path.join(operacaoPath, 'banco', 'listas'), { recursive: true })
      fs.mkdirSync(path.join(operacaoPath, 'banco', 'nichos'), { recursive: true })
      fs.mkdirSync(path.join(operacaoPath, 'contas telegram'), { recursive: true })

      // Criar arquivos padrão
      fs.writeFileSync(
        path.join(operacaoPath, 'banco', 'dashboard-profile.json'),
        JSON.stringify({ photo: null, name: '' }, null, 2)
      )

      console.log(`✅ Operação "${nomeLimpo}" criada com sucesso`)
      
      return {
        nome: nomeLimpo,
        path: nomeLimpo
      }
    } catch (error) {
      console.error('Erro ao criar operação:', error)
      throw error
    }
  })

  // Definir operação atual
  ipcMain.handle('set-operacao-atual', async (event, operacao) => {
    try {
      setOperacaoAtual(operacao)
      console.log(`✅ Operação atual definida: ${operacao.nome}`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao definir operação atual:', error)
      throw error
    }
  })
}


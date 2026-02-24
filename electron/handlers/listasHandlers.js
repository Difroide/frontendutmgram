import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { PATHS } from '../config/paths.js'

export function registerListasHandlers() {
  // Handler IPC para salvar lista de bots
  ipcMain.handle('salvar-lista-bots', async (event, listName, bots, prioritaria = false) => {
    try {
      // Verificar se a pasta listas existe, se não, criar
      if (!fs.existsSync(PATHS.LISTAS_DIR)) {
        fs.mkdirSync(PATHS.LISTAS_DIR, { recursive: true })
        console.log('Pasta "listas" criada em:', PATHS.LISTAS_DIR)
      }

      // Validar nome da lista (apenas letras, números, espaços, hífens e underscores)
      if (!listName || !/^[a-zA-Z0-9\s\-_]+$/.test(listName.trim())) {
        throw new Error('Nome da lista inválido. Use apenas letras, números, espaços, hífens e underscores.')
      }

      const nomeLimpo = listName.trim()
      const arquivoLista = path.join(PATHS.LISTAS_DIR, `${nomeLimpo}.json`)

      // Criar objeto da lista
      const lista = {
        id: nomeLimpo,
        listName: nomeLimpo,
        bots: bots,
        prioritaria: prioritaria === true, // Garantir boolean
        createdAt: new Date().toISOString(),
      }

      // Salvar no arquivo JSON
      fs.writeFileSync(arquivoLista, JSON.stringify(lista, null, 2), 'utf-8')
      console.log(`Lista de bots salva em: ${arquivoLista} (prioritária: ${prioritaria})`)

      return { success: true, lista }
    } catch (error) {
      console.error('Erro ao salvar lista de bots:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar todas as listas
  ipcMain.handle('carregar-todas-listas', async () => {
    try {
      if (!fs.existsSync(PATHS.LISTAS_DIR)) {
        return []
      }

      const arquivos = fs.readdirSync(PATHS.LISTAS_DIR)
        .filter(arquivo => arquivo.endsWith('.json'))
        .map(arquivo => {
          const arquivoPath = path.join(PATHS.LISTAS_DIR, arquivo)
          try {
            const data = fs.readFileSync(arquivoPath, 'utf-8')
            const lista = JSON.parse(data)
            return lista
          } catch (error) {
            console.warn(`Erro ao ler arquivo ${arquivo}:`, error)
            return null
          }
        })
        .filter(lista => lista !== null)

      console.log(`Carregadas ${arquivos.length} listas de: ${PATHS.LISTAS_DIR}`)
      return arquivos
    } catch (error) {
      console.error('Erro ao carregar listas:', error)
      return []
    }
  })

  // Handler IPC para excluir lista
  ipcMain.handle('excluir-lista-bots', async (event, listName) => {
    try {
      // Validar nome da lista
      if (!listName || !/^[a-zA-Z0-9\s\-_]+$/.test(listName.trim())) {
        throw new Error('Nome da lista inválido')
      }

      const nomeLimpo = listName.trim()
      const arquivoLista = path.join(PATHS.LISTAS_DIR, `${nomeLimpo}.json`)

      if (!fs.existsSync(arquivoLista)) {
        return { success: false, error: 'Arquivo não encontrado' }
      }

      // Remover o arquivo
      fs.unlinkSync(arquivoLista)
      console.log(`Lista excluída: ${arquivoLista}`)

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir lista:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para atualizar lista (editar)
  ipcMain.handle('atualizar-lista-bots', async (event, listNameAntigo, listNameNovo, bots, prioritaria = false) => {
    try {
      // Validar nomes
      if (!listNameNovo || !/^[a-zA-Z0-9\s\-_]+$/.test(listNameNovo.trim())) {
        throw new Error('Nome da lista inválido. Use apenas letras, números, espaços, hífens e underscores.')
      }

      const nomeAntigoLimpo = listNameAntigo.trim()
      const nomeNovoLimpo = listNameNovo.trim()
      const arquivoAntigo = path.join(PATHS.LISTAS_DIR, `${nomeAntigoLimpo}.json`)
      const arquivoNovo = path.join(PATHS.LISTAS_DIR, `${nomeNovoLimpo}.json`)

      // Se o nome mudou, precisamos renomear o arquivo
      if (nomeAntigoLimpo !== nomeNovoLimpo) {
        if (fs.existsSync(arquivoNovo)) {
          throw new Error('Já existe uma lista com esse nome')
        }
        // Remover arquivo antigo se existir
        if (fs.existsSync(arquivoAntigo)) {
          fs.unlinkSync(arquivoAntigo)
        }
      }

      // Ler arquivo antigo para preservar createdAt e prioritaria se existir
      let createdAt = new Date().toISOString()
      let prioritariaAntiga = false
      if (fs.existsSync(arquivoAntigo)) {
        try {
          const dataAntiga = fs.readFileSync(arquivoAntigo, 'utf-8')
          const listaAntiga = JSON.parse(dataAntiga)
          createdAt = listaAntiga.createdAt
          prioritariaAntiga = listaAntiga.prioritaria === true
        } catch (error) {
          console.warn('Erro ao ler arquivo antigo, usando data atual:', error)
        }
      }

      // Criar/atualizar lista
      const lista = {
        id: nomeNovoLimpo,
        listName: nomeNovoLimpo,
        bots: bots,
        prioritaria: prioritaria === true, // Usar o novo valor passado
        createdAt: createdAt,
      }

      // Salvar no arquivo JSON
      fs.writeFileSync(arquivoNovo, JSON.stringify(lista, null, 2), 'utf-8')
      console.log(`Lista atualizada em: ${arquivoNovo} (prioritária: ${prioritaria})`)

      return { success: true, lista }
    } catch (error) {
      console.error('Erro ao atualizar lista:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para salvar configuração de quantidade de listas prioritárias
  ipcMain.handle('salvar-config-listas-prioritarias', async (event, quantidade) => {
    try {
      const configPath = path.join(PATHS.BASE, 'config', 'listas-config.json')
      const configDir = path.dirname(configPath)
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      const config = {
        quantidadeListasPrioritariasPorGrupo: Math.max(0, parseInt(quantidade) || 0),
        updatedAt: new Date().toISOString(),
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      console.log(`Configuração de listas prioritárias salva: ${quantidade} por grupo`)

      return { success: true, config }
    } catch (error) {
      console.error('Erro ao salvar configuração de listas prioritárias:', error)
      return { success: false, error: error.message }
    }
  })

  // Handler IPC para carregar configuração de quantidade de listas prioritárias
  ipcMain.handle('carregar-config-listas-prioritarias', async () => {
    try {
      const configPath = path.join(PATHS.BASE, 'config', 'listas-config.json')
      
      if (!fs.existsSync(configPath)) {
        return { success: true, quantidade: 0 }
      }

      const data = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(data)

      return { 
        success: true, 
        quantidade: config.quantidadeListasPrioritariasPorGrupo || 0 
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de listas prioritárias:', error)
      return { success: true, quantidade: 0 }
    }
  })

}


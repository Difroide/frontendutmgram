import { app } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getBasePath() {
  try {
    return app.isPackaged
      ? path.dirname(process.execPath) // pasta do .exe final
      : path.resolve(__dirname, '../../..') // raiz do projeto em dev (front/electron/config/ -> front/electron/ -> front/ -> raiz)
  } catch (error) {
    // Se app ainda não estiver pronto, usa o caminho de desenvolvimento
    return path.resolve(__dirname, '../../..')
  }
}

const BASE_PATH = getBasePath()
const OPERACOES_DIR = path.join(BASE_PATH, 'operações')
const OPERACAO_ATUAL_FILE = path.join(BASE_PATH, 'operacao-atual.json')

// Variável global para armazenar a operação atual
let operacaoAtual = null

// Função para carregar operação atual do arquivo
function loadOperacaoAtual() {
  try {
    if (fs.existsSync(OPERACAO_ATUAL_FILE)) {
      const content = fs.readFileSync(OPERACAO_ATUAL_FILE, 'utf-8')
      const saved = JSON.parse(content)
      if (saved && saved.path) {
        operacaoAtual = saved
        return operacaoAtual
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro ao carregar operação atual do arquivo:', error.message)
  }
  
  // Fallback: tentar usar primeira operação disponível
  try {
    if (fs.existsSync(OPERACOES_DIR)) {
      const operacoes = fs.readdirSync(OPERACOES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
      if (operacoes.length > 0) {
        const primeiraOperacao = {
          nome: operacoes[0].name,
          path: operacoes[0].name
        }
        operacaoAtual = primeiraOperacao
        // Salvar automaticamente a primeira operação encontrada
        saveOperacaoAtualToFile(primeiraOperacao)
        console.log(`📁 Usando primeira operação disponível: ${primeiraOperacao.nome}`)
        return operacaoAtual
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro ao buscar primeira operação:', error.message)
  }
  
  return null
}

// Função para salvar operação atual no arquivo
function saveOperacaoAtualToFile(operacao) {
  try {
    const data = {
      nome: operacao?.nome || operacao?.path,
      path: operacao?.path,
      timestamp: new Date().toISOString()
    }
    fs.writeFileSync(OPERACAO_ATUAL_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`💾 Operação atual salva no arquivo: ${data.nome}`)
  } catch (error) {
    console.error('❌ Erro ao salvar operação atual no arquivo:', error.message)
  }
}

// Carregar operação atual na inicialização
loadOperacaoAtual()

export function setOperacaoAtual(operacao) {
  operacaoAtual = operacao
  saveOperacaoAtualToFile(operacao)
  console.log(`📁 Operação atual definida: ${operacao?.nome || 'nenhuma'}`)
}

export function getOperacaoAtual() {
  // Se não há operação em memória, tentar carregar do arquivo
  if (!operacaoAtual) {
    loadOperacaoAtual()
  }
  return operacaoAtual
}

function getOperacaoPath() {
  if (operacaoAtual) {
    return path.join(OPERACOES_DIR, operacaoAtual.path)
  }
  // Se não há operação, usar a primeira operação disponível ou lançar erro
  // Isso força o uso de operações ao invés de fallback para estrutura antiga
  throw new Error('Nenhuma operação selecionada. Por favor, selecione uma operação no dropdown.')
}

export const PATHS = {
  BASE: BASE_PATH,
  OPERACOES_DIR: OPERACOES_DIR,
  get CONTAS_DIR() {
    if (!operacaoAtual) {
      console.warn('⚠️ Nenhuma operação selecionada. Tentando usar primeira operação disponível...')
      // Tentar usar primeira operação se disponível
      try {
        if (fs.existsSync(OPERACOES_DIR)) {
          const operacoes = fs.readdirSync(OPERACOES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
          if (operacoes.length > 0) {
            const primeiraOperacao = operacoes[0].name
            const contasPath = path.join(OPERACOES_DIR, primeiraOperacao, 'contas telegram')
            console.log(`📁 Usando operação "${primeiraOperacao}" (fallback): ${contasPath}`)
            return contasPath
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao buscar operações:', e.message)
      }
      // Se não conseguir, usar estrutura antiga como último recurso
      const fallbackPath = path.join(BASE_PATH, 'contas telegram')
      console.log(`📁 Usando estrutura padrão (fallback): ${fallbackPath}`)
      return fallbackPath
    }
    return path.join(getOperacaoPath(), 'contas telegram')
  },
  get BANCO_DIR() {
    if (!operacaoAtual) {
      console.warn('⚠️ Nenhuma operação selecionada. Tentando usar primeira operação disponível...')
      // Tentar usar primeira operação se disponível
      try {
        if (fs.existsSync(OPERACOES_DIR)) {
          const operacoes = fs.readdirSync(OPERACOES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
          if (operacoes.length > 0) {
            const primeiraOperacao = operacoes[0].name
            const bancoPath = path.join(OPERACOES_DIR, primeiraOperacao, 'banco')
            console.log(`📁 Usando operação "${primeiraOperacao}" (fallback): ${bancoPath}`)
            return bancoPath
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao buscar operações:', e.message)
      }
      // Se não conseguir, usar estrutura antiga como último recurso
      const fallbackPath = path.join(BASE_PATH, 'banco')
      console.log(`📁 Usando estrutura padrão (fallback): ${fallbackPath}`)
      return fallbackPath
    }
    return path.join(getOperacaoPath(), 'banco')
  },
  get NICHOS_DIR() {
    return path.join(this.BANCO_DIR, 'nichos')
  },
  get LISTAS_DIR() {
    return path.join(this.BANCO_DIR, 'listas')
  },
  // APIs Telegram e Proxies sempre usam a pasta principal (compartilhados entre todas operações)
  get APIS_TELEGRAM_DIR() {
    return path.join(BASE_PATH, 'banco', 'apis telegram')
  },
  get APIS_TELEGRAM_FILE() {
    return path.join(this.APIS_TELEGRAM_DIR, 'api.json')
  },
  get PROXIES_DIR() {
    return path.join(BASE_PATH, 'banco', 'proxies')
  },
  get PROXIES_FILE() {
    return path.join(this.PROXIES_DIR, 'proxies.json')
  },
  get DASHBOARD_PROFILE_FILE() {
    return path.join(this.BANCO_DIR, 'dashboard-profile.json')
  },
  get CAMPANHAS_DIR() {
    if (!operacaoAtual) {
      try {
        if (fs.existsSync(OPERACOES_DIR)) {
          const operacoes = fs.readdirSync(OPERACOES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
          if (operacoes.length > 0) {
            return path.join(OPERACOES_DIR, operacoes[0].name, 'Campanhas')
          }
        }
      } catch (e) { }
      return path.join(BASE_PATH, 'operações', 'Op', 'Campanhas')
    }
    return path.join(getOperacaoPath(), 'Campanhas')
  },
  get CAMPANHAS_NOVAS_DIR() {
    return path.join(this.CAMPANHAS_DIR, 'Campanhas-novas')
  },
  get CAMPANHAS_RODANDO_DIR() {
    return path.join(this.CAMPANHAS_DIR, 'Campanhas-rodando')
  },
}


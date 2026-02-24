/**
 * Sistema de logging configurável
 * Respeita as configurações de LOG_LEVEL e categorias definidas no iniciar.bat
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configuração do arquivo ou variáveis de ambiente
function loadLogConfig() {
  const config = {
    level: process.env.LOG_LEVEL || 'all',
    categories: {
      main: process.env.LOG_MAIN !== '0',
      telegram: process.env.LOG_TELEGRAM !== '0',
      botmidia: process.env.LOG_BOTMIDIA !== '0',
      proxy: process.env.LOG_PROXY !== '0',
      dashboard: process.env.LOG_DASHBOARD !== '0',
      others: process.env.LOG_OTHERS !== '0',
    }
  }

  // Se não há variáveis de ambiente, tentar ler do arquivo
  if (!process.env.LOG_LEVEL) {
    try {
      // Tentar encontrar o arquivo log_config.txt na raiz do projeto
      const possiblePaths = [
        path.join(__dirname, '../../../log_config.txt'),
        path.join(process.cwd(), 'log_config.txt'),
        path.join(process.cwd(), '../../log_config.txt'),
      ]

      for (const configFile of possiblePaths) {
        if (fs.existsSync(configFile)) {
          const content = fs.readFileSync(configFile, 'utf-8')
          const lines = content.split('\n')
          lines.forEach(line => {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
              const [key, value] = trimmed.split('=')
              if (key && value) {
                const keyTrimmed = key.trim()
                const valueTrimmed = value.trim()
                if (keyTrimmed === 'LOG_LEVEL') {
                  config.level = valueTrimmed
                } else if (keyTrimmed.startsWith('LOG_')) {
                  const category = keyTrimmed.replace('LOG_', '').toLowerCase()
                  if (category in config.categories) {
                    config.categories[category] = valueTrimmed === '1'
                  }
                }
              }
            }
          })
          break
        }
      }
    } catch (error) {
      // Se não conseguir ler, usar padrão (já definido acima)
    }
  }

  return config
}

const logConfig = loadLogConfig()

// Níveis de log
const LOG_LEVELS = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  all: 4
}

// Mapeamento de categorias baseado em padrões nas mensagens
const CATEGORY_PATTERNS = [
  { pattern: /\[main\]|main|inicializ|app está pronto/i, category: 'main' },
  { pattern: /\[telegramHandlers\]|telegram|get-telegram|adicionar-contas/i, category: 'telegram' },
  { pattern: /\[botMidiaHandlers\]|botmidia|bot-midia|bot_midia/i, category: 'botmidia' },
  { pattern: /\[proxyHandlers\]|proxy|proxies/i, category: 'proxy' },
  { pattern: /\[dashboardHandlers\]|dashboard/i, category: 'dashboard' },
]

function getCategoryFromMessage(message) {
  const msg = String(message)
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(msg)) {
      return category
    }
  }
  return 'others'
}

function shouldLog(level, category) {
  // Verificar nível
  const currentLevel = LOG_LEVELS[logConfig.level] ?? LOG_LEVELS.all
  const messageLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info
  
  if (messageLevel > currentLevel) {
    return false
  }

  // Verificar categoria
  const categoryEnabled = logConfig.categories[category] !== false
  return categoryEnabled
}

// Criar logger customizado
export const logger = {
  log: (...args) => {
    const category = getCategoryFromMessage(args[0])
    if (shouldLog('all', category)) {
      console.log(...args)
    }
  },

  info: (...args) => {
    const category = getCategoryFromMessage(args[0])
    if (shouldLog('info', category)) {
      console.log(...args)
    }
  },

  warn: (...args) => {
    const category = getCategoryFromMessage(args[0])
    if (shouldLog('warn', category)) {
      console.warn(...args)
    }
  },

  error: (...args) => {
    const category = getCategoryFromMessage(args[0])
    if (shouldLog('error', category)) {
      console.error(...args)
    }
  },

  debug: (...args) => {
    const category = getCategoryFromMessage(args[0])
    if (shouldLog('all', category)) {
      console.log('[DEBUG]', ...args)
    }
  }
}

// Exportar função para verificar se categoria está habilitada
export function isCategoryEnabled(category) {
  return logConfig.categories[category] !== false
}

// Exportar configuração atual
export function getLogConfig() {
  return { ...logConfig }
}


import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { PATHS } from '../config/paths.js'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fallbacks portáteis: pastas relativas ao projeto (funcionam em qualquer PC)
function getDefaultBaseDir() {
  return path.join(PATHS.BASE, 'downloads', 'numeros')
}

/**
 * Lê a proxy padrão (padrao: true) de proxies.json.
 * @returns {{ endereco: string, porta: number, tipo: string, usuario?: string, senha?: string, padrao?: boolean } | null}
 */
function getProxyPadrao() {
  try {
    const filePath = PATHS.PROXIES_FILE
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8').trim()
    if (!raw) return null
    const list = JSON.parse(raw)
    const arr = Array.isArray(list) ? list : []
    return arr.find((p) => p.padrao === true) || null
  } catch {
    return null
  }
}

/**
 * Monta a URL da proxy (ex.: http://user:pass@host:port ou socks5://host:port).
 */
function buildProxyUrl(proxy) {
  if (!proxy || !proxy.endereco || !proxy.porta) return null
  const tipo = (proxy.tipo || 'HTTP').toLowerCase()
  const protocol = tipo === 'socks4' ? 'socks4' : tipo === 'socks5' ? 'socks5' : tipo === 'https' ? 'https' : 'http'
  const auth = proxy.usuario && proxy.senha ? `${encodeURIComponent(proxy.usuario)}:${encodeURIComponent(proxy.senha)}@` : ''
  return `${protocol}://${auth}${proxy.endereco}:${proxy.porta}`
}

/**
 * Cria agent de proxy (HttpsProxyAgent ou SocksProxyAgent) para uso no megajs.
 */
async function createProxyAgents(proxyConfig) {
  const proxyUrl = buildProxyUrl(proxyConfig)
  if (!proxyUrl) return { httpAgent: null, httpsAgent: null }
  try {
    const tipo = (proxyConfig.tipo || 'HTTP').toUpperCase()
    if (tipo === 'SOCKS4' || tipo === 'SOCKS5') {
      const { SocksProxyAgent } = await import('socks-proxy-agent')
      const agent = new SocksProxyAgent(proxyUrl)
      return { httpAgent: agent, httpsAgent: agent }
    }
    const { HttpsProxyAgent } = await import('https-proxy-agent')
    const agent = new HttpsProxyAgent(proxyUrl)
    return { httpAgent: agent, httpsAgent: agent }
  } catch (e) {
    console.warn('[megaDownload] Proxy agent não disponível:', e.message)
    return { httpAgent: null, httpsAgent: null }
  }
}

const CDN_403_RETRY_DELAY_MS = 2500
const CDN_403_MAX_RETRIES = 3

/**
 * Fetch customizado que usa agent (proxy) com Node https/http.
 * Inclui retry com atraso para 403 no CDN do MEGA (rate limit).
 */
function createFetchWithAgents(httpsAgent, httpAgent) {
  function doFetch(url, opts = {}, retryCount = 0) {
    const u = new URL(url)
    const isHttps = u.protocol === 'https:'
    const mod = isHttps ? https : http
    const agent = opts.agent != null
      ? (typeof opts.agent === 'function' ? opts.agent(u) : opts.agent)
      : (isHttps ? httpsAgent : httpAgent)
    const headers = { ...(opts.headers || {}) }
    if (opts.body != null) {
      const body = typeof opts.body === 'string' ? Buffer.from(opts.body, 'utf8') : opts.body
      if (!headers['Content-Length']) headers['Content-Length'] = body.length
    }
    const options = {
      method: opts.method || 'GET',
      headers,
      agent,
    }
    const shortUrl = u.hostname + (u.pathname || '').substring(0, 50)
    console.log('[megaDownload] [FETCH] Iniciando requisição:', shortUrl, '| method:', options.method)
    const FETCH_TIMEOUT = 90000
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log('[megaDownload] [FETCH] Timeout 90s atingido para:', shortUrl)
        if (req) req.destroy()
        reject(new Error('Timeout após 90s (proxy ou servidor sem resposta). Tente sem proxy ou verifique o proxy.'))
      }, FETCH_TIMEOUT)
      const req = mod.request(url, options, (res) => {
        const status = res.statusCode
        console.log('[megaDownload] [FETCH] Resposta recebida:', shortUrl, '| status:', status)
        const location = res.headers.location || res.headers.Location
        if (location && (status === 301 || status === 302 || status === 307 || status === 308)) {
          clearTimeout(timeoutId)
          const nextUrl = location.startsWith('http') ? location : new URL(location, url).href
          const nextOpts = (status === 307 || status === 308) ? opts : { ...opts, method: 'GET', body: undefined }
          doFetch(nextUrl, nextOpts, retryCount).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          clearTimeout(timeoutId)
          const totalBytes = chunks.reduce((a, c) => a + c.length, 0)
          console.log('[megaDownload] [FETCH] Body completo recebido:', shortUrl, '| status:', status, '| bytes:', totalBytes)
          const isCdnDl = shortUrl.includes('userstorage') && shortUrl.includes('/dl/')
          if (status === 403 && isCdnDl && retryCount < CDN_403_MAX_RETRIES) {
            const nextRetry = retryCount + 1
            console.log('[megaDownload] [FETCH] 403 no CDN, retentando em', CDN_403_RETRY_DELAY_MS / 1000, 's (' + nextRetry + '/' + CDN_403_MAX_RETRIES + ')...')
            setTimeout(() => {
              doFetch(url, opts, nextRetry).then(resolve, reject)
            }, CDN_403_RETRY_DELAY_MS)
            return
          }
          const body = Buffer.concat(chunks)
          const headers = res.headers
          const responseObj = {
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage || '',
            headers: {
              get(name) {
                const v = headers[name.toLowerCase()]
                return Array.isArray(v) ? v[0] : v ?? null
              },
            },
            json: () => {
              const text = body.toString()
              if (!text) return Promise.resolve(null)
              try {
                return Promise.resolve(JSON.parse(text))
              } catch {
                return Promise.reject(new Error('Resposta inválida (não é JSON)'))
              }
            },
            text: () => Promise.resolve(body.toString()),
            arrayBuffer: () => Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
            body,
          }
          resolve(responseObj)
        })
      })
      req.on('error', (err) => {
        clearTimeout(timeoutId)
        console.log('[megaDownload] [FETCH] Erro de conexão:', shortUrl, '|', err.message)
        reject(err)
      })
      if (opts.body != null) {
        const body = typeof opts.body === 'string' ? opts.body : opts.body
        req.write(body)
      }
      req.end()
    })
  }
  return function fetchWithAgent(url, opts = {}) {
    return doFetch(url, opts, 0)
  }
}

/** Número de conta válido: 10 a 15 dígitos (Telegram user ID / número). */
function isNumeroConta(name) {
  return /^\d{10,15}$/.test(String(name))
}

/**
 * Encontra o número da conta dentro de uma pasta: subpasta com nome numérico ou arquivo .session com número no nome.
 * @returns {string[]} Lista de números encontrados (sem duplicatas).
 */
function encontrarNumerosNaPasta(pastaPath, nivel = 0) {
  const numeros = []
  if (nivel > 2) return numeros
  try {
    const items = fs.readdirSync(pastaPath, { withFileTypes: true })
    for (const item of items) {
      if (item.isDirectory()) {
        if (isNumeroConta(item.name)) {
          if (!numeros.includes(item.name)) numeros.push(item.name)
        } else if (nivel < 2) {
          numeros.push(...encontrarNumerosNaPasta(path.join(pastaPath, item.name), nivel + 1))
        }
      } else if (item.isFile() && item.name.endsWith('.session')) {
        const numero = path.basename(item.name, '.session')
        if (isNumeroConta(numero) && !numeros.includes(numero)) numeros.push(numero)
      }
    }
  } catch {
    // ignora
  }
  return numeros
}

/**
 * Se dentro da pasta houver exatamente um número de conta, renomeia a pasta para esse número.
 */
function renomearPastaParaNumeroSeUnico(pastaPath) {
  const numeros = encontrarNumerosNaPasta(pastaPath)
  if (numeros.length !== 1) return
  const numero = numeros[0]
  const dir = path.dirname(pastaPath)
  const novoPath = path.join(dir, numero)
  if (novoPath === pastaPath) return
  if (fs.existsSync(novoPath)) return
  try {
    fs.renameSync(pastaPath, novoPath)
    console.log('[megaDownload] Pasta renomeada para o número:', numero)
  } catch (e) {
    console.warn('[megaDownload] Não foi possível renomear pasta:', e.message)
  }
}

/**
 * Carrega baseDir e pastaBaseTelegram do configuracoes-gerais.json (se existir).
 * Usa fallbacks portáteis relativos ao projeto quando não configurado.
 */
function loadConfig() {
  try {
    const configPath = path.join(PATHS.BASE, 'configuracoes-gerais.json')
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content)
      return {
        baseDir: config.megaDownloadBaseDir || getDefaultBaseDir(),
        pastaBaseTelegram: config.pastaBaseTelegram || config.pastaTelegramPortatil || null,
      }
    }
  } catch (e) {
    // ignora
  }
  return {
    baseDir: getDefaultBaseDir(),
    pastaBaseTelegram: null,
  }
}

/** Pasta numérica: 10–15 dígitos (mesmo critério que número de conta). */
function isPastaNumerica(name) {
  return /^\d{10,15}$/.test(String(name))
}

/**
 * Encontra a primeira pasta "tdata" sob raiz (recursivo, até 4 níveis).
 * @returns {string | null} Caminho absoluto da pasta tdata ou null.
 */
function encontrarTdata(raiz, nivel = 0) {
  if (nivel > 4) return null
  try {
    const items = fs.readdirSync(raiz, { withFileTypes: true })
    for (const item of items) {
      if (!item.isDirectory()) continue
      const itemPath = path.join(raiz, item.name)
      if (item.name === 'tdata') return itemPath
      const found = encontrarTdata(itemPath, nivel + 1)
      if (found) return found
    }
  } catch {
    // ignora
  }
  return null
}

/**
 * Encontra o primeiro "TwoFA" (arquivo ou pasta) sob raiz (recursivo, até 4 níveis).
 * @returns {string | null} Caminho absoluto ou null.
 */
function encontrarTwoFA(raiz, nivel = 0) {
  if (nivel > 4) return null
  try {
    const items = fs.readdirSync(raiz, { withFileTypes: true })
    for (const item of items) {
      const itemPath = path.join(raiz, item.name)
      if (item.name === 'TwoFA') return itemPath
      if (item.isDirectory()) {
        const found = encontrarTwoFA(itemPath, nivel + 1)
        if (found) return found
      }
    }
  } catch {
    // ignora
  }
  return null
}

/** Copia diretório recursivamente (não esvazia; copia pasta inteira). */
function copyDirRecursive(source, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  const items = fs.readdirSync(source)
  for (const item of items) {
    const srcPath = path.join(source, item)
    const destPath = path.join(dest, item)
    const stat = fs.statSync(srcPath)
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/** Mescla conteúdo de sourceDir em destDir e depois remove sourceDir. */
function mergeDirInto(sourceDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const items = fs.readdirSync(sourceDir)
  for (const item of items) {
    const srcPath = path.join(sourceDir, item)
    const destPath = path.join(destDir, item)
    const stat = fs.statSync(srcPath)
    if (stat.isDirectory()) {
      if (fs.existsSync(destPath)) mergeDirInto(srcPath, destPath)
      else fs.renameSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      fs.unlinkSync(srcPath)
    }
  }
  try {
    fs.rmdirSync(sourceDir)
  } catch {
    // pode falhar se não estiver vazia
  }
}

/**
 * Copia apenas Telegram (ou Telegram.exe) e a pasta modules da pasta portátil para a pasta central.
 * Usado quando o conteúdo baixado (ex.: zip) já vem com tdata; só falta o cliente e os módulos.
 */
function copiarTelegramEModulosParaPasta(centralPath, pastaBaseTelegram) {
  if (!fs.existsSync(centralPath) || !fs.statSync(centralPath).isDirectory()) return
  if (!pastaBaseTelegram || !fs.existsSync(pastaBaseTelegram)) return

  const items = fs.readdirSync(pastaBaseTelegram, { withFileTypes: true })
  for (const item of items) {
    const srcPath = path.join(pastaBaseTelegram, item.name)
    const destPath = path.join(centralPath, item.name)
    if (item.name !== 'Telegram' && item.name !== 'Telegram.exe' && item.name !== 'modules') continue
    try {
      if (item.isDirectory()) {
        if (item.name === 'modules' && !fs.existsSync(destPath)) {
          copyDirRecursive(srcPath, destPath)
          console.log('[megaDownload] modules copiado em:', centralPath)
        }
      } else {
        if ((item.name === 'Telegram' || item.name === 'Telegram.exe') && !fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath)
          console.log('[megaDownload]', item.name, 'copiado em:', centralPath)
        }
      }
    } catch (e) {
      console.warn('[megaDownload] Erro ao copiar', item.name, ':', e.message)
    }
  }
}

/**
 * Consolida uma pasta central do número: traz tdata e TwoFA para a raiz e copia Telegram + modules da pasta portátil.
 * @param {object} opts - { apenasTelegramModulos: true } para só copiar Telegram e modules (sem mover tdata/TwoFA).
 */
function consolidarPastaNumero(centralPath, pastaBaseTelegram, opts = {}) {
  if (!fs.existsSync(centralPath) || !fs.statSync(centralPath).isDirectory()) return
  if (!pastaBaseTelegram || !fs.existsSync(pastaBaseTelegram)) return

  if (opts.apenasTelegramModulos) {
    copiarTelegramEModulosParaPasta(centralPath, pastaBaseTelegram)
    return
  }

  const destTdata = path.join(centralPath, 'tdata')
  const destTwoFA = path.join(centralPath, 'TwoFA')

  const foundTdata = encontrarTdata(centralPath)
  if (foundTdata && path.resolve(foundTdata) !== path.resolve(destTdata)) {
    try {
      if (fs.existsSync(destTdata)) mergeDirInto(foundTdata, destTdata)
      else fs.renameSync(foundTdata, destTdata)
      console.log('[megaDownload] tdata consolidado em:', centralPath)
    } catch (e) {
      console.warn('[megaDownload] Erro ao consolidar tdata:', e.message)
    }
  }

  const foundTwoFA = encontrarTwoFA(centralPath)
  if (foundTwoFA && path.resolve(foundTwoFA) !== path.resolve(destTwoFA)) {
    try {
      if (fs.existsSync(destTwoFA)) fs.rmSync(destTwoFA, { recursive: true })
      fs.renameSync(foundTwoFA, destTwoFA)
      console.log('[megaDownload] TwoFA consolidado em:', centralPath)
    } catch (e) {
      console.warn('[megaDownload] Erro ao consolidar TwoFA:', e.message)
    }
  }

  copiarTelegramEModulosParaPasta(centralPath, pastaBaseTelegram)
  removerSubpastasVazias(centralPath, 0, 3)
}

/** Remove subpastas vazias recursivamente (max níveis). */
function removerSubpastasVazias(raiz, nivel, maxNivel) {
  if (nivel >= maxNivel) return
  try {
    const items = fs.readdirSync(raiz, { withFileTypes: true })
    for (const item of items) {
      if (!item.isDirectory()) continue
      const itemPath = path.join(raiz, item.name)
      removerSubpastasVazias(itemPath, nivel + 1, maxNivel)
      if (fs.readdirSync(itemPath).length === 0) fs.rmdirSync(itemPath)
    }
  } catch {
    // ignora
  }
}

/**
 * Para cada pasta numérica em baseDir, executa consolidarPastaNumero (ou só Telegram+modules se opts.apenasTelegramModulos).
 */
function consolidarPastasNumeros(baseDir, pastaBaseTelegram, opts = {}) {
  if (!fs.existsSync(baseDir)) return
  try {
    const items = fs.readdirSync(baseDir, { withFileTypes: true })
    for (const item of items) {
      if (!item.isDirectory() || !isPastaNumerica(item.name)) continue
      const centralPath = path.join(baseDir, item.name)
      consolidarPastaNumero(centralPath, pastaBaseTelegram, opts)
    }
  } catch (e) {
    console.warn('[megaDownload] Erro ao consolidar pastas:', e.message)
  }
}

/**
 * Se a pasta tiver um único item e for diretório, move o conteúdo dele para a pasta e remove o subdiretório (achata um nível).
 */
function achatarPastaSeUnicoFilho(pasta) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) return
  const itens = fs.readdirSync(pasta, { withFileTypes: true })
  if (itens.length !== 1 || !itens[0].isDirectory()) return
  const subPasta = path.join(pasta, itens[0].name)
  const filhos = fs.readdirSync(subPasta, { withFileTypes: true })
  for (const f of filhos) {
    const src = path.join(subPasta, f.name)
    const dest = path.join(pasta, f.name)
    fs.renameSync(src, dest)
  }
  fs.rmdirSync(subPasta)
  console.log('[megaDownload] Pasta achatada (conteúdo de', itens[0].name, 'movido para a raiz)')
}

/**
 * Extrai um arquivo .zip em destDir e remove o .zip.
 * @param {string} zipPath - Caminho do arquivo .zip
 * @param {string} destDir - Pasta de destino da extração (usa absoluto)
 */
function extrairZipERemover(zipPath, destDir) {
  if (!fs.existsSync(zipPath) || !path.basename(zipPath).toLowerCase().endsWith('.zip')) return
  const destAbs = path.resolve(destDir)
  if (!fs.existsSync(destAbs)) fs.mkdirSync(destAbs, { recursive: true })
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(destAbs, true)
  fs.unlinkSync(zipPath)
  achatarPastaSeUnicoFilho(destAbs)
  console.log('[megaDownload] ZIP extraído e arquivo removido:', path.basename(zipPath))
}

/**
 * Tenta extrair .rar usando UnRAR.exe (WinRAR) ou 7z.exe (7-Zip) no Windows.
 * @returns {boolean} true se extraiu com sucesso
 */
function extrairRarComExterno(rarPathAbs, destAbs) {
  const destComBarra = destAbs.endsWith(path.sep) ? destAbs : destAbs + path.sep
  const candidatos = [
    'C:\\Program Files\\WinRAR\\UnRAR.exe',
    'C:\\Program Files (x86)\\WinRAR\\UnRAR.exe',
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ]
  for (const exe of candidatos) {
    if (!fs.existsSync(exe)) continue
    if (exe.includes('7z')) {
      const ret = spawnSync(exe, ['x', rarPathAbs, '-o' + destAbs, '-y'], {
        windowsHide: true,
        timeout: 60000,
      })
      if (ret.status === 0) {
        console.log('[megaDownload] RAR extraído com 7-Zip')
        return true
      }
    } else {
      const ret = spawnSync(exe, ['x', '-o+', rarPathAbs, destComBarra], {
        windowsHide: true,
        timeout: 60000,
      })
      if (ret.status === 0) {
        console.log('[megaDownload] RAR extraído com UnRAR (WinRAR)')
        return true
      }
    }
  }
  return false
}

/**
 * Extrai um arquivo .rar em destDir e remove o .rar.
 * Tenta primeiro UnRAR/7-Zip (Windows), depois node-unrar-js.
 */
async function extrairRarERemover(rarPath, destDir) {
  const base = path.basename(rarPath).toLowerCase()
  if (!fs.existsSync(rarPath) || !base.endsWith('.rar')) return
  const rarPathAbs = path.resolve(rarPath)
  const destAbs = path.resolve(destDir)
  if (!fs.existsSync(destAbs)) fs.mkdirSync(destAbs, { recursive: true })

  let ok = false
  if (extrairRarComExterno(rarPathAbs, destAbs)) {
    ok = true
  }
  if (!ok) {
    try {
      const unrar = await import('node-unrar-js/esm')
      let wasmBinary
      try {
        const p = require.resolve('node-unrar-js/package.json')
        const wasmPath = path.join(path.dirname(p), 'esm', 'js', 'unrar.wasm')
        if (fs.existsSync(wasmPath)) wasmBinary = new Uint8Array(fs.readFileSync(wasmPath)).buffer
      } catch (_) {}
      const extractor = await unrar.createExtractorFromFile({
        filepath: rarPathAbs,
        targetPath: destAbs,
        ...(wasmBinary && { wasmBinary }),
      })
      const list = extractor.getFileList()
      ;[...list.fileHeaders]
      const result = extractor.extract()
      ;[...result.files]
      console.log('[megaDownload] RAR extraído com node-unrar-js')
      ok = true
    } catch (e) {
      console.warn('[megaDownload] Erro ao extrair RAR:', e.message)
      throw new Error('Falha ao extrair RAR. Instale WinRAR ou 7-Zip (UnRAR) ou verifique o arquivo. ' + e.message)
    }
  }
  if (ok) {
    achatarPastaSeUnicoFilho(destAbs)
    fs.unlinkSync(rarPathAbs)
    console.log('[megaDownload] RAR removido após extração:', path.basename(rarPath))
  }
}

/**
 * Baixa um arquivo MEGA para destDir (stream para disco).
 */
async function downloadFile(node, destDir) {
  const destPath = path.join(destDir, node.name)
  const stream = node.download()
  const writeStream = fs.createWriteStream(destPath)
  return new Promise((resolve, reject) => {
    stream.on('error', reject)
    writeStream.on('error', reject)
    writeStream.on('finish', resolve)
    stream.pipe(writeStream)
  })
}

/**
 * Baixa um nó (arquivo ou pasta) para destDir.
 * Não chama loadAttributes nos filhos: no megajs, filhos de pasta compartilhada já têm
 * name e metadados preenchidos pela resposta do loadAttributes do pai. Chamar de novo
 * nos filhos dispara requisições com formato diferente e a API MEGA retorna EARGS (-2).
 */
async function downloadNode(node, destDir) {
  if (!node.name) return
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  if (hasChildren) {
    const folderPath = path.join(destDir, node.name)
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })
    for (const child of node.children) {
      await downloadNode(child, folderPath)
    }
  } else {
    await downloadFile(node, destDir)
  }
}

/**
 * Baixa uma lista de links MEGA.nz usando a biblioteca megajs (sem megadl.exe).
 */
export async function baixarLinksMega(listaLinks, options = {}) {
  const config = loadConfig()
  const baseDir = options.baseDir ?? config.baseDir

  if (!listaLinks || !Array.isArray(listaLinks) || listaLinks.length === 0) {
    return { sucesso: 0, erros: [] }
  }

  const urls = listaLinks
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => u && (u.includes('mega.nz') || u.includes('mega.co.nz')))

  if (urls.length === 0) {
    return { sucesso: 0, erros: [] }
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }

  let File
  let API
  try {
    const megajs = await import('megajs')
    File = megajs.File
    API = megajs.API
  } catch (e) {
    console.error('[megaDownload] megajs não instalado. Execute: npm install megajs')
    const msg = 'Biblioteca megajs não encontrada. Execute "npm install" na pasta do projeto.'
    return {
      sucesso: 0,
      erros: urls.map((url) => ({ url, message: msg })),
    }
  }

  // MEGA: não usar proxy para evitar 403/bloqueio do CDN (gfs*.userstorage.mega.co.nz)
  const megaApi = API.getGlobalApi()
  megaApi.userAgent = megaApi.userAgent || 'MEGA-Painel/1.0 (+https://mega.nz)'

  let sucesso = 0
  const erros = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const index = i + 1
    const total = urls.length
    console.log(`[megaDownload] Iniciando download [${index}/${total}]: ${url}`)

    try {
      console.log('[megaDownload] [LOG] Criando nó File.fromURL...')
      const node = File.fromURL(url, {
        api: megaApi,
      })
      if (!node.api.userAgent) node.api.userAgent = 'MEGA-Painel/1.0 (+https://mega.nz)'
      console.log('[megaDownload] [LOG] Chamando loadAttributes() (pode travar aqui se proxy/servidor não responder)...')
      await node.loadAttributes()
      console.log('[megaDownload] [LOG] loadAttributes() concluído.')

      const hasChildren = Array.isArray(node.children) && node.children.length > 0
      console.log('[megaDownload] [LOG] É pasta?', hasChildren, '| Nome do nó:', node.name || '(vazio)')
      if (hasChildren) {
        const folderPath = path.join(baseDir, node.name || `link_${index}`)
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })
        for (const child of node.children) {
          await downloadNode(child, folderPath)
        }
        renomearPastaParaNumeroSeUnico(folderPath)
      } else {
        const fileName = node.name || `arquivo_${index}`
        const destPath = path.join(baseDir, fileName)
        console.log('[megaDownload] [LOG] Iniciando stream de download para:', fileName)
        const stream = node.download()
        const writeStream = fs.createWriteStream(destPath)
        stream.on('data', (chunk) => {
          if (!stream._loggedFirstChunk) {
            stream._loggedFirstChunk = true
            console.log('[megaDownload] [LOG] Primeiro chunk de dados recebido.')
          }
        })
        await new Promise((resolve, reject) => {
          stream.on('error', (err) => {
            console.log('[megaDownload] [LOG] Erro no stream:', err.message)
            reject(err)
          })
          writeStream.on('error', (err) => {
            console.log('[megaDownload] [LOG] Erro no writeStream:', err.message)
            reject(err)
          })
          writeStream.on('finish', () => {
            console.log('[megaDownload] [LOG] Gravação em disco finalizada.')
            resolve()
          })
          stream.pipe(writeStream)
        })
        const nomeLower = fileName.toLowerCase()
        if (nomeLower.endsWith('.zip') || nomeLower.endsWith('.rar')) {
          const ext = nomeLower.endsWith('.zip') ? '.zip' : '.rar'
          const nomeSemExt = path.basename(fileName, ext)
          const pastaNumero = path.join(baseDir, nomeSemExt)
          if (!fs.existsSync(pastaNumero)) fs.mkdirSync(pastaNumero, { recursive: true })
          try {
            if (nomeLower.endsWith('.zip')) {
              extrairZipERemover(destPath, pastaNumero)
            } else {
              await extrairRarERemover(destPath, pastaNumero)
            }
            if (options.adicionarExtras === true) {
              const cfg = loadConfig()
              copiarTelegramEModulosParaPasta(path.resolve(pastaNumero), cfg.pastaBaseTelegram)
            }
          } catch (e) {
            console.warn('[megaDownload] Erro ao extrair:', e.message)
          }
        }
      }
      console.log(`[megaDownload] Sucesso [${index}/${total}]`)
      sucesso++
    } catch (error) {
      const msg = error.message || String(error)
      console.error(`[megaDownload] Erro no link [${index}]: ${msg}`)
      if (error.stack) console.error('[megaDownload] [LOG] Stack:', error.stack)
      erros.push({ url, message: msg })
    }
  }

  if (options.adicionarExtras === true) {
    const cfg = loadConfig()
    // MEGA: conteúdo (zip/pasta) já vem com tdata; só adicionar Telegram portátil e modules
    consolidarPastasNumeros(baseDir, cfg.pastaBaseTelegram, { apenasTelegramModulos: true })
  }

  return { sucesso, erros }
}

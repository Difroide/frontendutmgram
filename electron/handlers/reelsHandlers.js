import { ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { spawn } from 'child_process'
import { getMainWindow } from '../window/windowManager.js'
import { PATHS } from '../config/paths.js'
import { trackChildProcess } from '../main.js'

const YT_DLP_CMD_DEFAULT = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
// Pasta padrão do yt-dlp (usada quando o usuário não informa caminho)
const YT_DLP_DEFAULT_DIR = 'C:\\Operação\\YT DLP'
const YT_DLP_DEFAULT_EXE = path.join(YT_DLP_DEFAULT_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')

function getYtDlpExecutable(customPath) {
  const trimmed = typeof customPath === 'string' ? customPath.trim() : ''
  if (trimmed && fs.existsSync(trimmed)) return trimmed
  if (fs.existsSync(YT_DLP_DEFAULT_EXE)) return YT_DLP_DEFAULT_EXE
  return YT_DLP_CMD_DEFAULT
}

function isValidReelUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  return u.length > 0 && u.includes('instagram.com') && u.includes('reel')
}

function normalizeUrls(input) {
  if (Array.isArray(input)) {
    return input.map(s => String(s).trim()).filter(isValidReelUrl)
  }
  if (typeof input === 'string') {
    return input
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(isValidReelUrl)
  }
  return []
}

/**
 * Converte string de cookies no formato do extractor (name=value;name2=value2)
 * para arquivo Netscape que o yt-dlp aceita com --cookies.
 * Retorna o caminho do arquivo temporário ou null se não houver cookies válidos.
 */
function writeCookiesFileNetscape(cookiesString) {
  const trimmed = typeof cookiesString === 'string' ? cookiesString.trim() : ''
  if (!trimmed) return null
  const pairs = trimmed.split(';').map(s => s.trim()).filter(Boolean)
  const lines = ['# Netscape HTTP Cookie File', '# https://instagram.com']
  const domain = '.instagram.com'
  const pathStr = '/'
  const secure = 'FALSE'
  const expiration = '0' // session
  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (!name) continue
    // Netscape: domain \t flag \t path \t secure \t expiration \t name \t value
    lines.push([domain, 'TRUE', pathStr, secure, expiration, name, value].join('\t'))
  }
  if (lines.length <= 2) return null
  const tmpDir = os.tmpdir()
  const cookiesPath = path.join(tmpDir, `painel-instagram-cookies-${Date.now()}.txt`)
  fs.writeFileSync(cookiesPath, lines.join('\n') + '\n', 'utf8')
  return cookiesPath
}

function runOneUrl(url, outputDir, sender, ytDlpExe, cookiesFromBrowser, cookiesFilePath) {
  return new Promise((resolve) => {
    const outputTemplate = path.join(outputDir, '%(id)s.%(ext)s')
    const args = [
      '--no-check-certificate',
      '-o', outputTemplate,
      '--no-warnings',
      '--quiet',
      '--progress'
    ]
    if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
      args.push('--cookies', cookiesFilePath)
    } else if (cookiesFromBrowser && typeof cookiesFromBrowser === 'string' && cookiesFromBrowser.trim()) {
      args.push('--cookies-from-browser', cookiesFromBrowser.trim())
    }
    args.push(url)
    const useShell = process.platform === 'win32' && !path.isAbsolute(ytDlpExe) && !ytDlpExe.includes(path.sep)
    const child = spawn(ytDlpExe, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: useShell
    })
    trackChildProcess(child)

    let stderr = ''
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString() })
    child.stdout?.on('data', () => {})

    child.on('close', (code, signal) => {
      const success = code === 0
      const errorMsg = success ? null : (stderr.trim() || `Exit code ${code}`)
      resolve({ url, success, error: errorMsg })
    })

    child.on('error', (err) => {
      resolve({ url, success: false, error: err.message })
    })
  })
}

async function runWithConcurrency(urls, outputDir, concurrency, sender, ytDlpExe, cookiesFromBrowser, cookiesFilePath) {
  const total = urls.length
  let completed = 0
  const errors = []
  let running = 0
  let index = 0

  const sendProgress = (currentUrl, success, error, fileName) => {
    completed += 1
    try {
      sender.send('download-reels-progress', {
        completed,
        total,
        currentUrl,
        success,
        error: error || undefined,
        fileName: fileName || undefined
      })
    } catch (e) {
      console.warn('[reels] send progress:', e?.message)
    }
  }

  const runNext = async () => {
    while (index < urls.length && running < concurrency) {
      const url = urls[index]
      index += 1
      running += 1
      runOneUrl(url, outputDir, sender, ytDlpExe, cookiesFromBrowser, cookiesFilePath).then(({ url: u, success, error }) => {
        running -= 1
        if (!success) errors.push({ url: u, error: error || 'Unknown error' })
        sendProgress(u, success, error, null)
        runNext()
      })
    }
    if (running === 0 && index >= urls.length) return
  }

  await new Promise((resolve) => {
    const checkDone = () => {
      if (completed >= total) resolve()
      else setTimeout(checkDone, 100)
    }
    runNext()
    checkDone()
  })

  return { completed, failed: errors.length, errors }
}

const INSTA3_DIR = path.join(PATHS.BASE, '..', 'Insta3')
const INSTA3_SCRIPT = path.join(INSTA3_DIR, 'run-extract-reels.js')
const INSTA3_ANALYZE_SCRIPT = path.join(INSTA3_DIR, 'run-analyze-reels.js')
/** Pasta específica para relatórios (links extraídos de Reels) */
const RELATORIOS_DIR = path.join(PATHS.BASE, 'relatorios')

function extractReelLinksFromStdout(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
  const lastLine = lines[lines.length - 1]
  if (!lastLine || !lastLine.includes(path.sep) || !lastLine.endsWith('.txt')) return null
  return lastLine.trim()
}

function extractAnalyzeResultFromStdout(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
  const lastLine = lines[lines.length - 1]
  if (!lastLine || !lastLine.includes(path.sep) || !lastLine.endsWith('.json')) return null
  return lastLine.trim()
}

/** Analisa metadados (views, curtidas, etc.) via yt-dlp --dump-json.
 * O Instagram só retorna view_count quando há sessão logada. Use cookiesFromBrowser (ex: "chrome") ou cookiesFilePath.
 */
async function analyzeReelsWithYtDlp(urls, cookiesFilePath, cookiesFromBrowser, ytDlpExe, sender, concurrency = 3) {
  const results = []
  let index = 0

  const analyzeOne = async (url) => {
    return new Promise((resolve) => {
      const args = ['--dump-json', '--no-download', '--no-warnings', '--no-check-certificate', '-q']
      if (cookiesFromBrowser && typeof cookiesFromBrowser === 'string' && cookiesFromBrowser.trim()) {
        args.push('--cookies-from-browser', cookiesFromBrowser.trim())
      } else if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
        args.push('--cookies', cookiesFilePath)
      }
      args.push(url)
      const useShell = process.platform === 'win32' && !path.isAbsolute(ytDlpExe) && !ytDlpExe.includes(path.sep)
      const child = spawn(ytDlpExe, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell })
      trackChildProcess(child)
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (c) => { stdout += c.toString() })
      child.stderr?.on('data', (c) => { stderr += c.toString() })
      child.on('close', (code) => {
        if (code !== 0) {
          resolve({ url, views: null, likes: null, comments: null, description: null })
          return
        }
        try {
          const data = JSON.parse(stdout)
          const views = data?.view_count ?? data?.play_count ?? null
          const likes = data?.like_count ?? null
          const comments = data?.comment_count ?? null
          const desc = (data?.description ?? data?.title ?? '')?.trim() || null
          resolve({ url, views, likes, comments, description: desc })
        } catch (_) {
          resolve({ url, views: null, likes: null, comments: null, description: null })
        }
      })
      child.on('error', () => resolve({ url, views: null, likes: null, comments: null, description: null }))
    })
  }

  const runNext = async () => {
    while (index < urls.length) {
      const batch = []
      while (batch.length < concurrency && index < urls.length) {
        batch.push(analyzeOne(urls[index]))
        index++
      }
      if (batch.length) {
        const batchRes = await Promise.all(batch)
        results.push(...batchRes)
      }
    }
  }

  await runNext()
  return { success: true, data: results, error: null }
}

async function runAnalyzeReels(urls, cookiesFilePath, sender) {
  const urlsFile = path.join(os.tmpdir(), `painel-insta3-urls-${Date.now()}.txt`)
  fs.writeFileSync(urlsFile, urls.join('\n'), 'utf8')
  const args = [INSTA3_ANALYZE_SCRIPT, '--urls-file', urlsFile]
  if (cookiesFilePath && fs.existsSync(cookiesFilePath)) args.push('--cookies', cookiesFilePath)
  const child = spawn(process.execPath || 'node', args, { cwd: INSTA3_DIR, stdio: ['ignore', 'pipe', 'pipe'] })
  trackChildProcess(child)
  let stdout = ''
  let stderr = ''
  const sendLog = (line, type) => {
    try { sender?.send?.('reels-insta3-log', { line, type }) } catch (_) {}
  }
  child.stdout?.on('data', (c) => {
    const s = c.toString()
    stdout += s
    sendLog(s, 'stdout')
  })
  child.stderr?.on('data', (c) => {
    const s = c.toString()
    stderr += s
    sendLog(s, 'stderr')
  })
  await new Promise((resolve, reject) => {
    child.on('close', (code) => resolve(code))
    child.on('error', reject)
  })
  try { fs.unlinkSync(urlsFile) } catch (_) {}
  const resultPath = extractAnalyzeResultFromStdout(stdout)
  if (!resultPath || !fs.existsSync(resultPath)) return { success: false, data: [], error: stderr.trim() || 'Arquivo de resultado não encontrado' }
  const content = fs.readFileSync(resultPath, 'utf8')
  try { fs.unlinkSync(resultPath) } catch (_) {}
  const data = content.split(/\r?\n/).filter(Boolean).map(line => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
  return { success: true, data, error: null }
}

function formatReelBlock(fullUrl, s) {
  const likes = s?.likes != null ? String(s.likes) : '-'
  const comments = s?.comments != null ? String(s.comments) : '-'
  const views = s?.views != null ? String(s.views) : '-'
  const desc = (s?.description != null && String(s.description).trim()) ? String(s.description).trim().replace(/\r?\n/g, ' ') : '-'
  return [
    '==================================================',
    `VIDEO: ${fullUrl}`,
    '--------------------------------------------------',
    `CURTIDAS: ${likes}`,
    `COMENTÁRIOS: ${comments}`,
    `VISUALIZAÇÕES: ${views}`,
    `DESCRIÇÃO: ${desc}`,
    '==================================================',
    ''
  ].join('\n')
}

function writeReportWithStats(usernames, links, statsData, reportPath) {
  const now = new Date()
  const dateStr = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
  const statsMap = new Map()
  const toFull = (u) => (u && u.startsWith('http') ? u : `https://www.instagram.com${u || ''}`)
  for (const s of statsData) {
    const u = (s.url || '').trim()
    if (!u) continue
    statsMap.set(u, s)
    if (!u.startsWith('http')) statsMap.set(toFull(u), s)
  }
  const header = [
    '==================================================',
    'Relatório de Reels (Insta3 / Playwright)',
    '==================================================',
    `Data: ${dateStr}`,
    `Perfis: ${usernames.join(', ')}`,
    `Total de vídeos: ${links.length}`,
    '==================================================',
    ''
  ].join('\n')
  const blocks = links.map(url => {
    const full = url.startsWith('http') ? url : toFull(url)
    const s = statsMap.get(full) || statsMap.get(url)
    return formatReelBlock(full, s)
  })
  fs.writeFileSync(reportPath, header + blocks.join(''), 'utf8')
  const csvPath = reportPath.replace(/\.txt$/, '.csv')
  const csvHeader = 'URL;Curtidas;Comentários;Visualizações;Descrição\n'
  const csvRows = links.map(url => {
    const full = url.startsWith('http') ? url : toFull(url)
    const s = statsMap.get(full) || statsMap.get(url)
    const v = s?.views != null ? s.views : ''
    const l = s?.likes != null ? s.likes : ''
    const c = s?.comments != null ? s.comments : ''
    const d = (s?.description || '').replace(/"/g, '""').replace(/\n/g, ' ')
    return `"${full}";${l};${c};${v};"${d}"`
  })
  fs.writeFileSync(csvPath, '\uFEFF' + csvHeader + csvRows.join('\n') + '\n', 'utf8')
  return csvPath
}

export function registerReelsHandlers() {
  ipcMain.handle('reels-extract-links-insta3', async (event, { usernames: usernamesInput, cookiesString: cookiesStringInput, cookiesFromBrowser: cookiesFromBrowserInput, includeStats: includeStatsInput, ytDlpPath: ytDlpPathInput }) => {
    const usernames = Array.isArray(usernamesInput)
      ? usernamesInput.map(u => String(u).trim()).filter(Boolean)
      : []
    const includeStats = includeStatsInput === true
    if (usernames.length === 0) {
      return { success: false, links: [], reportPath: null, csvPath: null, error: 'Nenhum usuário informado.' }
    }
    if (!fs.existsSync(INSTA3_SCRIPT)) {
      return { success: false, links: [], reportPath: null, csvPath: null, error: `Script Insta3 não encontrado: ${INSTA3_SCRIPT}` }
    }

    let cookiesFilePath = null
    const cookiesString = typeof cookiesStringInput === 'string' ? cookiesStringInput.trim() : ''
    if (cookiesString) {
      cookiesFilePath = writeCookiesFileNetscape(cookiesString)
    }

    const args = [INSTA3_SCRIPT]
    if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
      args.push('--cookies', cookiesFilePath)
    }
    args.push(...usernames)

    return new Promise((resolve) => {
      const sender = event.sender
      const sendLog = (line, type) => {
        try { sender?.send?.('reels-insta3-log', { line, type }) } catch (_) {}
      }
      const child = spawn(process.execPath || 'node', args, {
        cwd: INSTA3_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      trackChildProcess(child)
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (c) => {
        const s = c.toString()
        stdout += s
        sendLog(s, 'stdout')
      })
      child.stderr?.on('data', (c) => {
        const s = c.toString()
        stderr += s
        sendLog(s, 'stderr')
      })

      const cleanup = () => {
        if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
          try { fs.unlinkSync(cookiesFilePath) } catch (err) { console.warn('[reels] remover cookies temp extract:', err?.message) }
        }
      }

      child.on('close', async (code) => {
        const resultPath = extractReelLinksFromStdout(stdout)
        if (code !== 0) {
          cleanup()
          resolve({ success: false, links: [], reportPath: null, csvPath: null, error: stderr.trim() || `Processo saiu com código ${code}` })
          return
        }
        if (!resultPath || !fs.existsSync(resultPath)) {
          cleanup()
          resolve({ success: false, links: [], reportPath: null, csvPath: null, error: 'Arquivo de resultado não encontrado.' })
          return
        }
        try {
          const content = fs.readFileSync(resultPath, 'utf8')
          fs.unlinkSync(resultPath)
          const links = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && l.includes('instagram.com') && l.includes('reel'))
          let reportPath = null
          let csvPath = null
          try {
            if (!fs.existsSync(RELATORIOS_DIR)) fs.mkdirSync(RELATORIOS_DIR, { recursive: true })
            const now = new Date()
            const dateStr = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
            const safeDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
            const fileName = `relatorio_reels_${safeDate}.txt`
            reportPath = path.join(RELATORIOS_DIR, fileName)
            const header = [
              '==================================================',
              'Relatório de Reels (Insta3 / Playwright)',
              '==================================================',
              `Data: ${dateStr}`,
              `Perfis: ${usernames.join(', ')}`,
              `Total de vídeos: ${links.length}`,
              '==================================================',
              ''
            ].join('\n')
            const toFullUrl = (u) => (u.startsWith('http') ? u : `https://www.instagram.com${u}`)
            const blocks = links.map(url => formatReelBlock(toFullUrl(url), null))
            fs.writeFileSync(reportPath, header + blocks.join(''), 'utf8')
            sendLog(`\nRelatório salvo em: ${reportPath}\n`, 'stdout')
          } catch (err) {
            console.warn('[reels] Erro ao salvar relatório:', err?.message)
          }
          if (!includeStats) cleanup()
          resolve({ success: true, links, reportPath, csvPath, error: null })
          if (includeStats && links.length > 0) {
            sendLog('\n--- Análise de views/curtidas em segundo plano (yt-dlp)... ---\n', 'stdout')
            const ytDlpExe = getYtDlpExecutable(ytDlpPathInput ?? null)
            const browser = typeof cookiesFromBrowserInput === 'string' ? cookiesFromBrowserInput.trim() : null
            analyzeReelsWithYtDlp(links, cookiesFilePath, browser, ytDlpExe, sender, 6).then((analyzeRes) => {
              if (analyzeRes.success && reportPath) {
                writeReportWithStats(usernames, links, analyzeRes.data || [], reportPath)
                try { sender?.send?.('reels-insta3-log', { line: `\nAnálise concluída. Relatório atualizado com views e curtidas: ${reportPath}\n`, type: 'stdout' }) } catch (_) {}
                try { sender?.send?.('reels-analysis-complete', { reportPath }) } catch (_) {}
              }
              cleanup()
            }).catch(() => { cleanup() })
          }
        } catch (e) {
          cleanup()
          resolve({ success: false, links: [], reportPath: null, csvPath: null, error: e?.message || String(e) })
        }
      })

      child.on('error', (e) => {
        cleanup()
        resolve({ success: false, links: [], reportPath: null, csvPath: null, error: e?.message || String(e) })
      })
    })
  })

  ipcMain.handle('reels-analyze-stats', async (event, { urls: urlsInput, cookiesString: cookiesStringInput, cookiesFromBrowser, ytDlpPath }) => {
    const urls = normalizeUrls(urlsInput || [])
    if (urls.length === 0) {
      return { success: false, data: [], reportPath: null, csvPath: null, error: 'Nenhum link válido de Reel informado.' }
    }
    let cookiesFilePath = null
    const cookiesString = typeof cookiesStringInput === 'string' ? cookiesStringInput.trim() : ''
    if (cookiesString) cookiesFilePath = writeCookiesFileNetscape(cookiesString)
    const browser = typeof cookiesFromBrowser === 'string' ? cookiesFromBrowser.trim() : null
    const ytDlpExe = getYtDlpExecutable(ytDlpPath)
    let analyzeRes
    try {
      analyzeRes = await analyzeReelsWithYtDlp(urls, cookiesFilePath, browser, ytDlpExe, event.sender, 6)
    } catch (e) {
      analyzeRes = { success: false, data: [], error: e?.message || 'Erro na análise via yt-dlp' }
    }
    if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
      try { fs.unlinkSync(cookiesFilePath) } catch (_) {}
    }
    if (!analyzeRes.success) {
      return { success: false, data: [], reportPath: null, csvPath: null, error: analyzeRes.error }
    }
    let reportPath = null
    let csvPath = null
    try {
      if (!fs.existsSync(RELATORIOS_DIR)) fs.mkdirSync(RELATORIOS_DIR, { recursive: true })
      const now = new Date()
      const safeDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
      reportPath = path.join(RELATORIOS_DIR, `relatorio_reels_analise_${safeDate}.txt`)
      csvPath = writeReportWithStats(['lista atual'], urls, analyzeRes.data, reportPath)
    } catch (err) {
      console.warn('[reels] Erro ao salvar relatório de análise:', err?.message)
    }
    return { success: true, data: analyzeRes.data, reportPath, csvPath, error: null }
  })

  ipcMain.handle('reels-selecionar-ytdlp', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openFile'],
        title: 'Selecione o executável do yt-dlp',
        filters: [
          { name: 'Executável', extensions: process.platform === 'win32' ? ['exe'] : [] },
          { name: 'Todos os arquivos', extensions: ['*'] }
        ]
      })
      if (result.canceled || !result.filePaths?.length) return null
      return result.filePaths[0]
    } catch (e) {
      console.error('[reels] selecionar yt-dlp:', e)
      return null
    }
  })

  ipcMain.handle('reels-check-ytdlp', async (event, ytDlpPath) => {
    const exe = getYtDlpExecutable(ytDlpPath)
    return new Promise((resolve) => {
      const child = spawn(exe, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      })
      let out = ''
      let err = ''
      child.stdout?.on('data', (c) => { out += c.toString() })
      child.stderr?.on('data', (c) => { err += c.toString() })
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          version: (out || err).trim() || null,
          error: code !== 0 ? (err || `Exit ${code}`).trim() : null
        })
      })
      child.on('error', (e) => {
        resolve({ success: false, version: null, error: e.message })
      })
    })
  })

  ipcMain.handle('download-reels', async (event, { urls: urlsInput, outputDir, concurrency: concurrencyInput, ytDlpPath, cookiesFromBrowser, cookiesString }) => {
    const sender = event.sender
    const urls = normalizeUrls(urlsInput || [])
    const ytDlpExe = getYtDlpExecutable(ytDlpPath)
    let cookiesFilePath = null
    if (cookiesString && typeof cookiesString === 'string' && cookiesString.trim()) {
      cookiesFilePath = writeCookiesFileNetscape(cookiesString)
    }
    if (urls.length === 0) {
      return {
        success: false,
        total: 0,
        completed: 0,
        failed: 0,
        errors: [{ url: '', error: 'Nenhum link válido de Reel (instagram.com/reel) encontrado.' }]
      }
    }
    const outputDirResolved = path.resolve(outputDir || '.')
    if (!fs.existsSync(outputDirResolved)) {
      try {
        fs.mkdirSync(outputDirResolved, { recursive: true })
      } catch (e) {
        return {
          success: false,
          total: urls.length,
          completed: 0,
          failed: urls.length,
          errors: [{ url: '', error: `Pasta inválida ou sem permissão: ${e.message}` }]
        }
      }
    }
    const concurrency = Math.min(10, Math.max(1, parseInt(Number(concurrencyInput), 10) || 5))

    try {
      const { completed, failed, errors } = await runWithConcurrency(
        urls,
        outputDirResolved,
        concurrency,
        sender,
        ytDlpExe,
        cookiesFilePath ? null : cookiesFromBrowser,
        cookiesFilePath
      )
      return {
        success: failed === 0,
        total: urls.length,
        completed,
        failed,
        errors
      }
    } catch (e) {
      return {
        success: false,
        total: urls.length,
        completed: 0,
        failed: urls.length,
        errors: [{ url: '', error: e?.message || String(e) }]
      }
    } finally {
      if (cookiesFilePath && fs.existsSync(cookiesFilePath)) {
        try { fs.unlinkSync(cookiesFilePath) } catch (err) { console.warn('[reels] remover cookies temp:', err?.message) }
      }
    }
  })
}

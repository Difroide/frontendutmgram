import { ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { PATHS } from '../config/paths.js'
import { spawn, execSync } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Função para detectar o comando Python correto
function getPythonCommand() {
  // No Windows, tentar 'py' primeiro (Python Launcher), depois 'python'
  // Em outros sistemas, usar 'python3' ou 'python'
  const commands = process.platform === 'win32' 
    ? ['py', 'python', 'python3']
    : ['python3', 'python']
  
  for (const cmd of commands) {
    try {
      // Tentar executar o comando para verificar se existe
      execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 2000 })
      console.log(`[capturarApisHandler] Comando Python detectado: ${cmd}`)
      return cmd
    } catch (error) {
      // Comando não encontrado, tentar próximo
      continue
    }
  }
  
  // Se nenhum comando funcionou, retornar 'python' como padrão
  console.warn('[capturarApisHandler] Nenhum comando Python detectado, usando "python" como padrão')
  return 'python'
}

export function registerCapturarApisHandlers() {
  // Handler IPC para capturar APIs
  ipcMain.handle('capturar-apis', async (event, customPaths = {}, selectedPhones = null) => {
    try {
      // Caminho para o script Python
      const pythonScriptPath = path.join(PATHS.BASE, 'back', 'capturando apis', 'app.py')
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(pythonScriptPath)) {
        throw new Error(`Script Python não encontrado: ${pythonScriptPath}`)
      }
      
      console.log('[capturarApisHandler] Iniciando captura de APIs via Python...')
      console.log('[capturarApisHandler] Caminho do script:', pythonScriptPath)
      if (selectedPhones && selectedPhones.length > 0) {
        console.log('[capturarApisHandler] Processando contas selecionadas:', selectedPhones)
      }
      
      // Detectar comando Python correto
      const pythonCommand = getPythonCommand()
      console.log('[capturarApisHandler] Usando comando Python:', pythonCommand)
      
      // Preparar variáveis de ambiente
      // O Python agora lê as credenciais diretamente do api.json, não precisa de variáveis de ambiente
      const env = {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Para ver logs em tempo real
        PYTHONIOENCODING: 'utf-8', // Forçar encoding UTF-8
      }
      
      // Preparar argumentos para o script Python
      const args = []
      
      // Adicionar telefones selecionados como argumentos JSON
      if (selectedPhones && selectedPhones.length > 0) {
        args.push('--phones', JSON.stringify(selectedPhones))
      }
      
      // Adicionar custom paths como argumentos JSON
      const pathsToUse = {
        ...customPaths,
        apisDir: customPaths.apisDir || PATHS.APIS_TELEGRAM_DIR,
        proxiesDir: customPaths.proxiesDir || PATHS.PROXIES_DIR,
        baseDir: PATHS.BASE, // Passar o diretório base explicitamente
      }
      args.push('--paths', JSON.stringify(pathsToUse))
      
      console.log('[capturarApisHandler] Argumentos:', args)
      console.log('[capturarApisHandler] Diretório de trabalho:', path.dirname(pythonScriptPath))
      
      // Normalizar caminho para garantir que funcione mesmo com espaços
      // Usar path.resolve para obter caminho absoluto normalizado
      const normalizedScriptPath = path.resolve(pythonScriptPath)
      console.log('[capturarApisHandler] Caminho original:', pythonScriptPath)
      console.log('[capturarApisHandler] Caminho normalizado do script:', normalizedScriptPath)
      
      // Verificar novamente se o arquivo existe após normalização
      if (!fs.existsSync(normalizedScriptPath)) {
        throw new Error(`Script Python não encontrado após normalização: ${normalizedScriptPath}`)
      }
      
      // No Windows, quando há espaços no caminho, o spawn precisa do caminho absoluto
      // e não deve usar shell: true, pois isso pode quebrar o caminho
      const scriptPathForSpawn = normalizedScriptPath
      const cwdPath = path.resolve(path.dirname(normalizedScriptPath))
      
      console.log('[capturarApisHandler] Caminho para spawn:', scriptPathForSpawn)
      console.log('[capturarApisHandler] CWD para spawn:', cwdPath)
      console.log('[capturarApisHandler] Arquivo existe?', fs.existsSync(scriptPathForSpawn))
      
      // Executar script Python
      return new Promise((resolve, reject) => {
        // Construir array de argumentos com o caminho do script primeiro
        // IMPORTANTE: Não usar shell: true no Windows quando há espaços no caminho
        // O Node.js spawn lida melhor com caminhos com espaços quando shell é false
        const spawnArgs = [scriptPathForSpawn, ...args]
        
        console.log('[capturarApisHandler] Comando Python:', pythonCommand)
        console.log('[capturarApisHandler] Argumentos:', JSON.stringify(spawnArgs))
        
        const pythonProcess = spawn(pythonCommand, spawnArgs, {
          cwd: cwdPath,
          env: env,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false // CRÍTICO: Não usar shell no Windows com caminhos que têm espaços
        })
        
        let stdout = ''
        let stderr = ''
        
        pythonProcess.stdout.on('data', (data) => {
          const output = data.toString('utf-8')
          stdout += output
          // Log em tempo real
          console.log('[Python]', output.trim())
        })
        
        pythonProcess.stderr.on('data', (data) => {
          const output = data.toString('utf-8')
          stderr += output
          console.error('[Python Error]', output.trim())
        })
        
        pythonProcess.on('close', (code) => {
          try {
            // Tentar extrair JSON do stdout
            const jsonMatch = stdout.match(/===RESULTADO_JSON===\s*([\s\S]*?)\s*===FIM_RESULTADO_JSON===/)
            
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[1])
              console.log('[capturarApisHandler] Captura concluída:', result)
              
              // Se houver erro no resultado, ainda retornar sucesso mas com os dados do erro
              if (result.error) {
                console.error('[capturarApisHandler] Erro no resultado:', result.error)
              }
              
              resolve({ success: true, data: result })
            } else if (code === 0) {
              // Se não encontrou JSON mas código é 0, tentar extrair erro do stderr
              const errorFromStderr = stderr.trim() || 'Resultado não encontrado no output'
              const result = {
                total: selectedPhones ? selectedPhones.length : 0,
                success: 0,
                failed: selectedPhones ? selectedPhones.length : 0,
                results: selectedPhones ? selectedPhones.map(phone => ({
                  phone,
                  success: false,
                  error: errorFromStderr
                })) : [],
                error: errorFromStderr
              }
              console.log('[capturarApisHandler] Captura concluída (sem JSON):', result)
              resolve({ success: true, data: result })
            } else {
              // Código de saída diferente de 0 - erro
              const errorMsg = stderr.trim() || stdout.trim() || `Script Python retornou código de saída ${code}`
              console.error('[capturarApisHandler] Erro ao executar script Python:', errorMsg)
              
              // Retornar como resultado com erro ao invés de rejeitar
              const errorResult = {
                total: selectedPhones ? selectedPhones.length : 0,
                success: 0,
                failed: selectedPhones ? selectedPhones.length : 0,
                results: selectedPhones ? selectedPhones.map(phone => ({
                  phone,
                  success: false,
                  error: errorMsg
                })) : [],
                error: errorMsg
              }
              resolve({ success: true, data: errorResult })
            }
          } catch (parseError) {
            console.error('[capturarApisHandler] Erro ao parsear resultado:', parseError)
            const errorMsg = stderr.trim() || stdout.trim() || `Erro ao processar resultado: ${parseError.message}`
            
            // Retornar como resultado com erro ao invés de rejeitar
            const errorResult = {
              total: selectedPhones ? selectedPhones.length : 0,
              success: 0,
              failed: selectedPhones ? selectedPhones.length : 0,
              results: selectedPhones ? selectedPhones.map(phone => ({
                phone,
                success: false,
                error: errorMsg
              })) : [],
              error: errorMsg
            }
            resolve({ success: true, data: errorResult })
          }
        })
        
        pythonProcess.on('error', (error) => {
          console.error('[capturarApisHandler] Erro ao iniciar processo Python:', error)
          console.error('[capturarApisHandler] Comando tentado:', pythonCommand)
          console.error('[capturarApisHandler] Script path:', pythonScriptPath)
          console.error('[capturarApisHandler] Erro completo:', error)
          
          // Retornar erro estruturado ao invés de rejeitar
          const errorResult = {
            total: selectedPhones ? selectedPhones.length : 0,
            success: 0,
            failed: selectedPhones ? selectedPhones.length : 0,
            results: selectedPhones ? selectedPhones.map(phone => ({
              phone,
              success: false,
              error: `Erro ao executar Python: ${error.message}. Certifique-se de que Python está instalado e no PATH. Comando tentado: ${pythonCommand}`
            })) : [],
            error: `Erro ao executar Python: ${error.message}. Certifique-se de que Python está instalado e no PATH. Comando tentado: ${pythonCommand}`
          }
          resolve({ success: true, data: errorResult })
        })
      })
    } catch (error) {
      console.error('[capturarApisHandler] Erro ao capturar APIs:', error)
      const errorMessage = error.message || 'Erro desconhecido'
      
      // Retornar no mesmo formato que o processo Python retornaria
      const errorResult = {
        total: selectedPhones ? selectedPhones.length : 0,
        success: 0,
        failed: selectedPhones ? selectedPhones.length : 0,
        results: selectedPhones ? selectedPhones.map(phone => ({
          phone,
          success: false,
          error: errorMessage
        })) : [],
        error: errorMessage
      }
      
      return { success: true, data: errorResult }
    }
  })
}


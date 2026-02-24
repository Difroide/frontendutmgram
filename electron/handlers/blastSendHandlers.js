import { ipcMain } from 'electron'
import { createRequire } from 'module'
import path from 'path'
import { PATHS } from '../config/paths.js'

const require = createRequire(import.meta.url)

export function registerBlastSendHandlers() {
    // Módulo BlastSend desativado/removido a pedido do usuário
    // Handlers 'blastsend-scan' e 'blastsend-replace' foram removidos.
}

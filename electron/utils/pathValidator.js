import path from 'path'

export function validatePathInDirectory(filePath, allowedDir) {
  const normalizedPath = path.normalize(filePath)
  const normalizedDir = path.normalize(allowedDir)
  
  return normalizedPath.startsWith(normalizedDir)
}

export function validateTelegramNumber(numero) {
  return /^\d{6,20}$/.test(numero)
}

export function validateNichoName(nomeNicho) {
  return nomeNicho && /^[a-zA-Z0-9\s\-_]+$/.test(nomeNicho.trim())
}


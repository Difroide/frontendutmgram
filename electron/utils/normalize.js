/**
 * Utilitários de normalização de dados
 * 
 * Este módulo fornece funções para normalizar dados antes de retorná-los ao frontend,
 * garantindo consistência e removendo a necessidade de normalização no frontend.
 */

/**
 * Normaliza um username de bot (remove @ e converte para lowercase)
 * @param {string|undefined} username - O username a ser normalizado
 * @returns {string} - O username normalizado (sem @, lowercase, trimmed)
 */
export function normalizarUsername(username) {
  if (!username) return ''
  return String(username).replace(/^@/, '').toLowerCase().trim()
}

/**
 * Normaliza um array de usernames
 * @param {string[]|undefined} usernames - Array de usernames a serem normalizados
 * @returns {string[]} - Array de usernames normalizados (sem duplicatas)
 */
export function normalizarUsernames(usernames) {
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return []
  }
  
  const normalizados = usernames
    .map(u => normalizarUsername(u))
    .filter(u => u.length > 0)
  
  // Remover duplicatas
  return Array.from(new Set(normalizados))
}

/**
 * Normaliza um username mantendo o original (para casos onde precisamos de ambos)
 * @param {string|undefined} username - O username a ser normalizado
 * @returns {{original: string, normalizado: string}} - Objeto com original e normalizado
 */
export function normalizarUsernameComOriginal(username) {
  const original = username || ''
  return {
    original: original,
    normalizado: normalizarUsername(original)
  }
}

/**
 * Normaliza dados de um grupo, incluindo bots de mídia admin
 * @param {object} grupo - Objeto do grupo
 * @returns {object} - Grupo com dados normalizados
 */
export function normalizarGrupo(grupo) {
  if (!grupo) return grupo
  
  const grupoNormalizado = { ...grupo }
  
  // Normalizar bot_midia_admin (string)
  if (grupoNormalizado.bot_midia_admin && typeof grupoNormalizado.bot_midia_admin === 'string') {
    grupoNormalizado.bot_midia_admin = normalizarUsername(grupoNormalizado.bot_midia_admin)
  }
  
  // Normalizar bots_midia_admin (array)
  if (Array.isArray(grupoNormalizado.bots_midia_admin)) {
    grupoNormalizado.bots_midia_admin = normalizarUsernames(grupoNormalizado.bots_midia_admin)
  }
  
  // Garantir que tags_grupos seja preservado (não normalizar, apenas garantir que seja array)
  if (grupoNormalizado.tags_grupos !== undefined) {
    if (!Array.isArray(grupoNormalizado.tags_grupos)) {
      grupoNormalizado.tags_grupos = []
    }
  } else if (grupo.tags_grupos !== undefined) {
    // Se não foi copiado pelo spread, copiar manualmente
    grupoNormalizado.tags_grupos = Array.isArray(grupo.tags_grupos) ? [...grupo.tags_grupos] : []
  }
  
  return grupoNormalizado
}

/**
 * Normaliza dados de uma conta, incluindo botsMidiaAdmin e gruposDetalhes
 * @param {object} conta - Objeto da conta
 * @returns {object} - Conta com dados normalizados
 */
export function normalizarConta(conta) {
  if (!conta) return conta
  
  const contaNormalizada = { ...conta }
  
  // Normalizar botsMidiaAdmin
  if (Array.isArray(contaNormalizada.botsMidiaAdmin)) {
    contaNormalizada.botsMidiaAdmin = normalizarUsernames(contaNormalizada.botsMidiaAdmin)
  }
  
  // Normalizar gruposDetalhes
  if (Array.isArray(contaNormalizada.gruposDetalhes)) {
    contaNormalizada.gruposDetalhes = contaNormalizada.gruposDetalhes.map(grupo => 
      normalizarGrupo(grupo)
    )
  }
  
  return contaNormalizada
}


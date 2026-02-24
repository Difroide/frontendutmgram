/**
 * Utilitários para formatação automática de nomes de planos
 */

/**
 * Extrai o nome base do plano, removendo formatações antigas de "por X" e descontos
 * 
 * Exemplos:
 * "Semanal por 10,00" -> "Semanal"
 * "Mensal por 25,00 (20%OFF)" -> "Mensal"
 * "Premium" -> "Premium"
 */
export type MoedaPlano = 'R$' | '$'

export function extrairNomeBase(nomeCompleto: string, porTexto: string = 'por'): string {
  // Remover desconto se existir (tudo após o primeiro parêntese)
  let nome = nomeCompleto.split('(')[0].trim()
  
  // Remover "por X" se existir
  const porTextoNormalizado = porTexto.trim().toLowerCase()
  const nomeLower = nome.toLowerCase()
  let porIndex = porTextoNormalizado ? nomeLower.lastIndexOf(` ${porTextoNormalizado} `) : -1
  if (porIndex === -1) {
    porIndex = nomeLower.lastIndexOf(' por ')
  }
  if (porIndex !== -1) {
    nome = nome.substring(0, porIndex).trim()
  }
  
  return nome
}

/**
 * Extrai o percentual de desconto do nome do plano (se existir)
 * 
 * Exemplos:
 * "Semanal por 10,00 (20%OFF)" -> 20
 * "Mensal por 25,00" -> undefined
 */
export function extrairDesconto(nomeCompleto: string): number | undefined {
  const match = nomeCompleto.match(/\((\d+)%OFF\)/i)
  return match ? parseInt(match[1]) : undefined
}

/**
 * Formata o nome do plano no padrão: "NOME por VALOR" ou "NOME por VALOR (X%OFF)"
 * 
 * @param nome Nome base do plano (será extraído automaticamente se vier com formatação)
 * @param valor Valor do plano em reais
 * @param desconto Percentual de desconto (opcional)
 * @returns Nome formatado do plano
 */
export function formatarValorComMoeda(valor: number, moeda: MoedaPlano = 'R$'): string {
  const valorFormatado = valor.toFixed(2).replace('.', ',')
  if (moeda === '$') {
    return `$${valorFormatado}`
  }
  return `R$ ${valorFormatado}`
}

export function formatarNomePlano(
  nome: string,
  valor: number,
  desconto?: number,
  porTexto: string = 'por',
  moeda: MoedaPlano = 'R$'
): string {
  // Extrair o nome base (sem formatações antigas)
  const nomeBase = extrairNomeBase(nome, porTexto)
  
  // Se não houver nome base, retornar vazio
  if (!nomeBase) return ''
  
  const porFinal = porTexto.trim() || 'por'
  
  // Montar o nome formatado
  let nomeFormatado = `${nomeBase} ${porFinal} ${formatarValorComMoeda(valor, moeda)}`
  
  // Adicionar desconto se existir
  if (desconto && desconto > 0) {
    nomeFormatado += ` (${desconto}%OFF)`
  }
  
  return nomeFormatado
}

/**
 * Normaliza nome base para comparação
 */
export function normalizarNomeBase(nomeBase: string): string {
  return nomeBase.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Extrai partes do nome do plano para reconstrução
 */
export function parseNomePlano(nomeCompleto: string): {
  nomeBase: string
  porTexto: string
  moeda: MoedaPlano
  sufixo: string
} {
  const match = nomeCompleto.match(/^(.*?)\s+([^\s]+)\s+(R\$|\$)\s*[\d.,]+(.*)$/i)
  if (match) {
    return {
      nomeBase: match[1].trim(),
      porTexto: match[2].trim() || 'por',
      moeda: (match[3] as MoedaPlano) || 'R$',
      sufixo: match[4] || '',
    }
  }

  return {
    nomeBase: extrairNomeBase(nomeCompleto),
    porTexto: 'por',
    moeda: 'R$',
    sufixo: '',
  }
}

/**
 * Atualiza o nome do plano mantendo o desconto existente (se houver)
 */
export function atualizarNomeComDesconto(nomeAtual: string, novoNome: string, valor: number): string {
  const descontoAtual = extrairDesconto(nomeAtual)
  return formatarNomePlano(novoNome, valor, descontoAtual)
}

/**
 * Atualiza o valor do plano mantendo o nome base e desconto existentes
 */
export function atualizarValorComDesconto(nomeAtual: string, novoValor: number): string {
  const nomeBase = extrairNomeBase(nomeAtual)
  const descontoAtual = extrairDesconto(nomeAtual)
  return formatarNomePlano(nomeBase, novoValor, descontoAtual)
}

/**
 * Aplica desconto ao plano, atualizando tanto o valor quanto o nome
 */
export function aplicarDesconto(
  nomeAtual: string,
  valorAtual: number,
  percentualDesconto: number
): { novoNome: string; novoValor: number } {
  const nomeBase = extrairNomeBase(nomeAtual)
  const novoValor = valorAtual * (1 - percentualDesconto / 100)
  const novoNome = formatarNomePlano(nomeBase, novoValor, percentualDesconto)
  
  return { novoNome, novoValor }
}

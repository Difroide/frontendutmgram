/**
 * Converte string de dinheiro (R$ 139,00 ou R$ 139.00) em número.
 * Trata ponto ou vírgula como separador decimal para não multiplicar por 100.
 */
export function parseMoneyValue(value: string): number {
  if (!value) return 0
  let s = String(value).replace(/R\$\s*/gi, '').replace(/\s/g, '').trim()
  if (!s) return 0
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    // Vírgula é decimal (ex: 1.399,00 ou 139,00)
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // Ponto é decimal (ex: 139.00 ou 1,399.00)
    s = s.replace(/,/g, '')
  }
  return parseFloat(s) || 0
}

/** Formata número em real para exibição (sempre vírgula como decimal). */
export function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

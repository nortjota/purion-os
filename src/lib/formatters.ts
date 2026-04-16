/**
 * PURION OS — Utilitários de formatação
 * Wrappers tipados para Intl — use estes em lugar de chamadas inline.
 */

/**
 * Formata um número como moeda BRL.
 * @example formatCurrency(1234.5) → "R$ 1.234,50"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata um número como percentual.
 * Recebe o valor já em % (ex: 65 → "65,00%").
 * @example formatPercent(65.5) → "65,50%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Formata um número inteiro ou decimal com separadores de milhar.
 * @example formatNumber(12345.6) → "12.345,6"
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

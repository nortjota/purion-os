/**
 * PURION OS — Biblioteca de Widgets (estilo Asana)
 * Paleta e utilitários compartilhados por todos os widgets do dashboard/relatórios.
 */

export { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters'

// Dourado da marca + tons complementares legíveis no fundo escuro — usados em todos os gráficos.
export const PALETA_GRAFICOS = ['#C9A84C', '#5B8FE8', '#4CAF7A', '#E8A838', '#A855F7', '#E85238', '#B8B8B8']

export const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 8,
  fontSize: 12,
  color: '#F5F5F5',
}

export const CHART_GRID_STROKE = 'rgba(255,255,255,0.06)'
export const CHART_TICK_FILL = '#8A8A8A'

export type Periodo = 'hoje' | 'semana' | 'mes' | 'trimestre'

export const PERIODO_OPCOES: Array<{ id: Periodo; label: string }> = [
  { id: 'hoje',      label: 'Hoje' },
  { id: 'semana',    label: 'Semana' },
  { id: 'mes',       label: 'Mês' },
  { id: 'trimestre', label: 'Trimestre' },
]

/** Data de início (inclusive) do período selecionado, a partir de agora. */
export function inicioPeriodo(periodo: Periodo): Date {
  const agora = new Date()
  const d = new Date(agora)
  if (periodo === 'hoje') { d.setHours(0, 0, 0, 0); return d }
  if (periodo === 'semana') { d.setDate(d.getDate() - 7); return d }
  if (periodo === 'trimestre') { d.setMonth(d.getMonth() - 3); return d }
  d.setDate(d.getDate() - 30) // 'mes'
  return d
}

export function dentroDoPeriodo(dataISO: string, periodo: Periodo): boolean {
  return new Date(dataISO) >= inicioPeriodo(periodo)
}

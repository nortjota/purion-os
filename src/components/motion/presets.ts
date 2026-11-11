import type { Transition, Variants } from 'framer-motion'

/** Presets de spring da camada de movimento PURION (espelham os tokens de globals.css). */
export const spring: Transition = { type: 'spring', stiffness: 260, damping: 18 }
export const soft: Transition = { type: 'spring', stiffness: 200, damping: 30 }
export const press: Transition = { type: 'spring', stiffness: 400, damping: 25 }

/** cubic-bezier do --ease-expo */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const
/** cubic-bezier do --ease-soft */
export const EASE_SOFT = [0.22, 0.61, 0.36, 1] as const

/** Acento do movimento (verde-limão) e cores de status. */
export const ACCENT = 'var(--accent-motion, #D4FC3C)'
export const STATUS = {
  ok: 'var(--status-ok, #8FD14F)',
  warning: 'var(--status-warning, #E6C374)',
  danger: 'var(--status-danger, #E5544B)',
  neutral: '#A7A9A6',
} as const

/** Lê um token de tempo (ms) do CSS — respeita a versão mobile mais curta. */
export function tokenMs(nome: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return v.endsWith('ms') ? n : n * 1000
}

/** Variante de entrada dos itens de grade: opacity 0→1, y 6→0, scale 0.96→1 (spring). */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
}

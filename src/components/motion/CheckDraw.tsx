'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ACCENT, EASE_EXPO, press } from './presets'

/**
 * Caixa de seleção com check DESENHADO (pathLength) — só visual.
 * O estado e o onChange continuam com quem usa (nenhuma lógica muda).
 */
export function CheckDraw({ checked, size = 18, color = ACCENT, onColor = '#0B0B0B', style }: {
  checked: boolean
  size?: number
  color?: string
  onColor?: string
  style?: React.CSSProperties
}) {
  const reduzir = useReducedMotion() ?? false
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={{ scale: checked && !reduzir ? [1, 0.88, 1] : 1, backgroundColor: checked ? 'var(--accent-motion, #D4FC3C)' : 'rgba(0,0,0,0)' }}
      transition={reduzir ? { duration: 0 } : press}
      style={{
        width: size, height: size, borderRadius: 6, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${checked ? color : 'rgba(245,245,240,0.28)'}`,
        ...style,
      }}
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 12 12" fill="none">
        <AnimatePresence initial={false}>
          {checked && (
            <motion.path
              key="check"
              d="M2.5 6.4 L5 8.8 L9.5 3.4"
              stroke={onColor} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: reduzir ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: reduzir ? 0 : 0.28, ease: EASE_EXPO }}
            />
          )}
        </AnimatePresence>
      </svg>
    </motion.span>
  )
}

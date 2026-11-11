'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { AnimatedNumber } from './AnimatedNumber'
import { ACCENT, soft } from './presets'

export interface ProgressRingProps {
  /** 0–100 */
  value: number
  size?: number
  stroke?: number
  /** cor do arco — padrão: acento verde-limão */
  color?: string
  /** trilho */
  trackColor?: string
  /** mostra a % no centro (padrão true) */
  showLabel?: boolean
  /** conteúdo custom no centro (substitui a %) */
  children?: React.ReactNode
  /** brilho ambiente discreto (ex.: meta "em dia") */
  glow?: boolean
  labelSize?: number
}

/** Anel SVG que varre de 0 até `value` com spring (stroke-dashoffset), % no centro com count-up. */
export function ProgressRing({
  value, size = 96, stroke = 8, color = ACCENT, trackColor = 'rgba(245,245,240,0.08)',
  showLabel = true, children, glow = false, labelSize,
}: ProgressRingProps) {
  const reduzir = useReducedMotion() ?? false
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const alvo = circ * (1 - pct / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {glow && !reduzir && (
        <div aria-hidden style={{
          position: 'absolute', inset: stroke / 2, borderRadius: '50%',
          boxShadow: `0 0 ${Math.round(size / 6)}px ${color}`,
          animation: 'purion-glow 3.2s var(--ease-soft) infinite', pointerEvents: 'none',
        }} />
      )}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduzir ? alvo : circ }}
          animate={{ strokeDashoffset: alvo }}
          transition={reduzir ? { duration: 0 } : soft}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children ?? (showLabel && (
          <AnimatedNumber value={pct} suffix="%" style={{ fontSize: labelSize ?? Math.round(size * 0.22), fontWeight: 700, color }} />
        ))}
      </div>
      <span className="sr-only">{Math.round(pct)}%</span>
    </div>
  )
}

'use client'

import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ACCENT, EASE_EXPO, tokenMs } from './presets'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  /** área suave abaixo da linha */
  fill?: boolean
}

/** Mini-linha de tendência que se "desenha" (pathLength 0→1) ao montar. */
export function Sparkline({ data, width = 96, height = 28, color = ACCENT, strokeWidth = 1.75, fill = true }: SparklineProps) {
  const reduzir = useReducedMotion() ?? false
  const gid = useId().replace(/:/g, '')

  const { linha, area } = useMemo(() => {
    const pts = data.filter((n) => Number.isFinite(n))
    if (pts.length < 2) return { linha: '', area: '' }
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const amp = max - min || 1
    const pad = strokeWidth
    const xy = pts.map((v, i) => [
      (i / (pts.length - 1)) * width,
      pad + (1 - (v - min) / amp) * (height - pad * 2),
    ] as const)
    const l = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    return { linha: l, area: `${l} L${width},${height} L0,${height} Z` }
  }, [data, width, height, strokeWidth])

  if (!linha) return <div style={{ width, height }} aria-hidden />

  const dur = tokenMs('--dur-slow', 1100) / 1000
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={`spk-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path
            d={area} fill={`url(#spk-${gid})`}
            initial={{ opacity: reduzir ? 1 : 0 }} animate={{ opacity: 1 }}
            transition={{ duration: reduzir ? 0 : dur * 0.8, delay: reduzir ? 0 : dur * 0.4, ease: EASE_EXPO }}
          />
        </>
      )}
      <motion.path
        d={linha} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: reduzir ? 1 : 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: reduzir ? 0 : dur, ease: EASE_EXPO }}
      />
    </svg>
  )
}

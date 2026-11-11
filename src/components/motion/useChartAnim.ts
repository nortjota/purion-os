'use client'

import { useReducedMotion } from 'framer-motion'
import { useMobile } from '@/hooks/useMobile'

/**
 * Props de animação para séries do recharts: barras crescem de baixo, linhas desenham,
 * donut varre. `ordem` escalona o início entre gráficos/séries (animationBegin).
 * prefers-reduced-motion → sem animação. Mobile → mais curto.
 */
export function useChartAnim(ordem = 0) {
  const reduzir = useReducedMotion() ?? false
  const isMobile = useMobile()
  return {
    isAnimationActive: !reduzir,
    animationBegin: (isMobile ? 60 : 120) * ordem,
    animationDuration: isMobile ? 550 : 800,
    animationEasing: 'ease-out' as const,
  }
}

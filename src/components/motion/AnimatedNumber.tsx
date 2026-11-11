'use client'

import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { EASE_EXPO, spring, tokenMs } from './presets'

export interface AnimatedNumberProps {
  value: number
  /** casas decimais (pt-BR: vírgula) */
  decimals?: number
  /** ex.: "R$ " */
  prefix?: string
  /** ex.: "%", " un" */
  suffix?: string
  /** 'count' = count-up contínuo (padrão) · 'odometer' = cada dígito rola até o novo valor */
  mode?: 'count' | 'odometer'
  /** valor de onde começa a primeira animação (padrão 0) */
  from?: number
  className?: string
  style?: React.CSSProperties
}

function formatar(v: number, decimals: number, prefix: string, suffix: string): string {
  const n = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v)
  return `${prefix}${n}${suffix}`
}

const DIGITOS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Coluna 0–9 que desliza até o dígito atual (efeito odômetro). */
function Digito({ d, reduzir }: { d: number; reduzir: boolean }) {
  return (
    <span style={{ display: 'inline-block', height: '1em', overflow: 'hidden', lineHeight: 1, verticalAlign: 'top' }}>
      <motion.span
        style={{ display: 'flex', flexDirection: 'column', willChange: 'transform' }}
        initial={false}
        animate={{ y: `${-d}em` }}
        transition={reduzir ? { duration: 0 } : spring}
      >
        {DIGITOS.map((x) => <span key={x} style={{ height: '1em', lineHeight: 1 }}>{x}</span>)}
      </motion.span>
    </span>
  )
}

/**
 * Número animado com dígitos tabulares (.tnum).
 * count: anima do valor antigo ao novo (useMotionValue + animate, --dur-count, ease expo) sem re-renderizar a cada frame.
 * odometer: cada dígito sobe/desce até o novo valor com spring.
 * prefers-reduced-motion: troca direta, sem animação.
 */
export function AnimatedNumber({
  value, decimals = 0, prefix = '', suffix = '', mode = 'count', from = 0, className, style,
}: AnimatedNumberProps) {
  const reduzir = useReducedMotion() ?? false
  const mv = useMotionValue(from)
  const ref = useRef<HTMLSpanElement>(null)
  const seguro = Number.isFinite(value) ? value : 0

  useEffect(() => {
    if (mode !== 'count') return
    const escrever = (v: number) => { if (ref.current) ref.current.textContent = formatar(v, decimals, prefix, suffix) }
    if (reduzir) { mv.set(seguro); escrever(seguro); return }
    const unsub = mv.on('change', escrever)
    const ctrl = animate(mv, seguro, { duration: tokenMs('--dur-count', 900) / 1000, ease: EASE_EXPO })
    return () => { ctrl.stop(); unsub() }
  }, [seguro, decimals, prefix, suffix, mode, reduzir, mv])

  if (mode === 'odometer') {
    const texto = formatar(seguro, decimals, prefix, suffix)
    const chars = texto.split('')
    return (
      <span className={`tnum ${className ?? ''}`} style={{ display: 'inline-flex', alignItems: 'baseline', ...style }}>
        <span className="sr-only">{texto}</span>
        <span aria-hidden style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          {chars.map((c, i) => {
            const chave = chars.length - i // identidade pela posição a partir da direita
            return /\d/.test(c)
              ? <Digito key={`d${chave}`} d={Number(c)} reduzir={reduzir} />
              : <span key={`c${chave}`}>{c}</span>
          })}
        </span>
      </span>
    )
  }

  return (
    <span ref={ref} className={`tnum ${className ?? ''}`} style={style}>
      {formatar(reduzir ? seguro : from, decimals, prefix, suffix)}
    </span>
  )
}

'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import { Sparkline } from './Sparkline'
import { STATUS } from './presets'

export interface CountCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  /** variação vs período anterior, em % (ex.: 12.5). null = sem comparação */
  delta?: number | null
  /** true quando subir é ruim (ex.: CPA, atrasos) */
  inverterDelta?: boolean
  deltaLabel?: string
  sub?: React.ReactNode
  sparkline?: number[]
  /** indicador "ao vivo" (ponto que pulsa) */
  live?: boolean
  href?: string
  color?: string
  icon?: React.ReactNode
  style?: React.CSSProperties
}

/** Card de KPI padrão: rótulo, número grande com count-up, delta colorido e sparkline opcional. */
export function CountCard({
  label, value, prefix, suffix, decimals = 0, delta = null, inverterDelta = false, deltaLabel = 'vs período anterior',
  sub, sparkline, live, href, color = '#F5F5F0', icon, style,
}: CountCardProps) {
  const temDelta = delta != null && Number.isFinite(delta)
  const bom = temDelta ? (inverterDelta ? delta! < 0 : delta! > 0) : false
  const neutro = temDelta && Math.abs(delta!) < 0.05
  const corDelta = !temDelta || neutro ? STATUS.neutral : bom ? STATUS.ok : STATUS.danger
  const Seta = !temDelta || neutro ? Minus : delta! > 0 ? ArrowUpRight : ArrowDownRight

  const corpo = (
    <div
      className={`kpi-card ${href ? 'lift' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, height: '100%', cursor: href ? 'pointer' : undefined, ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono, ui-monospace), monospace', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A7A9A6',
          display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0,
        }}>
          {live && <span className="pulse" aria-hidden />}
          {icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </span>
        {live && <span className="sr-only">atualiza ao vivo</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <AnimatedNumber
          value={value} prefix={prefix} suffix={suffix} decimals={decimals}
          style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color, letterSpacing: '-0.02em' }}
        />
        {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} />}
      </div>

      {(temDelta || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
          {temDelta && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: corDelta, fontWeight: 600 }} className="tnum">
              <Seta size={13} aria-hidden />
              {delta! > 0 ? '+' : ''}{delta!.toFixed(1).replace('.', ',')}%
              <span style={{ color: '#A7A9A6', fontWeight: 400, marginLeft: 4 }}>{deltaLabel}</span>
            </span>
          )}
          {sub && <span style={{ color: '#A7A9A6' }}>{sub}</span>}
        </div>
      )}
    </div>
  )

  return href ? <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>{corpo}</Link> : corpo
}

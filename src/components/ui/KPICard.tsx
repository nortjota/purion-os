'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value?: string | number
  prefix?: string
  suffix?: string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  loading?: boolean
  delay?: number
}

export function KPICard({
  label,
  value,
  prefix,
  suffix,
  change,
  changeLabel = 'vs mês anterior',
  icon: Icon,
  loading = false,
  delay = 0,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="kpi-card animate-pulse" style={{ minHeight: 110 }}>
        <div style={{ width: '60%', height: 10, borderRadius: 4, background: 'var(--bg-surface-2)', marginBottom: 12 }} />
        <div style={{ width: '40%', height: 28, borderRadius: 4, background: 'var(--bg-surface-2)', marginBottom: 10 }} />
        <div style={{ width: '70%', height: 10, borderRadius: 4, background: 'var(--bg-surface-2)' }} />
      </div>
    )
  }

  const changeColor = !change || change === 0
    ? 'var(--text-secondary)'
    : change > 0 ? '#22C55E' : '#EF4444'
  const changeArrow = !change || change === 0 ? '' : change > 0 ? '▲ ' : '▼ '

  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay }}
      style={{ position: 'relative', cursor: 'default' }}
    >
      {/* Accent bar */}
      <div
        className="kpi-accent-bar"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--gold)', opacity: 0,
          transition: 'opacity var(--transition-base)',
          borderRadius: '12px 12px 0 0',
        }}
      />

      {/* Icon */}
      {Icon && (
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <Icon size={20} style={{ color: 'var(--gold)', opacity: 0.3 }} />
        </div>
      )}

      {/* Label */}
      <p className="kpi-label">{label}</p>

      {/* Value */}
      <p style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--gold)', marginTop: 6, lineHeight: 1 }}>
        {prefix && <span style={{ fontSize: 16, fontWeight: 500, marginRight: 2 }}>{prefix}</span>}
        {value ?? '—'}
        {suffix && <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 2 }}>{suffix}</span>}
      </p>

      {/* Change */}
      {change !== undefined && (
        <p style={{ fontSize: 12, color: changeColor, marginTop: 8 }}>
          {changeArrow}{Math.abs(change)}% {changeLabel}
        </p>
      )}

      <style>{`.kpi-card:hover .kpi-accent-bar { opacity: 1 !important; }`}</style>
    </motion.div>
  )
}

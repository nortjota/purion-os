'use client'

import { motion } from 'framer-motion'
import { WidgetShell } from './WidgetShell'
import { soft } from '@/components/motion/presets'

export interface EtapaFunil {
  label: string
  valor: number
  meta?: number
  cor: string
}

interface Props {
  title: string
  icon?: React.ElementType
  etapas: EtapaFunil[]
  isLoading?: boolean
  href?: string
}

export function WidgetFunil({ title, icon, etapas, isLoading, href }: Props) {
  const maior = Math.max(1, ...etapas.map((e) => e.valor))
  const isEmpty = etapas.every((e) => e.valor === 0)

  return (
    <WidgetShell title={title} icon={icon} isLoading={isLoading} isEmpty={isEmpty} height={200} href={href}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {etapas.map((etapa, idx) => {
          const largura = Math.max(8, (etapa.valor / maior) * 100)
          const pctMeta = etapa.meta && etapa.meta > 0 ? Math.min(100, Math.round((etapa.valor / etapa.meta) * 100)) : null
          return (
            <div key={etapa.label}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{etapa.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: etapa.cor }}>
                  {etapa.valor}{etapa.meta ? <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}> / {etapa.meta}</span> : ''}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                {/* cresce da esquerda (scaleX = só transform) */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: largura / 100 }}
                  transition={{ ...soft, delay: 0.08 * idx }}
                  style={{
                    height: '100%', width: '100%', background: etapa.cor, borderRadius: 999,
                    transformOrigin: 'left center', willChange: 'transform',
                    opacity: pctMeta !== null && pctMeta < 100 ? 0.85 : 1,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </WidgetShell>
  )
}

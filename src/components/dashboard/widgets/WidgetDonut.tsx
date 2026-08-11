'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { WidgetShell } from './WidgetShell'
import { PALETA_GRAFICOS, TOOLTIP_STYLE } from './widgetHelpers'

export interface DonutFatia {
  name: string
  value: number
  cor?: string
}

interface Props {
  title: string
  icon?: React.ElementType
  data: DonutFatia[]
  centerLabel?: string
  centerValor?: string
  height?: number
  isLoading?: boolean
  href?: string
  formatarValor?: (v: number) => string
}

export function WidgetDonut({ title, icon, data, centerLabel, centerValor, height = 180, isLoading, href, formatarValor }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const isEmpty = total <= 0

  return (
    <WidgetShell title={title} icon={icon} isLoading={isLoading} isEmpty={isEmpty} height={height} href={href}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: height, height, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={3} stroke="none">
                {data.map((d, i) => <Cell key={d.name} fill={d.cor ?? PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [formatarValor ? formatarValor(Number(value)) : value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          {(centerLabel || centerValor) && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              {centerValor && <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{centerValor}</span>}
              {centerLabel && <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{centerLabel}</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 100 }}>
          {data.map((d, i) => {
            const cor = d.cor ?? PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </WidgetShell>
  )
}

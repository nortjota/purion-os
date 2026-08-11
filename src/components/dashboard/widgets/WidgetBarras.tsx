'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts'
import { WidgetShell } from './WidgetShell'
import { PALETA_GRAFICOS, TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_TICK_FILL } from './widgetHelpers'

export interface BarraItem {
  name: string
  value: number
  cor?: string
}

interface SerieMulti {
  key: string
  label: string
  cor: string
}

interface Props {
  title: string
  icon?: React.ElementType
  data: Array<Record<string, string | number>>
  series?: SerieMulti[]   // se informado, renderiza múltiplas barras (uma por série) em vez de "value"
  height?: number
  isLoading?: boolean
  href?: string
  formatarValor?: (v: number) => string
  horizontal?: boolean
}

export function WidgetBarras({ title, icon, data, series, height = 200, isLoading, href, formatarValor, horizontal }: Props) {
  const isEmpty = data.length === 0

  return (
    <WidgetShell title={title} icon={icon} isLoading={isLoading} isEmpty={isEmpty} height={height} href={href}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            </>
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(201,168,76,0.05)' }}
            formatter={(value) => formatarValor ? formatarValor(Number(value)) : value}
          />
          {series ? (
            <>
              <Legend formatter={(v) => <span style={{ color: CHART_TICK_FILL, fontSize: 11 }}>{v}</span>} />
              {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.cor} radius={[3, 3, 0, 0]} />)}
            </>
          ) : (
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={String(d.name)} fill={(d.cor as string) ?? PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]} />)}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </WidgetShell>
  )
}

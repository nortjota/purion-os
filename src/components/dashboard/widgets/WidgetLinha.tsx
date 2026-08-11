'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { WidgetShell } from './WidgetShell'
import { TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_TICK_FILL } from './widgetHelpers'

export interface PontoLinha {
  name: string
  valor: number
}

interface Props {
  title: string
  icon?: React.ElementType
  data: PontoLinha[]
  cor?: string
  height?: number
  isLoading?: boolean
  href?: string
  formatarValor?: (v: number) => string
}

export function WidgetLinha({ title, icon, data, cor = '#C9A84C', height = 200, isLoading, href, formatarValor }: Props) {
  const isEmpty = data.length === 0 || data.every((d) => d.valor === 0)
  const gradId = `grad-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <WidgetShell title={title} icon={icon} isLoading={isLoading} isEmpty={isEmpty} height={height} href={href}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="name" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} width={40} allowDecimals={false}
            tickFormatter={(v) => formatarValor ? formatarValor(v) : String(v)} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatarValor ? formatarValor(Number(value)) : value} />
          <Area type="monotone" dataKey="valor" stroke={cor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: cor }} />
        </AreaChart>
      </ResponsiveContainer>
    </WidgetShell>
  )
}

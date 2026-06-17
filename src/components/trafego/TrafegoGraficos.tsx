'use client'

/**
 * PURION OS — Tráfego: Gráficos Recharts (SSR-safe)
 * Carregado via dynamic() para evitar erros de hidratação.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { TrafegoDaily } from '@/lib/trafego-types'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface DailyConsolidado {
  data: string
  meta: number
  google: number
  tiktok: number
}

interface Props {
  tipo: 'empilhado' | 'linha'
  empilhadoData?: DailyConsolidado[]
  linhaData?: TrafegoDaily[]
  cor?: string
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fmtR = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function TooltipEmpilhado({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#6B6B6B] mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtR(p.value)}
        </p>
      ))}
      <p className="text-[var(--text-primary)] font-bold mt-1 border-t border-[var(--border)] pt-1">
        Total: {fmtR(total)}
      </p>
    </div>
  )
}

function TooltipLinha({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#6B6B6B] mb-1">{label}</p>
      <p className="font-bold text-[var(--text-primary)]">{fmtR(payload[0].value)}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function TrafegoGraficos({ tipo, empilhadoData = [], linhaData = [], cor = '#C9A84C' }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridStroke = isDark ? '#2A2A2A' : '#E0DFDB'
  const tickFill   = isDark ? '#4A4A4A' : '#6B6B66'

  if (tipo === 'empilhado') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={empilhadoData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="data"
            tick={{ fill: tickFill, fontSize: 9 }}
            axisLine={false} tickLine={false}
            interval={Math.floor(empilhadoData.length / 6)}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: tickFill, fontSize: 9 }}
            axisLine={false} tickLine={false} width={40}
          />
          <Tooltip content={<TooltipEmpilhado />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend formatter={(v) => <span style={{ color: tickFill, fontSize: 10 }}>{v}</span>} />
          <Bar dataKey="meta"   name="Meta"   stackId="a" fill="#1877F2" radius={[0, 0, 0, 0]} />
          <Bar dataKey="google" name="Google" stackId="a" fill="#34A853" radius={[0, 0, 0, 0]} />
          <Bar dataKey="tiktok" name="TikTok" stackId="a" fill="#EE1D52" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={linhaData}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="data"
          tick={{ fill: tickFill, fontSize: 9 }}
          axisLine={false} tickLine={false}
          interval={Math.floor(linhaData.length / 6)}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: tickFill, fontSize: 9 }}
          axisLine={false} tickLine={false} width={40}
        />
        <Tooltip content={<TooltipLinha />} />
        <Line
          type="monotone" dataKey="gasto"
          stroke={cor} strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: cor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

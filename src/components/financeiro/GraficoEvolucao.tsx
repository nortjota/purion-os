'use client'

/**
 * PURION OS — Gráfico de Evolução Financeira
 * Isolado em arquivo próprio para uso com dynamic() + ssr:false.
 * Recharts requer DOM — não pode ser renderizado no servidor.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { MesGrafico } from '@/lib/calculos'

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

// Tooltip customizado com estilo PURION
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const LABELS: Record<string, string> = {
    receita: 'Receita',
    despesa: 'Despesa',
    margem: 'Margem',
  }

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 shadow-xl min-w-[160px]">
      <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mb-2 font-medium">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#8A8A8A]">{LABELS[entry.name] ?? entry.name}</span>
          </div>
          <span className="font-semibold" style={{ color: entry.color }}>
            {entry.name === 'margem'
              ? `${entry.value}%`
              : `R$ ${entry.value.toLocaleString('pt-BR')}`
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// Tick customizado para o eixo Y monetário
function TickMoeda({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  if (!payload) return null
  const val = payload.value >= 1000 ? `${(payload.value / 1000).toFixed(0)}k` : String(payload.value)
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#4A4A4A" fontSize={11}>
      {val}
    </text>
  )
}

// Tick para eixo Y de percentual (direita)
function TickPercent({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  if (!payload) return null
  return (
    <text x={x} y={y} dy={4} textAnchor="start" fill="#4A4A4A" fontSize={11}>
      {payload.value}%
    </text>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

interface GraficoEvolucaoProps {
  dados: MesGrafico[]
}

export function GraficoEvolucao({ dados }: GraficoEvolucaoProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1E1E1E"
          vertical={false}
        />
        <XAxis
          dataKey="mes"
          tick={{ fill: '#4A4A4A', fontSize: 11 }}
          axisLine={{ stroke: '#2A2A2A' }}
          tickLine={false}
        />
        {/* Eixo Y esquerdo — valores monetários */}
        <YAxis
          yAxisId="moeda"
          orientation="left"
          tick={<TickMoeda />}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        {/* Eixo Y direito — percentual de margem */}
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={<TickPercent />}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 16, fontSize: 11, color: '#6B6B6B' }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              receita: 'Receita',
              despesa: 'Despesa',
              margem: 'Margem %',
            }
            return labels[value] ?? value
          }}
        />

        {/* Linha Receita — dourado */}
        <Line
          yAxisId="moeda"
          type="monotone"
          dataKey="receita"
          stroke="#C9A84C"
          strokeWidth={2.5}
          dot={{ fill: '#C9A84C', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#C9A84C', stroke: '#0D0D0D', strokeWidth: 2 }}
        />
        {/* Linha Despesa — vermelho suave */}
        <Line
          yAxisId="moeda"
          type="monotone"
          dataKey="despesa"
          stroke="#E85238"
          strokeWidth={2}
          strokeOpacity={0.7}
          dot={{ fill: '#E85238', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#E85238', stroke: '#0D0D0D', strokeWidth: 2 }}
        />
        {/* Linha Margem % — cinza */}
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="margem"
          stroke="#6B6B6B"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 4, fill: '#6B6B6B', stroke: '#0D0D0D', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

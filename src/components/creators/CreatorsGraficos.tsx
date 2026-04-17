'use client'

import { useTheme } from 'next-themes'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

export interface RoiPlataformaData { plataforma: string; roi: number; receita: number }
export interface NichoData { nicho: string; total: number }

const PIE_COLORS = ['#C9A84C', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#F59E0B']

function useChartColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    grid:    dark ? '#252525' : '#E5E7EB',
    axis:    dark ? '#555555' : '#9CA3AF',
    tick:    dark ? '#6B6B6B' : '#6B7280',
    surface: dark ? '#161616' : '#FFFFFF',
  }
}

export function GraficoRoiPlataforma({ data }: { data: RoiPlataformaData[] }) {
  const c = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="plataforma" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}×`} />
        <Tooltip
          contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${Number(v).toFixed(2)}×`, 'ROI médio']}
        />
        <Bar dataKey="roi" fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GraficoNicho({ data }: { data: NichoData[] }) {
  const c = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          dataKey="total"
          nameKey="nicho"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
          fontSize={11}
          fill={c.tick}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ fontSize: 11, color: c.tick }}>{v}</span>}
        />
        <Tooltip
          contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 8, fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function CreatorsGraficos({
  roiData, nichoData,
}: {
  roiData: RoiPlataformaData[]
  nichoData: NichoData[]
}) {
  return { roiData, nichoData }
}

'use client'

import { useTheme } from 'next-themes'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

export interface FluxoSemanaData { semana: string; entradas: number; saidas: number; saldo: number }
export interface CentroCustoData { nome: string; total: number }

const PIE_COLORS = ['#C9A84C', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444']

function useChartColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    grid:    dark ? '#252525' : '#E5E7EB',
    tick:    dark ? '#B8B8B8' : '#6B7280',
    surface: dark ? '#161616' : '#FFFFFF',
  }
}

export function GraficoFluxoCaixa({ data }: { data: FluxoSemanaData[] }) {
  const c = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(v, name) => [
            `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saídas' : 'Saldo',
          ]}
        />
        <Bar dataKey="entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="saidas"   fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GraficoCentroCustos({ data }: { data: CentroCustoData[] }) {
  const c = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={75}
          dataKey="total"
          nameKey="nome"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
          fontSize={10}
          fill={c.tick}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Legend iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: 11, color: c.tick }}>{v}</span>} />
        <Tooltip
          contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

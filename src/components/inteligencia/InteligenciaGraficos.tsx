'use client'

/**
 * PURION OS — Inteligência Comercial: Gráficos Recharts
 * Layout: BarChart + PieChart em grid 2-col, LineChart largura total.
 * Importado via dynamic() para evitar erros SSR.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line,
} from 'recharts'
import { useTheme } from 'next-themes'

// ─────────────────────────────────────────────
// TIPOS (re-exportados para uso no Dashboard)
// ─────────────────────────────────────────────

export interface ProdutoChartData {
  nome: string
  receita: number
  unidades: number
  margem: number
}

export interface CanalChartData {
  nome: string
  valor: number
  percentual: number
}

export interface SemanalChartData {
  semana: string
  valor: number
}

interface Props {
  produtosData: ProdutoChartData[]
  canaisData: CanalChartData[]
  semanalData: SemanalChartData[]
}

// ─────────────────────────────────────────────
// CORES E HELPERS
// ─────────────────────────────────────────────

const CANAL_CORES = ['#C9A84C', '#8B5CF6', '#3B82F6', '#6B7280']
const PRODUTO_CORES = ['#C9A84C', '#A07A2E', '#7A5E22']

const fmtR = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function TooltipProduto({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
      <p className="font-bold text-[#C9A84C] mb-2 tracking-widest">{label}</p>
      <p className="text-[var(--text-secondary)]">Receita: <span className="text-[var(--text-primary)] font-semibold">{fmtR(d.value)}</span></p>
    </div>
  )
}

function TooltipCanal({ active, payload }: {
  active?: boolean; payload?: Array<{ name: string; value: number; payload: CanalChartData }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
      <p className="font-bold text-[var(--text-primary)] mb-1">{item.name}</p>
      <p className="text-[var(--text-secondary)]">Receita: <span className="text-[#C9A84C] font-bold">{fmtR(item.value)}</span></p>
      <p className="text-[var(--text-secondary)]">Participação: <span className="text-[var(--text-primary)] font-semibold">{item.payload.percentual}%</span></p>
    </div>
  )
}

function TooltipSemanal({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#B8B8B8] mb-1">Semana de {label}</p>
      <p className="font-bold text-[#C9A84C]">{fmtR(payload[0].value)}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function GraficosInteligencia({ produtosData, canaisData, semanalData }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridStroke = isDark ? '#2A2A2A' : '#E0DFDB'
  const tickFill   = isDark ? '#A0A0A0' : '#6B6B66'

  return (
    <div className="flex flex-col gap-6">

      {/* ── Grid: BarChart (esq) + PieChart (dir) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Seção 1 — Ranking de Produtos (BarChart) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-4">
            Seção 1 — Ranking de Produtos
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={produtosData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="nome"
                tick={{ fill: '#B8B8B8', fontSize: 11, fontWeight: 700 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<TooltipProduto />} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
              <Bar dataKey="receita" name="receita" radius={[4, 4, 0, 0]}>
                {produtosData.map((entry, index) => (
                  <Cell key={entry.nome} fill={PRODUTO_CORES[index] ?? '#3A3A3A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Métricas por produto */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {produtosData.map((p, i) => (
              <div key={p.nome} className="bg-[var(--bg-surface-2)] rounded-md p-2">
                <p className="text-[9px] font-black tracking-widest mb-1.5"
                   style={{ color: PRODUTO_CORES[i] }}>{p.nome}</p>
                <p className="text-[10px] text-[#B8B8B8]">
                  {p.unidades} un · <span className="text-emerald-400">{p.margem}%</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Seção 2 — Ranking de Canais (PieChart) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-1">
            Seção 2 — Ranking de Canais
          </p>
          <p className="text-[9px] text-[#A0A0A0] mb-3">Fatia dourada = canal líder</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={canaisData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                dataKey="valor" nameKey="nome"
                paddingAngle={3}
              >
                {canaisData.map((entry, index) => (
                  <Cell key={entry.nome} fill={CANAL_CORES[index] ?? '#3A3A3A'} />
                ))}
              </Pie>
              <Tooltip content={<TooltipCanal />} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: tickFill, fontSize: 11 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Tabela rápida de participação */}
          <div className="flex flex-col gap-1.5 mt-1">
            {canaisData.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CANAL_CORES[i] ?? '#3A3A3A' }} />
                <span className="text-[10px] text-[var(--text-secondary)] flex-1">{c.nome}</span>
                <span className="text-[10px] font-bold text-[var(--text-primary)]">{c.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seção 5 — Sazonalidade (LineChart) — largura total */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
        <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-4">
          Seção 5 — Sazonalidade — Vendas por Semana (2 meses)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={semanalData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="semana"
              tick={{ fill: tickFill, fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: tickFill, fontSize: 10 }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<TooltipSemanal />} />
            <Line
              type="monotone" dataKey="valor"
              stroke="#C9A84C" strokeWidth={2}
              dot={{ fill: '#C9A84C', r: 3 }}
              activeDot={{ r: 5, fill: '#D4B568' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

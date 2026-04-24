'use client'

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts'

const GOLD = '#C9A84C'
const BLUE = '#3B82F6'
const TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text-secondary)' },
}
const TICK  = { fontSize: 11, fill: 'var(--text-secondary)' }
const AXIS  = { tickLine: false, axisLine: false }
const MONEY = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const KILO  = (v: number) => `R$${(v / 1000).toFixed(1)}k`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtV = (fn: (v: number) => string | number, label: string): any => (v: any) => [fn(v as number), label]

// ── Vendas diárias (30 dias) ──────────────────────────────────────────────────
export type DiaVenda = { data: string; valor: number }

export function GraficoVendasDiarias({ dados }: { dados: DiaVenda[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="data" tick={TICK} {...AXIS} />
        <YAxis tick={TICK} {...AXIS} tickFormatter={KILO} width={56} />
        <Tooltip {...TOOLTIP_STYLE} formatter={fmtV(MONEY, 'Vendas')} />
        <Line type="monotone" dataKey="valor" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GOLD }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Top afiliados — barras horizontais ────────────────────────────────────────
export type TopAfiliadoItem = { id: string; nome: string; receita: number }

export function GraficoTopAfiliados({
  dados,
  onClickAfiliado,
}: {
  dados: TopAfiliadoItem[]
  onClickAfiliado?: (id: string) => void
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 40)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={TICK} {...AXIS} tickFormatter={KILO} />
        <YAxis type="category" dataKey="nome" tick={TICK} {...AXIS} width={90} />
        <Tooltip {...TOOLTIP_STYLE} formatter={fmtV(MONEY, 'Receita')} />
        <Bar
          dataKey="receita" fill={GOLD} radius={[0, 4, 4, 0]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(entry: any) => onClickAfiliado?.((entry as TopAfiliadoItem).id)}
          cursor={onClickAfiliado ? 'pointer' : 'default'}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Cliques vs vendas por semana (perfil do afiliado) ─────────────────────────
export type SemanaData = { semana: string; cliques: number; vendas: number }

export function GraficoClicksVsVendas({ dados }: { dados: SemanaData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="semana" tick={TICK} {...AXIS} />
        <YAxis tick={TICK} {...AXIS} width={36} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="cliques" stroke={BLUE} strokeWidth={2} dot={false} name="Cliques" />
        <Line type="monotone" dataKey="vendas"  stroke={GOLD} strokeWidth={2} dot={false} name="Vendas" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Cliques por dia (aba cliques do perfil) ───────────────────────────────────
export type DiaClique = { data: string; cliques: number; convertidos: number }

export function GraficoClicksPorDia({ dados }: { dados: DiaClique[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={dados} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="data" tick={TICK} {...AXIS} />
        <YAxis tick={TICK} {...AXIS} width={32} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="cliques"    fill="rgba(59,130,246,0.4)" radius={[3, 3, 0, 0]} name="Cliques" />
        <Bar dataKey="convertidos" fill={GOLD}                radius={[3, 3, 0, 0]} name="Convertidos" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Plataformas — pizza (relatório) ──────────────────────────────────────────
const PLAT_COLORS = [GOLD, BLUE, '#EC4899', '#10B981', '#8B5CF6', '#F59E0B']
export type PlataformaItem = { nome: string; valor: number }

export function GraficoPorPlataforma({ dados }: { dados: PlataformaItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={dados} dataKey="valor" nameKey="nome"
          cx="50%" cy="50%" outerRadius={80}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => `${props.nome ?? props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {dados.map((_, i) => <Cell key={i} fill={PLAT_COLORS[i % PLAT_COLORS.length]} />)}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} formatter={fmtV((v) => v, 'Cliques')} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Evolução mensal (relatório) ───────────────────────────────────────────────
export type MesData = { mes: string; receita: number }

export function GraficoEvolucaoMensal({ dados }: { dados: MesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="mes" tick={TICK} {...AXIS} />
        <YAxis tick={TICK} {...AXIS} tickFormatter={KILO} width={56} />
        <Tooltip {...TOOLTIP_STYLE} formatter={fmtV(MONEY, 'Receita')} />
        <Line type="monotone" dataKey="receita" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

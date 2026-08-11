'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { Lote } from '@/store'
import { ESTAGIOS_LOTE, normalizarStatusLote, calcularCustoLote, formatarMoeda } from './producaoHelpers'

interface Props {
  lotes: Lote[]
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

function KpiCard({ label, value, cor, sub }: { label: string; value: string | number; cor?: string; sub?: string }) {
  return (
    <div className="kpi-card" style={{ borderColor: cor ? `${cor}30` : undefined }}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={{ color: cor }}>{value}</span>
      {sub && <p className="caption mt-1">{sub}</p>}
    </div>
  )
}

export function ProducaoLotesPainel({ lotes }: Props) {
  const metricas = useMemo(() => {
    const totalUnidades = lotes.reduce((s, l) => s + l.quantidadeProduzida, 0)
    const totalEnvasado = lotes.reduce((s, l) => s + l.quantidadeAprovada, 0)
    const custoTotal = calcularCustoLote(totalUnidades)
    const concluidos = lotes.filter((l) => normalizarStatusLote(l.status) === 'concluido')

    const duracoes = concluidos
      .filter((l) => l.dataConclusao)
      .map((l) => (new Date(l.dataConclusao!).getTime() - new Date(l.dataInicio).getTime()) / 86_400_000)
    const duracaoMedia = duracoes.length > 0 ? duracoes.reduce((s, d) => s + d, 0) / duracoes.length : 0

    const porEstagio = ESTAGIOS_LOTE.map((e) => ({
      name: e.label, value: lotes.filter((l) => normalizarStatusLote(l.status) === e.id).length, cor: e.cor,
    })).filter((d) => d.value > 0)

    const porMes = new Map<string, number>()
    lotes.forEach((l) => {
      const mes = l.dataInicio.slice(0, 7)
      porMes.set(mes, (porMes.get(mes) ?? 0) + l.quantidadeProduzida)
    })
    const producaoPorMes = Array.from(porMes.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([mes, un]) => ({ name: mes, unidades: un }))

    return { totalUnidades, totalEnvasado, custoTotal, concluidos: concluidos.length, duracaoMedia, porEstagio, producaoPorMes }
  }, [lotes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiCard label="Unidades produzidas" value={metricas.totalUnidades} />
        <KpiCard label="Unidades envasadas" value={metricas.totalEnvasado} cor="#4CAF7A" />
        <KpiCard label="Custo total" value={formatarMoeda(metricas.custoTotal)} cor="#C9A84C" />
        <KpiCard label="Lotes concluídos" value={metricas.concluidos} cor="#5B8FE8" />
        <KpiCard label="Duração média" value={metricas.duracaoMedia > 0 ? `${metricas.duracaoMedia.toFixed(1)}d` : '—'} sub="do início à conclusão" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Unidades produzidas por mês</p>
          {metricas.producaoPorMes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas.producaoPorMes}>
                <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                <Bar dataKey="unidades" fill="rgba(201,168,76,0.75)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Por estágio</p>
          {metricas.porEstagio.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={metricas.porEstagio} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {metricas.porEstagio.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {metricas.porEstagio.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

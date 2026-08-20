'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { CheckSquare, Clock, AlertTriangle, ListTodo } from 'lucide-react'
import type { Tarefa } from '@/store'
import { isVencida, SOCIOS, PRIORIDADE_CONFIG, STATUS_LABEL, COLUNAS, MODULOS } from './tarefasHelpers'
import { useMobile } from '@/hooks/useMobile'

interface Props {
  tarefas: Tarefa[]
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 8,
  fontSize: 12,
  color: '#F5F5F5',
}

function KpiCard({ label, value, cor, icon: Icon }: {
  label: string; value: number | string; cor?: string; icon: React.ElementType
}) {
  return (
    <div className="kpi-card" style={{ borderColor: cor ? `${cor}30` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="kpi-label">{label}</span>
        <Icon size={14} style={{ color: cor ?? 'var(--text-secondary)', opacity: 0.7 }} />
      </div>
      <span className="kpi-value" style={{ color: cor }}>{value}</span>
    </div>
  )
}

export function TarefaDashboardView({ tarefas }: Props) {
  const metricas = useMemo(() => {
    const total       = tarefas.length
    const concluidas  = tarefas.filter((t) => t.status === 'concluida').length
    const atrasadas   = tarefas.filter((t) => isVencida(t.dueDate, t.status)).length
    const emAndamento = tarefas.filter((t) => t.status === 'em_andamento').length

    const porStatus = COLUNAS.map((col) => ({
      name: col.label,
      value: tarefas.filter((t) => t.status === col.id).length,
      cor: col.cor,
    })).filter((d) => d.value > 0)

    const modulosUsados = [...new Set([
      ...MODULOS.filter((m) => tarefas.some((t) => t.modulo === m)),
      ...tarefas.map((t) => t.modulo).filter((m) => m && !MODULOS.includes(m as never)),
    ])]

    const porModulo = modulosUsados.map((m) => ({
      name: m.charAt(0).toUpperCase() + m.slice(1),
      total: tarefas.filter((t) => t.modulo === m).length,
      concluidas: tarefas.filter((t) => t.modulo === m && t.status === 'concluida').length,
    }))

    const porResponsavel = SOCIOS.map((s) => ({
      name: s.nome,
      cor: s.cor,
      total:      tarefas.filter((t) => t.responsavel === s.id).length,
      concluidas: tarefas.filter((t) => t.responsavel === s.id && t.status === 'concluida').length,
      atrasadas:  tarefas.filter((t) => t.responsavel === s.id && isVencida(t.dueDate, t.status)).length,
    }))

    const porPrioridade = (['urgente', 'alta', 'media', 'baixa'] as const).map((p) => ({
      name: PRIORIDADE_CONFIG[p].label,
      cor: PRIORIDADE_CONFIG[p].cor,
      value: tarefas.filter((t) => t.prioridade === p).length,
    })).filter((d) => d.value > 0)

    return { total, concluidas, atrasadas, emAndamento, porStatus, porModulo, porResponsavel, porPrioridade }
  }, [tarefas])

  const taxaConclusao = metricas.total > 0
    ? Math.round((metricas.concluidas / metricas.total) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiCard label="Total de Tarefas"  value={metricas.total}       icon={ListTodo}     />
        <KpiCard label="Concluídas"        value={metricas.concluidas}  icon={CheckSquare}  cor="#4CAF7A" />
        <KpiCard label="Em Andamento"      value={metricas.emAndamento} icon={Clock}        cor="#5B8FE8" />
        <KpiCard label="Atrasadas"         value={metricas.atrasadas}   icon={AlertTriangle} cor={metricas.atrasadas > 0 ? '#E85238' : undefined} />
      </div>

      {/* ── Taxa de conclusão ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Taxa de Conclusão</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#4CAF7A' }}>{taxaConclusao}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
          <div style={{
            width: `${taxaConclusao}%`, height: '100%',
            background: 'linear-gradient(90deg, #4CAF7A, #6DD4A0)',
            borderRadius: 3, transition: 'width 600ms ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{metricas.concluidas} concluídas</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{metricas.total - metricas.concluidas} abertas</span>
        </div>
      </div>

      {/* ── Linha: Módulos + Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>

        {/* Por módulo */}
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Por Módulo</p>
          {metricas.porModulo.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas.porModulo} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(201,168,76,0.05)' }}
                />
                <Bar dataKey="total" name="Total" fill="rgba(91,143,232,0.7)" radius={[3,3,0,0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill="rgba(76,175,122,0.8)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por status (donut) */}
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Por Status</p>
          {metricas.porStatus.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={metricas.porStatus}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    dataKey="value" paddingAngle={3}
                  >
                    {metricas.porStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {metricas.porStatus.map((d) => (
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

      {/* ── Por responsável ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Por Responsável</p>
        {metricas.porResponsavel.filter((r) => r.total > 0).length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metricas.porResponsavel.filter((r) => r.total > 0).map((r) => {
              const pct = r.total > 0 ? Math.round((r.concluidas / r.total) * 100) : 0
              return (
                <div key={r.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800,
                      background: `${r.cor}22`, color: r.cor,
                    }}>
                      {r.name[0]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.concluidas}/{r.total}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: r.cor }}>{pct}%</span>
                    {r.atrasadas > 0 && (
                      <span style={{ fontSize: 10, color: '#E85238', fontWeight: 600 }}>
                        {r.atrasadas} atrasada{r.atrasadas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: r.cor, borderRadius: 3,
                      transition: 'width 500ms ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Por prioridade ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Por Prioridade</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {metricas.porPrioridade.map((p) => (
            <div key={p.name} style={{
              flex: 1, minWidth: 100,
              background: `${p.cor}10`,
              border: `1px solid ${p.cor}30`,
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 11, color: p.cor, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: p.cor }}>{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status label reference ── */}
      <div style={{ height: 1, display: 'none' }}>{Object.keys(STATUS_LABEL).join('')}</div>
    </div>
  )
}

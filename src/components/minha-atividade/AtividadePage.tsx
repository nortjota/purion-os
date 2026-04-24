'use client'

import { useState, useMemo } from 'react'
import { Activity, CheckSquare, Users, DollarSign, TrendingDown } from 'lucide-react'
import { usePurionStore } from '@/store'

type Modulo = 'todos' | 'crm' | 'tarefas' | 'financeiro'
type Periodo = '7d' | '30d' | 'todos'

interface TimelineEvent {
  id: string
  icon: React.ElementType
  iconColor: string
  text: string
  date: string
  modulo: Modulo
}

function formatRelDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return `${diff} dias atrás`
}

function isWithinDays(iso: string, days: number): boolean {
  const diff = (Date.now() - new Date(iso).getTime()) / 86_400_000
  return diff <= days
}

export function AtividadePage() {
  const { tarefas, leads, receitas, despesas } = usePurionStore()
  const [filtroModulo, setFiltroModulo] = useState<Modulo>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<Periodo>('todos')

  // KPI stats
  const tarefasConcluidas = tarefas.filter((t) => t.status === 'concluida').length
  const leadsAbordados    = leads.filter((l) => l.status !== 'prospecto').length
  const receitasCount     = receitas.length
  const despesasCount     = despesas.length

  // Build timeline events
  const events = useMemo<TimelineEvent[]>(() => {
    const result: TimelineEvent[] = []

    tarefas.forEach((t) => {
      result.push({
        id: `t-${t.id}`,
        icon: CheckSquare,
        iconColor: '#5B8FE8',
        text: `Você criou tarefa: ${t.titulo}`,
        date: t.createdAt,
        modulo: 'tarefas',
      })
      if (t.completedAt) {
        result.push({
          id: `tc-${t.id}`,
          icon: CheckSquare,
          iconColor: '#22C55E',
          text: `Você concluiu tarefa: ${t.titulo}`,
          date: t.completedAt,
          modulo: 'tarefas',
        })
      }
    })

    leads.forEach((l) => {
      result.push({
        id: `l-${l.id}`,
        icon: Users,
        iconColor: '#C9A84C',
        text: `Lead adicionado: ${l.nomeEmpresa}`,
        date: l.createdAt,
        modulo: 'crm',
      })
    })

    receitas.forEach((r) => {
      result.push({
        id: `r-${r.id}`,
        icon: DollarSign,
        iconColor: '#22C55E',
        text: `Receita registrada: R$ ${r.valor.toLocaleString('pt-BR')}`,
        date: r.data,
        modulo: 'financeiro',
      })
    })

    despesas.forEach((d) => {
      result.push({
        id: `d-${d.id}`,
        icon: TrendingDown,
        iconColor: '#E85238',
        text: `Despesa registrada: R$ ${d.valor.toLocaleString('pt-BR')}`,
        date: d.data,
        modulo: 'financeiro',
      })
    })

    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [tarefas, leads, receitas, despesas])

  const filtered = events.filter((ev) => {
    if (filtroModulo !== 'todos' && ev.modulo !== filtroModulo) return false
    if (filtroPeriodo === '7d'  && !isWithinDays(ev.date, 7))  return false
    if (filtroPeriodo === '30d' && !isWithinDays(ev.date, 30)) return false
    return true
  })

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Minha Atividade</h1>
        <p className="caption mt-1">Histórico pessoal de ações no sistema</p>
      </div>

      {/* KPI row */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Tarefas Concluídas',   valor: tarefasConcluidas, icon: CheckSquare,  cor: '#22C55E' },
          { label: 'Leads Abordados',      valor: leadsAbordados,    icon: Users,         cor: '#C9A84C' },
          { label: 'Receitas Registradas', valor: receitasCount,     icon: DollarSign,    cor: '#5B8FE8' },
          { label: 'Despesas Registradas', valor: despesasCount,     icon: TrendingDown,  cor: '#E85238' },
        ].map((kpi) => (
          <div key={kpi.label} className="card-purion" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${kpi.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon size={15} style={{ color: kpi.cor }} />
              </div>
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{kpi.valor}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['todos', 'crm', 'tarefas', 'financeiro'] as Modulo[]).map((m) => (
          <button
            key={m}
            onClick={() => setFiltroModulo(m)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: filtroModulo === m ? 'rgba(201,168,76,0.15)' : 'transparent',
              border: `1px solid ${filtroModulo === m ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
              color: filtroModulo === m ? '#C9A84C' : 'var(--text-secondary)',
              textTransform: 'capitalize',
            }}
          >
            {m === 'todos' ? 'Todos' : m.toUpperCase()}
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {(['7d', '30d', 'todos'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setFiltroPeriodo(p)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: filtroPeriodo === p ? 'rgba(91,143,232,0.12)' : 'transparent',
              border: `1px solid ${filtroPeriodo === p ? 'rgba(91,143,232,0.4)' : 'var(--border)'}`,
              color: filtroPeriodo === p ? '#5B8FE8' : 'var(--text-secondary)',
            }}
          >
            {p === 'todos' ? 'Tudo' : p === '7d' ? '7 dias' : '30 dias'}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <Activity size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhuma atividade encontrada</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Ajuste os filtros ou adicione dados ao sistema</p>
        </div>
      ) : (
        <div className="card-purion" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.map((ev, idx) => (
            <div
              key={ev.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Timeline dot */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                flexShrink: 0,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `${ev.iconColor}18`, border: `1px solid ${ev.iconColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ev.icon size={13} style={{ color: ev.iconColor }} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{ev.text}</p>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatRelDate(ev.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

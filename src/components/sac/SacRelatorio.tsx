'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import type { Ticket } from './SacDashboard'

const COLORS = ['#3B82F6', '#C9A84C', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B']

const fmtV = (v: unknown) => String(v) as any

export function SacRelatorio() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!supabase) { setCarregando(false); return }
    supabase.from('tickets_sac')
      .select('*')
      .is('deleted_at', null)
      .then(({ data }) => {
        if (data) setTickets(data as Ticket[])
        setCarregando(false)
      })
  }, [])

  const porStatus = [
    { name: 'Aberto',          value: tickets.filter(t => t.status === 'aberto').length },
    { name: 'Em atendimento',  value: tickets.filter(t => t.status === 'em_atendimento').length },
    { name: 'Ag. cliente',     value: tickets.filter(t => t.status === 'aguardando_cliente').length },
    { name: 'Resolvido',       value: tickets.filter(t => t.status === 'resolvido').length },
    { name: 'Encerrado',       value: tickets.filter(t => t.status === 'encerrado').length },
  ]

  const porTipo = [
    { name: 'Dúvida',     value: tickets.filter(t => t.tipo === 'duvida').length },
    { name: 'Reclamação', value: tickets.filter(t => t.tipo === 'reclamacao').length },
    { name: 'Troca',      value: tickets.filter(t => t.tipo === 'troca').length },
    { name: 'Devolução',  value: tickets.filter(t => t.tipo === 'devolucao').length },
    { name: 'Elogio',     value: tickets.filter(t => t.tipo === 'elogio').length },
    { name: 'Outro',      value: tickets.filter(t => t.tipo === 'outro').length },
  ].filter(d => d.value > 0)

  const porCanal = [
    { name: 'WhatsApp',  value: tickets.filter(t => t.canal === 'whatsapp').length },
    { name: 'E-mail',    value: tickets.filter(t => t.canal === 'email').length },
    { name: 'Instagram', value: tickets.filter(t => t.canal === 'instagram').length },
    { name: 'Manual',    value: tickets.filter(t => t.canal === 'manual').length },
  ].filter(d => d.value > 0)

  const resolvidos = tickets.filter(t => t.resolvido_em && t.criado_em)
  const tmrMedio = resolvidos.length > 0
    ? Math.round(resolvidos.reduce((acc, t) => {
        const diff = new Date(t.resolvido_em!).getTime() - new Date(t.criado_em).getTime()
        return acc + diff / 3_600_000
      }, 0) / resolvidos.length)
    : null

  const csatList = tickets.filter(t => t.satisfacao)
  const csatMedio = csatList.length > 0
    ? (csatList.reduce((s, t) => s + (t.satisfacao ?? 0), 0) / csatList.length).toFixed(1)
    : null

  const chartCard = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }
  const kpiCard   = { ...chartCard, textAlign: 'center' as const }

  if (carregando) return <div className="page-content" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Carregando…</div>

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <p className="kpi-label mb-1">SAC</p>
        <h1 className="page-title">Relatório</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total de tickets', value: tickets.length, color: 'var(--text-primary)' },
          { label: 'TMR médio (h)',    value: tmrMedio !== null ? `${tmrMedio}h` : '—', color: '#3B82F6' },
          { label: 'CSAT médio',       value: csatMedio !== null ? `${csatMedio}⭐` : '—', color: '#F59E0B' },
          { label: 'Taxa resolução',   value: tickets.length > 0 ? `${Math.round((tickets.filter(t => t.status === 'resolvido' || t.status === 'encerrado').length / tickets.length) * 100)}%` : '—', color: '#10B981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={kpiCard}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Status bar chart */}
        <div style={chartCard}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Tickets por status</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={fmtV} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#C9A84C" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Canal pie */}
        <div style={chartCard}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Tickets por canal</p>
          {porCanal.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porCanal} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${Math.round(percent * 100)}%`}>
                  {porCanal.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={fmtV} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Sem dados</div>
          )}
        </div>
      </div>

      {/* Tipo bar chart */}
      <div style={chartCard}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Tickets por tipo</p>
        {porTipo.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
              <Tooltip formatter={fmtV} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Sem dados</div>
        )}
      </div>
    </div>
  )
}

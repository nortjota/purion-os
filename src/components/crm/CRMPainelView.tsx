'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users, DollarSign, Target, TrendingUp, Bell, ChevronDown, ChevronRight } from 'lucide-react'
import type { Lead } from '@/store'
import { usePurionStore } from '@/store'
import {
  ESTAGIOS, TIER_CONFIG, OBJECOES, METAS_MENSAIS, estagioNormalizado,
  formatarMoeda, diasDesde,
} from './crmHelpers'

interface Props {
  leads: Lead[]
  onAbrirLead: (id: string) => void
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

function KpiCard({ label, value, cor, icon: Icon, sub }: {
  label: string; value: number | string; cor?: string; icon: React.ElementType; sub?: string
}) {
  return (
    <div className="kpi-card" style={{ borderColor: cor ? `${cor}30` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="kpi-label">{label}</span>
        <Icon size={14} style={{ color: cor ?? 'var(--text-secondary)', opacity: 0.7 }} />
      </div>
      <span className="kpi-value" style={{ color: cor }}>{value}</span>
      {sub && <p className="caption mt-1">{sub}</p>}
    </div>
  )
}

export function CRMPainelView({ leads, onAbrirLead }: Props) {
  const { vendas } = usePurionStore()
  const [objecoesAberto, setObjecoesAberto] = useState(false)
  const hoje = new Date()
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const metricas = useMemo(() => {
    const total = leads.length
    const porEstagio = ESTAGIOS.map((e) => ({
      name: e.label,
      value: leads.filter((l) => estagioNormalizado(l.status) === e.id).length,
      cor: e.cor,
    })).filter((d) => d.value > 0)

    const porTier = (['A', 'B', 'C'] as const).map((t) => ({
      name: TIER_CONFIG[t].label,
      value: leads.filter((l) => l.tier === t).length,
      cor: TIER_CONFIG[t].cor,
    }))

    const ganhos = leads.filter((l) => ['cliente', 'recorrente'].includes(estagioNormalizado(l.status))).length
    const perdidos = leads.filter((l) => estagioNormalizado(l.status) === 'perdido').length
    const taxaConversao = total > 0 ? (ganhos / total) * 100 : 0
    const pipeline = leads
      .filter((l) => !['perdido'].includes(estagioNormalizado(l.status)))
      .reduce((s, l) => s + l.valorMedioMensal, 0)

    const fechamentosMes = leads.filter((l) => {
      const ultimaMudanca = l.historicoEstagios?.filter((h) => ['cliente', 'recorrente'].includes(h.para)).slice(-1)[0]
      const ref = ultimaMudanca?.timestamp ?? l.updatedAt
      return ['cliente', 'recorrente'].includes(estagioNormalizado(l.status)) && ref.startsWith(mesStr)
    }).length

    return { total, porEstagio, porTier, ganhos, perdidos, taxaConversao, pipeline, fechamentosMes }
  }, [leads, mesStr])

  const receitaMes = useMemo(() =>
    vendas.filter((v) => v.canal === 'b2b' && v.dataVenda.startsWith(mesStr) && v.statusPagamento === 'pago')
      .reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0),
    [vendas, mesStr]
  )

  const reposicoesPendentes = useMemo(() =>
    leads.filter((l) => {
      if (!['cliente', 'recorrente'].includes(estagioNormalizado(l.status))) return false
      const dias = diasDesde(l.updatedAt)
      return dias >= 14 && dias <= 35
    }).sort((a, b) => diasDesde(b.updatedAt) - diasDesde(a.updatedAt)),
    [leads]
  )

  const mesAtual = Math.min(hoje.getMonth(), METAS_MENSAIS.length - 1)
  const metaMes = METAS_MENSAIS[mesAtual]
  const pctGanhos = metaMes.ganhos > 0 ? Math.min(100, Math.round((metricas.fechamentosMes / metaMes.ganhos) * 100)) : 0
  const pctReceita = metaMes.receita > 0 ? Math.min(100, Math.round((receitaMes / metaMes.receita) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiCard label="Total de Leads"     value={metricas.total}                        icon={Users} />
        <KpiCard label="Taxa de Conversão"  value={`${metricas.taxaConversao.toFixed(1)}%`} icon={Target} cor="#A855F7" sub={`${metricas.ganhos} ganhos / ${metricas.total}`} />
        <KpiCard label="Valor do Pipeline"  value={formatarMoeda(metricas.pipeline) + '/mês'} icon={DollarSign} cor="#C9A84C" />
        <KpiCard label="Fechamentos no mês" value={metricas.fechamentosMes}                icon={TrendingUp} cor="#4CAF7A" />
      </div>

      {/* ── Placar Comercial ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Placar Comercial — {metaMes.mes}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Estéticas fechadas</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4CAF7A' }}>{metricas.fechamentosMes} / {metaMes.ganhos}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pctGanhos}%`, height: '100%', background: '#4CAF7A', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Receita B2B</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C' }}>{formatarMoeda(receitaMes)} / {formatarMoeda(metaMes.receita)}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pctReceita}%`, height: '100%', background: '#C9A84C', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Linha: por estágio + por tier ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Por Estágio</p>
          {metricas.porEstagio.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas.porEstagio} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                <Bar dataKey="value" name="Leads" radius={[3, 3, 0, 0]}>
                  {metricas.porEstagio.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Por Tier</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={metricas.porTier} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                {metricas.porTier.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {metricas.porTier.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Reposições D+21 ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} style={{ color: reposicoesPendentes.length > 0 ? '#E8A838' : 'var(--text-secondary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700 }}>
            Reposições desta semana
            {reposicoesPendentes.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, color: '#E8A838', fontWeight: 600 }}>
                {reposicoesPendentes.length} pendente{reposicoesPendentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {reposicoesPendentes.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum cliente no ciclo de reposição (D+14 a D+35). Bom trabalho!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reposicoesPendentes.map((lead) => {
              const dias = diasDesde(lead.updatedAt)
              const urgente = dias >= 21
              return (
                <button
                  key={lead.id}
                  onClick={() => onAbrirLead(lead.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: 'var(--bg-surface-2)',
                    border: `1px solid ${urgente ? 'rgba(232,168,56,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.nomeEmpresa}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lead.cidade} · {lead.regiao}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: urgente ? '#E8A838' : '#4CAF7A' }}>D+{dias}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{urgente ? '⚡ Follow-up agora' : 'Prepare abordagem'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Objeções & Respostas ── */}
      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <button
          onClick={() => setObjecoesAberto((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {objecoesAberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <p style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'left' }}>Objeções & Respostas — playbook rápido</p>
        </button>
        {objecoesAberto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {OBJECOES.map((o) => (
              <div key={o.objecao} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C', marginBottom: 4 }}>{o.objecao}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{o.resposta}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Lead, StatusLead, TierLead } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import {
  ESTAGIOS, TIER_CONFIG, formatarMoeda, diasDesde, estagioNormalizado,
  urgenciaProximoPasso, URGENCIA_COR, socioInfo,
} from './crmHelpers'

export type LeadGroupBy = 'estagio' | 'tier' | 'none'

function grupos(leads: Lead[], groupBy: LeadGroupBy): Array<{ id: string; label: string; cor?: string; leads: Lead[] }> {
  if (groupBy === 'none') return [{ id: 'all', label: 'Todos os leads', leads }]
  if (groupBy === 'tier') {
    return (['A', 'B', 'C'] as TierLead[]).map((t) => ({
      id: t, label: TIER_CONFIG[t].label, cor: TIER_CONFIG[t].cor,
      leads: leads.filter((l) => l.tier === t),
    })).filter((g) => g.leads.length > 0)
  }
  return ESTAGIOS.map((e) => ({
    id: e.id, label: e.label, cor: e.cor,
    leads: leads.filter((l) => estagioNormalizado(l.status) === e.id),
  })).filter((g) => g.leads.length > 0)
}

interface Props {
  leads: Lead[]
  groupBy: LeadGroupBy
  onAbrirLead: (id: string) => void
  onMudarEstagio: (id: string, status: StatusLead) => void
  onMudarTier: (id: string, tier: TierLead) => void
}

function LinhaLead({ lead, onAbrirLead, onMudarEstagio, onMudarTier }: {
  lead: Lead
  onAbrirLead: (id: string) => void
  onMudarEstagio: (id: string, status: StatusLead) => void
  onMudarTier: (id: string, tier: TierLead) => void
}) {
  const tier = TIER_CONFIG[lead.tier]
  const ultimoContato = lead.ultimoPedido ?? lead.updatedAt
  const diasSem = diasDesde(ultimoContato)
  const urgencia = urgenciaProximoPasso(lead.proximoPassoData)
  const info = socioInfo(lead.responsavel)

  return (
    <tr onClick={() => onAbrirLead(lead.id)} style={{ cursor: 'pointer' }} className="hover:bg-[rgba(201,168,76,0.03)]">
      <td style={{ maxWidth: 220 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lead.nomeEmpresa}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.nomeContato}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.telefone || '—'}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.cidade} · {lead.regiao}</span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.tier}
          onChange={(e) => onMudarTier(lead.id, e.target.value as TierLead)}
          style={{
            fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
            background: tier.bg, color: tier.cor, border: 'none', cursor: 'pointer',
          }}
        >
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.status}
          onChange={(e) => onMudarEstagio(lead.id, e.target.value as StatusLead)}
          style={{
            fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
            background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}
        >
          {ESTAGIOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </td>
      <td>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C' }}>{formatarMoeda(lead.valorMedioMensal)}/mês</span>
      </td>
      <td>
        {lead.proximoPassoData ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: urgencia ? URGENCIA_COR[urgencia] : 'var(--text-secondary)' }}>
            {formatarDataBR(lead.proximoPassoData)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
        )}
      </td>
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {diasSem === 0 ? 'Hoje' : `${diasSem}d atrás`}
        </span>
      </td>
      <td>
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 22, height: 22, borderRadius: '50%',
            fontSize: 9, fontWeight: 800,
            background: `${info.cor}22`, color: info.cor,
          }}
          title={info.nome}
        >
          {info.inicial}
        </span>
      </td>
    </tr>
  )
}

export function CRMListaView({ leads, groupBy, onAbrirLead, onMudarEstagio, onMudarTier }: Props) {
  const isMobile = useMobile()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const gruposList = useMemo(() => grupos(leads, groupBy), [leads, groupBy])

  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum lead encontrado</p>
        <p className="empty-state-subtitle">Cadastre um novo lead ou ajuste os filtros.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {gruposList.map((grupo) => (
          <div key={grupo.id}>
            {groupBy !== 'none' && (
              <button
                onClick={() => setCollapsed((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '4px 0 8px', cursor: 'pointer' }}
              >
                {collapsed[grupo.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {grupo.cor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: grupo.cor }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{grupo.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{grupo.leads.length}</span>
              </button>
            )}
            {!collapsed[grupo.id] && grupo.leads.map((lead) => {
              const tier = TIER_CONFIG[lead.tier]
              return (
                <button key={lead.id} onClick={() => onAbrirLead(lead.id)} className="mobile-card-item text-left w-full" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{lead.nomeEmpresa}</p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: tier.bg, color: tier.cor }}>{tier.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{lead.cidade} · {lead.regiao}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#C9A84C' }}>{formatarMoeda(lead.valorMedioMensal)}/mês</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card-purion" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-purion" style={{ tableLayout: 'fixed', width: '100%', minWidth: 980 }}>
          <colgroup>
            <col style={{ minWidth: 180 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Próximo passo</th>
              <th>Último contato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gruposList.map((grupo) => (
              <React.Fragment key={grupo.id}>
                {groupBy !== 'none' && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <button
                        onClick={() => setCollapsed((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                          background: 'var(--bg-surface-2)', border: 'none', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)', textAlign: 'left',
                        }}
                      >
                        {collapsed[grupo.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        {grupo.cor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: grupo.cor, flexShrink: 0 }} />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{grupo.label}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                          background: grupo.cor ? `${grupo.cor}20` : 'var(--bg-surface)',
                          color: grupo.cor ?? 'var(--text-secondary)',
                          border: `1px solid ${grupo.cor ? `${grupo.cor}30` : 'var(--border)'}`,
                        }}>
                          {grupo.leads.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                )}
                {!collapsed[grupo.id] && grupo.leads.map((lead) => (
                  <LinhaLead
                    key={lead.id}
                    lead={lead}
                    onAbrirLead={onAbrirLead}
                    onMudarEstagio={onMudarEstagio}
                    onMudarTier={onMudarTier}
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

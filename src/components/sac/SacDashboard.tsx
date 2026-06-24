'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, Clock, CheckCircle, AlertCircle, MessageSquare, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TicketModal } from './TicketModal'
import { TicketDetalhe } from './TicketDetalhe'

export type Ticket = {
  id: string
  numero: string
  cliente_nome: string
  cliente_email?: string
  cliente_whatsapp?: string
  canal: 'whatsapp' | 'email' | 'instagram' | 'manual'
  tipo?: 'reclamacao' | 'troca' | 'devolucao' | 'duvida' | 'elogio' | 'outro'
  assunto: string
  descricao?: string
  pedido_ref?: string
  status: 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'resolvido' | 'encerrado'
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
  satisfacao?: number
  criado_em: string
  atualizado_em: string
  resolvido_em?: string
}

const STATUS_CFG: Record<Ticket['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  aberto:            { label: 'Aberto',             color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: AlertCircle    },
  em_atendimento:    { label: 'Em atendimento',     color: '#C9A84C', bg: 'rgba(201,168,76,0.1)', icon: MessageSquare  },
  aguardando_cliente:{ label: 'Aguard. cliente',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: Clock          },
  resolvido:         { label: 'Resolvido',           color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle    },
  encerrado:         { label: 'Encerrado',           color: '#6B7280', bg: 'rgba(107,114,128,0.1)',icon: CheckCircle    },
}

const PRIO_CFG: Record<Ticket['prioridade'], { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: '#6B7280' },
  normal:  { label: 'Normal',  color: '#3B82F6' },
  alta:    { label: 'Alta',    color: '#F59E0B' },
  urgente: { label: 'Urgente', color: '#EF4444' },
}

const CANAL_EMOJI: Record<string, string> = { whatsapp: '💬', email: '📧', instagram: '📷', manual: '✏️' }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

function isUrgenteSemResposta(t: Ticket) {
  if (t.prioridade !== 'urgente') return false
  const diff = Date.now() - new Date(t.criado_em).getTime()
  return diff > 2 * 3_600_000 && t.status === 'aberto'
}

type Props = {
  ticketsInicial: Ticket[]
}

export function SacDashboard({ ticketsInicial }: Props) {
  const [tickets, setTickets]       = useState<Ticket[]>(ticketsInicial)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltro]   = useState<string>('todos')
  const [novoAberto, setNovoAberto] = useState(false)
  const [detalhe, setDetalhe]       = useState<Ticket | null>(null)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    if (!supabase) return
    setCarregando(true)
    const { data } = await supabase
      .from('tickets_sac')
      .select('*')
      .is('deleted_at', null)
      .order('criado_em', { ascending: false })
    if (data) setTickets(data as Ticket[])
    setCarregando(false)
  }, [])

  const filtrados = useMemo(() => {
    let r = tickets
    if (filtroStatus !== 'todos') r = r.filter(t => t.status === filtroStatus)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      r = r.filter(t => t.cliente_nome.toLowerCase().includes(q) || t.assunto.toLowerCase().includes(q) || t.numero.includes(q))
    }
    return r
  }, [tickets, filtroStatus, busca])

  // KPIs
  const abertos         = tickets.filter(t => t.status === 'aberto').length
  const emAtendimento   = tickets.filter(t => t.status === 'em_atendimento').length
  const resolvidosHoje  = tickets.filter(t => t.resolvido_em && t.resolvido_em.startsWith(new Date().toISOString().slice(0, 10))).length
  const csatMedio       = tickets.filter(t => t.satisfacao).length > 0
    ? (tickets.reduce((s, t) => s + (t.satisfacao ?? 0), 0) / tickets.filter(t => t.satisfacao).length).toFixed(1)
    : '—'

  function handleCriado(novo: Ticket) {
    setTickets(p => [novo, ...p])
    setNovoAberto(false)
  }

  function handleAtualizado(atualizado: Ticket) {
    setTickets(p => p.map(t => t.id === atualizado.id ? atualizado : t))
    setDetalhe(atualizado)
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3" style={{ marginBottom: 24 }}>
        <div>
          <p className="kpi-label mb-1">Suporte ao Cliente</p>
          <h1 className="page-title">SAC</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={carregar} disabled={carregando} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
          <button onClick={() => setNovoAberto(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Novo ticket
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Abertos',            value: abertos,         color: '#3B82F6' },
          { label: 'Em atendimento',     value: emAtendimento,   color: '#C9A84C' },
          { label: 'Resolvidos hoje',    value: resolvidosHoje,  color: '#10B981' },
          { label: 'CSAT médio',         value: `${csatMedio}⭐`, color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ticket…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%', padding: '9px 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['todos', 'aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido'].map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              style={{ padding: '7px 12px', borderRadius: 7, border: filtroStatus === s ? '1px solid #C9A84C' : '1px solid var(--border)', background: filtroStatus === s ? 'rgba(201,168,76,0.08)' : 'var(--bg-surface)', color: filtroStatus === s ? '#C9A84C' : 'var(--text-secondary)', fontSize: 11, fontWeight: filtroStatus === s ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {s === 'todos' ? 'Todos' : STATUS_CFG[s as Ticket['status']]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Nenhum ticket encontrado
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                  {['#', 'Cliente', 'Assunto', 'Canal', 'Status', 'Prioridade', 'Aberto'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(t => {
                  const sc  = STATUS_CFG[t.status]
                  const pc  = PRIO_CFG[t.prioridade]
                  const urg = isUrgenteSemResposta(t)
                  return (
                    <tr key={t.id} onClick={() => setDetalhe(t)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: urg ? 'rgba(239,68,68,0.04)' : 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = urg ? 'rgba(239,68,68,0.08)' : 'rgba(201,168,76,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = urg ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {urg && <span style={{ marginRight: 4, animation: 'pulse 1s infinite' }}>🔴</span>}
                        {t.numero}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{t.cliente_nome}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.assunto}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{CANAL_EMOJI[t.canal]} {t.canal}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '3px 8px', borderRadius: 20 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: pc.color }}>{pc.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(t.criado_em)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {novoAberto && <TicketModal onCriado={handleCriado} onFechar={() => setNovoAberto(false)} />}
      {detalhe && <TicketDetalhe ticket={detalhe} onAtualizado={handleAtualizado} onFechar={() => setDetalhe(null)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

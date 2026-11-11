'use client'

import { MetricStrip } from '@/components/ui/MetricStrip'
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
  aberto:            { label: 'Aberto',             color: '#9CC3DB', bg: 'rgba(156,195,219,0.1)',  icon: AlertCircle    },
  em_atendimento:    { label: 'Em atendimento',     color: '#D4FC3C', bg: 'rgba(212,252,60,0.1)', icon: MessageSquare  },
  aguardando_cliente:{ label: 'Aguard. cliente',    color: '#A7A9A6', bg: 'rgba(167,169,166,0.1)', icon: Clock          },
  resolvido:         { label: 'Resolvido',           color: '#8FD14F', bg: 'rgba(143,209,79,0.1)', icon: CheckCircle    },
  encerrado:         { label: 'Encerrado',           color: '#6B7280', bg: 'rgba(107,114,128,0.1)',icon: CheckCircle    },
}

const PRIO_CFG: Record<Ticket['prioridade'], { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: '#6B7280' },
  normal:  { label: 'Normal',  color: '#9CC3DB' },
  alta:    { label: 'Alta',    color: '#E6C374' },
  urgente: { label: 'Urgente', color: '#E5544B' },
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

  const aguardandoCliente = tickets.filter(t => t.status === 'aguardando_cliente').length
  const resolvidos = tickets.filter(t => t.status === 'resolvido').length
  const urgentesSemResposta = tickets.filter(t => isUrgenteSemResposta(t)).length

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
      <div className="toolbar" style={{ marginBottom: 18 }}>
        <h1 className="page-title" style={{ flex: '1 1 200px' }}>SAC</h1>
        <button onClick={carregar} disabled={carregando} className="icon-btn" title="Atualizar tickets" aria-label="Atualizar tickets">
          <RefreshCw size={14} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
        </button>
        <button onClick={() => setNovoAberto(true)} className="btn btn-accent btn-sm">
          <Plus size={14} /> Novo ticket
        </button>
      </div>

      {/* Números = filtro de status (clicar de novo volta para todos) */}
      <div style={{ marginBottom: 14 }}>
        <MetricStrip
          rotulo="Tickets por status"
          metricas={[
            { label: 'Abertos', valor: abertos, sub: urgentesSemResposta > 0 ? `${urgentesSemResposta} urgente${urgentesSemResposta > 1 ? 's' : ''} sem resposta` : 'aguardando 1º atendimento', tom: urgentesSemResposta > 0 ? 'danger' : undefined, onClick: () => setFiltro(filtroStatus === 'aberto' ? 'todos' : 'aberto'), ativo: filtroStatus === 'aberto' },
            { label: 'Em atendimento', valor: emAtendimento, sub: 'com alguém do time', onClick: () => setFiltro(filtroStatus === 'em_atendimento' ? 'todos' : 'em_atendimento'), ativo: filtroStatus === 'em_atendimento' },
            { label: 'Aguardando cliente', valor: aguardandoCliente, sub: 'retorno pendente', onClick: () => setFiltro(filtroStatus === 'aguardando_cliente' ? 'todos' : 'aguardando_cliente'), ativo: filtroStatus === 'aguardando_cliente' },
            { label: 'Resolvidos', valor: resolvidos, sub: `${resolvidosHoje} hoje`, onClick: () => setFiltro(filtroStatus === 'resolvido' ? 'todos' : 'resolvido'), ativo: filtroStatus === 'resolvido' },
            { label: 'Satisfação média', valor: csatMedio === '—' ? '—' : `${String(csatMedio).replace('.', ',')} / 5`, sub: 'notas dos clientes' },
          ]}
        />
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <label className="busca" style={{ flex: '1 1 240px', maxWidth: 380 }}>
          <Search size={13} aria-hidden />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ticket" aria-label="Buscar ticket" />
        </label>
        {filtroStatus !== 'todos' && <button type="button" className="link-limpar" onClick={() => setFiltro('todos')}>Ver todos os status</button>}
        <span className="toolbar-espaco" />
        <span className="caption tnum">{filtrados.length} ticket{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tickets table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
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
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: urg ? 'rgba(229,84,75,0.04)' : 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = urg ? 'rgba(229,84,75,0.08)' : 'rgba(212,252,60,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = urg ? 'rgba(229,84,75,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {urg && <span className="pulse" aria-label="Urgente sem resposta" style={{ marginRight: 6, background: 'var(--status-danger)' }} />}
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

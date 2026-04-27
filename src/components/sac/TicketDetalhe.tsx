'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Ticket } from './SacDashboard'

type Mensagem = {
  id: string
  ticket_id: string
  autor: 'cliente' | 'atendente'
  conteudo: string
  criado_em: string
}

const STATUS_OPTIONS: { value: Ticket['status']; label: string }[] = [
  { value: 'aberto',             label: 'Aberto'            },
  { value: 'em_atendimento',     label: 'Em atendimento'    },
  { value: 'aguardando_cliente', label: 'Aguard. cliente'   },
  { value: 'resolvido',          label: 'Resolvido'         },
  { value: 'encerrado',          label: 'Encerrado'         },
]

const PRIO_OPTIONS: { value: Ticket['prioridade']; label: string }[] = [
  { value: 'baixa',   label: 'Baixa'   },
  { value: 'normal',  label: 'Normal'  },
  { value: 'alta',    label: 'Alta'    },
  { value: 'urgente', label: 'Urgente' },
]

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

type Props = {
  ticket: Ticket
  onAtualizado: (t: Ticket) => void
  onFechar: () => void
}

export function TicketDetalhe({ ticket, onAtualizado, onFechar }: Props) {
  const [msgs, setMsgs]           = useState<Mensagem[]>([])
  const [novaMsg, setNovaMsg]     = useState('')
  const [enviando, setEnviando]   = useState(false)
  const [status, setStatus]       = useState(ticket.status)
  const [prioridade, setPrioridade] = useState(ticket.prioridade)
  const [satisfacao, setSatisfacao] = useState(ticket.satisfacao ?? 0)
  const [salvando, setSalvando]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.from('ticket_mensagens')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('criado_em', { ascending: true })
      .then(({ data }) => { if (data) setMsgs(data as Mensagem[]) })
  }, [ticket.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function enviarMsg() {
    if (!novaMsg.trim() || !supabase) return
    setEnviando(true)
    const { data } = await supabase.from('ticket_mensagens').insert({
      ticket_id: ticket.id, autor: 'atendente', conteudo: novaMsg.trim(),
    }).select().single()
    if (data) setMsgs(p => [...p, data as Mensagem])
    setNovaMsg('')
    setEnviando(false)
  }

  async function salvarAlteracoes() {
    if (!supabase) return
    setSalvando(true)
    const updates: Partial<Ticket> & { resolvido_em?: string | null } = {
      status, prioridade, satisfacao: satisfacao || undefined,
    }
    if ((status === 'resolvido' || status === 'encerrado') && !ticket.resolvido_em) {
      updates.resolvido_em = new Date().toISOString()
    }
    const { data } = await supabase.from('tickets_sac')
      .update(updates)
      .eq('id', ticket.id)
      .select()
      .single()
    setSalvando(false)
    if (data) onAtualizado(data as Ticket)
  }

  const selectStyle = {
    padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-surface-2)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ width: '100%', maxWidth: 520, height: '100%', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', margin: '0 0 2px' }}>{ticket.numero}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.assunto}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{ticket.cliente_nome}</p>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, padding: 4 }}><X size={18} /></button>
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value as Ticket['status'])}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select style={selectStyle} value={prioridade} onChange={e => setPrioridade(e.target.value as Ticket['prioridade'])}>
            {PRIO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setSatisfacao(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: n <= satisfacao ? '#F59E0B' : 'var(--border)' }}>
                <Star size={16} fill={n <= satisfacao ? '#F59E0B' : 'none'} />
              </button>
            ))}
          </div>
          <button onClick={salvarAlteracoes} disabled={salvando}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#C9A84C', color: '#0D0D0D', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {/* Info bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
          {ticket.cliente_email && <span>✉ {ticket.cliente_email}</span>}
          {ticket.cliente_whatsapp && <span>💬 {ticket.cliente_whatsapp}</span>}
          {ticket.pedido_ref && <span>📦 {ticket.pedido_ref}</span>}
          <span style={{ marginLeft: 'auto' }}>🕐 {fmtTime(ticket.criado_em)}</span>
        </div>

        {/* Initial description */}
        {ticket.descricao && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px', textTransform: 'uppercase' }}>Descrição inicial</p>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{ticket.descricao}</p>
          </div>
        )}

        {/* Chat timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginTop: 24 }}>Nenhuma mensagem ainda.</p>
          )}
          {msgs.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.autor === 'atendente' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: m.autor === 'atendente' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.autor === 'atendente' ? '#C9A84C' : 'var(--bg-surface)',
                border: m.autor === 'atendente' ? 'none' : '1px solid var(--border)',
                color: m.autor === 'atendente' ? '#0D0D0D' : 'var(--text-primary)',
                fontSize: 13, lineHeight: 1.5,
              }}>{m.conteudo}</div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
                {m.autor === 'atendente' ? 'Você' : ticket.cliente_nome} · {fmtTime(m.criado_em)}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <textarea
            value={novaMsg}
            onChange={e => setNovaMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMsg() } }}
            placeholder="Digite uma mensagem… (Enter para enviar)"
            rows={2}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'none' }}
          />
          <button onClick={enviarMsg} disabled={enviando || !novaMsg.trim()}
            style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0D0D0D', cursor: 'pointer', opacity: enviando || !novaMsg.trim() ? 0.5 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

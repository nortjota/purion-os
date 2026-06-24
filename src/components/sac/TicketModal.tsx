'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Ticket } from './SacDashboard'

type Props = {
  onCriado: (t: Ticket) => void
  onFechar: () => void
}

export function TicketModal({ onCriado, onFechar }: Props) {
  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_email: '',
    cliente_whatsapp: '',
    canal: 'manual' as Ticket['canal'],
    tipo: 'duvida' as NonNullable<Ticket['tipo']>,
    assunto: '',
    descricao: '',
    pedido_ref: '',
    prioridade: 'normal' as Ticket['prioridade'],
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function set(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function salvar() {
    if (!form.cliente_nome.trim() || !form.assunto.trim()) {
      setErro('Nome do cliente e assunto são obrigatórios.')
      return
    }
    if (!supabase) { setErro('Conexão indisponível.'); return }
    setSalvando(true)
    setErro('')
    const numero = `#${Date.now().toString().slice(-6)}`
    const { data, error } = await supabase.from('tickets_sac').insert({
      numero,
      cliente_nome: form.cliente_nome,
      cliente_email: form.cliente_email || null,
      cliente_whatsapp: form.cliente_whatsapp || null,
      canal: form.canal,
      tipo: form.tipo,
      assunto: form.assunto,
      descricao: form.descricao || null,
      pedido_ref: form.pedido_ref || null,
      prioridade: form.prioridade,
      status: 'aberto',
    }).select().single()
    setSalvando(false)
    if (error || !data) { setErro(error?.message ?? 'Erro ao criar ticket.'); return }
    onCriado(data as Ticket)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-surface-2)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ background: 'var(--bg-primary)', borderTopLeftRadius: 16, borderTopRightRadius: 16, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Novo Ticket</h2>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Nome do cliente *</label>
            <input style={inputStyle} value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input style={inputStyle} value={form.cliente_email} onChange={e => set('cliente_email', e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input style={inputStyle} value={form.cliente_whatsapp} onChange={e => set('cliente_whatsapp', e.target.value)} placeholder="+55 11 9..." />
          </div>
          <div>
            <label style={labelStyle}>Canal</label>
            <select style={inputStyle} value={form.canal} onChange={e => set('canal', e.target.value)}>
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select style={inputStyle} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="duvida">Dúvida</option>
              <option value="reclamacao">Reclamação</option>
              <option value="troca">Troca</option>
              <option value="devolucao">Devolução</option>
              <option value="elogio">Elogio</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prioridade</label>
            <select style={inputStyle} value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Nº Pedido</label>
            <input style={inputStyle} value={form.pedido_ref} onChange={e => set('pedido_ref', e.target.value)} placeholder="PED-0001" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Assunto *</label>
            <input style={inputStyle} value={form.assunto} onChange={e => set('assunto', e.target.value)} placeholder="Resumo do contato" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Descrição</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes adicionais…" />
          </div>
        </div>

        {erro && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 12 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onFechar} className="btn btn-secondary" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className="btn btn-primary" style={{ flex: 2 }}>
            {salvando ? 'Criando…' : 'Criar Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

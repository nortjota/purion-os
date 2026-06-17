'use client'

import { useState, useMemo } from 'react'
import { X, Check } from 'lucide-react'
import type { Afiliado, AfiliadoVenda, AfiliadoPagamento } from '@/hooks/useAfiliados'

type Props = {
  afiliado: Afiliado
  vendas: AfiliadoVenda[]
  onRegistrar: (dados: Omit<AfiliadoPagamento, 'id' | 'criado_em'>, vendasIds: string[]) => Promise<boolean>
  onFechar: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function PagamentoModal({ afiliado, vendas, onRegistrar, onFechar }: Props) {
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [periodoFim, setPeriodoFim] = useState(() => new Date().toISOString().slice(0, 10))
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [metodo, setMetodo] = useState<'pix' | 'transferencia' | 'outro'>('pix')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const vendasPeriodo = useMemo(() => vendas.filter(v =>
    v.afiliado_id === afiliado.id &&
    v.status_comissao === 'aprovada' &&
    v.data_venda >= periodoInicio &&
    v.data_venda <= periodoFim + 'T23:59:59'
  ), [vendas, afiliado.id, periodoInicio, periodoFim])

  const totalSelecionado = useMemo(() =>
    Array.from(selecionadas).reduce((s, id) => {
      const v = vendasPeriodo.find(v => v.id === id)
      return s + (v?.comissao_valor ?? 0)
    }, 0),
  [selecionadas, vendasPeriodo])

  function toggleVenda(id: string) {
    setSelecionadas(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodas() {
    if (selecionadas.size === vendasPeriodo.length) {
      setSelecionadas(new Set())
    } else {
      setSelecionadas(new Set(vendasPeriodo.map(v => v.id)))
    }
  }

  async function handleSalvar() {
    if (selecionadas.size === 0) { setErro('Selecione ao menos uma venda'); return }
    setSalvando(true)
    setErro('')
    const ids = Array.from(selecionadas)
    const ok = await onRegistrar({
      afiliado_id:    afiliado.id,
      vendas_ids:     ids,
      valor_total:    totalSelecionado,
      metodo,
      chave_pix:      afiliado.pix_chave,
      status:         'pago',
      periodo_inicio: periodoInicio,
      periodo_fim:    periodoFim,
      data_pagamento: new Date().toISOString(),
      notas: notas || undefined,
    }, ids)
    if (ok) onFechar()
    else { setErro('Erro ao registrar pagamento'); setSalvando(false) }
  }

  const INPUT = {
    padding: '8px 12px', borderRadius: 8, fontSize: 13,
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
  }

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)',
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Registrar pagamento</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{afiliado.nome} · {afiliado.codigo}</p>
          </div>
          <button onClick={onFechar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Período */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Período de referência
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>De</label>
              <input style={INPUT} type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Até</label>
              <input style={INPUT} type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
            </div>
          </div>

          {/* Vendas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Vendas aprovadas no período ({vendasPeriodo.length})
            </p>
            {vendasPeriodo.length > 0 && (
              <button onClick={toggleTodas} style={{ fontSize: 11, color: '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {selecionadas.size === vendasPeriodo.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            )}
          </div>

          {vendasPeriodo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhuma venda aprovada no período
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              {vendasPeriodo.map((v, i) => (
                <div
                  key={v.id}
                  onClick={() => toggleVenda(v.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderBottom: i < vendasPeriodo.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', background: selecionadas.has(v.id) ? 'rgba(201,168,76,0.06)' : 'transparent',
                    transition: 'background 150ms',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: selecionadas.has(v.id) ? '2px solid #C9A84C' : '2px solid var(--border)',
                    background: selecionadas.has(v.id) ? '#C9A84C' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selecionadas.has(v.id) && <Check size={10} color="#0D0D0D" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                      Pedido {v.pedido_ref ?? v.pedido_id.slice(0, 8)}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(v.data_venda).toLocaleDateString('pt-BR')} · Valor: {fmt(v.valor_liquido)}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>{fmt(v.comissao_valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {selecionadas.size > 0 && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selecionadas.size} venda(s) selecionada(s)</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#C9A84C' }}>{fmt(totalSelecionado)}</span>
            </div>
          )}

          {/* Método */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Método de pagamento</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['pix', 'transferencia', 'outro'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetodo(m)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    border: metodo === m ? '2px solid #C9A84C' : '1px solid var(--border)',
                    background: metodo === m ? 'rgba(201,168,76,0.08)' : 'var(--bg-surface)',
                    color: metodo === m ? '#C9A84C' : 'var(--text-secondary)',
                    fontWeight: metodo === m ? 600 : 400,
                  }}
                >
                  {m === 'pix' ? 'PIX' : m === 'transferencia' ? 'Transferência' : 'Outro'}
                </button>
              ))}
            </div>
          </div>

          {metodo === 'pix' && afiliado.pix_chave && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
              Chave PIX: <strong style={{ color: 'var(--text-primary)' }}>{afiliado.pix_tipo?.toUpperCase()} — {afiliado.pix_chave}</strong>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea
              style={{ ...INPUT, resize: 'vertical', minHeight: 60 }}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas opcionais…"
            />
          </div>

          {erro && (
            <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
              {erro}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onFechar} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || selecionadas.size === 0}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: selecionadas.size === 0 ? 'var(--border)' : '#C9A84C',
              color: selecionadas.size === 0 ? 'var(--text-secondary)' : '#0D0D0D',
              fontWeight: 600, cursor: selecionadas.size === 0 ? 'not-allowed' : 'pointer',
              opacity: salvando ? 0.7 : 1, fontSize: 13,
            }}
          >
            {salvando ? 'Registrando…' : `Registrar ${selecionadas.size > 0 ? fmt(totalSelecionado) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

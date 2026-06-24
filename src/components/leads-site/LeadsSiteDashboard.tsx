'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, RefreshCw, Mail, ShoppingCart, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export type LeadSite = {
  id: string
  email: string
  cupom: string | null
  utm_source: string | null
  pagina: string | null
  criado_em: string
}

export type CarrinhoAbandonado = {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  etapa: 'dados' | 'endereco' | 'pagamento'
  produtos: { name: string; qty: number; price: number }[]
  valor_total: number
  cupom: string | null
  utm_source: string | null
  recuperado: boolean
  criado_em: string
  atualizado_em: string
}

const ETAPA_CFG: Record<CarrinhoAbandonado['etapa'], { label: string; color: string }> = {
  dados:     { label: 'Dados',     color: '#3B82F6' },
  endereco:  { label: 'Endereço',  color: '#F59E0B' },
  pagamento: { label: 'Pagamento', color: '#EF4444' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  leadsInicial: LeadSite[]
  carrinhosInicial: CarrinhoAbandonado[]
}

export function LeadsSiteDashboard({ leadsInicial, carrinhosInicial }: Props) {
  const [tab, setTab]               = useState<'leads' | 'carrinhos'>('leads')
  const [leads, setLeads]           = useState<LeadSite[]>(leadsInicial)
  const [carrinhos, setCarrinhos]   = useState<CarrinhoAbandonado[]>(carrinhosInicial)
  const [busca, setBusca]           = useState('')
  const [soNaoRecuperados, setSoNaoRecuperados] = useState(true)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    if (!supabase) return
    setCarregando(true)
    const [leadsRes, carrinhosRes] = await Promise.all([
      supabase.from('leads_site').select('*').order('criado_em', { ascending: false }),
      supabase.from('carrinhos_abandonados').select('*').order('criado_em', { ascending: false }),
    ])
    if (leadsRes.data) setLeads(leadsRes.data as LeadSite[])
    if (carrinhosRes.data) setCarrinhos(carrinhosRes.data as CarrinhoAbandonado[])
    setCarregando(false)
  }, [])

  const leadsFiltrados = useMemo(() => {
    if (!busca.trim()) return leads
    const q = busca.toLowerCase()
    return leads.filter(l => l.email.toLowerCase().includes(q) || (l.cupom ?? '').toLowerCase().includes(q))
  }, [leads, busca])

  const carrinhosFiltrados = useMemo(() => {
    let r = carrinhos
    if (soNaoRecuperados) r = r.filter(c => !c.recuperado)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      r = r.filter(c => (c.nome ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
    }
    return r
  }, [carrinhos, soNaoRecuperados, busca])

  const totalLeads        = leads.length
  const totalCarrinhos    = carrinhos.length
  const carrinhosAbertos  = carrinhos.filter(c => !c.recuperado).length
  const valorEmAberto     = carrinhos.filter(c => !c.recuperado).reduce((s, c) => s + c.valor_total, 0)

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
            Aquisição
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Leads do Site</h1>
        </div>
        <button onClick={carregar} disabled={carregando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
          <RefreshCw size={13} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Leads capturados',        value: totalLeads,             color: '#3B82F6' },
          { label: 'Carrinhos abandonados',   value: totalCarrinhos,         color: '#F59E0B' },
          { label: 'Em aberto',               value: carrinhosAbertos,       color: '#EF4444' },
          { label: 'Valor em aberto',         value: formatBRL(valorEmAberto), color: '#C9A84C' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setTab('leads')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: tab === 'leads' ? '1px solid #C9A84C' : '1px solid var(--border)', background: tab === 'leads' ? 'rgba(201,168,76,0.08)' : 'var(--bg-surface)', color: tab === 'leads' ? '#C9A84C' : 'var(--text-secondary)', fontSize: 12, fontWeight: tab === 'leads' ? 600 : 400, cursor: 'pointer' }}>
          <Mail size={13} /> Leads (E-mail)
        </button>
        <button onClick={() => setTab('carrinhos')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: tab === 'carrinhos' ? '1px solid #C9A84C' : '1px solid var(--border)', background: tab === 'carrinhos' ? 'rgba(201,168,76,0.08)' : 'var(--bg-surface)', color: tab === 'carrinhos' ? '#C9A84C' : 'var(--text-secondary)', fontSize: 12, fontWeight: tab === 'carrinhos' ? 600 : 400, cursor: 'pointer' }}>
          <ShoppingCart size={13} /> Carrinhos Abandonados
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={tab === 'leads' ? 'Buscar por e-mail ou cupom…' : 'Buscar por nome ou e-mail…'}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%', padding: '9px 0' }} />
        </div>
        {tab === 'carrinhos' && (
          <button onClick={() => setSoNaoRecuperados(p => !p)}
            style={{ padding: '7px 12px', borderRadius: 7, border: soNaoRecuperados ? '1px solid #C9A84C' : '1px solid var(--border)', background: soNaoRecuperados ? 'rgba(201,168,76,0.08)' : 'var(--bg-surface)', color: soNaoRecuperados ? '#C9A84C' : 'var(--text-secondary)', fontSize: 11, fontWeight: soNaoRecuperados ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Só não recuperados
          </button>
        )}
      </div>

      {/* Leads table */}
      {tab === 'leads' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {leadsFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhum lead encontrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                    {['E-mail', 'Cupom', 'Origem (UTM)', 'Página', 'Capturado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsFiltrados.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{l.email}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {l.cupom && <span style={{ fontSize: 11, fontWeight: 600, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', padding: '3px 8px', borderRadius: 20 }}>{l.cupom}</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{l.utm_source || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.pagina || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(l.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Carrinhos table */}
      {tab === 'carrinhos' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {carrinhosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhum carrinho encontrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                    {['Cliente', 'Contato', 'Parou em', 'Valor', 'Status', 'Abandonado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carrinhosFiltrados.map(c => {
                    const ec = ETAPA_CFG[c.etapa]
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{c.nome || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {c.email && <div>{c.email}</div>}
                          {c.telefone && <div style={{ fontSize: 11 }}>{c.telefone}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ec.color, background: `${ec.color}1A`, padding: '3px 8px', borderRadius: 20 }}>{ec.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatBRL(c.valor_total)}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {c.recuperado
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#10B981' }}><CheckCircle size={12} /> Recuperado</span>
                            : <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444' }}>Em aberto</span>}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(c.criado_em)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

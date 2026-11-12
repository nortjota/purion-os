'use client'

import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { MetricStrip } from '@/components/ui/MetricStrip'
import { dbLog } from '@/lib/dbLog'
import { linkWhatsApp } from '@/hooks/useDespacho'
import { MessageCircle } from 'lucide-react'
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
  dados:     { label: 'Dados',     color: '#9CC3DB' },
  endereco:  { label: 'Endereço',  color: '#E6C374' },
  pagamento: { label: 'Pagamento', color: '#E5544B' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

/** Texto-base de recuperação de carrinho (o sócio revisa antes de enviar — nada é enviado automaticamente). */
function mensagemRecuperacao(nome: string | null | undefined): string {
  const primeiro = (nome ?? '').trim().split(' ')[0]
  return `Oi${primeiro ? `, ${primeiro}` : ''}! Aqui é da PURION. Vi que você começou um pedido do PURION GT e não finalizou. Ficou alguma dúvida ou posso te ajudar a concluir?`
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  leadsInicial: LeadSite[]
  carrinhosInicial: CarrinhoAbandonado[]
}

export function LeadsSiteDashboard({ leadsInicial, carrinhosInicial }: Props) {
  const [tab, setTab] = useEstadoPersistido<'leads' | 'carrinhos'>('leads.lista', 'leads')
  const [leads, setLeads]           = useState<LeadSite[]>(leadsInicial)
  const [carrinhos, setCarrinhos]   = useState<CarrinhoAbandonado[]>(carrinhosInicial)
  const [busca, setBusca]           = useState('')
  const [soNaoRecuperados, setSoNaoRecuperados] = useEstadoPersistido('leads.soAbertos', true)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    if (!supabase) return
    setCarregando(true)
    const [leadsRes, carrinhosRes] = await Promise.all([
      supabase.from('leads_site').select('*').order('criado_em', { ascending: false }),
      supabase.from('carrinhos_abandonados').select('*').order('criado_em', { ascending: false }),
    ])
    dbLog('SELECT', 'leads_site', leadsRes.error, `${leadsRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'carrinhos_abandonados', carrinhosRes.error, `${carrinhosRes.data?.length ?? 0} rows`)
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
      <div className="toolbar" style={{ marginBottom: 18 }}>
        <h1 className="page-title" style={{ flex: '1 1 200px' }}>Leads do Site</h1>
        <button onClick={carregar} disabled={carregando} className="icon-btn" title="Atualizar" aria-label="Atualizar">
          <RefreshCw size={14} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Números = seletor de lista */}
      <div style={{ marginBottom: 14 }}>
        <MetricStrip
          rotulo="Leads e carrinhos"
          metricas={[
            { label: 'Leads capturados', valor: totalLeads, sub: 'e-mails pelo cupom do site', onClick: () => setTab('leads'), ativo: tab === 'leads' },
            { label: 'Carrinhos em aberto', valor: carrinhosAbertos, sub: `${formatBRL(valorEmAberto)} parados`, tom: carrinhosAbertos > 0 ? 'warning' : undefined, onClick: () => { setTab('carrinhos'); setSoNaoRecuperados(true) }, ativo: tab === 'carrinhos' && soNaoRecuperados },
            { label: 'Todos os carrinhos', valor: totalCarrinhos, sub: `${totalCarrinhos - carrinhosAbertos} recuperado${totalCarrinhos - carrinhosAbertos !== 1 ? 's' : ''}`, onClick: () => { setTab('carrinhos'); setSoNaoRecuperados(false) }, ativo: tab === 'carrinhos' && !soNaoRecuperados },
            { label: 'Taxa de recuperação', valor: totalCarrinhos > 0 ? `${Math.round(((totalCarrinhos - carrinhosAbertos) / totalCarrinhos) * 100)}%` : '—', sub: 'recuperados ÷ abandonados' },
          ]}
        />
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <label className="busca" style={{ flex: '1 1 240px', maxWidth: 380 }}>
          <Search size={13} aria-hidden />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={tab === 'leads' ? 'Buscar por e-mail ou cupom' : 'Buscar por nome ou e-mail'} aria-label="Buscar" />
        </label>
        <span className="toolbar-espaco" />
        <span className="caption tnum">{tab === 'leads' ? leadsFiltrados.length : carrinhosFiltrados.length} resultado{(tab === 'leads' ? leadsFiltrados.length : carrinhosFiltrados.length) !== 1 ? 's' : ''}</span>
      </div>

      {/* Leads table */}
      {tab === 'leads' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
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
                        {l.cupom && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-accent)', background: 'rgba(212,252,60,0.1)', padding: '3px 8px', borderRadius: 20 }}>{l.cupom}</span>}
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
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {carrinhosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhum carrinho encontrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                    {['Cliente', 'Contato', 'Parou em', 'Valor', 'Status', 'Abandonado', ''].map(h => (
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
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--status-ok)' }}><CheckCircle size={12} /> Recuperado</span>
                            : <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-danger)' }}>Em aberto</span>}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(c.criado_em)}</td>
                        <td style={{ padding: '6px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {!c.recuperado && (() => {
                            const wa = c.telefone ? linkWhatsApp(c.telefone, mensagemRecuperacao(c.nome)) : null
                            if (wa) return <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}><MessageCircle size={12} /> Recuperar</a>
                            if (c.email) return <a href={`mailto:${c.email}?subject=${encodeURIComponent('Seu PURION GT ficou no carrinho')}&body=${encodeURIComponent(mensagemRecuperacao(c.nome))}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}><Mail size={12} /> Recuperar</a>
                            return null
                          })()}
                        </td>
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

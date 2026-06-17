'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Copy, Check, Pencil, DollarSign, ExternalLink,
  Camera, Play, Link2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useAfiliados } from '@/hooks/useAfiliados'
import { AfiliadoModal } from './AfiliadoModal'
import { PagamentoModal } from './PagamentoModal'
import type { Afiliado, AfiliadoVenda, AfiliadoClique, AfiliadoPagamento } from '@/hooks/useAfiliados'

const GraficoClicksVsVendas = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoClicksVsVendas })),
  { ssr: false, loading: () => <div style={{ height: 220, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)
const GraficoClicksPorDia = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoClicksPorDia })),
  { ssr: false, loading: () => <div style={{ height: 180, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)

const fmt   = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPc = (v: number) => `${v.toFixed(1)}%`

type TabId = 'vendas' | 'pagamentos' | 'cliques' | 'materiais' | 'configuracoes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'vendas',         label: 'Vendas'         },
  { id: 'pagamentos',     label: 'Pagamentos'      },
  { id: 'cliques',        label: 'Cliques'         },
  { id: 'materiais',      label: 'Materiais'       },
  { id: 'configuracoes',  label: 'Configurações'   },
]

const STATUS_VENDA: Record<string, { label: string; color: string }> = {
  pendente:   { label: 'Pendente',   color: '#F59E0B' },
  confirmada: { label: 'Confirmada', color: '#10B981' },
  cancelada:  { label: 'Cancelada',  color: '#EF4444' },
  devolvida:  { label: 'Devolvida',  color: '#8B5CF6' },
}
const STATUS_COM: Record<string, { label: string; color: string }> = {
  pendente:  { label: 'Pendente',  color: '#F59E0B' },
  aprovada:  { label: 'Aprovada',  color: '#3B82F6' },
  paga:      { label: 'Paga',      color: '#10B981' },
  cancelada: { label: 'Cancelada', color: '#EF4444' },
}

export function AfiliadoPerfil({ id }: { id: string }) {
  const router = useRouter()
  const { atualizarAfiliado, aprovarComissao, registrarPagamento } = useAfiliados()

  const [afiliado,   setAfiliado]   = useState<Afiliado | null>(null)
  const [vendas,     setVendas]     = useState<AfiliadoVenda[]>([])
  const [cliques,    setCliques]    = useState<AfiliadoClique[]>([])
  const [pagamentos, setPagamentos] = useState<AfiliadoPagamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba,        setAba]        = useState<TabId>('vendas')
  const [copiado,    setCopiado]    = useState(false)
  const [modalEditar, setModalEditar]   = useState(false)
  const [modalPagar,  setModalPagar]    = useState(false)

  useEffect(() => {
    if (!supabase || !id) return
    ;(async () => {
      setCarregando(true)
      const [
        { data: af, error: afErr },
        { data: vd, error: vdErr },
        { data: cl, error: clErr },
        { data: pg, error: pgErr },
      ] = await Promise.all([
        supabase.from('afiliados').select('*').eq('id', id).single(),
        supabase.from('afiliado_vendas').select('*').eq('afiliado_id', id).order('data_venda', { ascending: false }),
        supabase.from('afiliado_cliques').select('*').eq('afiliado_id', id).order('criado_em', { ascending: false }).limit(500),
        supabase.from('afiliado_pagamentos').select('*').eq('afiliado_id', id).order('criado_em', { ascending: false }),
      ])
      dbLog('SELECT', 'afiliados', afErr, id)
      dbLog('SELECT', 'afiliado_vendas', vdErr, `afiliado ${id}`)
      dbLog('SELECT', 'afiliado_cliques', clErr, `afiliado ${id}`)
      dbLog('SELECT', 'afiliado_pagamentos', pgErr, `afiliado ${id}`)
      if (af) setAfiliado(af as Afiliado)
      setVendas((vd as AfiliadoVenda[]) ?? [])
      setCliques((cl as AfiliadoClique[]) ?? [])
      setPagamentos((pg as AfiliadoPagamento[]) ?? [])
      setCarregando(false)
    })()
  }, [id])

  // ── Métricas ──────────────────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const totalCliques    = cliques.length
    const convertidos     = cliques.filter(c => c.converteu).length
    const taxaConv        = totalCliques > 0 ? convertidos / totalCliques * 100 : 0
    const vendasOk        = vendas.filter(v => v.status_venda !== 'cancelada')
    const receitaTotal    = vendasOk.reduce((s, v) => s + v.valor_liquido, 0)
    const comPendente     = vendasOk.filter(v => v.status_comissao === 'pendente').reduce((s, v) => s + v.comissao_valor, 0)
    const comPaga         = vendas.filter(v => v.status_comissao === 'paga').reduce((s, v) => s + v.comissao_valor, 0)
    return { totalCliques, totalVendas: vendasOk.length, taxaConv, receitaTotal, comPendente, comPaga }
  }, [vendas, cliques])

  // ── Gráfico cliques vs vendas por semana (60 dias) ────────────────────────
  const dadosClicksVsVendas = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 9 }, (_, i) => {
      const inicio = new Date(hoje); inicio.setDate(inicio.getDate() - (8 - i) * 7)
      const fim    = new Date(inicio); fim.setDate(fim.getDate() + 6)
      const ini = inicio.toISOString().slice(0, 10)
      const fin = fim.toISOString().slice(0, 10)
      return {
        semana:  `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        cliques: cliques.filter(c => c.criado_em >= ini && c.criado_em <= fin + 'T23:59:59').length,
        vendas:  vendas.filter(v => v.data_venda >= ini && v.data_venda <= fin + 'T23:59:59').length,
      }
    })
  }, [cliques, vendas])

  // ── Gráfico cliques por dia (aba cliques) ────────────────────────────────
  const dadosClicksPorDia = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 30 }, (_, i) => {
      const d   = new Date(hoje); d.setDate(d.getDate() - (29 - i))
      const dia = d.toISOString().slice(0, 10)
      const clsDia = cliques.filter(c => c.criado_em.startsWith(dia))
      return {
        data:        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        cliques:     clsDia.length,
        convertidos: clsDia.filter(c => c.converteu).length,
      }
    })
  }, [cliques])

  function copiarLink() {
    const link = afiliado?.link_afiliado ?? `https://puriongt.com.br?ref=${afiliado?.codigo}`
    navigator.clipboard.writeText(link)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Carregando perfil…</p>
      </div>
    )
  }

  if (!afiliado) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ color: 'var(--text-secondary)' }}>Afiliado não encontrado.</p>
        <button onClick={() => router.push('/afiliados')} style={{ marginTop: 16, color: '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          ← Voltar
        </button>
      </div>
    )
  }

  const stBadge = { ativo: { c: '#10B981', b: 'rgba(16,185,129,0.1)' }, pausado: { c: '#F59E0B', b: 'rgba(245,158,11,0.1)' }, pendente: { c: '#3B82F6', b: 'rgba(59,130,246,0.1)' }, bloqueado: { c: '#EF4444', b: 'rgba(239,68,68,0.1)' } }
  const st = stBadge[afiliado.status] ?? stBadge.pendente

  return (
    <div className="page-content">
      {/* Voltar */}
      <button onClick={() => router.push('/afiliados')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Voltar
      </button>

      {/* Header do perfil */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#C9A84C', color: '#0D0D0D', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {afiliado.nome[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{afiliado.nome}</h2>
              <code style={{ fontSize: 12, background: 'rgba(201,168,76,0.1)', color: '#C9A84C', padding: '2px 8px', borderRadius: 6 }}>{afiliado.codigo}</code>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.c, background: st.b, textTransform: 'capitalize' }}>{afiliado.status}</span>
            </div>
            {afiliado.nicho && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{afiliado.nicho}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {afiliado.instagram && (
                <a href={`https://instagram.com/${afiliado.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#EC4899', textDecoration: 'none' }}>
                  <Camera size={13} /> {afiliado.instagram}
                </a>
              )}
              {afiliado.tiktok && (
                <a href={`https://tiktok.com/${afiliado.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  <ExternalLink size={12} /> TikTok {afiliado.tiktok}
                </a>
              )}
              {afiliado.youtube && (
                <a href={`https://youtube.com/${afiliado.youtube}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#EF4444', textDecoration: 'none' }}>
                  <Play size={13} /> {afiliado.youtube}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={copiarLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer', fontSize: 12, color: copiado ? '#10B981' : 'var(--text-secondary)' }}>
              {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar link'}
            </button>
            <button onClick={() => setModalEditar(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
              <Pencil size={13} /> Editar
            </button>
            <button onClick={() => setModalPagar(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#C9A84C', cursor: 'pointer', fontSize: 12, color: '#0D0D0D', fontWeight: 600 }}>
              <DollarSign size={13} /> Pagar comissão
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Cliques totais',    value: metricas.totalCliques.toLocaleString('pt-BR'), cor: '#3B82F6' },
          { label: 'Vendas totais',     value: metricas.totalVendas,                          cor: '#10B981' },
          { label: 'Taxa de conversão', value: fmtPc(metricas.taxaConv),                      cor: '#8B5CF6' },
          { label: 'Receita gerada',    value: fmt(metricas.receitaTotal),                    cor: '#C9A84C' },
          { label: 'Comissão pendente', value: fmt(metricas.comPendente),                     cor: '#F59E0B' },
          { label: 'Comissão paga',     value: fmt(metricas.comPaga),                         cor: '#10B981' },
        ].map(({ label, value, cor }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: cor, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico cliques vs vendas */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Cliques vs Vendas — últimas 9 semanas</p>
        <GraficoClicksVsVendas dados={dadosClicksVsVendas} />
      </div>

      {/* Abas */}
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: aba === t.id ? '#C9A84C' : 'var(--text-secondary)',
                borderBottom: aba === t.id ? '2px solid #C9A84C' : '2px solid transparent',
                fontWeight: aba === t.id ? 600 : 400, whiteSpace: 'nowrap', transition: 'color 150ms',
              }}>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aba: Vendas */}
      {aba === 'vendas' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Data', 'Pedido', 'Valor', 'Comissão', 'Status venda', 'Status comissão', 'Ação'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>Nenhuma venda registrada</td></tr>
                : vendas.map(v => {
                  const sv = STATUS_VENDA[v.status_venda] ?? { label: v.status_venda, color: 'var(--text-secondary)' }
                  const sc = STATUS_COM[v.status_comissao] ?? { label: v.status_comissao, color: 'var(--text-secondary)' }
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{v.pedido_ref ?? v.pedido_id.slice(0, 8)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(v.valor_liquido)}</td>
                      <td style={{ padding: '10px 14px', color: '#C9A84C', fontWeight: 600 }}>{fmt(v.comissao_valor)}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, color: sv.color }}>{sv.label}</span></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, color: sc.color }}>{sc.label}</span></td>
                      <td style={{ padding: '10px 14px' }}>
                        {v.status_comissao === 'pendente' && (
                          <button onClick={() => aprovarComissao(v.id)}
                            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #3B82F6', background: 'transparent', color: '#3B82F6', cursor: 'pointer' }}>
                            Aprovar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba: Pagamentos */}
      {aba === 'pagamentos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setModalPagar(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0D0D0D', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <DollarSign size={13} /> Registrar pagamento
            </button>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                  {['Período', 'Vendas', 'Valor', 'Método', 'Data', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagamentos.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>Nenhum pagamento registrado</td></tr>
                  : pagamentos.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {new Date(p.periodo_inicio).toLocaleDateString('pt-BR')} – {new Date(p.periodo_fim).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{p.vendas_ids?.length ?? 0}</td>
                      <td style={{ padding: '10px 14px', color: '#C9A84C', fontWeight: 700 }}>{fmt(p.valor_total)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.metodo ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.status === 'pago' ? '#10B981' : '#F59E0B', textTransform: 'capitalize' }}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba: Cliques */}
      {aba === 'cliques' && (
        <div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Cliques por dia — últimos 30 dias</p>
            <GraficoClicksPorDia dados={dadosClicksPorDia} />
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                  {['Data', 'Origem (UTM)', 'Referrer', 'Converteu'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliques.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>Nenhum clique registrado</td></tr>
                  : cliques.slice(0, 100).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{new Date(c.criado_em).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{c.utm_source || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.referrer || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {c.converteu
                          ? <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ Sim</span>
                          : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Não</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba: Materiais */}
      {aba === 'materiais' && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <Link2 size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Biblioteca de materiais em breve</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>Adicione imagens, vídeos e textos para este afiliado</p>
        </div>
      )}

      {/* Aba: Configurações */}
      {aba === 'configuracoes' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Dados do afiliado</p>
            {[
              ['E-mail', afiliado.email],
              ['WhatsApp', afiliado.whatsapp],
              ['Nicho', afiliado.nicho],
              ['Comissão', `${afiliado.valor_comissao}${afiliado.tipo_comissao === 'percentual' ? '%' : ' R$'}`],
              ['Desconto ao cliente', afiliado.desconto_cliente > 0 ? `${afiliado.desconto_cliente}${afiliado.tipo_desconto === 'percentual' ? '%' : ' R$'}` : 'Nenhum'],
              ['Chave PIX', afiliado.pix_chave ? `${afiliado.pix_tipo?.toUpperCase()} — ${afiliado.pix_chave}` : 'Não cadastrada'],
              ['Banco', afiliado.banco_nome],
              ['Data início', afiliado.data_inicio ? new Date(afiliado.data_inicio).toLocaleDateString('pt-BR') : undefined],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <button onClick={() => setModalEditar(true)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#C9A84C', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Pencil size={13} /> Editar dados
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      {modalEditar && (
        <AfiliadoModal
          afiliado={afiliado}
          onSalvar={async dados => { await atualizarAfiliado(afiliado.id, dados); setAfiliado(a => a ? { ...a, ...dados } : a) }}
          onFechar={() => setModalEditar(false)}
        />
      )}

      {modalPagar && (
        <PagamentoModal
          afiliado={afiliado}
          vendas={vendas}
          onRegistrar={registrarPagamento}
          onFechar={() => setModalPagar(false)}
        />
      )}
    </div>
  )
}

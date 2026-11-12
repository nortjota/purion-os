'use client'

import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import { Skeleton } from '@/components/motion/Skeleton'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Plus, Copy, Check, Pencil, Trash2, Pause, Play, ExternalLink,
  Search, Filter, TrendingUp, Users, DollarSign, Award, BarChart2,
} from 'lucide-react'
import { useAfiliados } from '@/hooks/useAfiliados'
import { AfiliadoModal } from './AfiliadoModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { Afiliado } from '@/hooks/useAfiliados'

const GraficoVendasDiarias = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoVendasDiarias })),
  { ssr: false, loading: () => <div style={{ height: 220, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)
const GraficoTopAfiliados = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoTopAfiliados })),
  { ssr: false, loading: () => <div style={{ height: 220, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)

const fmt   = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPc = (v: number) => `${v.toFixed(1).replace('.', ',')}%`

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  ativo:     { label: 'Ativo',     color: '#8FD14F', bg: 'rgba(143,209,79,0.1)' },
  pausado:   { label: 'Pausado',   color: '#E6C374', bg: 'rgba(230,195,116,0.1)' },
  pendente:  { label: 'Pendente',  color: '#9CC3DB', bg: 'rgba(156,195,219,0.1)' },
  bloqueado: { label: 'Bloqueado', color: '#E5544B', bg: 'rgba(229,84,75,0.1)'  },
}

function plataformaPrincipal(a: Afiliado) {
  if (a.tiktok)    return 'TikTok'
  if (a.instagram) return 'Instagram'
  if (a.youtube)   return 'YouTube'
  return 'Direto'
}

export function AfiliadosDashboard() {
  const router = useRouter()
  const { afiliados, vendas, cliques, carregando, criarAfiliado, atualizarAfiliado, deletarAfiliado, pausarAfiliado } = useAfiliados()
  const { success, error: toastError } = useToast()

  const [modalAberto, setModalAberto]         = useState(false)
  const [editando, setEditando]               = useState<Afiliado | null>(null)
  const [deletando, setDeletando]             = useState<Afiliado | null>(null)
  const [copiado, setCopiado]                 = useState<string | null>(null)
  const [busca, setBusca]                     = useState('')
  const [filtroStatus, setFiltroStatus]       = useState<string>('todos')
  const [filtroPlataforma, setFiltroPlataforma] = useState<string>('todos')

  const mesAtual = new Date().toISOString().slice(0, 7)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativos         = afiliados.filter(a => a.status === 'ativo').length
    const vendasMes      = vendas.filter(v => v.data_venda.startsWith(mesAtual))
    const receitaMes     = vendasMes.reduce((s, v) => s + v.valor_liquido, 0)
    const comPendentes   = vendas.filter(v => v.status_comissao === 'pendente').reduce((s, v) => s + v.comissao_valor, 0)
    const comPagasMes    = vendas.filter(v => v.status_comissao === 'paga' && v.data_venda.startsWith(mesAtual)).reduce((s, v) => s + v.comissao_valor, 0)

    const receitaPorAfil = vendasMes.reduce<Record<string, number>>((acc, v) => {
      acc[v.afiliado_id] = (acc[v.afiliado_id] ?? 0) + v.valor_liquido; return acc
    }, {})
    const [melhorId, melhorVal] = Object.entries(receitaPorAfil).sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    const melhor = afiliados.find(a => a.id === melhorId)

    const totalCliques = cliques.length
    const convertidos  = cliques.filter(c => c.converteu).length
    const taxaConv     = totalCliques > 0 ? convertidos / totalCliques * 100 : 0

    return { ativos, receitaMes, comPendentes, comPagasMes, melhor, melhorVal, taxaConv }
  }, [afiliados, vendas, cliques, mesAtual])

  // ── Dados dos gráficos ────────────────────────────────────────────────────
  const dadosVendasDiarias = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(hoje); d.setDate(d.getDate() - (29 - i))
      const dia = d.toISOString().slice(0, 10)
      const valor = vendas.filter(v => v.data_venda.startsWith(dia)).reduce((s, v) => s + v.valor_liquido, 0)
      return { data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), valor }
    })
  }, [vendas])

  const dadosTopAfiliados = useMemo(() => afiliados
    .map(a => ({
      id: a.id,
      nome: a.nome.split(' ')[0],
      receita: vendas.filter(v => v.afiliado_id === a.id && v.data_venda.startsWith(mesAtual)).reduce((s, v) => s + v.valor_liquido, 0),
    }))
    .filter(a => a.receita > 0)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10),
  [afiliados, vendas, mesAtual])

  // ── Tabela filtrada ───────────────────────────────────────────────────────
  const afiliadosFiltrados = useMemo(() => afiliados.filter(a => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
    if (filtroPlataforma !== 'todos' && plataformaPrincipal(a) !== filtroPlataforma) return false
    if (busca) {
      const b = busca.toLowerCase()
      if (!a.nome.toLowerCase().includes(b) && !a.codigo.toLowerCase().includes(b)) return false
    }
    return true
  }), [afiliados, filtroStatus, filtroPlataforma, busca])

  // ── Métricas por afiliado (para a tabela) ─────────────────────────────────
  const metricasPorAfiliado = useMemo(() => {
    const map: Record<string, { totalCliques: number; totalVendas: number; receita: number; comPendente: number }> = {}
    for (const a of afiliados) {
      const aCliques = cliques.filter(c => c.afiliado_id === a.id)
      const aVendas  = vendas.filter(v => v.afiliado_id === a.id)
      map[a.id] = {
        totalCliques: aCliques.length,
        totalVendas:  aVendas.length,
        receita:      aVendas.reduce((s, v) => s + v.valor_liquido, 0),
        comPendente:  aVendas.filter(v => v.status_comissao === 'pendente').reduce((s, v) => s + v.comissao_valor, 0),
      }
    }
    return map
  }, [afiliados, vendas, cliques])

  function copiarLink(a: Afiliado) {
    const link = a.link_afiliado ?? `https://puriongt.com.br?ref=${a.codigo}`
    navigator.clipboard.writeText(link)
    setCopiado(a.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const metricas: MetricaFaixa[] = [
    { label: 'Afiliados ativos', valor: kpis.ativos, sub: `${afiliados.length} cadastrado${afiliados.length !== 1 ? 's' : ''}` },
    { label: 'Vendas via afiliados', valor: fmt(kpis.receitaMes), sub: 'no mês' },
    { label: 'Comissões a pagar', valor: fmt(kpis.comPendentes), sub: 'pendentes', tom: kpis.comPendentes > 0 ? 'warning' : undefined },
    { label: 'Comissões pagas', valor: fmt(kpis.comPagasMes), sub: 'no mês' },
    { label: 'Melhor do mês', valor: kpis.melhor?.nome.split(' ')[0] ?? '—', sub: kpis.melhorVal > 0 ? fmt(kpis.melhorVal) : 'sem vendas' },
    { label: 'Conversão média', valor: fmtPc(kpis.taxaConv), sub: 'vendas ÷ cliques' },
  ]

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <Skeleton rows={3} label="Carregando dados…" />
      </div>
    )
  }

  return (
    <div className="page-content section-gap">
      {/* Header */}
      <div className="toolbar">
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 className="page-title">Afiliados</h1>
          <p className="caption mt-1">Parceiros com link próprio, cliques e comissão. Vendas por cupom de creator ficam em Creators.</p>
        </div>
        <button onClick={() => { setEditando(null); setModalAberto(true) }} className="btn btn-accent btn-sm">
          <Plus size={14} /> Novo afiliado
        </button>
      </div>

      <MetricStrip metricas={metricas} rotulo="Resumo de afiliados" />

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid-mobile-1">
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p className="kpi-label mb-4">Vendas via afiliados · 30 dias</p>
          <GraficoVendasDiarias dados={dadosVendasDiarias} />
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p className="kpi-label mb-4">Top afiliados do mês</p>
          {dadosTopAfiliados.length === 0
            ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sem vendas registradas no mês</p>
            : <GraficoTopAfiliados dados={dadosTopAfiliados} onClickAfiliado={id => router.push(`/afiliados/${id}`)} />
          }
        </div>
      </div>

      {/* Filtros */}
      <div className="toolbar">
        <label className="busca" style={{ flex: '1 1 220px', maxWidth: 360 }}>
          <Search size={13} aria-hidden />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou código" aria-label="Buscar afiliados" />
        </label>
        <select
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="filtro" data-ativo={filtroStatus !== 'todos' || undefined} aria-label="Status"
        >
          <option value="todos">Status</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="pendente">Pendente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select
          value={filtroPlataforma} onChange={e => setFiltroPlataforma(e.target.value)}
          className="filtro" data-ativo={filtroPlataforma !== 'todos' || undefined} aria-label="Plataforma"
        >
          <option value="todos">Plataforma</option>
          <option value="TikTok">TikTok</option>
          <option value="Instagram">Instagram</option>
          <option value="YouTube">YouTube</option>
          <option value="Direto">Direto</option>
        </select>
        <span className="toolbar-espaco" />
        <span className="caption tnum">{afiliadosFiltrados.length} resultado{afiliadosFiltrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Nome', 'Código', 'Plataforma', 'Cliques', 'Vendas', 'Receita', 'Comissão pendente', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {afiliadosFiltrados.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <p style={{ marginBottom: 12 }}>Nenhum afiliado encontrado</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => setModalAberto(true)}>
                    <Plus size={14} /> Novo afiliado
                  </button>
                </td></tr>
              ) : afiliadosFiltrados.map(a => {
                const m  = metricasPorAfiliado[a.id] ?? { totalCliques: 0, totalVendas: 0, receita: 0, comPendente: 0 }
                const st = STATUS_BADGE[a.status] ?? STATUS_BADGE.pendente
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div
                        onClick={() => router.push(`/afiliados/${a.id}`)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(245,245,240,0.15)', border: '1px solid rgba(245,245,240,0.3)',
                          color: 'var(--text-primary)', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {a.nome[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{a.nome}</p>
                          {a.nicho && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{a.nicho}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: 11, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-primary)' }}>{a.codigo}</code>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{plataformaPrincipal(a)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.totalCliques.toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.totalVendas}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(m.receita)}</td>
                    <td style={{ padding: '12px 14px', color: m.comPendente > 0 ? 'var(--status-warning)' : 'var(--text-secondary)', fontWeight: m.comPendente > 0 ? 600 : 400 }}>
                      {fmt(m.comPendente)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => router.push(`/afiliados/${a.id}`)} title="Ver perfil"
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          <ExternalLink size={13} />
                        </button>
                        <button onClick={() => copiarLink(a)} title="Copiar link"
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiado === a.id ? 'var(--status-ok)' : 'var(--text-secondary)' }}>
                          {copiado === a.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                        <button onClick={() => { setEditando(a); setModalAberto(true) }} title="Editar"
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => pausarAfiliado(a.id, a.status === 'ativo')} title={a.status === 'ativo' ? 'Pausar' : 'Ativar'}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          {a.status === 'ativo' ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button onClick={() => setDeletando(a)} title="Excluir"
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais */}
      {modalAberto && (
        <AfiliadoModal
          afiliado={editando ?? undefined}
          onSalvar={async dados => {
            if (editando) {
              await atualizarAfiliado(editando.id, dados)
              success('Afiliado atualizado')
            } else {
              const novo = await criarAfiliado(dados)
              if (novo) success('Afiliado cadastrado')
              else toastError('Erro ao cadastrar afiliado')
            }
          }}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}

      {deletando && (
        <ConfirmModal
          open={true}
          title="Excluir afiliado"
          message={`Tem certeza que deseja excluir "${deletando.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={async () => { await deletarAfiliado(deletando.id); setDeletando(null); success('Afiliado excluído', 'Você pode restaurar na Lixeira') }}
          onCancel={() => setDeletando(null)}
        />
      )}
    </div>
  )
}

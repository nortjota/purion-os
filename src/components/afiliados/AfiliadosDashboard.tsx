'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Plus, Copy, Check, Pencil, Trash2, Pause, Play, ExternalLink,
  Search, Filter, TrendingUp, Users, DollarSign, Award, BarChart2, Link2,
} from 'lucide-react'
import { useAfiliados } from '@/hooks/useAfiliados'
import { AfiliadoModal } from './AfiliadoModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
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
const fmtPc = (v: number) => `${v.toFixed(1)}%`

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  ativo:     { label: 'Ativo',     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  pausado:   { label: 'Pausado',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  pendente:  { label: 'Pendente',  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  bloqueado: { label: 'Bloqueado', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
}

function plataformaPrincipal(a: Afiliado) {
  if (a.tiktok)    return 'TikTok'
  if (a.instagram) return 'Instagram'
  if (a.youtube)   return 'YouTube'
  return 'Direto'
}

export function AfiliadosDashboard() {
  const router = useRouter()
  const { afiliados, vendas, cliques, carregando, tenantId, criarAfiliado, atualizarAfiliado, deletarAfiliado, pausarAfiliado } = useAfiliados()

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

  const KPI_CARDS = [
    { label: 'Afiliados ativos',       value: String(kpis.ativos),              icon: Users,     cor: '#3B82F6' },
    { label: 'Vendas via afiliados',    value: fmt(kpis.receitaMes),             icon: TrendingUp, cor: '#10B981', sub: 'no mês' },
    { label: 'Comissões a pagar',       value: fmt(kpis.comPendentes),           icon: DollarSign, cor: '#F59E0B' },
    { label: 'Comissões pagas no mês',  value: fmt(kpis.comPagasMes),            icon: Check,     cor: '#10B981' },
    { label: 'Melhor afiliado do mês',  value: kpis.melhor?.nome.split(' ')[0] ?? '—', icon: Award, cor: '#C9A84C', sub: kpis.melhorVal > 0 ? fmt(kpis.melhorVal) : undefined },
    { label: 'Taxa de conversão média', value: fmtPc(kpis.taxaConv),            icon: BarChart2, cor: '#8B5CF6' },
  ]

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Carregando dados…</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Afiliados</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {afiliados.length} afiliado{afiliados.length !== 1 ? 's' : ''} cadastrado{afiliados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalAberto(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: '#C9A84C', color: '#0D0D0D', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Novo afiliado
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {KPI_CARDS.map(({ label, value, icon: Icon, cor, sub }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={cor} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>{label}</p>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
            {sub && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }} className="grid-mobile-1">
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Vendas via afiliados — últimos 30 dias</p>
          <GraficoVendasDiarias dados={dadosVendasDiarias} />
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Top afiliados do mês</p>
          {dadosTopAfiliados.length === 0
            ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sem vendas registradas no mês</p>
            : <GraficoTopAfiliados dados={dadosTopAfiliados} onClickAfiliado={id => router.push(`/afiliados/${id}`)} />
          }
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
          <Search size={14} color="var(--text-secondary)" />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }}
          />
        </div>
        <select
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="pendente">Pendente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select
          value={filtroPlataforma} onChange={e => setFiltroPlataforma(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
        >
          <option value="todos">Todas as plataformas</option>
          <option value="TikTok">TikTok</option>
          <option value="Instagram">Instagram</option>
          <option value="YouTube">YouTube</option>
          <option value="Direto">Direto</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Filter size={13} />
          {afiliadosFiltrados.length} resultado{afiliadosFiltrados.length !== 1 ? 's' : ''}
        </div>
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
                  Nenhum afiliado encontrado
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
                          background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                          color: '#C9A84C', fontSize: 12, fontWeight: 700,
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
                      <code style={{ fontSize: 11, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4, color: '#C9A84C' }}>{a.codigo}</code>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{plataformaPrincipal(a)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.totalCliques.toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.totalVendas}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(m.receita)}</td>
                    <td style={{ padding: '12px 14px', color: m.comPendente > 0 ? '#F59E0B' : 'var(--text-secondary)', fontWeight: m.comPendente > 0 ? 600 : 400 }}>
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
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiado === a.id ? '#10B981' : 'var(--text-secondary)' }}>
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
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
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
          tenantId={tenantId}
          onSalvar={async dados => {
            if (editando) await atualizarAfiliado(editando.id, dados)
            else await criarAfiliado(dados)
          }}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}

      {deletando && (
        <ConfirmModal
          open={true}
          title="Excluir afiliado"
          message={`Tem certeza que deseja excluir "${deletando.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={async () => { await deletarAfiliado(deletando.id); setDeletando(null) }}
          onCancel={() => setDeletando(null)}
        />
      )}
    </div>
  )
}

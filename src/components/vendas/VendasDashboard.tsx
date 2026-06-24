'use client'

import { useMemo, useState } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, CheckCircle2, ExternalLink } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { StatusVendaAppmax, CanalVenda } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { formatarDataBR } from '@/lib/calculos'

const STATUS_LABEL: Record<StatusVendaAppmax, string> = {
  aprovado:    'Aprovado',
  pendente:    'Pendente',
  recusado:    'Recusado',
  estornado:   'Estornado',
  reembolsado: 'Reembolsado',
}

const STATUS_BADGE: Record<StatusVendaAppmax, string> = {
  aprovado:    'badge-success',
  pendente:    'badge-warning',
  recusado:    'badge-danger',
  estornado:   'badge-danger',
  reembolsado: 'badge-neutral',
}

const METODO_LABEL: Record<string, string> = {
  pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto', desconhecido: '—',
}

const CANAL_LABEL: Record<CanalVenda, string> = { b2c: 'B2C', b2b: 'B2B' }

const PERIODOS = [
  { id: '7d',   label: 'Últimos 7 dias' },
  { id: '30d',  label: 'Últimos 30 dias' },
  { id: '90d',  label: 'Últimos 90 dias' },
  { id: 'todos', label: 'Todo o período' },
] as const

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function VendasDashboard() {
  const { vendas } = usePurionStore()
  const isMobile = useMobile()

  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const limiteDias = filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : filtroPeriodo === '90d' ? 90 : null

    return vendas.filter((v) => {
      if (filtroStatus !== 'todos' && v.status !== filtroStatus) return false
      if (filtroCanal !== 'todos' && v.canal !== filtroCanal) return false
      if (filtroMetodo !== 'todos' && v.metodoPagamento !== filtroMetodo) return false
      if (limiteDias !== null) {
        const dias = (agora - new Date(v.dataVenda).getTime()) / 86_400_000
        if (dias > limiteDias) return false
      }
      return true
    })
  }, [vendas, filtroStatus, filtroCanal, filtroMetodo, filtroPeriodo])

  const kpis = useMemo(() => {
    const aprovadas = vendasFiltradas.filter((v) => v.status === 'aprovado')
    const faturamento = aprovadas.reduce((s, v) => s + v.valorLiquido, 0)
    const ticketMedio = aprovadas.length > 0 ? faturamento / aprovadas.length : 0
    const totalVendas = vendasFiltradas.length
    const taxaAprovacao = totalVendas > 0 ? (aprovadas.length / totalVendas) * 100 : 0
    return { faturamento, ticketMedio, totalVendas, taxaAprovacao, aprovadas: aprovadas.length }
  }, [vendasFiltradas])

  const vendasOrdenadas = useMemo(
    () => [...vendasFiltradas].sort((a, b) => b.dataVenda.localeCompare(a.dataVenda)),
    [vendasFiltradas]
  )

  return (
    <div className="page-content section-gap">
      {/* Header */}
      <div>
        <h1 className="page-title">Vendas</h1>
        <p className="caption mt-1">Pedidos processados via Appmax — atualização em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Faturamento</span>
            <DollarSign size={14} className="text-[var(--gold)] opacity-70" />
          </div>
          <span className="kpi-value">{fmtR(kpis.faturamento)}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Ticket Médio</span>
            <TrendingUp size={14} className="text-[var(--text-secondary)] opacity-60" />
          </div>
          <span className="kpi-value">{fmtR(kpis.ticketMedio)}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Nº de Vendas</span>
            <ShoppingCart size={14} className="text-[var(--text-secondary)] opacity-60" />
          </div>
          <span className="kpi-value">{kpis.totalVendas}</span>
          <p className="caption mt-1">{kpis.aprovadas} aprovadas</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Taxa de Aprovação</span>
            <CheckCircle2 size={14} className="text-[#4CAF7A] opacity-70" />
          </div>
          <span className="kpi-value" style={{ color: kpis.taxaAprovacao >= 70 ? '#4CAF7A' : '#E8A838' }}>
            {kpis.taxaAprovacao.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="select-purion" style={{ width: 'auto' }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
          <option value="todos">Todos os canais</option>
          {Object.entries(CANAL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
          <option value="todos">Todos os métodos</option>
          {Object.entries(METODO_LABEL).filter(([v]) => v !== 'desconhecido').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as typeof filtroPeriodo)}>
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Lista de vendas */}
      {vendasOrdenadas.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={40} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma venda registrada ainda</p>
          <p className="empty-state-subtitle">As vendas aparecem automaticamente aqui via webhook da Appmax, assim que o checkout do site começar a processar pedidos.</p>
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5">
          {vendasOrdenadas.map((v) => (
            <div key={v.id} className="mobile-card-item">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{v.clienteNome || 'Cliente'}</p>
                <span className={`badge ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span>
              </div>
              <p className="caption mb-1">{v.produto || '—'} · {CANAL_LABEL[v.canal]} · {METODO_LABEL[v.metodoPagamento] ?? v.metodoPagamento}</p>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtR(v.valorLiquido)}</span>
                <span className="caption">{formatarDataBR(v.dataVenda.slice(0, 10))}</span>
              </div>
              {v.afiliadoCodigo && <p className="caption mt-1">Afiliado: {v.afiliadoCodigo}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card-purion overflow-hidden">
          <table className="table-purion">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Canal</th>
                <th>Método</th>
                <th>Afiliado</th>
                <th>Status</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Pedido</th>
              </tr>
            </thead>
            <tbody>
              {vendasOrdenadas.map((v) => (
                <tr key={v.id}>
                  <td>{v.clienteNome || '—'}</td>
                  <td className="caption">{v.produto || '—'}{v.quantidade > 1 ? ` ×${v.quantidade}` : ''}</td>
                  <td><span className="badge badge-neutral">{CANAL_LABEL[v.canal]}</span></td>
                  <td className="caption">{METODO_LABEL[v.metodoPagamento] ?? v.metodoPagamento}</td>
                  <td className="caption">{v.afiliadoCodigo ?? '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span></td>
                  <td className="caption">{formatarDataBR(v.dataVenda.slice(0, 10))}</td>
                  <td className="td-mono">{fmtR(v.valorLiquido)}</td>
                  <td className="caption" style={{ fontSize: 11 }}>
                    <span className="inline-flex items-center gap-1">{v.pedidoAppmax}<ExternalLink size={9} className="opacity-40" /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { DollarSign, Building2, Package, TrendingUp, Plus, ArrowRight, Pencil, Trash2, Eye } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { StatusPagamentoVenda } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useMobile } from '@/hooks/useMobile'
import { formatarDataBR } from '@/lib/calculos'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_BADGE, STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE,
  proximoStatusEntrega, fmtR,
} from '@/lib/vendas-helpers'
import { ModalVendaB2B } from './ModalVendaB2B'
import { ModalDetalheVenda } from './ModalDetalheVenda'
import type { Venda } from '@/store'

const PERIODOS = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'todos', label: 'Todo o período' },
] as const

export function VendasB2B() {
  const { vendas } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()
  const isMobile = useMobile()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [filtroEstetica, setFiltroEstetica] = useState<string>('todos')
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  const vendasB2B = useMemo(() => vendas.filter((v) => v.canal === 'b2b'), [vendas])

  const esteticas = useMemo(() => {
    const map = new Map<string, string>()
    vendasB2B.forEach((v) => { if (v.leadId) map.set(v.leadId, v.clienteNome) })
    return Array.from(map.entries())
  }, [vendasB2B])

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const limiteDias = filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : filtroPeriodo === '90d' ? 90 : null
    return vendasB2B.filter((v) => {
      if (filtroEstetica !== 'todos' && v.leadId !== filtroEstetica) return false
      if (filtroPagamento !== 'todos' && v.statusPagamento !== filtroPagamento) return false
      if (limiteDias !== null) {
        const dias = (agora - new Date(v.dataVenda).getTime()) / 86_400_000
        if (dias > limiteDias) return false
      }
      return true
    }).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda))
  }, [vendasB2B, filtroEstetica, filtroPagamento, filtroPeriodo])

  const kpis = useMemo(() => {
    const pagas = vendasFiltradas.filter((v) => v.statusPagamento === 'pago')
    const totalLotes = pagas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const parceiros = new Set(vendasFiltradas.map((v) => v.leadId).filter(Boolean)).size
    const unidades = vendasFiltradas.reduce((s, v) => s + v.quantidade, 0)
    const ticketMedio = pagas.length > 0 ? totalLotes / pagas.length : 0
    return { totalLotes, parceiros, unidades, ticketMedio }
  }, [vendasFiltradas])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="kpi-label">Vendas B2B ({vendasFiltradas.length})</p>
        <button onClick={() => { setEditando(undefined); setModalAberto(true) }} className="btn btn-primary btn-sm">
          <Plus size={12} /> Nova venda B2B
        </button>
      </div>

      {/* KPIs */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Total em Lotes</span><DollarSign size={14} className="text-[var(--gold)] opacity-70" /></div>
          <span className="kpi-value">{fmtR(kpis.totalLotes)}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Parceiros</span><Building2 size={14} className="text-[var(--text-secondary)] opacity-60" /></div>
          <span className="kpi-value">{kpis.parceiros}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Unidades Vendidas</span><Package size={14} className="text-[var(--text-secondary)] opacity-60" /></div>
          <span className="kpi-value">{kpis.unidades}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Ticket Médio do Lote</span><TrendingUp size={14} className="text-[#4CAF7A] opacity-70" /></div>
          <span className="kpi-value">{fmtR(kpis.ticketMedio)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="select-purion" style={{ width: 'auto' }} value={filtroEstetica} onChange={(e) => setFiltroEstetica(e.target.value)}>
          <option value="todos">Todas as estéticas</option>
          {esteticas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)}>
          <option value="todos">Todos os pagamentos</option>
          {Object.entries(STATUS_PAGAMENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as typeof filtroPeriodo)}>
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {vendasFiltradas.length === 0 ? (
        <div className="empty-state">
          <Building2 size={40} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma venda B2B registrada</p>
          <p className="empty-state-subtitle">Registre lotes vendidos a estéticas parceiras.</p>
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5">
          {vendasFiltradas.map((v) => {
            const proximo = proximoStatusEntrega(v.statusEntrega)
            return (
              <div key={v.id} className="mobile-card-item">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{v.clienteNome}</p>
                  <span className={`badge ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}>{STATUS_PAGAMENTO_LABEL[v.statusPagamento]}</span>
                </div>
                <p className="caption mb-1">{v.quantidade} un. · {formatarDataBR(v.dataVenda.slice(0, 10))}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtR(v.valorTotal ?? v.valorLiquido)}</span>
                  <span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {proximo && (
                    <button onClick={() => mudarStatusEntrega(v.id, proximo)} className="btn btn-secondary btn-sm flex-1">
                      <ArrowRight size={11} /> {STATUS_ENTREGA_LABEL[proximo]}
                    </button>
                  )}
                  <button onClick={() => setDetalheAberto(v)} className="icon-btn"><Eye size={12} /></button>
                  <button onClick={() => { setEditando(v); setModalAberto(true) }} className="icon-btn"><Pencil size={12} /></button>
                  <button onClick={() => deletarVenda(v.id)} className="icon-btn"><Trash2 size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-purion overflow-hidden">
          <table className="table-purion">
            <thead>
              <tr><th>Estética</th><th>Unidades</th><th>Valor</th><th>Pagamento</th><th>Entrega</th><th>Data</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {vendasFiltradas.map((v) => {
                const proximo = proximoStatusEntrega(v.statusEntrega)
                return (
                  <tr key={v.id}>
                    <td>{v.clienteNome}</td>
                    <td className="caption">{v.quantidade}</td>
                    <td className="td-mono">{fmtR(v.valorTotal ?? v.valorLiquido)}</td>
                    <td>
                      <select
                        value={v.statusPagamento}
                        onChange={(e) => mudarStatusPagamento(v.id, e.target.value as StatusPagamentoVenda)}
                        className={`text-[10px] font-bold rounded-full px-2 py-1 border-none outline-none cursor-pointer ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}
                      >
                        {Object.entries(STATUS_PAGAMENTO_LABEL).map(([sv, l]) => <option key={sv} value={sv}>{l}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span></td>
                    <td className="caption">{formatarDataBR(v.dataVenda.slice(0, 10))}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {proximo && (
                          <button onClick={() => mudarStatusEntrega(v.id, proximo)} title={`Avançar para ${STATUS_ENTREGA_LABEL[proximo]}`} className="icon-btn">
                            <ArrowRight size={12} />
                          </button>
                        )}
                        <button onClick={() => setDetalheAberto(v)} title="Ver detalhes" className="icon-btn"><Eye size={12} /></button>
                        <button onClick={() => { setEditando(v); setModalAberto(true) }} className="icon-btn"><Pencil size={12} /></button>
                        <button onClick={() => deletarVenda(v.id)} className="icon-btn"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && <ModalVendaB2B venda={editando} onFechar={() => setModalAberto(false)} />}
      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
    </div>
  )
}

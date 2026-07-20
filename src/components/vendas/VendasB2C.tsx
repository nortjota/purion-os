'use client'

import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, ShoppingBag, Truck, Plus, ArrowRight, Pencil, Trash2, Eye, Package } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { StatusPagamentoVenda } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useMobile } from '@/hooks/useMobile'
import { formatarDataBR } from '@/lib/calculos'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_BADGE, STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE,
  METODO_PAGAMENTO_LABEL, proximoStatusEntrega, fmtR,
} from '@/lib/vendas-helpers'
import { ModalVendaB2C } from './ModalVendaB2C'
import { ModalDetalheVenda } from './ModalDetalheVenda'
import type { Venda } from '@/store'

const PERIODOS = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'todos', label: 'Todo o período' },
] as const

export function VendasB2C() {
  const { vendas, creators } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()
  const isMobile = useMobile()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [filtroEntrega, setFiltroEntrega] = useState<string>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')
  const [filtroAfiliado, setFiltroAfiliado] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  const vendasB2C = useMemo(() => vendas.filter((v) => v.canal === 'b2c'), [vendas])

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const limiteDias = filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : filtroPeriodo === '90d' ? 90 : null
    return vendasB2C.filter((v) => {
      if (filtroPagamento !== 'todos' && v.statusPagamento !== filtroPagamento) return false
      if (filtroEntrega !== 'todos' && v.statusEntrega !== filtroEntrega) return false
      if (filtroMetodo !== 'todos' && v.metodoPagamento !== filtroMetodo) return false
      if (filtroAfiliado !== 'todos' && v.afiliadoCreatorId !== filtroAfiliado) return false
      if (limiteDias !== null) {
        const dias = (agora - new Date(v.dataVenda).getTime()) / 86_400_000
        if (dias > limiteDias) return false
      }
      return true
    }).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda))
  }, [vendasB2C, filtroPagamento, filtroEntrega, filtroMetodo, filtroAfiliado, filtroPeriodo])

  const kpis = useMemo(() => {
    const pagas = vendasFiltradas.filter((v) => v.statusPagamento === 'pago')
    const faturamento = pagas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const ticketMedio = pagas.length > 0 ? faturamento / pagas.length : 0
    const entregues = vendasFiltradas.filter((v) => v.statusEntrega === 'entregue').length
    const pctEntregues = vendasFiltradas.length > 0 ? (entregues / vendasFiltradas.length) * 100 : 0
    const aReceber = vendasFiltradas.filter((v) => v.statusPagamento === 'pendente').reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const totalFrascos = vendasFiltradas.reduce((s, v) => s + v.quantidade, 0)
    return { faturamento, ticketMedio, totalPedidos: vendasFiltradas.length, pctEntregues, aReceber, totalFrascos }
  }, [vendasFiltradas])

  const nomeCreator = (id: string | null) => id ? (creators.find((c) => c.id === id)?.nome ?? '—') : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="kpi-label">Vendas B2C · {kpis.totalPedidos} pedidos · {kpis.totalFrascos} frascos</p>
        <button onClick={() => { setEditando(undefined); setModalAberto(true) }} className="btn btn-primary btn-sm">
          <Plus size={12} /> Nova venda
        </button>
      </div>

      {/* KPIs */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Faturamento</span><DollarSign size={14} className="text-[var(--gold)] opacity-70" /></div>
          <span className="kpi-value">{fmtR(kpis.faturamento)}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Ticket Médio</span><TrendingUp size={14} className="text-[var(--text-secondary)] opacity-60" /></div>
          <span className="kpi-value">{fmtR(kpis.ticketMedio)}</span>
          <span className="caption">por pedido</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Pedidos</span><ShoppingBag size={14} className="text-[var(--text-secondary)] opacity-60" /></div>
          <span className="kpi-value">{kpis.totalPedidos}</span>
          <span className="caption">1 pedido pode ter vários frascos</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Frascos Vendidos</span><Package size={14} className="text-[#5B8FE8] opacity-70" /></div>
          <span className="kpi-value">{kpis.totalFrascos}</span>
          <span className="caption">unidades (soma das qtds)</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">% Entregues</span><Truck size={14} className="text-[#4CAF7A] opacity-70" /></div>
          <span className="kpi-value">{kpis.pctEntregues.toFixed(0)}%</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">A Receber</span></div>
          <span className="kpi-value" style={{ color: '#E8A838' }}>{fmtR(kpis.aReceber)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)}>
          <option value="todos">Todos os pagamentos</option>
          {Object.entries(STATUS_PAGAMENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)}>
          <option value="todos">Todas as entregas</option>
          {Object.entries(STATUS_ENTREGA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
          <option value="todos">Todos os métodos</option>
          {Object.entries(METODO_PAGAMENTO_LABEL).filter(([v]) => v !== 'desconhecido').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroAfiliado} onChange={(e) => setFiltroAfiliado(e.target.value)}>
          <option value="todos">Todos os afiliados</option>
          {creators.filter((c) => c.codigoDesconto).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as typeof filtroPeriodo)}>
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {vendasFiltradas.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={40} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma venda B2C registrada</p>
          <p className="empty-state-subtitle">Clique em &quot;Nova venda&quot; para registrar manualmente.</p>
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5">
          {vendasFiltradas.map((v) => {
            const proximo = proximoStatusEntrega(v.statusEntrega)
            return (
              <div key={v.id} className="mobile-card-item">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{v.clienteNome || 'Cliente'}</p>
                  <span className={`badge ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}>{STATUS_PAGAMENTO_LABEL[v.statusPagamento]}</span>
                </div>
                <p className="caption mb-1">
                  <span style={{ fontWeight: 700, color: '#5B8FE8' }}>{v.quantidade} frasco{v.quantidade !== 1 ? 's' : ''}</span>
                  {' · '}{METODO_PAGAMENTO_LABEL[v.metodoPagamento] ?? v.metodoPagamento} · {formatarDataBR(v.dataVenda.slice(0, 10))}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtR(v.valorTotal ?? v.valorLiquido)}</span>
                  <span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span>
                </div>
                {nomeCreator(v.afiliadoCreatorId) && <p className="caption mb-2">Afiliado: {nomeCreator(v.afiliadoCreatorId)}</p>}
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
          <div style={{ padding: '10px 4px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
            <span className="caption"><strong>{kpis.totalPedidos}</strong> pedidos</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C' }}>{kpis.totalFrascos} frascos</span>
            <span className="caption">{fmtR(kpis.faturamento)} faturado</span>
          </div>
        </div>
      ) : (
        <div className="card-purion overflow-hidden">
          <table className="table-purion">
            <thead>
              <tr>
                <th>Cliente</th><th>Frascos</th><th>Valor</th><th>Método</th><th>Pagamento</th>
                <th>Entrega</th><th>Afiliado</th><th>Data</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.map((v) => {
                const proximo = proximoStatusEntrega(v.statusEntrega)
                return (
                  <tr key={v.id}>
                    <td>{v.clienteNome || '—'}</td>
                    <td className="caption" style={{ fontWeight: 600 }}>{v.quantidade}</td>
                    <td className="td-mono">{fmtR(v.valorTotal ?? v.valorLiquido)}</td>
                    <td className="caption">{METODO_PAGAMENTO_LABEL[v.metodoPagamento] ?? v.metodoPagamento}</td>
                    <td>
                      <select
                        value={v.statusPagamento}
                        onChange={(e) => mudarStatusPagamento(v.id, e.target.value as StatusPagamentoVenda)}
                        className={`text-[10px] font-bold rounded-full px-2 py-1 border-none outline-none cursor-pointer ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}
                      >
                        {Object.entries(STATUS_PAGAMENTO_LABEL).map(([sv, l]) => <option key={sv} value={sv}>{l}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span>
                    </td>
                    <td className="caption">{nomeCreator(v.afiliadoCreatorId) ?? '—'}</td>
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
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', paddingTop: 8 }}>
                  {kpis.totalPedidos} pedidos
                </td>
                <td style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C', paddingTop: 8 }}>
                  {kpis.totalFrascos} frascos
                </td>
                <td style={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }}>
                  {fmtR(vendasFiltradas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0))}
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {modalAberto && <ModalVendaB2C venda={editando} onFechar={() => setModalAberto(false)} />}
      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
    </div>
  )
}

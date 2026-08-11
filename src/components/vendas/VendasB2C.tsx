'use client'

import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, ShoppingBag, Truck, Plus, Package } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_ENTREGA_LABEL, METODO_PAGAMENTO_LABEL, fmtR,
} from '@/lib/vendas-helpers'
import { ModalVendaB2C } from './ModalVendaB2C'
import { ModalDetalheVenda } from './ModalDetalheVenda'
import { VendasTabelaPedidos } from './VendasTabelaPedidos'
import { useDoacoesUGC } from '@/hooks/useDoacoesUGC'
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
  const { migrarVendasZeroParaUGC } = useDoacoesUGC()
  const [migrando, setMigrando] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [filtroEntrega, setFiltroEntrega] = useState<string>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')
  const [filtroAfiliado, setFiltroAfiliado] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  // Separa R$0 (doações registradas como venda) das vendas reais
  const vendasB2C = useMemo(() => vendas.filter((v) => v.canal === 'b2c' && (v.valorTotal ?? v.valorLiquido) > 0), [vendas])
  const vendasZeroB2C = useMemo(() => vendas.filter((v) => v.canal === 'b2c' && (v.valorTotal ?? v.valorLiquido) === 0), [vendas])

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
      {/* Banner de migração */}
      {vendasZeroB2C.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>
              {vendasZeroB2C.length} venda{vendasZeroB2C.length > 1 ? 's' : ''} de R$0,00 encontrada{vendasZeroB2C.length > 1 ? 's'  : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
              Essas são doações UGC registradas como venda. Clique para mover para a aba Doações UGC.
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            disabled={migrando}
            onClick={async () => {
              setMigrando(true)
              await migrarVendasZeroParaUGC()
              setMigrando(false)
            }}
          >
            {migrando ? 'Migrando…' : `Migrar ${vendasZeroB2C.length > 1 ? 'todas' : ''} para Doações UGC`}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Vendas B2C</p>
          <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
            <span style={{ color: '#C9A84C' }}>{kpis.totalPedidos}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>pedidos</span>
            <span style={{ color: 'var(--border)', margin: '0 8px' }}>·</span>
            <span style={{ color: '#5B8FE8' }}>{kpis.totalFrascos}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>frascos vendidos</span>
          </p>
        </div>
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
      <VendasTabelaPedidos
        vendas={vendasFiltradas}
        showCanal={false}
        nomeAfiliado={nomeCreator}
        onVerDetalhes={setDetalheAberto}
        onEditar={(v) => { setEditando(v); setModalAberto(true) }}
        onExcluir={deletarVenda}
        onAvancarEntrega={mudarStatusEntrega}
        onMudarStatusPagamento={mudarStatusPagamento}
      />

      {modalAberto && <ModalVendaB2C venda={editando} onFechar={() => setModalAberto(false)} />}
      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
    </div>
  )
}

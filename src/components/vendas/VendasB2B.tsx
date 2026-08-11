'use client'

import { useMemo, useState } from 'react'
import { DollarSign, Building2, Package, TrendingUp, Plus } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { STATUS_PAGAMENTO_LABEL, fmtR } from '@/lib/vendas-helpers'
import { ModalVendaB2B } from './ModalVendaB2B'
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

export function VendasB2B() {
  const { vendas } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()
  const { migrarVendasZeroParaUGC } = useDoacoesUGC()
  const [migrando, setMigrando] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [filtroEstetica, setFiltroEstetica] = useState<string>('todos')
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  const vendasB2B = useMemo(() => vendas.filter((v) => v.canal === 'b2b' && (v.valorTotal ?? v.valorLiquido) > 0), [vendas])
  const vendasZeroB2B = useMemo(() => vendas.filter((v) => v.canal === 'b2b' && (v.valorTotal ?? v.valorLiquido) === 0), [vendas])

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
      {vendasZeroB2B.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
          }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>
                {vendasZeroB2B.length} venda{vendasZeroB2B.length > 1 ? 's' : ''} B2B de R$0,00
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                Doações UGC registradas como venda — clique para migrar.
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={migrando}
              onClick={async () => { setMigrando(true); await migrarVendasZeroParaUGC(); setMigrando(false) }}
            >
              {migrando ? 'Migrando…' : 'Migrar para Doações UGC'}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Vendas B2B</p>
          <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
            <span style={{ color: '#C9A84C' }}>{vendasFiltradas.length}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>pedidos</span>
            <span style={{ color: 'var(--border)', margin: '0 8px' }}>·</span>
            <span style={{ color: '#5B8FE8' }}>{kpis.unidades}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>frascos vendidos</span>
          </p>
        </div>
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
          <div className="flex items-center justify-between mb-2"><span className="kpi-label">Frascos Vendidos</span><Package size={14} className="text-[#5B8FE8] opacity-70" /></div>
          <span className="kpi-value">{kpis.unidades}</span>
          <span className="caption">unidades (soma das qtds)</span>
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
      <VendasTabelaPedidos
        vendas={vendasFiltradas}
        showCanal={false}
        onVerDetalhes={setDetalheAberto}
        onEditar={(v) => { setEditando(v); setModalAberto(true) }}
        onExcluir={deletarVenda}
        onAvancarEntrega={mudarStatusEntrega}
        onMudarStatusPagamento={mudarStatusPagamento}
      />

      {modalAberto && <ModalVendaB2B venda={editando} onFechar={() => setModalAberto(false)} />}
      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
    </div>
  )
}

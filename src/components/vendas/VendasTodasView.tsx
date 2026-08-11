'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda, StatusEntregaVenda } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { STATUS_PAGAMENTO_LABEL, STATUS_ENTREGA_LABEL, CANAL_LABEL, type AgrupamentoVendas } from '@/lib/vendas-helpers'
import { VendasTabelaPedidos } from './VendasTabelaPedidos'
import { VendasQuadroView } from './VendasQuadroView'
import { VendasCalendarioView } from './VendasCalendarioView'
import { PainelMetricasVendas } from './PainelMetricasVendas'
import { ModalVendaB2C } from './ModalVendaB2C'
import { ModalVendaB2B } from './ModalVendaB2B'
import { ModalDetalheVenda } from './ModalDetalheVenda'

type Visao = 'lista' | 'quadro' | 'calendario' | 'painel'

const TABS = [
  { id: 'lista',      label: 'Lista'      },
  { id: 'quadro',     label: 'Quadro'     },
  { id: 'calendario', label: 'Calendário' },
  { id: 'painel',     label: 'Painel'     },
]

const VISOES_VALIDAS: Visao[] = ['lista', 'quadro', 'calendario', 'painel']

const PERIODOS = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'todos', label: 'Todo o período' },
] as const

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'lista'
  const v = localStorage.getItem('purion:view:vendas-todas')
  return VISOES_VALIDAS.includes(v as Visao) ? (v as Visao) : 'lista'
}

export function VendasTodasView() {
  const isMobile = useMobile()
  const { vendas, creators } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()

  const [visao, setVisao] = useState<Visao>('lista')
  const [groupBy, setGroupBy] = useState<AgrupamentoVendas>('status_entrega')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')
  const [filtroEntrega, setFiltroEntrega] = useState<string>('todos')
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<typeof PERIODOS[number]['id']>('30d')

  const [novaAberto, setNovaAberto] = useState(false)
  const [modalCanal, setModalCanal] = useState<'b2c' | 'b2b'>('b2c')
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: string) {
    setVisao(v as Visao)
    if (typeof window !== 'undefined') localStorage.setItem('purion:view:vendas-todas', v)
  }

  const vendasReais = useMemo(() => vendas.filter((v) => (v.valorTotal ?? v.valorLiquido) > 0), [vendas])

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const limiteDias = filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : filtroPeriodo === '90d' ? 90 : null
    return vendasReais.filter((v) => {
      if (filtroCanal !== 'todos' && v.canal !== filtroCanal) return false
      if (filtroEntrega !== 'todos' && v.statusEntrega !== filtroEntrega) return false
      if (filtroPagamento !== 'todos' && v.statusPagamento !== filtroPagamento) return false
      if (limiteDias !== null) {
        const dias = (agora - new Date(v.dataVenda).getTime()) / 86_400_000
        if (dias > limiteDias) return false
      }
      return true
    }).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda))
  }, [vendasReais, filtroCanal, filtroEntrega, filtroPagamento, filtroPeriodo])

  const nomeAfiliado = (id: string | null) => id ? (creators.find((c) => c.id === id)?.nome ?? '—') : null

  function handleEditar(v: Venda) {
    setEditando(v)
    setModalCanal(v.canal)
    setModalEdicaoAberto(true)
  }

  function handleNovaVenda(canal: 'b2c' | 'b2b') {
    setEditando(undefined)
    setModalCanal(canal)
    setModalEdicaoAberto(true)
    setNovaAberto(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Todas as Vendas</p>
          <p className="caption">{vendasFiltradas.length} pedido{vendasFiltradas.length !== 1 ? 's' : ''} · {vendasFiltradas.reduce((s, v) => s + v.quantidade, 0)} frascos</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNovaAberto((o) => !o)} className="btn btn-primary btn-sm">
            <Plus size={12} /> Nova venda <ChevronDown size={11} />
          </button>
          {novaAberto && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setNovaAberto(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 0', zIndex: 50, minWidth: 150,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                <button onClick={() => handleNovaVenda('b2c')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)' }}>
                  Venda B2C
                </button>
                <button onClick={() => handleNovaVenda('b2b')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)' }}>
                  Venda B2B
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Abas de visão */}
      {isMobile ? (
        <select className="select-purion" style={{ width: '100%' }} value={visao} onChange={(e) => mudarVisao(e.target.value)}>
          {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <InnerTabs tabs={TABS} activeTab={visao} onChange={mudarVisao} />
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="select-purion" style={{ width: 'auto' }} value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
          <option value="todos">Todos os canais</option>
          <option value="b2c">{CANAL_LABEL.b2c}</option>
          <option value="b2b">{CANAL_LABEL.b2b}</option>
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)}>
          <option value="todos">Todas as entregas</option>
          {Object.entries(STATUS_ENTREGA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)}>
          <option value="todos">Todos os pagamentos</option>
          {Object.entries(STATUS_PAGAMENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as typeof filtroPeriodo)}>
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {visao === 'lista' && !isMobile && (
          <select className="select-purion" style={{ width: 'auto' }} value={groupBy} onChange={(e) => setGroupBy(e.target.value as AgrupamentoVendas)}>
            <option value="status_entrega">Agrupar por entrega</option>
            <option value="canal">Agrupar por canal</option>
            <option value="periodo">Agrupar por período</option>
            <option value="none">Sem agrupamento</option>
          </select>
        )}
      </div>

      {/* Conteúdo */}
      <div>
        {visao === 'lista' && (
          <VendasTabelaPedidos
            vendas={vendasFiltradas}
            groupBy={isMobile ? 'status_entrega' : groupBy}
            showCanal
            nomeAfiliado={nomeAfiliado}
            onVerDetalhes={setDetalheAberto}
            onEditar={handleEditar}
            onExcluir={deletarVenda}
            onAvancarEntrega={mudarStatusEntrega}
            onMudarStatusPagamento={mudarStatusPagamento}
          />
        )}

        {visao === 'quadro' && (
          <VendasQuadroView
            vendas={vendasFiltradas}
            onAbrirVenda={setDetalheAberto}
            onMudarStatusEntrega={(id, status) => mudarStatusEntrega(id, status as StatusEntregaVenda)}
          />
        )}

        {visao === 'calendario' && (
          <VendasCalendarioView vendas={vendasFiltradas} onAbrirVenda={setDetalheAberto} />
        )}

        {visao === 'painel' && <PainelMetricasVendas />}
      </div>

      {modalEdicaoAberto && modalCanal === 'b2c' && (
        <ModalVendaB2C venda={editando} onFechar={() => setModalEdicaoAberto(false)} />
      )}
      {modalEdicaoAberto && modalCanal === 'b2b' && (
        <ModalVendaB2B venda={editando} onFechar={() => setModalEdicaoAberto(false)} />
      )}
      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
    </div>
  )
}

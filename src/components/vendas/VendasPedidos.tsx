'use client'

import { useAcaoRapida } from '@/lib/acaoRapida'
import { useState, useMemo, useEffect } from 'react'
import { Plus, ChevronDown, Search, List, Columns3, CalendarDays, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda, StatusEntregaVenda } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useDoacoesUGC } from '@/hooks/useDoacoesUGC'
import { useMobile } from '@/hooks/useMobile'
import { Segmentado } from '@/components/ui/Segmentado'
import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_ENTREGA_LABEL, METODO_PAGAMENTO_LABEL, fmtR,
  type AgrupamentoVendas,
} from '@/lib/vendas-helpers'
import { frascosDaVenda } from '@/lib/escadaProdutos'
import { VendasTabelaPedidos } from './VendasTabelaPedidos'
import { VendasQuadroView } from './VendasQuadroView'
import { VendasCalendarioView } from './VendasCalendarioView'
import { ModalVendaB2C } from './ModalVendaB2C'
import { ModalVendaB2B } from './ModalVendaB2B'
import { ModalDetalheVenda } from './ModalDetalheVenda'

type Visao = 'lista' | 'quadro' | 'calendario'
type Canal = 'todos' | 'b2c' | 'b2b'
type PeriodoId = '7d' | '30d' | '90d' | 'todos'

const VISOES: ReadonlyArray<{ id: Visao; label: string; icon: typeof List }> = [
  { id: 'lista',      label: 'Lista',      icon: List },
  { id: 'quadro',     label: 'Quadro',     icon: Columns3 },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
]
const PERIODOS: ReadonlyArray<{ id: PeriodoId; label: string }> = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'todos', label: 'Tudo' },
]
const DIAS: Record<PeriodoId, number | null> = { '7d': 7, '30d': 30, '90d': 90, todos: null }

const CHAVE_VISAO = 'purion:view:vendas-todas'
const valor = (v: Venda) => v.valorTotal ?? v.valorLiquido

/**
 * Pedidos — uma única lista para B2C e B2B (antes eram 3 abas quase iguais).
 * O canal vira um filtro; a faixa de números acompanha exatamente o recorte na tela.
 */
export function VendasPedidos() {
  const isMobile = useMobile()
  const { vendas, creators } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()
  const { migrarVendasZeroParaUGC } = useDoacoesUGC()

  const [visao, setVisao] = useState<Visao>('lista')
  const [canal, setCanal] = useState<Canal>('todos')
  const [periodo, setPeriodo] = useState<PeriodoId>('30d')
  const [busca, setBusca] = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('todos')
  const [filtroPagamento, setFiltroPagamento] = useState('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('todos')
  const [filtroAfiliado, setFiltroAfiliado] = useState('todos')
  const [filtroParceiro, setFiltroParceiro] = useState('todos')
  const [groupBy, setGroupBy] = useState<AgrupamentoVendas>('status_entrega')

  const [menuNovaAberto, setMenuNovaAberto] = useState(false)
  const [modalCanal, setModalCanal] = useState<'b2c' | 'b2b'>('b2c')
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [migrando, setMigrando] = useState(false)
  useAcaoRapida('nova-venda-b2c', () => { setEditando(undefined); setModalCanal('b2c'); setModalEdicaoAberto(true) })
  useAcaoRapida('nova-venda-b2b', () => { setEditando(undefined); setModalCanal('b2b'); setModalEdicaoAberto(true) })

  useEffect(() => {
    const salva = window.localStorage.getItem(CHAVE_VISAO)
    if (salva === 'lista' || salva === 'quadro' || salva === 'calendario') setVisao(salva)
  }, [])
  function mudarVisao(v: Visao) {
    setVisao(v)
    window.localStorage.setItem(CHAVE_VISAO, v)
  }

  // R$ 0,00 = doação UGC registrada como venda: fica fora da lista e ganha aviso para migrar
  const vendasReais = useMemo(() => vendas.filter((v) => valor(v) > 0), [vendas])
  const vendasZero = useMemo(() => vendas.filter((v) => valor(v) === 0), [vendas])

  const contagemCanal = useMemo(() => ({
    todos: vendasReais.length,
    b2c: vendasReais.filter((v) => v.canal === 'b2c').length,
    b2b: vendasReais.filter((v) => v.canal === 'b2b').length,
  }), [vendasReais])

  const parceiros = useMemo(() => {
    const map = new Map<string, string>()
    vendasReais.forEach((v) => { if (v.canal === 'b2b' && v.leadId) map.set(v.leadId, v.clienteNome) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [vendasReais])
  const afiliados = useMemo(() => creators.filter((c) => c.codigoDesconto), [creators])

  // filtros que só fazem sentido em um canal são ignorados fora dele
  const metodoAtivo = canal === 'b2c' ? filtroMetodo : 'todos'
  const afiliadoAtivo = canal === 'b2c' ? filtroAfiliado : 'todos'
  const parceiroAtivo = canal === 'b2b' ? filtroParceiro : 'todos'

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const limite = DIAS[periodo]
    const termo = busca.trim().toLowerCase()
    return vendasReais.filter((v) => {
      if (canal !== 'todos' && v.canal !== canal) return false
      if (filtroEntrega !== 'todos' && v.statusEntrega !== filtroEntrega) return false
      if (filtroPagamento !== 'todos' && v.statusPagamento !== filtroPagamento) return false
      if (metodoAtivo !== 'todos' && v.metodoPagamento !== metodoAtivo) return false
      if (afiliadoAtivo !== 'todos' && v.afiliadoCreatorId !== afiliadoAtivo) return false
      if (parceiroAtivo !== 'todos' && v.leadId !== parceiroAtivo) return false
      if (limite !== null && (agora - new Date(v.dataVenda).getTime()) / 86_400_000 > limite) return false
      if (termo && !`${v.clienteNome} ${v.clienteEmail ?? ''} ${v.clienteTelefone ?? ''}`.toLowerCase().includes(termo)) return false
      return true
    }).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda))
  }, [vendasReais, canal, periodo, busca, filtroEntrega, filtroPagamento, metodoAtivo, afiliadoAtivo, parceiroAtivo])

  const filtrosExtras = [filtroEntrega, filtroPagamento, metodoAtivo, afiliadoAtivo, parceiroAtivo].filter((f) => f !== 'todos').length + (busca.trim() ? 1 : 0)
  function limparFiltros() {
    setBusca(''); setFiltroEntrega('todos'); setFiltroPagamento('todos')
    setFiltroMetodo('todos'); setFiltroAfiliado('todos'); setFiltroParceiro('todos')
  }

  const metricas = useMemo<MetricaFaixa[]>(() => {
    const pagas = vendasFiltradas.filter((v) => v.statusPagamento === 'pago')
    const faturamento = pagas.reduce((s, v) => s + valor(v), 0)
    const frascos = vendasFiltradas.reduce((s, v) => s + frascosDaVenda(v), 0)
    const aReceber = vendasFiltradas.filter((v) => v.statusPagamento === 'pendente').reduce((s, v) => s + valor(v), 0)
    const entregues = vendasFiltradas.filter((v) => v.statusEntrega === 'entregue').length
    const aDespachar = vendasFiltradas.filter((v) => v.statusPagamento === 'pago' && ['aguardando', 'separando'].includes(v.statusEntrega)).length
    const lista: MetricaFaixa[] = [
      { label: 'Faturamento', valor: fmtR(faturamento), sub: `${pagas.length} pago${pagas.length !== 1 ? 's' : ''}`, dica: 'Soma dos pedidos com pagamento "pago" no recorte atual.' },
      { label: 'Pedidos', valor: vendasFiltradas.length, sub: `${frascos} frasco${frascos !== 1 ? 's' : ''}`, dica: 'Frascos = quantidade × frascos por unidade do SKU (kits contam todos os frascos).' },
      { label: 'Ticket médio', valor: pagas.length ? fmtR(faturamento / pagas.length) : '—', sub: 'por pedido pago' },
      { label: 'A receber', valor: fmtR(aReceber), sub: 'pagamento pendente', tom: aReceber > 0 ? 'warning' : undefined },
      { label: 'A despachar', valor: aDespachar, sub: 'pagos, não enviados', tom: aDespachar > 0 ? 'warning' : undefined },
      { label: 'Entregues', valor: vendasFiltradas.length ? `${Math.round((entregues / vendasFiltradas.length) * 100)}%` : '—', sub: `${entregues} de ${vendasFiltradas.length}` },
    ]
    if (canal === 'b2b') {
      const nParceiros = new Set(vendasFiltradas.map((v) => v.leadId).filter(Boolean)).size
      lista.splice(3, 0, { label: 'Parceiros', valor: nParceiros, sub: 'com pedido no período' })
    }
    return lista
  }, [vendasFiltradas, canal])

  const nomeAfiliado = (id: string | null) => id ? (creators.find((c) => c.id === id)?.nome ?? '—') : null

  function handleEditar(v: Venda) {
    setEditando(v); setModalCanal(v.canal); setModalEdicaoAberto(true)
  }
  function handleNovaVenda(c: 'b2c' | 'b2b') {
    setEditando(undefined); setModalCanal(c); setModalEdicaoAberto(true); setMenuNovaAberto(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Doações registradas como venda (R$ 0,00) */}
      {vendasZero.length > 0 && (
        <div className="card-purion" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {vendasZero.length} venda{vendasZero.length > 1 ? 's' : ''} de R$ 0,00
            </strong>
            {' '}— são doações UGC registradas como venda e não entram nos números abaixo.
          </p>
          <button
            className="btn btn-secondary btn-sm" disabled={migrando}
            onClick={async () => { setMigrando(true); await migrarVendasZeroParaUGC(); setMigrando(false) }}
          >
            {migrando ? 'Migrando…' : 'Mover para Doações UGC'}
          </button>
        </div>
      )}

      {/* Linha 1: recorte (canal + período) e ação principal */}
      <div className="toolbar">
        <Segmentado
          rotulo="Canal" valor={canal} onChange={setCanal}
          opcoes={[
            { id: 'todos', label: 'Todos', contagem: contagemCanal.todos },
            { id: 'b2c', label: 'B2C', contagem: contagemCanal.b2c },
            { id: 'b2b', label: 'B2B', contagem: contagemCanal.b2b },
          ]}
        />
        <Segmentado rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={PERIODOS} />
        <span className="toolbar-espaco" />
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-accent btn-sm"
            onClick={() => canal === 'todos' ? setMenuNovaAberto((o) => !o) : handleNovaVenda(canal)}
            aria-haspopup={canal === 'todos' ? 'menu' : undefined} aria-expanded={canal === 'todos' ? menuNovaAberto : undefined}
          >
            <Plus size={13} /> Nova venda{canal !== 'todos' ? ` ${canal.toUpperCase()}` : ''}
            {canal === 'todos' && <ChevronDown size={12} />}
          </button>
          {menuNovaAberto && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setMenuNovaAberto(false)} />
              <div className="menu-flutuante" role="menu">
                <button className="nav-menu-item" role="menuitem" onClick={() => handleNovaVenda('b2c')}>Venda B2C · cliente final</button>
                <button className="nav-menu-item" role="menuitem" onClick={() => handleNovaVenda('b2b')}>Venda B2B · parceiro</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Números do recorte atual */}
      <MetricStrip metricas={metricas} rotulo="Resumo dos pedidos filtrados" />

      {/* Linha 2: busca, filtros e visão */}
      <div className="toolbar">
        <label className="busca" style={{ flex: isMobile ? '1 1 100%' : undefined }}>
          <Search size={13} aria-hidden />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, e-mail ou telefone" aria-label="Buscar pedidos" />
          {busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={12} /></button>}
        </label>
        <select className="filtro" data-ativo={filtroPagamento !== 'todos' || undefined} value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)} aria-label="Pagamento">
          <option value="todos">Pagamento</option>
          {Object.entries(STATUS_PAGAMENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="filtro" data-ativo={filtroEntrega !== 'todos' || undefined} value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)} aria-label="Entrega">
          <option value="todos">Entrega</option>
          {Object.entries(STATUS_ENTREGA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {canal === 'b2c' && (
          <>
            <select className="filtro" data-ativo={filtroMetodo !== 'todos' || undefined} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} aria-label="Método de pagamento">
              <option value="todos">Método</option>
              {Object.entries(METODO_PAGAMENTO_LABEL).filter(([v]) => v !== 'desconhecido').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {afiliados.length > 0 && (
              <select className="filtro" data-ativo={filtroAfiliado !== 'todos' || undefined} value={filtroAfiliado} onChange={(e) => setFiltroAfiliado(e.target.value)} aria-label="Afiliado">
                <option value="todos">Afiliado</option>
                {afiliados.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
          </>
        )}
        {canal === 'b2b' && parceiros.length > 0 && (
          <select className="filtro" data-ativo={filtroParceiro !== 'todos' || undefined} value={filtroParceiro} onChange={(e) => setFiltroParceiro(e.target.value)} aria-label="Parceiro">
            <option value="todos">Parceiro</option>
            {parceiros.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        )}
        {filtrosExtras > 0 && <button type="button" className="link-limpar" onClick={limparFiltros}>Limpar filtros</button>}

        <span className="toolbar-espaco" />

        {visao === 'lista' && !isMobile && (
          <select className="filtro" value={groupBy} onChange={(e) => setGroupBy(e.target.value as AgrupamentoVendas)} aria-label="Agrupar por">
            <option value="status_entrega">Agrupar: entrega</option>
            <option value="canal">Agrupar: canal</option>
            <option value="periodo">Agrupar: dia</option>
            <option value="none">Sem agrupar</option>
          </select>
        )}
        <Segmentado rotulo="Visão" valor={visao} onChange={mudarVisao} opcoes={isMobile ? VISOES.map((v) => ({ id: v.id, label: '', icon: v.icon })) : VISOES} />
      </div>

      {/* Conteúdo */}
      <div>
        {visao === 'lista' && (
          <VendasTabelaPedidos
            vendas={vendasFiltradas}
            groupBy={isMobile ? 'status_entrega' : groupBy}
            showCanal={canal === 'todos'}
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

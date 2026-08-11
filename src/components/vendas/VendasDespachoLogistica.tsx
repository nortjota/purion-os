'use client'

import { useMemo, useState } from 'react'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useEstoque } from '@/hooks/useEstoque'
import { AlertTriangle, Package, Truck, CheckCircle2, RotateCcw } from 'lucide-react'
import { VendasTabelaPedidos } from './VendasTabelaPedidos'
import { ModalVendaB2C } from './ModalVendaB2C'
import { ModalVendaB2B } from './ModalVendaB2B'
import { ModalDetalheVenda } from './ModalDetalheVenda'

const TRANSPORTADORAS = ['Correios', 'Jadlog', 'Total Express', 'Sequoia', 'Shopee Logística', 'Outra']

export function VendasDespachoLogistica() {
  const { vendas, estoqueProduto, creators } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, atualizarVenda, deletarVenda } = useVendas()
  useEstoque()

  const [codigoRastreio, setCodigoRastreio] = useState<Record<string, string>>({})
  const [transportadora, setTransportadora] = useState<Record<string, string>>({})
  const [despachando, setDespachando] = useState<Record<string, boolean>>({})
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [erroLote, setErroLote] = useState<string | null>(null)
  const [processandoLote, setProcessandoLote] = useState(false)

  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [modalCanal, setModalCanal] = useState<'b2c' | 'b2b'>('b2c')
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)

  // Pedidos prontos para despachar: pagos e não postados
  const pendentes = useMemo(() => vendas.filter(
    (v) =>
      v.statusPagamento === 'pago' &&
      v.statusEntrega !== 'postado' &&
      v.statusEntrega !== 'entregue' &&
      v.statusEntrega !== 'devolvido',
  ), [vendas])

  // Todas as entregas ainda em andamento (inclui já postadas / em trânsito)
  const pendentesEntrega = useMemo(
    () => vendas
      .filter((v) => v.statusEntrega !== 'entregue' && v.statusEntrega !== 'devolvido')
      .sort((a, b) => a.dataVenda.localeCompare(b.dataVenda)),
    [vendas]
  )

  const estoqueAlerta = estoqueProduto && estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima
  const nomeAfiliado = (id: string | null) => id ? (creators.find((c) => c.id === id)?.nome ?? '—') : null

  async function despachar(id: string) {
    setDespachando((p) => ({ ...p, [id]: true }))
    const venda = vendas.find((v) => v.id === id)
    if (!venda) { setDespachando((p) => ({ ...p, [id]: false })); return }

    if (transportadora[id] || codigoRastreio[id]) {
      await atualizarVenda(id, {
        ...(transportadora[id] && { transportadora: transportadora[id] }),
        ...(codigoRastreio[id] && { codigoRastreio: codigoRastreio[id] }),
      })
    }
    await mudarStatusEntrega(id, 'postado')
    setDespachando((p) => ({ ...p, [id]: false }))
  }

  function toggleSel(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    setErroLote(null)
  }

  function toggleTodos() {
    setSelecionados((prev) => prev.size === pendentes.length ? new Set() : new Set(pendentes.map((v) => v.id)))
    setErroLote(null)
  }

  async function despacharLote() {
    if (selecionados.size === 0) return
    const itens = pendentes.filter((v) => selecionados.has(v.id))
    const totalNecessario = itens.reduce((s, v) => s + v.quantidade, 0)

    if (estoqueProduto && totalNecessario > estoqueProduto.quantidadeAtual) {
      setErroLote(`Estoque insuficiente: necessário ${totalNecessario} unidades, disponível ${estoqueProduto.quantidadeAtual}.`)
      return
    }

    setErroLote(null)
    setProcessandoLote(true)
    // Sequencial: cada despacho baixa o estoque lendo o saldo mais recente — paralelo causaria condição de corrida.
    for (const item of itens) {
      await despachar(item.id)
    }
    setSelecionados(new Set())
    setProcessandoLote(false)
  }

  function handleEditar(v: Venda) {
    setEditando(v)
    setModalCanal(v.canal)
    setModalEdicaoAberto(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Alerta de estoque baixo */}
      {estoqueAlerta && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 16px', color: '#EF4444',
        }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Estoque baixo: {estoqueProduto?.quantidadeAtual} unidades (mínimo: {estoqueProduto?.quantidadeMinima})
          </span>
        </div>
      )}

      {/* KPI de estoque */}
      {estoqueProduto && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="kpi-card" style={{ minWidth: 160 }}>
            <span className="caption">Em estoque</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: estoqueAlerta ? '#EF4444' : '#22C55E' }}>
              {estoqueProduto.quantidadeAtual}
            </span>
            <span className="caption">{estoqueProduto.produto}</span>
          </div>
          <div className="kpi-card" style={{ minWidth: 160 }}>
            <span className="caption">Aguardando despacho</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#C9A84C' }}>{pendentes.length}</span>
            <span className="caption">pedidos</span>
          </div>
          <div className="kpi-card" style={{ minWidth: 160 }}>
            <span className="caption">Custo unitário</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              R$ {estoqueProduto.custoUnitario.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>
            Pedidos para despacho ({pendentes.length})
          </h2>
          {pendentes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={selecionados.size === pendentes.length} onChange={toggleTodos} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Selecionar todos</span>
              </label>
              <button
                className="btn btn-primary btn-sm"
                disabled={selecionados.size === 0 || processandoLote}
                onClick={despacharLote}
              >
                <Truck size={12} /> {processandoLote ? 'Despachando…' : `Marcar postado (${selecionados.size})`}
              </button>
            </div>
          )}
        </div>

        {erroLote && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '8px 12px', color: '#EF4444', fontSize: 12,
          }}>
            <AlertTriangle size={14} /> {erroLote}
          </div>
        )}

        {pendentes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--text-secondary)', fontSize: 14,
            border: '1px dashed var(--border)', borderRadius: 12,
          }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            Nenhum pedido pendente de despacho
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendentes.map((v) => {
              const insuficiente = estoqueProduto ? v.quantidade > estoqueProduto.quantidadeAtual : false
              return (
                <div key={v.id} className="card-purion" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <input type="checkbox" checked={selecionados.has(v.id)} onChange={() => toggleSel(v.id)} />
                    </div>

                    {/* Info do pedido */}
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{v.clienteNome}</div>
                      <div className="caption" style={{ marginTop: 2 }}>
                        {v.quantidade}x {v.produto || 'PURION GT'} · R$ {(v.valorTotal ?? v.valorLiquido).toFixed(2)}
                      </div>
                      {v.endereco && (
                        <div className="caption" style={{ marginTop: 2 }}>
                          {v.endereco}, {v.numero} — {v.cidade}/{v.uf}
                        </div>
                      )}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 6, padding: '2px 8px', borderRadius: 99,
                        background: 'rgba(201,168,76,0.12)', color: '#C9A84C', fontSize: 11, fontWeight: 500,
                      }}>
                        <Package size={11} />
                        {v.statusEntrega === 'aguardando' ? 'Aguardando envio' : v.statusEntrega}
                      </div>
                      {insuficiente && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6,
                          marginTop: 6, padding: '2px 8px', borderRadius: 99,
                          background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontSize: 11, fontWeight: 500,
                        }}>
                          <AlertTriangle size={11} /> Estoque insuficiente
                        </div>
                      )}
                    </div>

                    {/* Campos de despacho */}
                    <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <select
                        className="input-purion"
                        value={transportadora[v.id] ?? v.transportadora ?? ''}
                        onChange={(e) => setTransportadora((p) => ({ ...p, [v.id]: e.target.value }))}
                        style={{ fontSize: 13 }}
                      >
                        <option value="">Transportadora (opcional)</option>
                        {TRANSPORTADORAS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        className="input-purion"
                        placeholder="Código de rastreio (opcional)"
                        value={codigoRastreio[v.id] ?? ''}
                        onChange={(e) => setCodigoRastreio((p) => ({ ...p, [v.id]: e.target.value }))}
                        style={{ fontSize: 13 }}
                      />
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <button
                        className="btn btn-primary"
                        disabled={despachando[v.id] || insuficiente}
                        onClick={() => despachar(v.id)}
                        title={insuficiente ? 'Estoque insuficiente para este pedido' : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                      >
                        <Truck size={14} />
                        {despachando[v.id] ? 'Enviando…' : 'Marcar Postado'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => mudarStatusEntrega(v.id, 'devolvido')}
                        title="Marcar devolvido"
                        style={{ padding: '6px 10px' }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Logística: todas as entregas em andamento */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          Entregas em andamento ({pendentesEntrega.length})
        </h2>
        <VendasTabelaPedidos
          vendas={pendentesEntrega}
          groupBy="status_entrega"
          showCanal
          nomeAfiliado={nomeAfiliado}
          onVerDetalhes={setDetalheAberto}
          onEditar={handleEditar}
          onExcluir={deletarVenda}
          onAvancarEntrega={mudarStatusEntrega}
          onMudarStatusPagamento={mudarStatusPagamento}
        />
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

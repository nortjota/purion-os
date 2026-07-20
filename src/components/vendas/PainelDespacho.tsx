'use client'

import { useState } from 'react'
import { usePurionStore } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useEstoque } from '@/hooks/useEstoque'
import { AlertTriangle, Package, Truck, CheckCircle2, RotateCcw } from 'lucide-react'

const TRANSPORTADORAS = ['Correios', 'Jadlog', 'Total Express', 'Sequoia', 'Shopee Logística', 'Outra']

export function PainelDespacho() {
  const { vendas, estoqueProduto } = usePurionStore()
  const { mudarStatusEntrega, atualizarVenda } = useVendas()
  useEstoque()

  const [codigoRastreio, setCodigoRastreio] = useState<Record<string, string>>({})
  const [transportadora, setTransportadora] = useState<Record<string, string>>({})
  const [despachando, setDespachando] = useState<Record<string, boolean>>({})

  // Pedidos prontos para despachar: pagos e não postados
  const pendentes = vendas.filter(
    (v) =>
      v.statusPagamento === 'pago' &&
      v.statusEntrega !== 'postado' &&
      v.statusEntrega !== 'entregue' &&
      v.statusEntrega !== 'devolvido',
  )

  const estoqueAlerta = estoqueProduto && estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima

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
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          Pedidos para despacho ({pendentes.length})
        </h2>

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
            {pendentes.map((v) => (
              <div key={v.id} className="card-purion" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
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
                      disabled={despachando[v.id]}
                      onClick={() => despachar(v.id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Trash2 } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda, PedidoExpedicao } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { useProducao } from '@/hooks/useProducao'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { VendasTabelaPedidos } from '@/components/vendas/VendasTabelaPedidos'
import { ModalDetalheVenda } from '@/components/vendas/ModalDetalheVenda'
import { ModalVendaB2C } from '@/components/vendas/ModalVendaB2C'
import { ModalVendaB2B } from '@/components/vendas/ModalVendaB2B'
import { formatarDataBR } from '@/lib/calculos'

const STATUS_PEDIDO_LABEL: Record<PedidoExpedicao['status'], string> = {
  aguardando: 'Aguardando', em_separacao: 'Separando', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
}
const STATUS_PEDIDO_BADGE: Record<PedidoExpedicao['status'], string> = {
  aguardando: 'badge-neutral', em_separacao: 'badge-warning', enviado: 'badge-info', entregue: 'badge-success', cancelado: 'badge-danger',
}

export function ProducaoExpedicaoView() {
  const { vendas, creators, pedidosExpedicao } = usePurionStore()
  const { mudarStatusEntrega, mudarStatusPagamento, deletarVenda } = useVendas()
  const { atualizarPedido, deletarPedido } = useProducao()
  const [detalheAberto, setDetalheAberto] = useState<Venda | null>(null)
  const [deletandoPedido, setDeletandoPedido] = useState<PedidoExpedicao | null>(null)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)
  const [modalCanal, setModalCanal] = useState<'b2c' | 'b2b'>('b2c')
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)

  function handleEditar(v: Venda) {
    setEditando(v)
    setModalCanal(v.canal)
    setModalEdicaoAberto(true)
  }

  const vendasAExpedir = useMemo(
    () => vendas
      .filter((v) => v.statusEntrega !== 'entregue' && v.statusEntrega !== 'devolvido')
      .sort((a, b) => a.dataVenda.localeCompare(b.dataVenda)),
    [vendas]
  )

  const nomeAfiliado = (id: string | null) => id ? (creators.find((c) => c.id === id)?.nome ?? '—') : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Vendas a expedir — referencia direta ao módulo de Vendas (mesma fonte de dados) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>
            Vendas a expedir ({vendasAExpedir.length})
          </p>
          <Link href="/vendas" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#C9A84C' }}>
            Despacho em lote (Vendas) <ArrowUpRight size={12} />
          </Link>
        </div>
        <VendasTabelaPedidos
          vendas={vendasAExpedir}
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

      {/* Pedidos avulsos (legado — não vinculados a uma venda) */}
      {pedidosExpedicao.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Pedidos avulsos ({pedidosExpedicao.length})
          </p>
          <div className="card-purion overflow-hidden">
            <table className="table-purion">
              <thead>
                <tr><th>Pedido</th><th>Destinatário</th><th>Data</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {pedidosExpedicao.map((p) => (
                  <tr key={p.id}>
                    <td className="td-mono" style={{ color: '#C9A84C' }}>{p.numeroPedido}</td>
                    <td>{p.destinatario}</td>
                    <td className="caption">{formatarDataBR(p.dataPedido.slice(0, 10))}</td>
                    <td>
                      <select
                        value={p.status}
                        onChange={(e) => atualizarPedido(p.id, { status: e.target.value as PedidoExpedicao['status'] })}
                        className={`text-[10px] font-bold rounded-full px-2 py-1 border-none outline-none cursor-pointer ${STATUS_PEDIDO_BADGE[p.status]}`}
                      >
                        {Object.entries(STATUS_PEDIDO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td>
                      <button onClick={() => setDeletandoPedido(p)} className="icon-btn"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detalheAberto && <ModalDetalheVenda venda={detalheAberto} onFechar={() => setDetalheAberto(null)} />}
      {modalEdicaoAberto && modalCanal === 'b2c' && (
        <ModalVendaB2C venda={editando} onFechar={() => setModalEdicaoAberto(false)} />
      )}
      {modalEdicaoAberto && modalCanal === 'b2b' && (
        <ModalVendaB2B venda={editando} onFechar={() => setModalEdicaoAberto(false)} />
      )}

      <ConfirmModal
        open={!!deletandoPedido}
        title="Excluir Pedido"
        message={`Deseja excluir o pedido "${deletandoPedido?.numeroPedido}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => { if (deletandoPedido) { deletarPedido(deletandoPedido.id); setDeletandoPedido(null) } }}
        onCancel={() => setDeletandoPedido(null)}
      />
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Info } from 'lucide-react'
import type { Venda } from '@/store'
import { useCatalogoSKU } from '@/hooks/useCatalogoSKU'
import { frascosDaVenda, codigoSkuDaVenda } from '@/lib/escadaProdutos'
import { clienteKey, orderId } from '@/lib/kpisPlaybook'
import { fmtR } from '@/lib/vendas-helpers'

const COR_SKU: Record<string, string> = {
  frasco_60ml: '#E0E0E0',
  kit_2: '#D4FC3C',
  kit_3: '#E6C374',
  discovery: '#4A90D9',
}

function Kpi({ label, valor, sub, tip }: { label: string; valor: string; sub?: string; tip: string }) {
  return (
    <div style={{ flex: '1 1 170px', minWidth: 0 }} title={tip}>
      <span style={{ fontSize: 12, color: '#B8B8B8', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label} <Info size={10} style={{ opacity: 0.6 }} />
      </span>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', lineHeight: 1.2 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: '#B8B8B8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/**
 * Métricas da escada de produtos: ticket médio, distribuição por SKU (PEDIDOS vs FRASCOS),
 * % de pedidos que são kit e conversão Discovery → frasco full size.
 * `vendas` = pedidos do período/canal filtrados; `todas` = histórico completo (para a conversão).
 */
export function EscadaMetricas({ vendas, todas }: { vendas: Venda[]; todas: Venda[] }) {
  const { skus } = useCatalogoSKU()

  const r = useMemo(() => {
    const pagas = vendas.filter((v) => v.statusPagamento === 'pago')
    const pedidos = new Set(pagas.map(orderId)).size
    const faturamento = pagas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const frascos = pagas.reduce((s, v) => s + frascosDaVenda(v), 0)

    const porSku = skus.map((s) => {
      const doSku = pagas.filter((v) => codigoSkuDaVenda(v) === s.codigo)
      return {
        codigo: s.codigo,
        nome: s.nome,
        tipo: s.tipo,
        pedidos: new Set(doSku.map(orderId)).size,
        frascos: doSku.reduce((acc, v) => acc + frascosDaVenda(v), 0),
        receita: doSku.reduce((acc, v) => acc + (v.valorTotal ?? v.valorLiquido), 0),
      }
    })
    const tipoPorCodigo = new Map(skus.map((s) => [s.codigo, s.tipo]))
    const pedidosKit = new Set(pagas.filter((v) => tipoPorCodigo.get(codigoSkuDaVenda(v)) === 'kit').map(orderId)).size

    // Conversão Discovery → full size: clientes que compraram Discovery e DEPOIS um frasco ou kit (histórico completo)
    const pagasHist = todas.filter((v) => v.statusPagamento === 'pago')
    const primeiraDiscovery = new Map<string, number>()
    for (const v of pagasHist) {
      if (codigoSkuDaVenda(v) !== 'discovery') continue
      const k = clienteKey(v), t = new Date(v.dataVenda).getTime()
      if (!primeiraDiscovery.has(k) || primeiraDiscovery.get(k)! > t) primeiraDiscovery.set(k, t)
    }
    const converteram = new Set<string>()
    for (const v of pagasHist) {
      if (codigoSkuDaVenda(v) === 'discovery') continue
      const k = clienteKey(v)
      const td = primeiraDiscovery.get(k)
      if (td != null && new Date(v.dataVenda).getTime() > td) converteram.add(k)
    }

    return {
      pedidos, faturamento, frascos, porSku, pedidosKit,
      ticketMedio: pedidos > 0 ? faturamento / pedidos : null,
      frascosPorPedido: pedidos > 0 ? frascos / pedidos : null,
      pctKit: pedidos > 0 ? pedidosKit / pedidos : null,
      discoveryClientes: primeiraDiscovery.size,
      discoveryConvertidos: converteram.size,
      conversaoDiscovery: primeiraDiscovery.size > 0 ? converteram.size / primeiraDiscovery.size : null,
    }
  }, [vendas, todas, skus])

  const maxPedidos = Math.max(1, ...r.porSku.map((s) => s.pedidos))

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--border)',
      borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Escada de produtos · AOV
        </span>
        <p style={{ fontSize: 12, color: '#B8B8B8', marginTop: 4 }}>
          <strong style={{ color: '#E0E0E0' }}>PEDIDOS</strong> = transações pagas · <strong style={{ color: '#E0E0E0' }}>FRASCOS</strong> = unidades que saem do estoque.
          Um Kit 3 = 1 pedido e 3 frascos.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Kpi label="Ticket médio (AOV)" valor={r.ticketMedio != null ? fmtR(r.ticketMedio) : '—'}
          sub={`${r.pedidos} pedidos pagos`} tip="Ticket médio = faturamento dos pedidos pagos ÷ nº de pedidos pagos (order_id único)." />
        <Kpi label="Frascos por pedido" valor={r.frascosPorPedido != null ? r.frascosPorPedido.toFixed(2).replace('.', ',') : '—'}
          sub={`${r.frascos} frascos em ${r.pedidos} pedidos`} tip="Frascos por pedido = Σ (quantidade × frascos do SKU) ÷ pedidos pagos." />
        <Kpi label="% de pedidos que são kit" valor={r.pctKit != null ? `${(r.pctKit * 100).toFixed(1).replace('.', ',')}%` : '—'}
          sub={`${r.pedidosKit} pedidos de Kit 2/Kit 3`} tip="Pedidos pagos com SKU do tipo kit ÷ pedidos pagos." />
        <Kpi label="Conversão Discovery → frasco"
          valor={r.conversaoDiscovery != null ? `${(r.conversaoDiscovery * 100).toFixed(1).replace('.', ',')}%` : '—'}
          sub={`${r.discoveryConvertidos} de ${r.discoveryClientes} clientes Discovery`}
          tip="Clientes que compraram o Discovery e depois compraram um frasco ou kit ÷ clientes que compraram o Discovery (histórico completo)." />
      </div>

      {/* Distribuição por SKU */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.4fr) 2fr 70px 70px', gap: 8, fontSize: 11, color: '#B8B8B8' }}>
          <span>SKU</span><span>Pedidos</span><span style={{ textAlign: 'right' }}>Frascos</span><span style={{ textAlign: 'right' }}>% pedidos</span>
        </div>
        {r.porSku.map((s) => {
          const pct = r.pedidos > 0 ? (s.pedidos / r.pedidos) * 100 : 0
          const cor = COR_SKU[s.codigo] ?? '#D4FC3C'
          return (
            <div key={s.codigo} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.4fr) 2fr 70px 70px', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${s.nome} · ${fmtR(s.receita)}`}>{s.nome}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.pedidos / maxPedidos) * 100}%`, height: '100%', background: cor, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', minWidth: 24, textAlign: 'right' }}>{s.pedidos}</span>
              </div>
              <span style={{ fontSize: 13, color: '#E0E0E0', textAlign: 'right' }}>{s.frascos}</span>
              <span style={{ fontSize: 13, color: '#E0E0E0', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

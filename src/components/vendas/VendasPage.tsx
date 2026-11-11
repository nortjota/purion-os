'use client'

import { useMemo, useState } from 'react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { usePurionStore } from '@/store'
import { aguardandoDespacho } from '@/hooks/useDespacho'
import { VendasPedidos } from './VendasPedidos'
import { VendasDespachoLogistica } from './VendasDespachoLogistica'
import { PainelMetricasVendas } from './PainelMetricasVendas'
import { CatalogoProdutos } from './CatalogoProdutos'

type TabId = 'pedidos' | 'despacho' | 'metricas' | 'produtos'

/**
 * Vendas em 4 abas (eram 6): "Todas", "B2C" e "B2B" viraram uma lista só, com o canal como filtro,
 * e a visão "Painel" saiu por repetir a aba Métricas.
 */
export function VendasPage() {
  const [aba, setAba] = useState<TabId>('pedidos')
  const { vendas } = usePurionStore()
  const naFila = useMemo(() => vendas.filter(aguardandoDespacho).length, [vendas])

  const tabs = [
    { id: 'pedidos',  label: 'Pedidos' },
    { id: 'despacho', label: 'Despacho', badge: naFila },
    { id: 'metricas', label: 'Métricas' },
    { id: 'produtos', label: 'Produtos & Kits' },
  ]

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 className="page-title">Vendas</h1>

      <InnerTabs tabs={tabs} activeTab={aba} onChange={(id) => setAba(id as TabId)} />

      {aba === 'pedidos' && <VendasPedidos />}
      {aba === 'despacho' && <VendasDespachoLogistica />}
      {aba === 'metricas' && <PainelMetricasVendas />}
      {aba === 'produtos' && <CatalogoProdutos />}
    </div>
  )
}

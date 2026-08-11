'use client'

import { useState } from 'react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { VendasTodasView } from './VendasTodasView'
import { VendasB2C } from './VendasB2C'
import { VendasB2B } from './VendasB2B'
import { VendasDespachoLogistica } from './VendasDespachoLogistica'
import { PainelMetricasVendas } from './PainelMetricasVendas'

type TabId = 'todas' | 'b2c' | 'b2b' | 'despacho' | 'metricas'

const TABS: { id: TabId; label: string }[] = [
  { id: 'todas',    label: 'Todas as Vendas'     },
  { id: 'b2c',      label: 'B2C'                 },
  { id: 'b2b',      label: 'B2B'                 },
  { id: 'despacho', label: 'Despacho & Logística' },
  { id: 'metricas', label: 'Métricas'            },
]

export function VendasPage() {
  const [aba, setAba] = useState<TabId>('todas')

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Vendas</h1>
        <p className="caption mt-1">Pipeline de pedidos B2C/B2B, despacho e métricas — estilo Asana</p>
      </div>

      <InnerTabs tabs={TABS} activeTab={aba} onChange={(id) => setAba(id as TabId)} />

      {aba === 'todas' && <VendasTodasView />}
      {aba === 'b2c' && <VendasB2C />}
      {aba === 'b2b' && <VendasB2B />}
      {aba === 'despacho' && <VendasDespachoLogistica />}
      {aba === 'metricas' && <PainelMetricasVendas />}
    </div>
  )
}

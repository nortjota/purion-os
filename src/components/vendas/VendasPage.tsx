'use client'

import { useState } from 'react'
import { VendasDashboard } from './VendasDashboard'
import { VendasB2C } from './VendasB2C'
import { VendasB2B } from './VendasB2B'
import { VendasLogistica } from './VendasLogistica'

type TabId = 'b2c' | 'b2b' | 'logistica' | 'appmax'

const TABS: { id: TabId; label: string }[] = [
  { id: 'b2c', label: 'B2C' },
  { id: 'b2b', label: 'B2B' },
  { id: 'logistica', label: 'Logística' },
  { id: 'appmax', label: 'Appmax (site)' },
]

export function VendasPage() {
  const [activeTab, setActiveTab] = useState<TabId>('b2c')

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Vendas</h1>
        <p className="caption mt-1">Registro manual B2C/B2B, logística de entrega e pedidos automáticos via Appmax</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
            style={activeTab === t.id
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
              : { color: 'var(--text-secondary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'b2c' && <VendasB2C />}
      {activeTab === 'b2b' && <VendasB2B />}
      {activeTab === 'logistica' && <VendasLogistica />}
      {activeTab === 'appmax' && <VendasDashboard />}
    </div>
  )
}

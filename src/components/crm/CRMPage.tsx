'use client'

import { useState } from 'react'
import { CRMDashboard } from './CRMDashboard'
import { FunilB2B } from './FunilB2B'
import { useCRM } from '@/hooks/useCRM'

type TabId = 'kanban' | 'funil'

export function CRMPage() {
  const [aba, setAba] = useState<TabId>('kanban')
  useCRM()

  if (aba === 'kanban') {
    return (
      <div>
        <div style={{ padding: '0 16px 0', maxWidth: 1600, margin: '0 auto' }}>
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit mb-[-8px]">
            <button
              onClick={() => setAba('kanban')}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
            >
              Kanban
            </button>
            <button
              onClick={() => setAba('funil')}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Funil & Placar
            </button>
          </div>
        </div>
        <CRMDashboard />
      </div>
    )
  }

  return (
    <div className="page-content section-gap">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="page-title">CRM B2B — Funil</h1>
          <p className="caption mt-1">Máquina de Vendas · Placar comercial · D+21 reposição · Ritual de sexta</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
          <button
            onClick={() => setAba('kanban')}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Kanban
          </button>
          <button
            onClick={() => setAba('funil')}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
          >
            Funil & Placar
          </button>
        </div>
      </div>
      <FunilB2B />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { CRMDashboard } from './CRMDashboard'
import { useCRM, toLead } from '@/hooks/useCRM'
import { useIsMaster } from '@/hooks/useIsMaster'
import { ArquivadosPanel } from '@/components/ui/ArquivadosPanel'
import type { Lead } from '@/store'

type TabId = 'pipeline' | 'arquivados'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'pipeline',   label: 'Pipeline' },
  { id: 'arquivados', label: 'Arquivados' },
]

function TabNav({ aba, onChange }: { aba: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-3 py-1.5 rounded-md text-xs font-medium"
          style={aba === t.id
            ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
            : { color: 'var(--text-secondary)' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function CRMPage() {
  const [aba, setAba] = useState<TabId>('pipeline')
  const { restaurarLead } = useCRM()
  const { isMaster } = useIsMaster()

  if (aba === 'arquivados') {
    return (
      <div className="page-content section-gap">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="page-title">CRM B2B — Arquivados</h1>
            <p className="caption mt-1">Leads arquivados · restaure ou exclua permanentemente</p>
          </div>
          <TabNav aba={aba} onChange={setAba} />
        </div>
        <ArquivadosPanel<Lead>
          table="leads_crm"
          mapRow={toLead}
          renderTitle={(l) => l.nomeEmpresa}
          renderSubtitle={(l) => `${l.cidade} · ${l.regiao} · Tier ${l.tier}`}
          onRestore={restaurarLead}
          isMaster={isMaster}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '0 16px 0', maxWidth: 1600, margin: '0 auto' }}>
        <div className="mb-[-8px]"><TabNav aba={aba} onChange={setAba} /></div>
      </div>
      <CRMDashboard />
    </div>
  )
}

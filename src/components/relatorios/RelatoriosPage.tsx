'use client'

import { useState } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { PERIODO_OPCOES, type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { RelatorioComercial } from './RelatorioComercial'
import { RelatorioFinanceiro } from './RelatorioFinanceiro'
import { RelatorioMarketing } from './RelatorioMarketing'
import { RelatorioOperacao } from './RelatorioOperacao'

type TabId = 'comercial' | 'financeiro' | 'marketing' | 'operacao'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'comercial',   label: 'Comercial' },
  { id: 'financeiro',  label: 'Financeiro' },
  { id: 'marketing',   label: 'Marketing' },
  { id: 'operacao',    label: 'Operação' },
]

export function RelatoriosPage() {
  const isMobile = useMobile()
  const [aba, setAba] = useState<TabId>('comercial')
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  return (
    <div className="page-content section-gap">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="caption mt-1">Painéis temáticos com dados reais, estilo Asana</p>
        </div>
        <div className="flex gap-0.5 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
          {PERIODO_OPCOES.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
              style={periodo === p.id ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isMobile ? (
        <select className="select-purion" style={{ width: '100%' }} value={aba} onChange={(e) => setAba(e.target.value as TabId)}>
          {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <InnerTabs tabs={TABS} activeTab={aba} onChange={(id) => setAba(id as TabId)} />
      )}

      <div>
        {aba === 'comercial' && <RelatorioComercial periodo={periodo} />}
        {aba === 'financeiro' && <RelatorioFinanceiro periodo={periodo} />}
        {aba === 'marketing' && <RelatorioMarketing periodo={periodo} />}
        {aba === 'operacao' && <RelatorioOperacao periodo={periodo} />}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { Segmentado } from '@/components/ui/Segmentado'

const PERIODOS: ReadonlyArray<{ id: Periodo; label: string }> = [
  { id: 'hoje', label: 'Hoje' }, { id: 'semana', label: '7 dias' }, { id: 'mes', label: '30 dias' }, { id: 'trimestre', label: '90 dias' },
]
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
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="toolbar">
        <h1 className="page-title" style={{ flex: '1 1 200px' }}>Relatórios</h1>
        <Segmentado rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={PERIODOS} />
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

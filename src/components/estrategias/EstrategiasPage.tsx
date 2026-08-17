'use client'

import { useState } from 'react'
import { GrowthPage } from '@/components/growth/GrowthPage'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { TabVisaoGeral } from './TabVisaoGeral'
import { TabB2B } from './TabB2B'
import { TabSocial } from './TabSocial'
import { TabCliente } from './TabCliente'
import { TabDecisoes } from './TabDecisoes'
import { TabMetas } from './metas/TabMetas'
import { PainelRMR } from './rmr/PainelRMR'
import { SecaoNotas } from './SecaoNotas'

type TabId = 'visao-geral' | 'metas' | 'rmr' | 'b2b' | 'social' | 'growth' | 'cliente' | 'decisoes'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'metas',       label: 'Metas' },
  { id: 'rmr',         label: 'RMR' },
  { id: 'b2b',         label: 'B2B' },
  { id: 'social',      label: 'Social' },
  { id: 'growth',      label: 'Growth' },
  { id: 'cliente',     label: 'Cliente / ICP' },
  { id: 'decisoes',    label: 'Decisões' },
]

export function EstrategiasPage() {
  const isMobile = useMobile()
  const [aba, setAba] = useState<TabId>('visao-geral')

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Estratégias</h1>
        <p className="caption mt-1">Centro de comando · direção, para quê, para quem e como executar</p>
      </div>

      {isMobile ? (
        <select className="select-purion" style={{ width: '100%' }} value={aba} onChange={(e) => setAba(e.target.value as TabId)}>
          {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <InnerTabs tabs={TABS} activeTab={aba} onChange={(id) => setAba(id as TabId)} />
      )}

      <div>
        {aba === 'visao-geral' && <TabVisaoGeral />}
        {aba === 'metas' && <TabMetas />}
        {aba === 'rmr' && <PainelRMR />}
        {aba === 'b2b' && <TabB2B />}
        {aba === 'social' && <TabSocial />}
        {aba === 'growth' && (
          <div className="flex flex-col gap-5">
            <GrowthPage embutido />
            <SecaoNotas secao="growth" />
          </div>
        )}
        {aba === 'cliente' && <TabCliente />}
        {aba === 'decisoes' && <TabDecisoes />}
      </div>
    </div>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { MarketingDashboard } from './MarketingDashboard'
import { TrafegoDashboard } from '@/components/trafego/TrafegoDashboard'
import { InteligenciaDashboard } from '@/components/inteligencia/InteligenciaDashboard'

const TABS = [
  { id: 'organico',     label: 'Orgânico & Creators' },
  { id: 'trafego',      label: 'Tráfego Pago' },
  { id: 'inteligencia', label: 'Inteligência' },
]

export function MarketingHub() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'organico'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InnerTabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => router.push(`/marketing?tab=${id}`)}
        className="px-4"
        style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'organico'     && <MarketingDashboard />}
        {tab === 'trafego'      && <TrafegoDashboard />}
        {tab === 'inteligencia' && <InteligenciaDashboard />}
      </div>
    </div>
  )
}

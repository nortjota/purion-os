'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { MarketingDashboard } from './MarketingDashboard'
import { TrafegoDashboard } from '@/components/trafego/TrafegoDashboard'
import { InteligenciaDashboard } from '@/components/inteligencia/InteligenciaDashboard'

const TABS = [
  { id: 'trafego',      label: 'Tráfego pago' },
  { id: 'organico',     label: 'Conteúdo & kits' },
  { id: 'inteligencia', label: 'Inteligência' },
]

export function MarketingHub() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'trafego'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InnerTabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => router.push(`/marketing?tab=${id}`)}
        className="px-2 md:px-[14px]"
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

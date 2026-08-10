'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { CreatorsDashboard } from './CreatorsDashboard'
import { DoacoesUGCPage } from '@/components/ugc/DoacoesUGCPage'

const TABS = [
  { id: 'influencers', label: 'Influencers' },
  { id: 'ugc',         label: 'Doações UGC' },
]

export function CreatorsHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'influencers'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InnerTabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => router.push(`/creators?tab=${id}`)}
        className="px-4"
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'influencers' && <CreatorsDashboard />}
        {tab === 'ugc'         && <DoacoesUGCPage />}
      </div>
    </div>
  )
}

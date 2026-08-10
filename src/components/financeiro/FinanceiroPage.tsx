'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { FinanceiroDashboard } from './FinanceiroDashboard'
import { FinanceiroDRE } from './FinanceiroDRE'
import ContabilidadeDashboard from '@/components/contabilidade/ContabilidadeDashboard'

const TABS = [
  { id: 'painel',        label: 'Painel' },
  { id: 'dre',          label: 'DRE' },
  { id: 'contabilidade', label: 'Contabilidade' },
]

function FinanceiroPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'painel'

  return (
    <div className="flex flex-col h-full">
      <InnerTabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => router.push(`/financeiro?tab=${id}`)}
        className="px-4"
      />
      <div className="flex-1 overflow-y-auto">
        {tab === 'painel'        && <FinanceiroDashboard />}
        {tab === 'dre'           && <FinanceiroDRE />}
        {tab === 'contabilidade' && <ContabilidadeDashboard />}
      </div>
    </div>
  )
}

export function FinanceiroPage() {
  return (
    <Suspense>
      <FinanceiroPageInner />
    </Suspense>
  )
}

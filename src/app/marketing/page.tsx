import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketingHub } from '@/components/marketing/MarketingHub'

export const metadata: Metadata = { title: 'Marketing — Purion OS' }

export default function MarketingPage() {
  return (
    <Suspense>
      <MarketingHub />
    </Suspense>
  )
}

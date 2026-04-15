import type { Metadata } from 'next'
import { MarketingDashboard } from '@/components/marketing/MarketingDashboard'

export const metadata: Metadata = { title: 'Marketing & Creators' }

export default function MarketingPage() {
  return <MarketingDashboard />
}

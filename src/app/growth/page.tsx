import type { Metadata } from 'next'
import { GrowthPage } from '@/components/growth/GrowthPage'

export const metadata: Metadata = { title: 'Growth — Purion OS' }

export default function Growth() {
  return <GrowthPage />
}

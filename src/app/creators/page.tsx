import type { Metadata } from 'next'
import { CreatorsDashboard } from '@/components/creators/CreatorsDashboard'

export const metadata: Metadata = { title: 'Hub de Creators — PURION OS' }

export default function CreatorsPage() {
  return <CreatorsDashboard />
}

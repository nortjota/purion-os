import type { Metadata } from 'next'
import { CreatorsDashboard } from '@/components/creators/CreatorsDashboard'

export const metadata: Metadata = { title: 'Creators' }

export default function CreatorsPage() {
  return <CreatorsDashboard />
}

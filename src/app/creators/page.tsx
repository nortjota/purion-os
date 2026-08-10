import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CreatorsHub } from '@/components/creators/CreatorsHub'

export const metadata: Metadata = { title: 'Creators — Purion OS' }

export default function CreatorsPage() {
  return (
    <Suspense>
      <CreatorsHub />
    </Suspense>
  )
}

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TikTokHub } from '@/components/tiktok/TikTokHub'

export const metadata: Metadata = { title: 'TikTok' }

export default function TikTokPage() {
  return (
    <Suspense>
      <TikTokHub />
    </Suspense>
  )
}

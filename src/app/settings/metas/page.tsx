import type { Metadata } from 'next'
import { MetasSettings } from '@/components/settings/MetasSettings'

export const metadata: Metadata = { title: 'Metas' }

export default function Page() {
  return <MetasSettings />
}

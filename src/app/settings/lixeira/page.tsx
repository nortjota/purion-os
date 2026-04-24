import type { Metadata } from 'next'
import { LixeiraSettings } from '@/components/settings/LixeiraSettings'

export const metadata: Metadata = { title: 'Lixeira' }

export default function Page() {
  return <LixeiraSettings />
}

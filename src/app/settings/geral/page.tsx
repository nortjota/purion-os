import type { Metadata } from 'next'
import { GeralSettings } from '@/components/settings/GeralSettings'

export const metadata: Metadata = { title: 'Configurações Gerais' }

export default function Page() {
  return <GeralSettings />
}

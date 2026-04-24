import type { Metadata } from 'next'
import { ProducaoSettings } from '@/components/settings/ProducaoSettings'

export const metadata: Metadata = { title: 'Produção' }

export default function Page() {
  return <ProducaoSettings />
}

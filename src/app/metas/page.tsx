import type { Metadata } from 'next'
import { MetasDashboard } from '@/components/metas/MetasDashboard'

export const metadata: Metadata = { title: 'Metas Diárias' }

export default function MetasPage() {
  return <MetasDashboard />
}

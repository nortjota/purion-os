import type { Metadata } from 'next'
import { ReunioesDashboard } from '@/components/reunioes/ReunioesDashboard'

export const metadata: Metadata = { title: 'Reuniões & Decisões' }

export default function ReunioesPage() {
  return <ReunioesDashboard />
}

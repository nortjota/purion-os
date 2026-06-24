import type { Metadata } from 'next'
import { VendasDashboard } from '@/components/vendas/VendasDashboard'

export const metadata: Metadata = { title: 'Vendas' }

export default function VendasPage() {
  return <VendasDashboard />
}

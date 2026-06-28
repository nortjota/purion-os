import type { Metadata } from 'next'
import { VendasPage } from '@/components/vendas/VendasPage'

export const metadata: Metadata = { title: 'Vendas' }

export default function Page() {
  return <VendasPage />
}

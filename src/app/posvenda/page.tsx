import type { Metadata } from 'next'
import { PosVendaPage } from '@/components/posvenda/PosVendaPage'

export const metadata: Metadata = { title: 'Pós-venda' }

export default function Page() {
  return <PosVendaPage />
}

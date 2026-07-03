import type { Metadata } from 'next'
import { FinanceiroPage } from '@/components/financeiro/FinanceiroPage'

export const metadata: Metadata = { title: 'Financeiro' }

export default function Page() {
  return <FinanceiroPage />
}

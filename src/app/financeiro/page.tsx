import type { Metadata } from 'next'
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard'

export const metadata: Metadata = { title: 'Financeiro' }

export default function FinanceiroPage() {
  return <FinanceiroDashboard />
}

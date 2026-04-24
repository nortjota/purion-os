import type { Metadata } from 'next'
import { FinanceiroSettings } from '@/components/settings/FinanceiroSettings'

export const metadata: Metadata = { title: 'Configurações Financeiras' }

export default function Page() {
  return <FinanceiroSettings />
}

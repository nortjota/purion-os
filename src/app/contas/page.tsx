import type { Metadata } from 'next'
import { ContasDashboard } from '@/components/contas/ContasDashboard'

export const metadata: Metadata = { title: 'Contas & Acessos' }

export default function ContasPage() {
  return <ContasDashboard />
}

import type { Metadata } from 'next'
import ContabilidadeDashboard from '@/components/contabilidade/ContabilidadeDashboard'

export const metadata: Metadata = {
  title: 'Contabilidade — PURION OS',
}

export default function ContabilidadePage() {
  return <ContabilidadeDashboard />
}

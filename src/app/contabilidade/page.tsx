import type { Metadata } from 'next'
import ContabilidadeDashboard from '@/components/contabilidade/ContabilidadeDashboard'

export const metadata: Metadata = {
  title: 'Contabilidade',
}

export default function ContabilidadePage() {
  return <ContabilidadeDashboard />
}

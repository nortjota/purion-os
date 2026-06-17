import type { Metadata } from 'next'
import { AfiliadosDashboard } from '@/components/afiliados/AfiliadosDashboard'

export const metadata: Metadata = { title: 'Afiliados' }

export default function Page() {
  return <AfiliadosDashboard />
}

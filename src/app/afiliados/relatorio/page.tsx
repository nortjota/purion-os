import type { Metadata } from 'next'
import { AfiliadoRelatorio } from '@/components/afiliados/AfiliadoRelatorio'

export const metadata: Metadata = { title: 'Relatório de Afiliados' }

export default function Page() {
  return <AfiliadoRelatorio />
}

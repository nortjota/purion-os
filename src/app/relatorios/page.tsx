import type { Metadata } from 'next'
import { RelatoriosPage } from '@/components/relatorios/RelatoriosPage'

export const metadata: Metadata = { title: 'Relatórios' }

export default function Page() {
  return <RelatoriosPage />
}

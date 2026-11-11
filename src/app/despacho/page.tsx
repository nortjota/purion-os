import type { Metadata } from 'next'
import { DespachoPage } from '@/components/despacho/DespachoPage'

export const metadata: Metadata = { title: 'Fila de Despacho' }

export default function Page() {
  return <DespachoPage />
}

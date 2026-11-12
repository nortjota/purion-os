import type { Metadata } from 'next'
import { ClientesPage } from '@/components/clientes/ClientesPage'

export const metadata: Metadata = { title: 'Clientes' }

export default function Page() {
  return <ClientesPage />
}

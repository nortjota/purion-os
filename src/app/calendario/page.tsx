import type { Metadata } from 'next'
import { CalendarioPage } from '@/components/calendario/CalendarioPage'

export const metadata: Metadata = { title: 'Calendário — Purion OS' }

export default function Calendario() {
  return <CalendarioPage />
}

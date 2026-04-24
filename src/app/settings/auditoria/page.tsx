import type { Metadata } from 'next'
import { AuditoriaSettings } from '@/components/settings/AuditoriaSettings'

export const metadata: Metadata = { title: 'Auditoria' }

export default function Page() {
  return <AuditoriaSettings />
}

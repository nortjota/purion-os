import type { Metadata } from 'next'
import { AlertasSettings } from '@/components/settings/AlertasSettings'

export const metadata: Metadata = { title: 'Alertas' }

export default function Page() {
  return <AlertasSettings />
}

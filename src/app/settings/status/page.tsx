import type { Metadata } from 'next'
import { StatusPage } from '@/components/settings/StatusPage'

export const metadata: Metadata = { title: 'Status do Sistema' }

export default function SettingsStatusPage() {
  return <StatusPage />
}

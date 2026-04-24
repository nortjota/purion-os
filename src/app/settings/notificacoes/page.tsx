import type { Metadata } from 'next'
import { NotificacoesSettings } from '@/components/settings/NotificacoesSettings'

export const metadata: Metadata = { title: 'Notificações' }

export default function Page() {
  return <NotificacoesSettings />
}

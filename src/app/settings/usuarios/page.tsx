import type { Metadata } from 'next'
import { UsuariosSettings } from '@/components/settings/UsuariosSettings'

export const metadata: Metadata = { title: 'Usuários' }

export default function Page() {
  return <UsuariosSettings />
}

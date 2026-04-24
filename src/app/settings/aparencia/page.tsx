import type { Metadata } from 'next'
import { AparenciaSettings } from '@/components/settings/AparenciaSettings'

export const metadata: Metadata = { title: 'Aparência' }

export default function Page() {
  return <AparenciaSettings />
}

import type { Metadata } from 'next'
import { DadosSettings } from '@/components/settings/DadosSettings'

export const metadata: Metadata = { title: 'Dados' }

export default function Page() {
  return <DadosSettings />
}

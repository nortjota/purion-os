import type { Metadata } from 'next'
import { MeuTrabalhoPage } from '@/components/meu-trabalho/MeuTrabalhoPage'

export const metadata: Metadata = { title: 'Meu trabalho' }

export default function Page() {
  return <MeuTrabalhoPage />
}

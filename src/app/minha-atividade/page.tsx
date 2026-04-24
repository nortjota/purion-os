import type { Metadata } from 'next'
import { AtividadePage } from '@/components/minha-atividade/AtividadePage'

export const metadata: Metadata = { title: 'Minha Atividade' }

export default function MinhaAtividadePage() {
  return <AtividadePage />
}

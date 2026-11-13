import type { Metadata } from 'next'
import { ConhecimentoHub } from '@/components/conhecimento/ConhecimentoHub'

export const metadata: Metadata = { title: 'Central de Conhecimento' }

export default function ConhecimentoPage() {
  return <ConhecimentoHub />
}

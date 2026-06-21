import type { Metadata } from 'next'
import { ConhecimentoDashboard } from '@/components/conhecimento/ConhecimentoDashboard'

export const metadata: Metadata = { title: 'Central de Conhecimento' }

export default function ConhecimentoPage() {
  return <ConhecimentoDashboard />
}

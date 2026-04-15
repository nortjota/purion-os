import type { Metadata } from 'next'
import { InteligenciaDashboard } from '@/components/inteligencia/InteligenciaDashboard'

export const metadata: Metadata = { title: 'Inteligência Comercial' }

export default function InteligenciaPage() {
  return <InteligenciaDashboard />
}

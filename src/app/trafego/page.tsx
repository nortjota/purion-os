import type { Metadata } from 'next'
import { TrafegoDashboard } from '@/components/trafego/TrafegoDashboard'

export const metadata: Metadata = { title: 'Tráfego Pago' }

export default function TrafegoPage() {
  return <TrafegoDashboard />
}

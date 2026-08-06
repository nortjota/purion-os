import type { Metadata } from 'next'
import { EstrategiasPage } from '@/components/estrategias/EstrategiasPage'

export const metadata: Metadata = { title: 'Estratégias — Purion OS' }

export default function Estrategias() {
  return <EstrategiasPage />
}

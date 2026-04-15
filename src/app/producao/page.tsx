import type { Metadata } from 'next'
import { ProducaoDashboard } from '@/components/producao/ProducaoDashboard'

export const metadata: Metadata = { title: 'Produção & Estoque' }

export default function ProducaoPage() {
  return <ProducaoDashboard />
}

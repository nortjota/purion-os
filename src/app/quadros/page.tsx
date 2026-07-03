import type { Metadata } from 'next'
import { QuadrosPage } from '@/components/quadros/QuadrosPage'

export const metadata: Metadata = { title: 'Quadros — PURION OS' }

export default function Page() {
  return <QuadrosPage />
}

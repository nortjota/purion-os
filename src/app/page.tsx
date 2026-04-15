import type { Metadata } from 'next'
import { CommandCenter } from '@/components/dashboard/CommandCenter'

export const metadata: Metadata = { title: 'Início' }

export default function HomePage() {
  return <CommandCenter />
}

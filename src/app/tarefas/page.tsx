import type { Metadata } from 'next'
import { TarefasDashboard } from '@/components/tarefas/TarefasDashboard'

export const metadata: Metadata = { title: 'Tarefas' }

export default function TarefasPage() {
  return <TarefasDashboard />
}

import type { Metadata } from 'next'
import { CanvasEditor } from '@/components/quadros/CanvasEditor'

export const metadata: Metadata = { title: 'Editor — PURION OS' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <CanvasEditor quadroId={id} />
}

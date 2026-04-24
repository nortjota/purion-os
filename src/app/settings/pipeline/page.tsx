import type { Metadata } from 'next'
import { PipelineSettings } from '@/components/settings/PipelineSettings'

export const metadata: Metadata = { title: 'Pipeline CRM' }

export default function Page() {
  return <PipelineSettings />
}

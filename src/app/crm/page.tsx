import type { Metadata } from 'next'
import { CRMPage } from '@/components/crm/CRMPage'

export const metadata: Metadata = { title: 'CRM B2B' }

export default function CRMRoutePage() {
  return <CRMPage />
}

import type { Metadata } from 'next'
import { CRMDashboard } from '@/components/crm/CRMDashboard'

export const metadata: Metadata = { title: 'CRM B2B' }

export default function CRMPage() {
  return <CRMDashboard />
}

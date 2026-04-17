import type { Metadata } from 'next'
import EmpresaDashboard from '@/components/settings/EmpresaDashboard'

export const metadata: Metadata = {
  title: 'Empresa — Configurações',
}

export default function EmpresaPage() {
  return <EmpresaDashboard />
}

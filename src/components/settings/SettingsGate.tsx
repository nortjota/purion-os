'use client'

import { SettingsNav } from './SettingsNav'
import { useIsMaster } from '@/hooks/useIsMaster'
import { AcessoRestrito } from '@/components/auth/AcessoRestrito'

export function SettingsGate({ children }: { children: React.ReactNode }) {
  const { isMaster, loading } = useIsMaster()

  if (loading) return null

  if (!isMaster) return <AcessoRestrito />

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <SettingsNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

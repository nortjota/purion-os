'use client'

/**
 * PURION OS — AppShell
 * Wrapper client-side que integra Sidebar + conteúdo principal.
 * Necessário pois usePurionStore é um hook de cliente.
 */

import { usePurionStore } from '@/store'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarRecolhida } = usePurionStore()
  const marginLeft = sidebarRecolhida ? 'ml-[64px]' : 'ml-[260px]'

  return (
    <>
      <Sidebar />
      <main
        className={`
          ${marginLeft} min-h-screen
          bg-[var(--bg-primary)]
          transition-all duration-300 ease-in-out
        `}
      >
        {children}
      </main>
    </>
  )
}

'use client'

import { usePurionStore } from '@/store'
import { Sidebar } from './Sidebar'
import { ContentHeader } from './ContentHeader'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarRecolhida } = usePurionStore()
  const marginLeft = sidebarRecolhida ? 'ml-16' : 'ml-60'

  return (
    <>
      <Sidebar />
      <div
        className={`
          ${marginLeft} min-h-screen flex flex-col
          bg-[var(--bg-primary)]
          transition-all duration-300 ease-in-out
        `}
      >
        <ContentHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  )
}

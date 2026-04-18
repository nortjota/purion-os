'use client'

import { Sidebar } from './Sidebar'
import { ContentHeader } from './ContentHeader'
import { PageTransition } from './PageTransition'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div
        style={{ marginLeft: 224, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
        className="bg-[var(--bg-primary)]"
      >
        <ContentHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </>
  )
}

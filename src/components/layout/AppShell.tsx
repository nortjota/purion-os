'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { ContentHeader } from './ContentHeader'
import { PageTransition } from './PageTransition'
import { MobileNav } from './MobileNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts'
import { QuickNotes } from '@/components/ui/QuickNotes'
import { TrialBanner } from '@/components/billing/TrialBanner'
import { usePurionStore } from '@/store'
import { X } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { focusMode, setFocusMode } = usePurionStore()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Listen for open palette event
  useEffect(() => {
    const handleOpen = () => setPaletteOpen(true)
    window.addEventListener('purion:open-palette', handleOpen)
    return () => window.removeEventListener('purion:open-palette', handleOpen)
  }, [])

  // Escape to exit focus mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && focusMode) setFocusMode(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode, setFocusMode])

  if (focusMode) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'var(--bg-primary)', overflow: 'auto', padding: 24,
      }}>
        <button
          onClick={() => setFocusMode(false)}
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 101,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
          }}
        >
          <X size={13} />
          Sair do foco
        </button>
        {children}
      </div>
    )
  }

  return (
    <>
      {/* Sidebar — self-manages mobile visibility via slide-in drawer */}
      <Sidebar />

      {/* Main content area — margin-left driven by CSS var --purion-sidebar-w */}
      <div
        className="bg-[var(--bg-primary)] pb-20 md:pb-0 purion-main-area"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <ContentHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom nav — hidden on md+ */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Global overlays — always mounted */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyboardShortcuts />
      <QuickNotes />
      <TrialBanner />
    </>
  )
}

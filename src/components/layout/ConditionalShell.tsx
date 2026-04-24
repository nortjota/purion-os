'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from './AppShell'

// Paths that render without the sidebar/header shell
const NO_SHELL_PREFIXES = ['/login', '/signup', '/reset-password', '/invite/', '/landing', '/portal/']

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const noShell = NO_SHELL_PREFIXES.some((p) => pathname.startsWith(p))

  if (noShell) return <>{children}</>
  return <AppShell>{children}</AppShell>
}

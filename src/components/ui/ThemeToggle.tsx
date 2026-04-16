'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita hydration mismatch — só renderiza após montar no cliente
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className="
        fixed top-4 right-4 z-50
        w-9 h-9 rounded-xl
        flex items-center justify-center
        border transition-all duration-200
        bg-[var(--bg-surface)] border-[var(--border)]
        text-[var(--text-primary)]
        hover:border-[#C9A84C] hover:text-[#C9A84C]
        shadow-sm
      "
    >
      {isDark
        ? <Sun size={16} />
        : <Moon size={16} />
      }
    </button>
  )
}

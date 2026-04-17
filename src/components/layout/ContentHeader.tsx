'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'

const MODULE_NAMES: Record<string, string> = {
  '/':                 'Command Center',
  '/crm':              'CRM B2B',
  '/tarefas':          'Tarefas',
  '/financeiro':       'Financeiro',
  '/producao':         'Produção',
  '/marketing':        'Marketing',
  '/creators':         'Creators',
  '/inteligencia':     'Inteligência',
  '/reunioes':         'Reuniões',
  '/trafego':          'Tráfego',
  '/contabilidade':    'Contabilidade',
  '/settings':         'Configurações',
  '/settings/empresa': 'Empresa',
}

const PERFIL_INICIAIS: Record<string, string> = {
  matheus: 'M',
  gabriel: 'G',
  joao:    'J',
}

export function ContentHeader() {
  const pathname  = usePathname()
  const { theme, setTheme } = useTheme()
  const { perfilAtivo } = usePurionStore()
  const { user, perfil } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Prefix match for nested routes
  const moduleName = Object.entries(MODULE_NAMES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => key === '/' ? pathname === '/' : pathname.startsWith(key))?.[1] ?? ''

  const isDark = theme === 'dark'

  // Avatar initial: real auth user first, fallback to demo store profile
  const inicial = perfil?.nome?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? PERFIL_INICIAIS[perfilAtivo]
    ?? 'U'

  return (
    <header className="
      h-14 flex items-center justify-between px-8
      border-b border-[var(--border)]
      bg-[var(--bg-primary)]
      sticky top-0 z-40
    ">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
        <span>PURION OS</span>
        {moduleName && (
          <>
            <span className="opacity-30 select-none">/</span>
            <span className="text-[var(--text-primary)]">{moduleName}</span>
          </>
        )}
      </div>

      {/* Ações direita */}
      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="icon-btn"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        )}

        <div className="w-8 h-8 rounded-full shrink-0 select-none bg-[#C9A84C] text-[#0D0D0D] flex items-center justify-center text-[11px] font-semibold">
          {inicial}
        </div>
      </div>
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, ChevronRight, Bell } from 'lucide-react'
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

  const moduleName = Object.entries(MODULE_NAMES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => key === '/' ? pathname === '/' : pathname.startsWith(key))?.[1] ?? ''

  const isDark = theme === 'dark'

  const inicial = perfil?.nome?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? PERFIL_INICIAIS[perfilAtivo]
    ?? 'U'

  const displayName = perfil?.nome ?? user?.email?.split('@')[0] ?? 'Usuário'

  return (
    <header style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-primary)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>PURION OS</span>
        {moduleName && (
          <>
            <ChevronRight size={12} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{moduleName}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="icon-btn"
            style={{ width: 32, height: 32 }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {/* Notifications */}
        <button
          title="Notificações"
          className="icon-btn"
          style={{ width: 32, height: 32, position: 'relative' }}
        >
          <Bell size={15} />
        </button>

        {/* Avatar */}
        <div
          title={displayName}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: '#C9A84C', color: '#0D0D0D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, userSelect: 'none', cursor: 'default',
          }}
        >
          {inicial}
        </div>
      </div>
    </header>
  )
}

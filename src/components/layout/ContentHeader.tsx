'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { usePurionStore } from '@/store'

const MODULE_NAMES: Record<string, string> = {
  '/':             'Command Center',
  '/crm':          'CRM B2B',
  '/tarefas':      'Tarefas',
  '/financeiro':   'Financeiro',
  '/producao':     'Produção',
  '/marketing':    'Marketing',
  '/creators':     'Creators',
  '/inteligencia': 'Inteligência',
  '/reunioes':     'Reuniões',
  '/trafego':       'Tráfego',
  '/contabilidade': 'Contabilidade',
  '/settings':      'Configurações',
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const moduleName = MODULE_NAMES[pathname] ?? ''
  const isDark     = theme === 'dark'

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

        {/* Avatar do usuário ativo */}
        <div className="
          w-8 h-8 rounded-full shrink-0 select-none
          bg-[#C9A84C] text-[#0D0D0D]
          flex items-center justify-center
          text-[11px] font-semibold
        ">
          {PERFIL_INICIAIS[perfilAtivo] ?? 'M'}
        </div>
      </div>
    </header>
  )
}

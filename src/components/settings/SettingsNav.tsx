'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sliders, DollarSign, Target, Bell, GitBranch, Package,
  Users, Palette, BellRing, Database, Trash2, FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: Sliders,    label: 'Configurações', href: '/settings/geral' },
  { icon: DollarSign, label: 'Financeiro',    href: '/settings/financeiro' },
  { icon: Target,     label: 'Metas',         href: '/settings/metas' },
  { icon: Bell,       label: 'Alertas',       href: '/settings/alertas' },
  { icon: GitBranch,  label: 'Pipeline CRM',  href: '/settings/pipeline' },
  { icon: Package,    label: 'Produção',      href: '/settings/producao' },
  { icon: Users,      label: 'Usuários',      href: '/settings/usuarios' },
  { icon: Palette,    label: 'Aparência',     href: '/settings/aparencia' },
  { icon: BellRing,   label: 'Notificações',  href: '/settings/notificacoes' },
  { icon: Database,   label: 'Dados',         href: '/settings/dados' },
  { icon: Trash2,     label: 'Lixeira',       href: '/settings/lixeira' },
  { icon: FileText,   label: 'Auditoria',     href: '/settings/auditoria' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex w-[220px] shrink-0 border-r border-[var(--border)] flex-col gap-0.5 p-3 min-h-screen">
        <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider px-3 mb-2">
          Configurações
        </p>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border-l-2 border-[#C9A84C]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile nav */}
      <nav className="flex md:hidden overflow-x-auto gap-1 p-3 border-b border-[var(--border)] scrollbar-hide">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[#C9A84C]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

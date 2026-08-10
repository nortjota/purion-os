'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  MoreHorizontal, Package, Users2, BookOpen,
  Zap, BarChart2, Settings, Calendar, Megaphone, X, Link2, Headphones, KeyRound, ShoppingBag, Target, Shapes,
  Compass, FlaskConical, Mail, CalendarDays,
} from 'lucide-react'
import { useIsMaster } from '@/hooks/useIsMaster'

const MAIN_ITEMS = [
  { href: '/',            label: 'Início',     icon: LayoutDashboard },
  { href: '/estrategias', label: 'Estratégias', icon: Compass        },
  { href: '/vendas',      label: 'Vendas',      icon: ShoppingBag    },
  { href: '/tarefas',     label: 'Tarefas',     icon: CheckSquare    },
  { href: '/metas',       label: 'Metas',       icon: Target         },
]

type DrawerGroup = {
  label: string
  items: { href: string; label: string; icon: React.ComponentType<{ size?: number }> ; masterOnly?: boolean }[]
}

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    label: 'COMERCIAL',
    items: [
      { href: '/crm',        label: 'CRM B2B',      icon: Users  },
      { href: '/leads-site', label: 'Leads do Site', icon: Mail  },
    ],
  },
  {
    label: 'OPERAÇÃO',
    items: [
      { href: '/calendario', label: 'Calendário', icon: CalendarDays },
      { href: '/quadros',  label: 'Quadros',   icon: Shapes   },
      { href: '/producao', label: 'Produção',  icon: Package  },
      { href: '/reunioes', label: 'Reuniões',  icon: Calendar },
      { href: '/sac',      label: 'SAC',       icon: Headphones },
    ],
  },
  {
    label: 'CRESCIMENTO',
    items: [
      { href: '/marketing', label: 'Marketing', icon: Megaphone   },
      { href: '/creators',  label: 'Creators',  icon: Users2      },
      { href: '/growth',    label: 'Growth',    icon: FlaskConical },
      { href: '/afiliados', label: 'Afiliados', icon: Link2       },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { href: '/financeiro',   label: 'Financeiro',       icon: TrendingUp },
      { href: '/conhecimento', label: 'Conhecimento',      icon: BookOpen  },
      { href: '/contas',       label: 'Contas & Acessos',  icon: KeyRound,  masterOnly: true },
      { href: '/settings',     label: 'Configurações',     icon: Settings,  masterOnly: true },
    ],
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isMaster } = useIsMaster()

  const visibleGroups = DRAWER_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => isMaster || !i.masterOnly),
  })).filter((g) => g.items.length > 0)

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const isDrawerActive = visibleGroups.some((g) => g.items.some((i) => isActive(i.href)))

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 60, zIndex: 100,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {MAIN_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, minWidth: 44, minHeight: 44, justifyContent: 'center',
                color: active ? '#C9A84C' : 'var(--text-secondary)',
                textDecoration: 'none', flex: 1,
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
            </Link>
          )
        })}

        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, minWidth: 44, minHeight: 44, justifyContent: 'center',
            color: isDrawerActive ? '#C9A84C' : 'var(--text-secondary)',
            background: 'none', border: 'none', cursor: 'pointer', flex: 1,
          }}
        >
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>Menu</span>
        </button>
      </nav>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                zIndex: 150,
              }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '75vh',
                background: 'var(--bg-surface)',
                borderRadius: '16px 16px 0 0',
                border: '1px solid var(--border)',
                borderBottom: 'none',
                zIndex: 151,
                paddingBottom: 'env(safe-area-inset-bottom)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
                <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 20px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(184,184,184,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Todos os módulos
                </span>
                <button
                  onClick={closeDrawer}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Grouped items */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {visibleGroups.map((group) => (
                  <div key={group.label}>
                    <p style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'rgba(184,184,184,0.45)',
                      padding: '12px 20px 4px', margin: 0, userSelect: 'none',
                    }}>
                      {group.label}
                    </p>
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={closeDrawer}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            height: 48, padding: '0 20px',
                            color: active ? '#C9A84C' : '#B8B8B8',
                            background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
                            textDecoration: 'none',
                            fontSize: 14, fontWeight: active ? 500 : 400,
                          }}
                        >
                          <Icon size={17} />
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

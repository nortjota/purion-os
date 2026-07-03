'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  MoreHorizontal, Package, Users2, BookOpen,
  Zap, BarChart2, Settings, Calendar, Megaphone, X, Link2, Headphones, KeyRound, ShoppingBag, Target, Shapes,
} from 'lucide-react'
import { useIsMaster } from '@/hooks/useIsMaster'

const MAIN_ITEMS = [
  { href: '/',          label: 'Início',    icon: LayoutDashboard },
  { href: '/crm',       label: 'CRM',       icon: Users           },
  { href: '/tarefas',   label: 'Tarefas',   icon: CheckSquare     },
  { href: '/financeiro', label: 'Financeiro', icon: TrendingUp    },
]

const DRAWER_ITEMS = [
  { href: '/metas',         label: 'Metas Diárias', icon: Target      },
  { href: '/quadros',       label: 'Quadros',       icon: Shapes      },
  { href: '/vendas',        label: 'Vendas',        icon: ShoppingBag },
  { href: '/producao',      label: 'Produção',      icon: Package     },
  { href: '/creators',      label: 'Creators',      icon: Users2      },
  { href: '/afiliados',     label: 'Afiliados',     icon: Link2       },
  { href: '/sac',           label: 'SAC',           icon: Headphones  },
  { href: '/contabilidade', label: 'Contabilidade', icon: BookOpen    },
  { href: '/marketing',     label: 'Marketing',     icon: Megaphone   },
  { href: '/trafego',       label: 'Tráfego',       icon: Zap         },
  { href: '/inteligencia',  label: 'Inteligência',  icon: BarChart2   },
  { href: '/reunioes',      label: 'Reuniões',      icon: Calendar    },
  { href: '/conhecimento',  label: 'Central de Conhecimento', icon: BookOpen },
  { href: '/contas',        label: 'Contas & Acessos',        icon: KeyRound },
  { href: '/settings',      label: 'Configurações', icon: Settings    },
]

export function MobileNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isMaster } = useIsMaster()

  const drawerItems = isMaster ? DRAWER_ITEMS : DRAWER_ITEMS.filter((item) => item.href !== '/settings' && item.href !== '/contas')

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const isDrawerActive = drawerItems.some((item) => isActive(item.href))

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

        {/* Menu button */}
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
            {/* Backdrop */}
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

            {/* Drawer panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '70vh',
                background: 'var(--bg-surface)',
                borderRadius: '16px 16px 0 0',
                border: '1px solid var(--border)',
                borderBottom: 'none',
                zIndex: 151,
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Handle bar */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 20px 8px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Mais módulos
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

              {/* Items list */}
              <div style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 80px)' }}>
                {drawerItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeDrawer}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        height: 52, padding: '0 20px',
                        color: active ? '#C9A84C' : 'var(--text-primary)',
                        background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
                        borderLeft: `3px solid ${active ? '#C9A84C' : 'transparent'}`,
                        textDecoration: 'none',
                        fontSize: 14, fontWeight: active ? 500 : 400,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <Icon size={18} style={{ color: active ? '#C9A84C' : 'var(--text-secondary)' }} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

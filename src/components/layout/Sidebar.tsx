'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Zap, Settings,
  BookOpen, LogOut, Megaphone, X, ChevronLeft, ChevronRight, Link2, Headphones, Mail, KeyRound, ShoppingBag, Target,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { useMobile } from '@/hooks/useMobile'
import { useIsMaster } from '@/hooks/useIsMaster'

const DATA_REF = new Date('2024-02-12T12:00:00Z')

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/',           label: 'Início',       icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/crm',       label: 'CRM B2B',          icon: Users },
      { href: '/tarefas',   label: 'Tarefas',          icon: CheckSquare },
      { href: '/metas',     label: 'Metas Diárias',    icon: Target },
      { href: '/producao',  label: 'Produção',         icon: Package },
      { href: '/reunioes',  label: 'Reuniões',         icon: Calendar },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro',    label: 'Financeiro',    icon: TrendingUp },
      { href: '/vendas',        label: 'Vendas',        icon: ShoppingBag },
      { href: '/contabilidade', label: 'Contabilidade', icon: BookOpen },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/creators',   label: 'Creators',      icon: Users2 },
      { href: '/afiliados',  label: 'Afiliados',     icon: Link2 },
      { href: '/sac',        label: 'SAC',           icon: Headphones },
      { href: '/marketing',  label: 'Marketing',     icon: Megaphone },
      { href: '/trafego',    label: 'Tráfego',       icon: Zap },
      { href: '/leads-site', label: 'Leads do Site', icon: Mail },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/inteligencia', label: 'Inteligência', icon: BarChart2 },
    ],
  },
  {
    label: 'Conhecimento',
    items: [
      { href: '/conhecimento', label: 'Central de Conhecimento', icon: BookOpen },
      { href: '/contas',       label: 'Contas & Acessos',        icon: KeyRound },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
]

const DEMO_PERFIS: Array<{ id: PerfilUsuario; nome: string; cargo: string; inicial: string }> = [
  { id: 'matheus', nome: 'Matheus', cargo: 'Comercial', inicial: 'M' },
  { id: 'gabriel', nome: 'Gabriel', cargo: 'Operações', inicial: 'G' },
  { id: 'joao',    nome: 'João',    cargo: 'Marketing', inicial: 'J' },
]

export function Sidebar() {
  const isMobile = useMobile()
  const pathname = usePathname()
  const { user, perfil: authPerfil, signOut } = useAuth()
  const { isMaster } = useIsMaster()
  const {
    perfilAtivo, setPerfilAtivo,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes,
    mobileSidebarAberta, setMobileSidebarAberta,
    sidebarRecolhida, setSidebarRecolhida,
  } = usePurionStore()

  // On mobile, always use full-width drawer (ignore desktop collapse state)
  const recolhida = !isMobile && sidebarRecolhida
  const sidebarWidth = recolhida ? 56 : 224

  // Keep CSS variable in sync so main content margin animates with sidebar
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--purion-sidebar-w',
      isMobile ? '0px' : `${sidebarWidth}px`,
    )
  }, [isMobile, sidebarWidth])

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (isMobile) setMobileSidebarAberta(false)
  }, [pathname, isMobile, setMobileSidebarAberta])

  // Close on Escape (mobile)
  useEffect(() => {
    if (!isMobile) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarAberta(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, setMobileSidebarAberta])

  const displayNome    = authPerfil?.nome ?? user?.email?.split('@')[0] ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.nome ?? 'Usuário'
  const displayCargo   = authPerfil?.cargo ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.cargo ?? ''
  const displayInicial = displayNome[0]?.toUpperCase() ?? 'U'
  const isAuthenticated = !!user

  const temPedidoExpirado = pedidosExpedicao.some((p) => {
    if (['enviado', 'entregue', 'cancelado'].includes(p.status)) return false
    const deadline = new Date(new Date(p.dataPedido).getTime() + p.prazoHoras * 3_600_000)
    return DATA_REF > deadline
  })

  const alertasTrafego = useMemo(() => {
    const gastoAds   = campanhasAds.reduce((s, c) => s + c.gastoTotal, 0)
    const receitaAds = campanhasAds.reduce((s, c) => s + c.receitaGerada, 0)
    const conversoes = campanhasAds.reduce((s, c) => s + c.conversoes, 0)
    const roas = gastoAds > 0 ? receitaAds / gastoAds : 0
    const cpa  = conversoes > 0 ? gastoAds / conversoes : 0
    let count = 0
    if (gastoAds > 0 && roas < configuracoes.roasMinimo) count++
    if (conversoes > 0 && cpa > configuracoes.cpaMaximo) count++
    return count
  }, [campanhasAds, configuracoes])

  const alertasEstoque = useMemo(
    () => produtosSKU.filter((s) => s.unidades < s.threshold).length,
    [produtosSKU],
  )

  const visibleNavGroups = useMemo(
    () => isMaster
      ? navGroups
      : navGroups
          .filter((g) => g.label !== 'Sistema')
          .map((g) => g.label === 'Conhecimento' ? { ...g, items: g.items.filter((i) => i.href !== '/contas') } : g),
    [isMaster],
  )

  function getBadge(href: string) {
    if (href === '/producao' && temPedidoExpirado) return { label: 'SLA', cls: 'badge-danger' }
    if (href === '/trafego' && alertasTrafego > 0) return { label: String(alertasTrafego), cls: 'badge-warning' }
    if (href === '/producao' && alertasEstoque > 0) return { label: String(alertasEstoque), cls: 'badge-warning' }
    return null
  }

  return (
    <>
      {/* Backdrop — mobile only, shown when drawer open */}
      {isMobile && mobileSidebarAberta && (
        <div
          onClick={() => setMobileSidebarAberta(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/*
        .purion-sidebar handles mobile visibility via CSS (no SSR flash):
          default: translateX(-100%)
          [data-open]: translateX(0)
        Desktop: CSS does not apply; width animates via inline style.
      */}
      <aside
        className="purion-sidebar hidden md:flex"
        data-open={isMobile && mobileSidebarAberta ? '' : undefined}
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ── TOPO ── */}
        <div style={{ padding: recolhida ? '20px 0 0' : '20px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: recolhida ? 'center' : 'space-between',
          }}>
            {recolhida ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', userSelect: 'none' }}>P</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, userSelect: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.12em' }}>PURION</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>OS</span>
              </div>
            )}
            {/* X close — mobile drawer only */}
            {isMobile && (
              <button
                onClick={() => setMobileSidebarAberta(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
          {recolhida ? (
            <div style={{ height: 16 }} />
          ) : (
            <div style={{
              height: 1, margin: '12px 0 16px',
              background: 'linear-gradient(90deg, transparent, var(--gold-border, rgba(201,168,76,0.25)), transparent)',
            }} />
          )}
        </div>

        {/* ── NAV ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: recolhida ? '0 4px' : '0 8px' }}>
          {visibleNavGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {/* Group label — hidden when collapsed, divider line instead */}
              {group.label && !recolhida && (
                <p style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-secondary)',
                  padding: '8px 8px 4px', marginTop: gi > 0 ? 8 : 0,
                }}>
                  {group.label}
                </p>
              )}
              {group.label && recolhida && gi > 0 && (
                <div style={{ height: 1, margin: '6px 8px', background: 'var(--border)' }} />
              )}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
                  const badge = getBadge(href)

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        title={recolhida ? label : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: recolhida ? 'center' : 'flex-start',
                          gap: recolhida ? 0 : 10,
                          height: 44,
                          borderRadius: 8,
                          padding: recolhida ? '0' : '0 10px',
                          fontSize: 13,
                          fontWeight: ativo ? 500 : 400,
                          color: ativo ? '#C9A84C' : 'var(--text-secondary)',
                          background: ativo ? 'rgba(201,168,76,0.08)' : 'transparent',
                          borderLeft: recolhida ? 'none' : `2px solid ${ativo ? '#C9A84C' : 'transparent'}`,
                          textDecoration: 'none',
                          transition: 'background var(--transition-fast), color var(--transition-fast)',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!ativo) {
                            e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                            e.currentTarget.style.color = 'var(--text-primary)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!ativo) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                          }
                        }}
                      >
                        <Icon size={16} />
                        {!recolhida && (
                          <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        )}
                        {!recolhida && badge && (
                          <span className={`badge ${badge.cls}`} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>
                            {badge.label}
                          </span>
                        )}
                        {/* Dot badge when collapsed */}
                        {recolhida && badge && (
                          <span style={{
                            position: 'absolute', top: 7, right: 7,
                            width: 6, height: 6, borderRadius: '50%',
                            background: badge.cls === 'badge-danger' ? '#EF4444' : '#F59E0B',
                          }} />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── BASE ── */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: recolhida ? '10px 4px' : '12px 16px 16px',
        }}>
          {/* User info — full when expanded, avatar-only when collapsed */}
          {recolhida ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div
                title={`${displayNome}${displayCargo ? ` · ${displayCargo}` : ''}`}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
                  color: '#C9A84C', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none',
                }}
              >
                {displayInicial}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
                color: '#C9A84C', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none',
              }}>
                {displayInicial}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayNome}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayCargo}
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  onClick={signOut}
                  title="Sair"
                  style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'color var(--transition-fast), background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 2 }}>
                  {DEMO_PERFIS.filter((p) => p.id !== perfilAtivo).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPerfilAtivo(p.id)}
                      title={p.nome}
                      style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: '1px solid var(--border)', background: 'var(--bg-surface)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)',
                        transition: 'border-color var(--transition-fast)',
                      }}
                    >
                      {p.inicial}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapse / Expand toggle — desktop only */}
          {!isMobile && (
            <button
              onClick={() => setSidebarRecolhida(!sidebarRecolhida)}
              title={sidebarRecolhida ? 'Expandir menu' : 'Minimizar menu'}
              style={{
                width: '100%', height: 32, borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: recolhida ? 'center' : 'flex-start',
                gap: 6, padding: recolhida ? '0' : '0 8px',
                fontSize: 12, color: 'var(--text-secondary)',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                e.currentTarget.style.color = '#C9A84C'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {recolhida ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Minimizar</span></>}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

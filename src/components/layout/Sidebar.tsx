'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Zap, Settings,
  BookOpen, LogOut, Megaphone,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'
import { useAuth } from '@/hooks/useAuth'

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
      { href: '/crm',       label: 'CRM B2B',      icon: Users },
      { href: '/tarefas',   label: 'Tarefas',      icon: CheckSquare },
      { href: '/producao',  label: 'Produção',     icon: Package },
      { href: '/reunioes',  label: 'Reuniões',     icon: Calendar },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro',    label: 'Financeiro',    icon: TrendingUp },
      { href: '/contabilidade', label: 'Contabilidade', icon: BookOpen },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/creators',   label: 'Creators',   icon: Users2 },
      { href: '/marketing',  label: 'Marketing',  icon: Megaphone },
      { href: '/trafego',    label: 'Tráfego',    icon: Zap },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/inteligencia', label: 'Inteligência', icon: BarChart2 },
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
  const pathname = usePathname()
  const { user, perfil: authPerfil, signOut } = useAuth()
  const { perfilAtivo, setPerfilAtivo, pedidosExpedicao, campanhasAds, produtosSKU, configuracoes } = usePurionStore()

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
    [produtosSKU]
  )

  function getBadge(href: string) {
    if (href === '/producao' && temPedidoExpirado) return { label: 'SLA', cls: 'badge-danger' }
    if (href === '/trafego' && alertasTrafego > 0) return { label: String(alertasTrafego), cls: 'badge-warning' }
    if (href === '/producao' && alertasEstoque > 0) return { label: String(alertasEstoque), cls: 'badge-warning' }
    return null
  }

  return (
    <aside
      style={{
        width: 224,
        minWidth: 224,
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
      }}
    >
      {/* ── ZONA TOPO ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, userSelect: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.12em' }}>
            PURION
          </span>
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            OS
          </span>
        </div>
        <div style={{
          height: 1,
          margin: '12px 0 16px',
          background: 'linear-gradient(90deg, transparent, var(--gold-border, rgba(201,168,76,0.25)), transparent)',
        }} />
      </div>

      {/* ── ZONA MEIO (nav) ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.label && (
              <p style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-secondary)',
                padding: '8px 8px 4px', marginTop: gi > 0 ? 8 : 0,
              }}>
                {group.label}
              </p>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(({ href, label, icon: Icon }) => {
                const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
                const badge = getBadge(href)

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        height: 34,
                        borderRadius: 8,
                        padding: '0 10px',
                        fontSize: 13,
                        fontWeight: ativo ? 500 : 400,
                        color: ativo ? '#C9A84C' : 'var(--text-secondary)',
                        background: ativo ? 'rgba(201,168,76,0.08)' : 'transparent',
                        borderLeft: `2px solid ${ativo ? '#C9A84C' : 'transparent'}`,
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
                      <Icon size={15} />
                      <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      {badge && (
                        <span className={`badge ${badge.cls}`} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>
                          {badge.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── ZONA BASE ── */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: '#C9A84C', fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none',
          }}>
            {displayInicial}
          </div>

          {/* Info */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayNome}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayCargo}
            </p>
          </div>

          {/* Logout / Demo switcher */}
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
      </div>
    </aside>
  )
}

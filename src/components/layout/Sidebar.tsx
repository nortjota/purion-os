'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Zap, Settings,
  ChevronLeft, ChevronRight, BookOpen, LogOut,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'
import { useAuth } from '@/hooks/useAuth'

const DATA_REF = new Date('2024-02-12T12:00:00Z')

const navItems = [
  { href: '/',              label: 'Início',        icon: LayoutDashboard },
  { href: '/crm',           label: 'CRM B2B',        icon: Users },
  { href: '/tarefas',       label: 'Tarefas',        icon: CheckSquare },
  { href: '/financeiro',    label: 'Financeiro',     icon: TrendingUp },
  { href: '/producao',      label: 'Produção',       icon: Package },
  { href: '/creators',      label: 'Creators',       icon: Users2 },
  { href: '/inteligencia',  label: 'Inteligência',   icon: BarChart2 },
  { href: '/reunioes',      label: 'Reuniões',       icon: Calendar },
  { href: '/trafego',       label: 'Tráfego',        icon: Zap },
  { href: '/contabilidade', label: 'Contabilidade',  icon: BookOpen },
  { href: '/settings',      label: 'Config',         icon: Settings },
]

const DEMO_PERFIS: Array<{ id: PerfilUsuario; nome: string; cargo: string; regiao: string; inicial: string }> = [
  { id: 'matheus', nome: 'Matheus', cargo: 'Comercial', regiao: 'DF', inicial: 'M' },
  { id: 'gabriel', nome: 'Gabriel', cargo: 'Operações', regiao: 'SP', inicial: 'G' },
  { id: 'joao',    nome: 'João',    cargo: 'Marketing', regiao: 'SC', inicial: 'J' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, perfil: authPerfil, signOut } = useAuth()
  const {
    perfilAtivo, setPerfilAtivo, sidebarRecolhida, setSidebarRecolhida,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes,
  } = usePurionStore()

  // Real user if authenticated, fallback to demo profile
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

  return (
    <aside
      className={`
        ${sidebarRecolhida ? 'w-16' : 'w-60'} h-screen fixed left-0 top-0 z-50
        flex flex-col
        bg-[var(--sidebar-bg)] border-r border-[var(--border)]
        transition-all duration-300 ease-in-out overflow-hidden
      `}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 min-h-[72px]">
        {!sidebarRecolhida ? (
          <div className="flex flex-col items-start select-none">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold text-[#C9A84C]" style={{ letterSpacing: '0.15em' }}>
                PURION
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-normal" style={{ letterSpacing: '0.05em' }}>
                OS
              </span>
            </div>
            <div className="w-6 h-px mt-3" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>
        ) : (
          <span className="text-[13px] font-semibold text-[#C9A84C] mx-auto select-none" style={{ letterSpacing: '0.1em' }}>
            P
          </span>
        )}
        <button
          onClick={() => setSidebarRecolhida(!sidebarRecolhida)}
          className="shrink-0 p-1 rounded-md text-[var(--text-secondary)] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)] transition-colors duration-150"
          aria-label={sidebarRecolhida ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarRecolhida ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
            const temAlertaTrafego = href === '/trafego' && alertasTrafego > 0
            const temAlertaEstoque = href === '/producao' && alertasEstoque > 0

            return (
              <li key={href}>
                <Link
                  href={href}
                  title={sidebarRecolhida ? label : undefined}
                  className={`
                    flex items-center gap-[10px] rounded-[10px]
                    h-9 text-[13px] transition-colors duration-150
                    group relative
                    ${ativo
                      ? 'bg-[rgba(201,168,76,0.08)] border-l-2 border-[#C9A84C] text-[#C9A84C] font-[500] pl-[10px] pr-3'
                      : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] font-[400] pl-[10px] pr-3'
                    }
                  `}
                >
                  <span className="relative shrink-0">
                    <Icon size={16} className={ativo ? 'text-[#C9A84C]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'} />
                    {href === '/producao' && temPedidoExpirado && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                    )}
                    {temAlertaTrafego && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                    )}
                    {temAlertaEstoque && !temPedidoExpirado && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    )}
                  </span>

                  {!sidebarRecolhida && <span className="truncate flex-1">{label}</span>}

                  {!sidebarRecolhida && href === '/producao' && temPedidoExpirado && (
                    <span className="badge badge-danger ml-auto py-0 text-[10px]">SLA</span>
                  )}
                  {!sidebarRecolhida && temAlertaTrafego && (
                    <span className="badge badge-warning ml-auto py-0 text-[10px]">{alertasTrafego}</span>
                  )}
                  {!sidebarRecolhida && temAlertaEstoque && (
                    <span className="badge badge-warning ml-auto py-0 text-[10px]">{alertasEstoque}</span>
                  )}

                  {sidebarRecolhida && (
                    <span className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] rounded-lg whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Usuário / Perfil ── */}
      <div className="border-t border-[var(--border)] px-3 py-4">
        {!sidebarRecolhida ? (
          <div>
            {/* Usuário ativo */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-[rgba(201,168,76,0.06)] mb-2">
              <div className="w-7 h-7 rounded-full shrink-0 select-none bg-[#C9A84C] text-[#0D0D0D] flex items-center justify-center text-[10px] font-semibold">
                {displayInicial}
              </div>
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <span className="text-[13px] font-[500] text-[var(--text-primary)] truncate">{displayNome}</span>
                <span className="text-[11px] text-[var(--text-secondary)] truncate">{displayCargo}</span>
              </div>
            </div>

            {/* Demo mode: profile switcher (shown when not authenticated) */}
            {!isAuthenticated && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-1.5 px-2.5" style={{ letterSpacing: '0.08em' }}>
                  Trocar perfil
                </p>
                <div className="flex flex-col gap-0.5 mb-2">
                  {DEMO_PERFIS.filter((p) => p.id !== perfilAtivo).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPerfilAtivo(p.id)}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors duration-150"
                    >
                      <div className="w-5 h-5 rounded-full shrink-0 bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-semibold">
                        {p.inicial}
                      </div>
                      <span className="truncate">{p.nome}<span className="opacity-40 ml-1">· {p.regiao}</span></span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Sign out */}
            {isAuthenticated && (
              <button
                onClick={signOut}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-left text-[12px] text-[var(--text-secondary)] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.06)] transition-colors duration-150"
              >
                <LogOut size={13} />
                <span>Sair</span>
              </button>
            )}
          </div>
        ) : (
          /* Versão compacta */
          <div className="flex flex-col items-center gap-1.5">
            {/* Avatar do usuário ativo */}
            <div
              title={displayNome}
              className="w-7 h-7 rounded-full bg-[#C9A84C] text-[#0D0D0D] flex items-center justify-center text-[10px] font-semibold select-none ring-2 ring-[#C9A84C] ring-offset-2 ring-offset-[var(--sidebar-bg)]"
            >
              {displayInicial}
            </div>

            {/* Demo switcher (compact) — only when not authenticated */}
            {!isAuthenticated && DEMO_PERFIS.filter((p) => p.id !== perfilAtivo).map((p) => (
              <button
                key={p.id}
                onClick={() => setPerfilAtivo(p.id)}
                title={`${p.nome} · ${p.regiao}`}
                className="w-7 h-7 rounded-full select-none flex items-center justify-center text-[10px] font-semibold transition-all duration-150 bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              >
                {p.inicial}
              </button>
            ))}

            {/* Sign out compact */}
            {isAuthenticated && (
              <button
                onClick={signOut}
                title="Sair"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.06)] transition-colors duration-150 mt-1"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

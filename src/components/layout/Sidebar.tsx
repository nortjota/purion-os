'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Zap, Settings,
  ChevronLeft, ChevronRight, BookOpen,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'

const DATA_REF = new Date('2024-02-12T12:00:00Z')

const navItems = [
  { href: '/',             label: 'Início',        icon: LayoutDashboard },
  { href: '/crm',          label: 'CRM B2B',        icon: Users },
  { href: '/tarefas',      label: 'Tarefas',        icon: CheckSquare },
  { href: '/financeiro',   label: 'Financeiro',     icon: TrendingUp },
  { href: '/producao',     label: 'Produção',       icon: Package },
  { href: '/creators',     label: 'Creators',       icon: Users2 },
  { href: '/inteligencia', label: 'Inteligência',   icon: BarChart2 },
  { href: '/reunioes',     label: 'Reuniões',       icon: Calendar },
  { href: '/trafego',      label: 'Tráfego',        icon: Zap },
  { href: '/contabilidade', label: 'Contabilidade',  icon: BookOpen },
  { href: '/settings',     label: 'Config',         icon: Settings },
]

const perfis: Array<{
  id: PerfilUsuario
  nome: string
  cargo: string
  regiao: string
  inicial: string
}> = [
  { id: 'matheus', nome: 'Matheus', cargo: 'Comercial',  regiao: 'DF', inicial: 'M' },
  { id: 'gabriel', nome: 'Gabriel', cargo: 'Operações',  regiao: 'SP', inicial: 'G' },
  { id: 'joao',    nome: 'João',    cargo: 'Marketing',  regiao: 'SC', inicial: 'J' },
]

export function Sidebar() {
  const pathname = usePathname()
  const {
    perfilAtivo, setPerfilAtivo, sidebarRecolhida, setSidebarRecolhida,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes,
  } = usePurionStore()

  const temPedidoExpirado = pedidosExpedicao.some((p) => {
    if (['enviado', 'entregue', 'cancelado'].includes(p.status)) return false
    const deadline = new Date(new Date(p.dataPedido).getTime() + p.prazoHoras * 3_600_000)
    return DATA_REF > deadline
  })

  const alertasTrafego = useMemo(() => {
    const gastoAds = campanhasAds.reduce((s, c) => s + c.gastoTotal, 0)
    const receitaAds = campanhasAds.reduce((s, c) => s + c.receitaGerada, 0)
    const conversoes = campanhasAds.reduce((s, c) => s + c.conversoes, 0)
    const roas = gastoAds > 0 ? receitaAds / gastoAds : 0
    const cpa = conversoes > 0 ? gastoAds / conversoes : 0
    let count = 0
    if (gastoAds > 0 && roas < configuracoes.roasMinimo) count++
    if (conversoes > 0 && cpa > configuracoes.cpaMaximo) count++
    return count
  }, [campanhasAds, configuracoes])

  const alertasEstoque = useMemo(() =>
    produtosSKU.filter((s) => s.unidades < s.threshold).length,
  [produtosSKU])

  const perfilInfo = perfis.find((p) => p.id === perfilAtivo)!

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
              <span
                className="text-[15px] font-semibold text-[#C9A84C]"
                style={{ letterSpacing: '0.15em' }}
              >
                PURION
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-normal" style={{ letterSpacing: '0.05em' }}>
                OS
              </span>
            </div>
            {/* Linha dourada */}
            <div className="w-6 h-px mt-3" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>
        ) : (
          <span
            className="text-[13px] font-semibold text-[#C9A84C] mx-auto select-none"
            style={{ letterSpacing: '0.1em' }}
          >
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
                    <Icon
                      size={16}
                      className={ativo
                        ? 'text-[#C9A84C]'
                        : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                      }
                    />
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

                  {!sidebarRecolhida && (
                    <span className="truncate flex-1">{label}</span>
                  )}

                  {!sidebarRecolhida && href === '/producao' && temPedidoExpirado && (
                    <span className="badge badge-danger ml-auto py-0 text-[10px]">SLA</span>
                  )}
                  {!sidebarRecolhida && temAlertaTrafego && (
                    <span className="badge badge-warning ml-auto py-0 text-[10px]">{alertasTrafego}</span>
                  )}
                  {!sidebarRecolhida && temAlertaEstoque && (
                    <span className="badge badge-warning ml-auto py-0 text-[10px]">{alertasEstoque}</span>
                  )}

                  {/* Tooltip recolhida */}
                  {sidebarRecolhida && (
                    <span className="
                      absolute left-full ml-2.5 px-2.5 py-1.5
                      bg-[var(--bg-surface)] border border-[var(--border)]
                      text-[var(--text-primary)] text-[12px] rounded-lg
                      whitespace-nowrap shadow-lg
                      opacity-0 pointer-events-none
                      group-hover:opacity-100
                      transition-opacity duration-150 z-50
                    ">
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Perfil ── */}
      <div className="border-t border-[var(--border)] px-3 py-4">
        {!sidebarRecolhida ? (
          <div>
            {/* Perfil ativo */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-[rgba(201,168,76,0.06)] mb-3">
              <div className="
                w-7 h-7 rounded-full shrink-0 select-none
                bg-[#C9A84C] text-[#0D0D0D]
                flex items-center justify-center
                text-[10px] font-semibold
              ">
                {perfilInfo.inicial}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-[500] text-[var(--text-primary)] truncate">
                  {perfilInfo.nome}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {perfilInfo.cargo} · {perfilInfo.regiao}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-1.5 px-2.5" style={{ letterSpacing: '0.08em' }}>
              Trocar perfil
            </p>
            <div className="flex flex-col gap-0.5">
              {perfis.filter((p) => p.id !== perfilAtivo).map((perfil) => (
                <button
                  key={perfil.id}
                  onClick={() => setPerfilAtivo(perfil.id)}
                  className="
                    flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg
                    text-left text-[12px] text-[var(--text-secondary)]
                    hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]
                    transition-colors duration-150
                  "
                >
                  <div className="
                    w-5 h-5 rounded-full shrink-0
                    bg-[var(--bg-surface-2)] border border-[var(--border)]
                    flex items-center justify-center
                    text-[9px] font-semibold
                  ">
                    {perfil.inicial}
                  </div>
                  <span className="truncate">
                    {perfil.nome}
                    <span className="opacity-40 ml-1">· {perfil.regiao}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Versão compacta */
          <div className="flex flex-col items-center gap-1.5">
            {perfis.map((perfil) => (
              <button
                key={perfil.id}
                onClick={() => setPerfilAtivo(perfil.id)}
                title={`${perfil.nome} · ${perfil.regiao}`}
                className={`
                  w-7 h-7 rounded-full select-none
                  flex items-center justify-center
                  text-[10px] font-semibold
                  transition-all duration-150
                  ${perfil.id === perfilAtivo
                    ? 'bg-[#C9A84C] text-[#0D0D0D] ring-2 ring-[#C9A84C] ring-offset-2 ring-offset-[var(--sidebar-bg)]'
                    : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                  }
                `}
              >
                {perfil.inicial}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

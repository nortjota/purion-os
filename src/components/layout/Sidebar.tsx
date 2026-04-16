'use client'

/**
 * PURION OS — Sidebar de Navegação
 * Sidebar fixa com identidade Dark Luxury.
 * Usa Zustand para controle do perfil ativo e estado recolhido.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  TrendingUp,
  Package,
  Megaphone,
  BarChart2,
  Calendar,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'

const DATA_REF = new Date('2024-02-12T12:00:00Z')

// ─────────────────────────────────────────────
// CONFIGURAÇÃO DOS ITENS DE NAVEGAÇÃO
// ─────────────────────────────────────────────

const navItems = [
  { href: '/',             label: 'Início',        icon: LayoutDashboard },
  { href: '/crm',          label: 'CRM B2B',        icon: Users },
  { href: '/tarefas',      label: 'Tarefas',        icon: CheckSquare },
  { href: '/financeiro',   label: 'Financeiro',     icon: TrendingUp },
  { href: '/producao',     label: 'Produção',       icon: Package },
  { href: '/marketing',    label: 'Marketing',      icon: Megaphone },
  { href: '/inteligencia', label: 'Inteligência',   icon: BarChart2 },
  { href: '/reunioes',     label: 'Reuniões',       icon: Calendar },
  { href: '/trafego',      label: 'Tráfego',        icon: Zap },
  { href: '/settings',     label: 'Configurações',  icon: Settings },
]

// ─────────────────────────────────────────────
// CONFIGURAÇÃO DOS PERFIS
// ─────────────────────────────────────────────

const perfis: Array<{
  id: PerfilUsuario
  nome: string
  cargo: string
  regiao: string
  inicial: string
}> = [
  { id: 'matheus', nome: 'Matheus',  cargo: 'Comercial',  regiao: 'DF', inicial: 'M' },
  { id: 'gabriel', nome: 'Gabriel',  cargo: 'Operações',  regiao: 'SP', inicial: 'G' },
  { id: 'joao',    nome: 'João',     cargo: 'Marketing',  regiao: 'SC', inicial: 'J' },
]

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const {
    perfilAtivo, setPerfilAtivo, sidebarRecolhida, setSidebarRecolhida,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes,
  } = usePurionStore()

  const temPedidoExpirado = pedidosExpedicao.some((p) => {
    if (p.status === 'enviado' || p.status === 'entregue' || p.status === 'cancelado') return false
    const deadline = new Date(new Date(p.dataPedido).getTime() + p.prazoHoras * 3_600_000)
    return DATA_REF > deadline
  })

  // Alertas de tráfego inline
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
  const largura = sidebarRecolhida ? 'w-[64px]' : 'w-[260px]'

  return (
    <aside
      className={`
        ${largura} h-screen fixed left-0 top-0 z-50
        flex flex-col
        bg-[var(--sidebar-bg)] border-r border-[var(--border)]
        transition-all duration-300 ease-in-out
        overflow-hidden
      `}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--border)] min-h-[72px]">
        {!sidebarRecolhida && (
          <div className="flex flex-col leading-none select-none">
            <span
              className="text-xl font-black tracking-[0.3em] text-[#C9A84C]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              PURION
            </span>
            <span className="text-[10px] font-medium tracking-[0.4em] text-[#6B6B6B] mt-0.5 uppercase">
              Operating System
            </span>
          </div>
        )}

        {sidebarRecolhida && (
          <span
            className="text-sm font-black tracking-widest text-[#C9A84C] mx-auto"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            P
          </span>
        )}

        {/* Botão recolher */}
        <button
          onClick={() => setSidebarRecolhida(!sidebarRecolhida)}
          className="
            ml-auto p-1.5 rounded-md
            text-[#6B6B6B] hover:text-[#C9A84C]
            hover:bg-[rgba(201,168,76,0.08)]
            transition-colors duration-150
          "
          aria-label={sidebarRecolhida ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarRecolhida ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Verifica rota ativa (exata para '/', prefixo para demais)
            const ativo =
              href === '/' ? pathname === '/' : pathname.startsWith(href)

            // Badges por rota
            const temAlertaTrafego = href === '/trafego' && alertasTrafego > 0
            const temAlertaEstoque = href === '/producao' && alertasEstoque > 0
            const totalAlertas = href === '/' ? alertasTrafego + alertasEstoque : 0

            return (
              <li key={href}>
                <Link
                  href={href}
                  title={sidebarRecolhida ? label : undefined}
                  className={`
                    flex items-center gap-3 rounded-md px-3 py-2.5
                    text-sm font-medium transition-all duration-150
                    group relative
                    ${ativo
                      ? 'bg-[rgba(201,168,76,0.10)] text-[#C9A84C] border-l-2 border-[#C9A84C] pl-[10px]'
                      : 'text-[#8A8A8A] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] border-l-2 border-transparent pl-[10px]'
                    }
                  `}
                >
                  <span className="relative shrink-0">
                    <Icon
                      size={18}
                      className={ativo ? 'text-[#C9A84C]' : 'text-[#6B6B6B] group-hover:text-[var(--text-primary)]'}
                    />
                    {href === '/producao' && temPedidoExpirado && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[#141414]" />
                    )}
                    {temAlertaTrafego && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-400 border border-[#141414]" />
                    )}
                    {temAlertaEstoque && !temPedidoExpirado && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-[#141414]" />
                    )}
                  </span>
                  {!sidebarRecolhida && (
                    <span className="truncate flex-1">{label}</span>
                  )}
                  {!sidebarRecolhida && href === '/producao' && temPedidoExpirado && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                      SLA
                    </span>
                  )}
                  {!sidebarRecolhida && temAlertaTrafego && (
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                      {alertasTrafego}
                    </span>
                  )}
                  {!sidebarRecolhida && temAlertaEstoque && (
                    <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                      {alertasEstoque}
                    </span>
                  )}
                  {!sidebarRecolhida && totalAlertas > 0 && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                      {totalAlertas}
                    </span>
                  )}

                  {/* Tooltip quando recolhida */}
                  {sidebarRecolhida && (
                    <span
                      className="
                        absolute left-full ml-2 px-2 py-1
                        bg-[var(--bg-surface)] border border-[var(--border)]
                        text-[var(--text-primary)] text-xs rounded-md
                        whitespace-nowrap opacity-0 pointer-events-none
                        group-hover:opacity-100
                        transition-opacity duration-150 z-50
                      "
                    >
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Seletor de Perfil ── */}
      <div className="border-t border-[var(--border)] p-3">
        {!sidebarRecolhida ? (
          <div>
            {/* Perfil ativo */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-[rgba(201,168,76,0.06)] mb-2">
              <div className="
                w-8 h-8 rounded-full
                bg-[#C9A84C] text-[#0D0D0D]
                flex items-center justify-center
                text-xs font-black shrink-0
                select-none
              ">
                {perfilInfo.inicial}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {perfilInfo.nome}
                </span>
                <span className="text-[11px] text-[#6B6B6B]">
                  {perfilInfo.cargo} · {perfilInfo.regiao}
                </span>
              </div>
            </div>

            {/* Troca de perfil */}
            <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider px-2 mb-1.5">
              Trocar perfil
            </p>
            <div className="flex flex-col gap-0.5">
              {perfis
                .filter((p) => p.id !== perfilAtivo)
                .map((perfil) => (
                  <button
                    key={perfil.id}
                    onClick={() => setPerfilAtivo(perfil.id)}
                    className="
                      flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md
                      text-left text-xs text-[#6B6B6B]
                      hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]
                      transition-colors duration-150
                    "
                  >
                    <div className="
                      w-6 h-6 rounded-full
                      bg-[#2A2A2A] text-[#8A8A8A]
                      flex items-center justify-center
                      text-[10px] font-bold shrink-0
                    ">
                      {perfil.inicial}
                    </div>
                    <span className="truncate">
                      {perfil.nome}
                      <span className="ml-1 text-[#4A4A4A]">· {perfil.regiao}</span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* Versão compacta — só avatar do perfil ativo */
          <div className="flex flex-col items-center gap-1">
            {perfis.map((perfil) => (
              <button
                key={perfil.id}
                onClick={() => setPerfilAtivo(perfil.id)}
                title={`${perfil.nome} · ${perfil.regiao}`}
                className={`
                  w-8 h-8 rounded-full
                  flex items-center justify-center
                  text-[10px] font-black
                  transition-all duration-150
                  ${perfil.id === perfilAtivo
                    ? 'bg-[#C9A84C] text-[#0D0D0D] ring-2 ring-[#C9A84C] ring-offset-2 ring-offset-[#141414]'
                    : 'bg-[#2A2A2A] text-[#6B6B6B] hover:bg-[#3A3A3A]'
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

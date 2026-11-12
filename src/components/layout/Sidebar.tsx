'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { soft } from '@/components/motion/presets'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LogOut, ChevronDown, ChevronsUpDown, LayoutGrid, Search, PanelLeftClose, PanelLeftOpen,
  Sun, Moon, Activity, Keyboard,
} from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { useMobile } from '@/hooks/useMobile'
import { useIsMaster } from '@/hooks/useIsMaster'
import { useIsLogistica } from '@/hooks/useIsLogistica'
import { usePreferenciasMenu } from '@/hooks/usePreferenciasMenu'
import { PERFIS_INFO, SOCIOS_ATIVOS, corPerfil } from '@/lib/socios'
import { NAV_GROUPS, NAV_GROUPS_LOGISTICA } from './navConfig'
import { aguardandoDespacho, despachoAtrasado } from '@/hooks/useDespacho'
import { PersonalizarMenuModal } from './PersonalizarMenuModal'
import { useSocioAtual } from '@/components/meu-trabalho/useSocioAtual'

const LARGURA_ABERTA = 232
const LARGURA_RECOLHIDA = 60
const CHAVE_GRUPOS = 'purion-nav-grupos-recolhidos'

// Apenas sócios ativos (gabriel arquivado)
const DEMO_PERFIS: Array<{ id: PerfilUsuario; nome: string; cargo: string; inicial: string }> = SOCIOS_ATIVOS.map((s) => ({
  id: s.id as PerfilUsuario, nome: s.nome, cargo: s.eixo.split(' · ')[0], inicial: s.inicial,
}))

type Selo = { label: string; tom: 'danger' | 'warning' | 'neutral' }

const COR_SELO: Record<Selo['tom'], string> = {
  danger: 'var(--status-danger)',
  warning: 'var(--status-warning)',
  neutral: 'var(--text-secondary)',
}

/** Itens do menu do perfil (rodapé) — mesma aparência para links e ações. */
function ItemMenuPerfil({ icon: Icon, label, onClick, href, perigo, atalho }: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  onClick?: () => void
  href?: string
  perigo?: boolean
  atalho?: string
}) {
  const conteudo = (
    <>
      <Icon size={14} />
      <span style={{ flex: 1 }}>{label}</span>
      {atalho && <kbd className="nav-kbd">{atalho}</kbd>}
    </>
  )
  const className = `nav-menu-item${perigo ? ' nav-menu-item-danger' : ''}`
  return href
    ? <Link href={href} onClick={onClick} className={className}>{conteudo}</Link>
    : <button type="button" onClick={onClick} className={className}>{conteudo}</button>
}

export function Sidebar() {
  const isMobile = useMobile()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, perfil: authPerfil, signOut } = useAuth()
  const { isMaster } = useIsMaster()
  const { isLogistica } = useIsLogistica()
  const {
    perfilAtivo, setPerfilAtivo,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes, vendas, tarefas, leads,
    sidebarRecolhida, setSidebarRecolhida,
  } = usePurionStore()

  const recolhida = !isMobile && sidebarRecolhida
  const sidebarWidth = recolhida ? LARGURA_RECOLHIDA : LARGURA_ABERTA

  useEffect(() => {
    document.documentElement.style.setProperty('--purion-sidebar-w', isMobile ? '0px' : `${sidebarWidth}px`)
  }, [isMobile, sidebarWidth])

  // ── Grupos recolhíveis (lembrados por navegador) ──
  const [gruposRecolhidos, setGruposRecolhidos] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_GRUPOS)
      if (salvo) setGruposRecolhidos(new Set(JSON.parse(salvo) as string[]))
    } catch { /* preferência só visual — segue com tudo aberto */ }
  }, [])
  function alternarGrupo(id: string) {
    setGruposRecolhidos((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id); else novo.add(id)
      try { window.localStorage.setItem(CHAVE_GRUPOS, JSON.stringify([...novo])) } catch { /* idem */ }
      return novo
    })
  }

  // ── Menu do perfil ──
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false)
  const [menuPersonalizarAberto, setMenuPersonalizarAberto] = useState(false)
  const rodapeRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setMenuPerfilAberto(false) }, [pathname])
  useEffect(() => {
    if (!menuPerfilAberto) return
    function fora(e: MouseEvent) {
      const alvo = e.target as Node
      if (rodapeRef.current?.contains(alvo) || menuRef.current?.contains(alvo)) return
      setMenuPerfilAberto(false)
    }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setMenuPerfilAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [menuPerfilAberto])

  const displayNome    = isLogistica ? PERFIS_INFO.logistica.nomeCompleto : (authPerfil?.nome ?? user?.email?.split('@')[0] ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.nome ?? 'Usuário')
  const displayCargo   = isLogistica ? 'Operador terceirizado' : (authPerfil?.cargo ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.cargo ?? '')
  const displayInicial = displayNome[0]?.toUpperCase() ?? 'U'
  const corAvatar      = isLogistica ? PERFIS_INFO.logistica.cor : corPerfil(perfilAtivo)
  const isAuthenticated = !!user
  const isDark = theme !== 'light'

  // ── Selos (o que pede atenção em cada módulo) ──
  const temPedidoExpirado = useMemo(() => {
    const agora = Date.now()
    return pedidosExpedicao.some((p) => {
      if (['enviado', 'entregue', 'cancelado'].includes(p.status)) return false
      return agora > new Date(p.dataPedido).getTime() + p.prazoHoras * 3_600_000
    })
  }, [pedidosExpedicao])

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

  const despachos = useMemo(() => {
    const fila = vendas.filter(aguardandoDespacho)
    return { fila: fila.length, atrasados: fila.filter((v) => despachoAtrasado(v)).length }
  }, [vendas])

  const alertasEstoque = useMemo(() => produtosSKU.filter((s) => s.unidades < s.threshold).length, [produtosSKU])

  const tarefasAtrasadas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    return tarefas.filter((t) => t.dueDate && t.dueDate < hoje && t.status !== 'concluida' && t.status !== 'cancelada').length
  }, [tarefas])

  // fila pessoal (tarefas + follow-ups do CRM com prazo vencido ou hoje) para o selo de "Meu trabalho"
  const socioAtual = useSocioAtual()
  const filaPessoal = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const t = tarefas.filter((x) => x.responsavel === socioAtual && x.dueDate && x.dueDate.slice(0, 10) <= hoje && !['concluida', 'cancelada'].includes(x.status))
    const atrasadas = t.filter((x) => x.dueDate!.slice(0, 10) < hoje).length
    const l = leads.filter((x) => x.responsavel === socioAtual && x.proximoPassoData && x.proximoPassoData.slice(0, 10) <= hoje)
    return { total: t.length + l.length, atrasado: atrasadas + l.filter((x) => x.proximoPassoData!.slice(0, 10) < hoje).length }
  }, [tarefas, leads, socioAtual])

  function getSelo(href: string): Selo | null {
    if (href === '/meu-trabalho' && filaPessoal.total > 0) return { label: String(filaPessoal.total), tom: filaPessoal.atrasado > 0 ? 'danger' : 'warning' }
    if (href === '/tarefas' && tarefasAtrasadas > 0) return { label: String(tarefasAtrasadas), tom: 'danger' }
    if (href === '/despacho' && despachos.atrasados > 0) return { label: `${despachos.atrasados} +48h`, tom: 'danger' }
    if (href === '/despacho' && despachos.fila > 0) return { label: String(despachos.fila), tom: 'warning' }
    if (href === '/producao' && temPedidoExpirado) return { label: 'SLA', tom: 'danger' }
    if (href === '/producao' && alertasEstoque > 0) return { label: String(alertasEstoque), tom: 'warning' }
    if (href === '/marketing' && alertasTrafego > 0) return { label: String(alertasTrafego), tom: 'warning' }
    return null
  }

  const { ocultas: abasOcultas } = usePreferenciasMenu()

  const grupos = useMemo(
    () => isLogistica
      ? NAV_GROUPS_LOGISTICA
      : NAV_GROUPS
        .filter((g) => !g.noPerfil)
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => (isMaster || !i.masterOnly) && (i.essencial || !abasOcultas.has(i.key))),
        }))
        .filter((g) => g.items.length > 0),
    [isMaster, isLogistica, abasOcultas],
  )

  const itensSistema = useMemo(
    () => isLogistica ? [] : NAV_GROUPS.filter((g) => g.noPerfil).flatMap((g) => g.items).filter((i) => isMaster || !i.masterOnly),
    [isMaster, isLogistica],
  )

  const estaAtivo = (href: string) => href === '/' ? pathname === '/' : (pathname === href || pathname.startsWith(`${href}/`))
  const sistemaAtivo = itensSistema.some((i) => estaAtivo(i.href))

  function abrirBusca() { window.dispatchEvent(new CustomEvent('purion:open-palette')) }

  return (
    <>
      <aside
        className="purion-sidebar hidden md:flex"
        style={{
          width: sidebarWidth, minWidth: sidebarWidth, height: '100vh',
          position: 'fixed', left: 0, top: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
          overflow: 'hidden', transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ── TOPO: marca + recolher ── */}
        <div style={{
          height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: recolhida ? 'center' : 'space-between',
          padding: recolhida ? 0 : '0 10px 0 18px',
        }}>
          {recolhida ? (
            <button
              type="button" onClick={() => setSidebarRecolhida(false)} title="Expandir menu" aria-label="Expandir menu"
              className="nav-icon-btn"
            >
              <PanelLeftOpen size={16} />
            </button>
          ) : (
            <>
              <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 6, userSelect: 'none', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-title)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.14em' }}>PURION</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>OS</span>
              </Link>
              <button
                type="button" onClick={() => setSidebarRecolhida(true)} title="Recolher menu" aria-label="Recolher menu"
                className="nav-icon-btn"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {/* ── BUSCA / PALETA ── */}
        {!isLogistica && (
          <div style={{ padding: recolhida ? '0 10px 8px' : '0 10px 8px', flexShrink: 0 }}>
            <button
              type="button" onClick={abrirBusca} title="Buscar ou ir para… (Ctrl+K)"
              className="nav-search"
              style={{ justifyContent: recolhida ? 'center' : 'flex-start', padding: recolhida ? 0 : '0 10px' }}
            >
              <Search size={14} />
              {!recolhida && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>Buscar ou ir para…</span>
                  <kbd className="nav-kbd">Ctrl K</kbd>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── NAVEGAÇÃO ── */}
        <nav className="nav-scroll" style={{ flex: 1, overflowY: 'auto', padding: recolhida ? '0 10px 8px' : '0 10px 8px' }}>
          {grupos.map((grupo, gi) => {
            const fechado = !recolhida && gruposRecolhidos.has(grupo.id)
            const grupoTemAtivo = grupo.items.some((i) => estaAtivo(i.href))
            const seloDoGrupo = fechado ? grupo.items.map((i) => getSelo(i.href)).find(Boolean) : null
            // grupo recolhido continua mostrando o item ativo, para o usuário não "se perder"
            const itens = fechado ? grupo.items.filter((i) => estaAtivo(i.href)) : grupo.items

            return (
              <div key={grupo.id} style={{ marginTop: gi === 0 ? 0 : recolhida ? 6 : 10 }}>
                {recolhida ? (
                  gi > 0 && <div style={{ height: 1, margin: '0 8px 6px', background: 'var(--border)' }} />
                ) : (
                  <button
                    type="button" onClick={() => alternarGrupo(grupo.id)}
                    className="nav-group-label" aria-expanded={!fechado}
                    title={fechado ? 'Expandir grupo' : 'Recolher grupo'}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>{grupo.label}</span>
                    {seloDoGrupo && (
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: COR_SELO[seloDoGrupo.tom] }} />
                    )}
                    <ChevronDown
                      size={12} className="nav-group-chevron"
                      style={{ transform: fechado ? 'rotate(-90deg)' : 'none', opacity: fechado || grupoTemAtivo ? 0.9 : undefined }}
                    />
                  </button>
                )}

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {itens.map(({ href, label, icon: Icon }) => {
                    const ativo = estaAtivo(href)
                    const selo = getSelo(href)
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          title={recolhida ? label : undefined}
                          aria-current={ativo ? 'page' : undefined}
                          className={`nav-item${ativo ? ' nav-item-ativo' : ''}`}
                          style={{
                            justifyContent: recolhida ? 'center' : 'flex-start',
                            padding: recolhida ? 0 : '0 10px',
                            gap: recolhida ? 0 : 10,
                          }}
                        >
                          {/* fundo do item ativo: desliza entre itens (layoutId) */}
                          {ativo && (
                            <motion.span
                              layoutId="sidebar-item-ativo" transition={soft} aria-hidden
                              style={{
                                position: 'absolute', inset: 0, borderRadius: 8,
                                background: 'color-mix(in srgb, var(--foreground) 7%, transparent)',
                                boxShadow: 'inset 2px 0 0 var(--brand-accent)',
                              }}
                            />
                          )}
                          <Icon size={16} style={{ position: 'relative', flexShrink: 0, color: ativo ? 'var(--brand-accent)' : undefined }} />
                          {!recolhida && (
                            <span style={{ position: 'relative', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {label}
                            </span>
                          )}
                          {!recolhida && selo && (
                            <span className="nav-selo tnum" style={{ color: COR_SELO[selo.tom], position: 'relative' }}>{selo.label}</span>
                          )}
                          {recolhida && selo && (
                            <span aria-hidden style={{
                              position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: '50%',
                              background: COR_SELO[selo.tom],
                            }} />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* ── RODAPÉ: perfil (abre o menu de conta/sistema) ── */}
        <div ref={rodapeRef} style={{ borderTop: '1px solid var(--border)', padding: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMenuPerfilAberto((v) => !v)}
            aria-haspopup="menu" aria-expanded={menuPerfilAberto}
            title={recolhida ? `${displayNome}${displayCargo ? ` · ${displayCargo}` : ''}` : 'Conta e sistema'}
            className={`nav-perfil${menuPerfilAberto || sistemaAtivo ? ' nav-perfil-aberto' : ''}`}
            style={{ justifyContent: recolhida ? 'center' : 'flex-start', padding: recolhida ? 0 : '0 8px' }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `${corAvatar}1A`, border: `1px solid ${corAvatar}55`, color: corAvatar,
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {displayInicial}
            </span>
            {!recolhida && (
              <>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.25 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayNome}
                  </span>
                  {displayCargo && (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayCargo}
                    </span>
                  )}
                </span>
                <ChevronsUpDown size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Menu do perfil — fora do <aside> (que tem overflow hidden) */}
      <AnimatePresence>
        {menuPerfilAberto && !isMobile && (
          <motion.div
            ref={menuRef} role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="nav-menu"
            style={{ left: recolhida ? LARGURA_RECOLHIDA + 6 : 8, bottom: recolhida ? 8 : 56, width: recolhida ? 228 : LARGURA_ABERTA - 16 }}
          >
            <div style={{ padding: '8px 10px 8px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNome}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? displayCargo}
              </p>
            </div>

            {!isAuthenticated && !isLogistica && (
              <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px' }}>
                {DEMO_PERFIS.map((p) => (
                  <button
                    key={p.id} type="button" onClick={() => setPerfilAtivo(p.id)}
                    className="nav-menu-chip" data-ativo={p.id === perfilAtivo || undefined}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
            )}

            <div className="nav-menu-sep" />
            {!isLogistica && (
              <ItemMenuPerfil icon={Activity} label="Minha atividade" href="/minha-atividade" onClick={() => setMenuPerfilAberto(false)} />
            )}
            {itensSistema.map((i) => (
              <ItemMenuPerfil key={i.key} icon={i.icon} label={i.label} href={i.href} onClick={() => setMenuPerfilAberto(false)} />
            ))}
            {!isLogistica && (
              <ItemMenuPerfil icon={LayoutGrid} label="Personalizar menu" onClick={() => { setMenuPerfilAberto(false); setMenuPersonalizarAberto(true) }} />
            )}
            <div className="nav-menu-sep" />
            <ItemMenuPerfil
              icon={isDark ? Sun : Moon} label={isDark ? 'Tema claro' : 'Tema escuro'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            />
            {!isLogistica && (
              <ItemMenuPerfil
                icon={Keyboard} label="Atalhos de teclado" atalho="?"
                onClick={() => { setMenuPerfilAberto(false); window.dispatchEvent(new CustomEvent('purion:open-shortcuts')) }}
              />
            )}
            {isAuthenticated && (
              <>
                <div className="nav-menu-sep" />
                <ItemMenuPerfil
                  icon={LogOut} label="Sair" perigo
                  onClick={() => { setMenuPerfilAberto(false); void signOut() }}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {menuPersonalizarAberto && <PersonalizarMenuModal onFechar={() => setMenuPersonalizarAberto(false)} />}
    </>
  )
}

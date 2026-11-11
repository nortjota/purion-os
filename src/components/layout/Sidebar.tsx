'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { soft } from '@/components/motion/presets'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut, X, ChevronLeft, ChevronRight, LayoutGrid,
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

const DATA_REF = new Date('2024-02-12T12:00:00Z')

// Apenas sócios ativos (gabriel arquivado)
const DEMO_PERFIS: Array<{ id: PerfilUsuario; nome: string; cargo: string; inicial: string }> = SOCIOS_ATIVOS.map((s) => ({
  id: s.id as PerfilUsuario, nome: s.nome, cargo: s.eixo.split(' · ')[0], inicial: s.inicial,
}))

export function Sidebar() {
  const isMobile = useMobile()
  const pathname = usePathname()
  const { user, perfil: authPerfil, signOut } = useAuth()
  const { isMaster } = useIsMaster()
  const { isLogistica } = useIsLogistica()
  const {
    perfilAtivo, setPerfilAtivo,
    pedidosExpedicao, campanhasAds, produtosSKU, configuracoes, vendas,
    mobileSidebarAberta, setMobileSidebarAberta,
    sidebarRecolhida, setSidebarRecolhida,
  } = usePurionStore()

  const recolhida = !isMobile && sidebarRecolhida
  const sidebarWidth = recolhida ? 56 : 224

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--purion-sidebar-w',
      isMobile ? '0px' : `${sidebarWidth}px`,
    )
  }, [isMobile, sidebarWidth])

  useEffect(() => {
    if (isMobile) setMobileSidebarAberta(false)
  }, [pathname, isMobile, setMobileSidebarAberta])

  useEffect(() => {
    if (!isMobile) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarAberta(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, setMobileSidebarAberta])

  const displayNome    = isLogistica ? PERFIS_INFO.logistica.nomeCompleto : (authPerfil?.nome ?? user?.email?.split('@')[0] ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.nome ?? 'Usuário')
  const displayCargo   = isLogistica ? 'Operador terceirizado' : (authPerfil?.cargo ?? DEMO_PERFIS.find((p) => p.id === perfilAtivo)?.cargo ?? '')
  const displayInicial = displayNome[0]?.toUpperCase() ?? 'U'
  const corAvatar      = isLogistica ? PERFIS_INFO.logistica.cor : corPerfil(perfilAtivo)
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

  const despachos = useMemo(() => {
    const fila = vendas.filter(aguardandoDespacho)
    return { fila: fila.length, atrasados: fila.filter((v) => despachoAtrasado(v)).length }
  }, [vendas])

  const alertasEstoque = useMemo(
    () => produtosSKU.filter((s) => s.unidades < s.threshold).length,
    [produtosSKU],
  )

  const { ocultas: abasOcultas } = usePreferenciasMenu()
  const [menuPersonalizarAberto, setMenuPersonalizarAberto] = useState(false)

  const visibleNavGroups = useMemo(
    () => isLogistica
      ? NAV_GROUPS_LOGISTICA
      : NAV_GROUPS
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => (isMaster || !i.masterOnly) && (i.essencial || !abasOcultas.has(i.key))),
        }))
        .filter((g) => g.items.length > 0),
    [isMaster, isLogistica, abasOcultas],
  )

  function getBadge(href: string) {
    if (href === '/despacho' && despachos.atrasados > 0) return { label: `${despachos.atrasados} +48h`, cls: 'badge-danger' }
    if (href === '/despacho' && despachos.fila > 0) return { label: String(despachos.fila), cls: 'badge-warning' }
    if (href === '/producao' && temPedidoExpirado) return { label: 'SLA', cls: 'badge-danger' }
    if (href === '/marketing' && alertasTrafego > 0) return { label: String(alertasTrafego), cls: 'badge-warning' }
    if (href === '/producao' && alertasEstoque > 0) return { label: String(alertasEstoque), cls: 'badge-warning' }
    return null
  }

  return (
    <>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', userSelect: 'none' }}>P</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, userSelect: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.12em' }}>PURION</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>OS</span>
              </div>
            )}
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
              background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
            }} />
          )}
        </div>

        {/* ── NAV ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: recolhida ? '0 4px' : '0 8px' }}>
          {visibleNavGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.label && !recolhida && (
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(184,184,184,0.45)',
                  padding: '10px 8px 3px', marginTop: gi > 0 ? 6 : 0,
                  userSelect: 'none',
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
                          height: 34,
                          borderRadius: 6,
                          padding: recolhida ? '0' : '0 10px',
                          fontSize: 13,
                          fontWeight: ativo ? 500 : 400,
                          color: ativo ? 'var(--brand-accent)' : '#B8B8B8',
                          background: ativo ? 'rgba(212,252,60,0.08)' : 'transparent',
                          textDecoration: 'none',
                          transition: 'background var(--dur-base) var(--ease-soft), color var(--dur-base) var(--ease-soft)',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!ativo) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                            e.currentTarget.style.color = '#E0E0E0'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!ativo) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#B8B8B8'
                          }
                        }}
                      >
                        {/* indicador do item ativo: pílula verde que GLIDA entre itens (layoutId) */}
                        {ativo && (
                          <motion.span
                            layoutId="sidebar-item-ativo"
                            transition={soft}
                            aria-hidden
                            style={{
                              position: 'absolute', left: recolhida ? 2 : 0, top: 8, bottom: 8, width: 3,
                              borderRadius: 999, background: 'var(--accent-motion, #D4FC3C)',
                            }}
                          />
                        )}
                        <Icon size={15} />
                        {!recolhida && (
                          <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        )}
                        {!recolhida && badge && (
                          <span
                            className={`badge ${badge.cls}`}
                            style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4 }}
                          >
                            {badge.label}
                          </span>
                        )}
                        {recolhida && badge && (
                          <span style={{
                            position: 'absolute', top: 5, right: 5,
                            width: 6, height: 6, borderRadius: '50%',
                            background: badge.cls === 'badge-danger' ? 'var(--status-danger)' : 'var(--status-warning)',
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
          {recolhida ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div
                title={`${displayNome}${displayCargo ? ` · ${displayCargo}` : ''}`}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `${corAvatar}14`, border: `1px solid ${corAvatar}40`,
                  color: corAvatar, fontSize: 11, fontWeight: 600,
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
                background: `${corAvatar}14`, border: `1px solid ${corAvatar}40`,
                color: corAvatar, fontSize: 11, fontWeight: 600,
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
                    transition: 'color 120ms, background 120ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--status-danger)'; e.currentTarget.style.background = 'rgba(229,84,75,0.08)' }}
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
                        transition: 'border-color 120ms',
                      }}
                    >
                      {p.inicial}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isLogistica && <button
            onClick={() => setMenuPersonalizarAberto(true)}
            title="Personalizar menu"
            style={{
              width: '100%', height: 30, borderRadius: 6,
              border: '1px solid var(--border)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: recolhida ? 'center' : 'flex-start',
              gap: 6, padding: recolhida ? '0' : '0 8px',
              fontSize: 12, color: 'var(--text-secondary)',
              transition: 'background 120ms, color 120ms',
              marginBottom: isMobile ? 0 : 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(245,245,240,0.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <LayoutGrid size={14} />
            {!recolhida && <span>Personalizar menu</span>}
          </button>}

          {!isMobile && (
            <button
              onClick={() => setSidebarRecolhida(!sidebarRecolhida)}
              title={sidebarRecolhida ? 'Expandir menu' : 'Minimizar menu'}
              style={{
                width: '100%', height: 30, borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: recolhida ? 'center' : 'flex-start',
                gap: 6, padding: recolhida ? '0' : '0 8px',
                fontSize: 12, color: 'var(--text-secondary)',
                transition: 'background 120ms, color 120ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245,245,240,0.08)'
                e.currentTarget.style.color = 'var(--text-primary)'
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

      {menuPersonalizarAberto && <PersonalizarMenuModal onFechar={() => setMenuPersonalizarAberto(false)} />}
    </>
  )
}

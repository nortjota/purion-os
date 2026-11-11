'use client'

import { usePathname } from 'next/navigation'
import { Maximize2, Search } from 'lucide-react'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { usePurionStore } from '@/store'
import { useIsLogistica } from '@/hooks/useIsLogistica'
import { nomeDoModulo, grupoDoModulo } from './navConfig'

/**
 * Cabeçalho enxuto: só diz onde você está e guarda o que é global de verdade
 * (modo foco e notificações). Busca, tema, conta e sair ficam na sidebar.
 */
export function ContentHeader() {
  const pathname = usePathname()
  const { focusMode, setFocusMode } = usePurionStore()
  const { isLogistica } = useIsLogistica()
  const moduleName = nomeDoModulo(pathname)
  const grupo = isLogistica ? '' : grupoDoModulo(pathname)

  function abrirBusca() { window.dispatchEvent(new CustomEvent('purion:open-palette')) }

  return (
    <header className="purion-header" style={{
      borderBottom: '1px solid var(--border)',
      background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      {/* ── DESKTOP ── */}
      <div className="purion-header-desktop" style={{
        height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 0 }}>
          {grupo && (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>{grupo}</span>
              <span aria-hidden style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>/</span>
            </>
          )}
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{moduleName}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setFocusMode(!focusMode)}
            title="Modo foco — esconde menu e cabeçalho (Esc para sair)"
            aria-label="Modo foco"
            className="icon-btn"
          >
            <Maximize2 size={15} />
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="purion-header-mobile" style={{
        height: 52, display: 'none', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 12px 0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.14em' }}>PURION</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {moduleName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isLogistica && (
            <button onClick={abrirBusca} className="icon-btn" style={{ border: 'none' }} aria-label="Buscar">
              <Search size={17} />
            </button>
          )}
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Maximize2, Search, Plus } from 'lucide-react'
import { ACOES_RAPIDAS, dispararAcaoRapida, type AcaoRapida } from '@/lib/acaoRapida'
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
  const router = useRouter()
  const [criarAberto, setCriarAberto] = useState(false)

  function criar(acao: AcaoRapida, href: string) {
    setCriarAberto(false)
    dispararAcaoRapida(acao)
    if (pathname !== href) router.push(href)
  }
  const grupos = [...new Set(ACOES_RAPIDAS.map((a) => a.grupo))]
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
          {/* Criar qualquer coisa de qualquer tela, sem navegar antes */}
          {!isLogistica && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setCriarAberto((o) => !o)} className="btn btn-secondary btn-sm"
                aria-haspopup="menu" aria-expanded={criarAberto} title="Criar (também pela busca: Ctrl+K)"
              >
                <Plus size={14} /> Criar
              </button>
              {criarAberto && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setCriarAberto(false)} />
                  <div className="menu-flutuante" role="menu" style={{ minWidth: 250 }}>
                    {grupos.map((g, gi) => (
                      <div key={g}>
                        {gi > 0 && <div className="nav-menu-sep" />}
                        <p className="nav-group-label" style={{ cursor: 'default', height: 24 }}>{g}</p>
                        {ACOES_RAPIDAS.filter((a) => a.grupo === g).map((a) => (
                          <button key={a.action} role="menuitem" className="nav-menu-item" onClick={() => criar(a.action, a.href)}>
                            <span style={{ flex: 1 }}>{a.label}</span>
                            {a.atalho && <kbd className="nav-kbd">{a.atalho}</kbd>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
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

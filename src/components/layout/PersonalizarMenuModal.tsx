'use client'

import { useMemo, useState } from 'react'
import { X, LayoutGrid, Lock, RotateCcw, AlertTriangle } from 'lucide-react'
import { NAV_GROUPS, TODOS_OS_ITENS } from './navConfig'
import { usePreferenciasMenu } from '@/hooks/usePreferenciasMenu'
import { useIsMaster } from '@/hooks/useIsMaster'

interface Props {
  onFechar: () => void
}

const LIMITE_AVISO_OCULTAS = 10

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{
        background: checked ? '#C9A84C' : 'var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        border: 'none',
        flexShrink: 0,
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform"
        style={{ background: '#fff', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export function PersonalizarMenuModal({ onFechar }: Props) {
  const { isMaster } = useIsMaster()
  const { ocultas, carregando, alternarAba, restaurarPadrao } = usePreferenciasMenu()
  const [avisoDispensado, setAvisoDispensado] = useState(false)

  const gruposVisiveis = useMemo(
    () => NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => isMaster || !i.masterOnly) }))
      .filter((g) => g.items.length > 0),
    [isMaster]
  )

  const itensToggleaveis = useMemo(
    () => TODOS_OS_ITENS.filter((i) => isMaster || !i.masterOnly),
    [isMaster]
  )

  const totalOcultas = itensToggleaveis.filter((i) => ocultas.has(i.key)).length
  const totalVisiveis = itensToggleaveis.length - totalOcultas
  const mostrarAviso = totalOcultas >= LIMITE_AVISO_OCULTAS && !avisoDispensado

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onFechar}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <span className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              <LayoutGrid size={16} style={{ color: '#C9A84C' }} /> Personalizar menu
            </span>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              Só afeta o seu menu — os outros sócios continuam vendo tudo.
            </p>
          </div>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#22C55E' }}>{totalVisiveis}</strong> visíveis · <strong style={{ color: '#E8A838' }}>{totalOcultas}</strong> ocultas
          </span>
          <button
            onClick={restaurarPadrao}
            className="flex items-center gap-1.5"
            style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <RotateCcw size={11} /> Restaurar padrão
          </button>
        </div>

        {mostrarAviso && (
          <div className="flex items-start gap-2 px-5 py-3" style={{ background: 'rgba(232,168,56,0.08)', borderBottom: '1px solid var(--border)' }}>
            <AlertTriangle size={14} style={{ color: '#E8A838', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
              {totalOcultas} abas ocultas — muita coisa escondida.{' '}
              <button onClick={restaurarPadrao} style={{ color: '#E8A838', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                Restaurar padrão?
              </button>
            </p>
            <button onClick={() => setAvisoDispensado(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando ? (
            <p className="caption">Carregando…</p>
          ) : (
            <div className="flex flex-col gap-5">
              {gruposVisiveis.map((grupo) => (
                <div key={grupo.label}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {grupo.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {grupo.items.map((item) => {
                      const Icon = item.icon
                      const oculta = ocultas.has(item.key)
                      return (
                        <div key={item.key} className="flex items-center gap-3" style={{ padding: '6px 4px' }}>
                          <Icon size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{item.label}</span>
                          {item.essencial ? (
                            <span className="flex items-center gap-1" title="Essencial — não pode ser ocultada" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                              <Lock size={11} /> sempre visível
                            </span>
                          ) : (
                            <Toggle checked={!oculta} onChange={(visivel) => alternarAba(item.key, !visivel)} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

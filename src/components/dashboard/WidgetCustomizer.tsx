'use client'

import { useState } from 'react'
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { SECOES_DASHBOARD, useDashboardLayout } from './useDashboardLayout'

/** Escolhe quais seções aparecem na tela inicial (preferência por navegador). */
export function WidgetCustomizer() {
  const [open, setOpen] = useState(false)
  const { visivel, alternarVisivel, restaurar } = useDashboardLayout()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="icon-btn" title="Personalizar tela inicial" aria-label="Personalizar tela inicial">
        <SlidersHorizontal size={15} />
      </button>

      {open && (
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal-container" style={{ maxWidth: 420, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 className="modal-title">Personalizar tela inicial</h2>
                <p className="caption" style={{ marginTop: 2 }}>Mostre só o que você acompanha. Vale para este navegador.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="icon-btn" aria-label="Fechar"><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              {SECOES_DASHBOARD.map((secao) => {
                const ligada = visivel(secao.id)
                return (
                  <label key={secao.id} className="opcao-linha" data-ativa={ligada || undefined}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{secao.label}</span>
                      <span className="caption" style={{ display: 'block' }}>{secao.descricao}</span>
                    </span>
                    <input type="checkbox" className="toggle" checked={ligada} onChange={() => alternarVisivel(secao.id)} />
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={restaurar}><RotateCcw size={13} /> Restaurar padrão</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Concluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

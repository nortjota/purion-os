'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'

type Step = {
  target: string   // CSS selector
  title: string
  body: string
  position: 'bottom' | 'right' | 'left'
}

const STEPS: Step[] = [
  { target: 'nav.purion-sidebar, aside.purion-sidebar', title: 'Módulos do sistema',     body: 'Navegue entre CRM, Financeiro, Produção e todos os outros módulos aqui.',             position: 'right'  },
  { target: '.kpi-grid',                                title: 'Métricas em tempo real', body: 'Acompanhe os principais indicadores do seu negócio atualizados automaticamente.',       position: 'bottom' },
  { target: '.purion-header-desktop',                   title: 'Ações rápidas',          body: 'Busque dados, alterne o tema e acesse notificações no cabeçalho.',                      position: 'bottom' },
  { target: 'body',                                     title: 'Ctrl+K — Command Center', body: 'Pressione Ctrl+K (ou ⌘K no Mac) para acessar ações rápidas de qualquer lugar.',         position: 'bottom' },
]

const TOUR_KEY = 'purion_tour_done'

export function OnboardingTour() {
  const [step, setStep]       = useState(-1)  // -1 = not started
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (done) return
    // Start tour after a short delay on first load
    const t = setTimeout(() => setStep(0), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) { setVisible(false); return }
    setVisible(true)
    const el = document.querySelector(STEPS[step].target)
    if (el) setRect(el.getBoundingClientRect())
    else setRect(null)
  }, [step])

  function next() {
    if (step >= STEPS.length - 1) finish()
    else setStep(s => s + 1)
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
    setStep(-1)
  }

  if (!visible || step < 0) return null

  const current = STEPS[step]

  // Tooltip positioning — fallback to center if target not found
  const top  = rect ? rect.bottom + 12 : window.innerHeight / 2 - 80
  const left = rect ? Math.max(12, Math.min(rect.left, window.innerWidth - 296)) : window.innerWidth / 2 - 140

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={finish}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)' }}
      />
      {/* Highlight ring */}
      {rect && (
        <div style={{
          position: 'fixed', zIndex: 9001,
          top: rect.top - 4, left: rect.left - 4,
          width: rect.width + 8, height: rect.height + 8,
          borderRadius: 10, border: '2px solid #C9A84C',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Tooltip */}
      <div style={{
        position: 'fixed', top, left, zIndex: 9002,
        width: 280, background: 'var(--bg-surface)',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 12, padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{current.title}</p>
          <button onClick={finish} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>{current.body}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{step + 1} / {STEPS.length}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={finish} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Pular tour
            </button>
            <button
              onClick={next}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#C9A84C', color: '#0D0D0D', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              {step < STEPS.length - 1 ? 'Próximo' : 'Concluir'} <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

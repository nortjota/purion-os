'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { soft } from '@/components/motion/presets'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: ToastAction
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const BORDER_COLOR: Record<ToastType, string> = {
  success: '#8FD14F',
  error:   '#E5544B',
  warning: '#E6C374',
  info:    '#9CC3DB',
}

const ICONE: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

function ToastItem({ t, onRemove }: { t: Toast; onRemove: () => void }) {
  const Icone = ICONE[t.type]
  const duration = t.duration ?? 3000
  const [progress, setProgress] = useState(100)
  const startRef = useRef(Date.now())
  const rafRef = useRef<number | null>(null)
  const onRemoveRef = useRef(onRemove)
  onRemoveRef.current = onRemove

  useEffect(() => {
    startRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onRemoveRef.current()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [duration])

  return (
    <div
      style={{
        minWidth: 280, maxWidth: 360,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        borderLeft: `3px solid ${BORDER_COLOR[t.type]}`,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* ícone com pulse na entrada */}
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.18, 1], opacity: 1 }}
          transition={{ duration: 0.45, times: [0, 0.6, 1], ease: 'easeOut', delay: 0.08 }}
          style={{ display: 'inline-flex', color: BORDER_COLOR[t.type], marginTop: 1, flexShrink: 0 }}
          aria-hidden
        >
          <Icone size={15} />
        </motion.span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.title}</p>
          {t.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{t.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); onRemove() }}
              style={{
                background: 'none', border: `1px solid ${BORDER_COLOR[t.type]}`,
                borderRadius: 6, cursor: 'pointer', padding: '2px 8px',
                color: BORDER_COLOR[t.type], fontSize: 11, fontWeight: 600, lineHeight: 1.6,
                whiteSpace: 'nowrap',
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={onRemove}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: 'var(--text-secondary)', lineHeight: 1,
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      {/* Progress bar (scaleX = só transform) */}
      <div style={{ height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: '100%', transform: `scaleX(${progress / 100})`, transformOrigin: 'left center', background: BORDER_COLOR[t.type] }} />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }])
  }, [])

  const value: ToastContextValue = {
    toast: add,
    success: (title, description) => add({ type: 'success', title, description }),
    error:   (title, description) => add({ type: 'error', title, description }),
    warning: (title, description) => add({ type: 'warning', title, description }),
    info:    (title, description) => add({ type: 'info', title, description }),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-20 right-6 md:bottom-6 md:right-6 flex flex-col gap-2 z-[9999]"
        style={{ pointerEvents: 'none' }}
      >
        {/* filho direto do AnimatePresence = motion.div → a saída anima de verdade; layout reposiciona a pilha */}
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 48, opacity: 0, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 48, opacity: 0, transition: { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] } }}
              transition={soft}
              style={{ pointerEvents: 'all' }}
            >
              <ToastItem t={t} onRemove={() => remove(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    const noop = () => {}
    return { success: noop, error: noop, warning: noop, info: noop, toast: noop }
  }
  return ctx
}

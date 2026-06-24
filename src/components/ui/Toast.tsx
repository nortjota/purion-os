'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

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
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#C9A84C',
  info:    '#3B82F6',
}

function ToastItem({ t, onRemove }: { t: Toast; onRemove: () => void }) {
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
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
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
      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: BORDER_COLOR[t.type] }} />
      </div>
    </motion.div>
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
        <AnimatePresence mode="sync">
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: 'all' }}>
              <ToastItem t={t} onRemove={() => remove(t.id)} />
            </div>
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

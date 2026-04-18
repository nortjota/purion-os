'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
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
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000)
    return () => clearTimeout(timer)
  }, [onRemove])

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
        padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.title}</p>
        {t.description && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{t.description}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--text-secondary)', flexShrink: 0, lineHeight: 1,
        }}
      >
        <X size={13} />
      </button>
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
        style={{
          position: 'fixed', bottom: 24, right: 24,
          display: 'flex', flexDirection: 'column', gap: 8,
          zIndex: 9999, pointerEvents: 'none',
        }}
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
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

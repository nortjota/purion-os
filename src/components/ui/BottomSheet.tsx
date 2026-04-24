'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  heightPercent?: number
}

export function BottomSheet({
  open, onClose, title, children, footer, heightPercent = 85,
}: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              maxHeight: `${heightPercent}vh`,
              background: 'var(--bg-surface)',
              borderRadius: '16px 16px 0 0',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {/* Header */}
            {title && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 20px 12px', borderBottom: '1px solid var(--border)',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
                <button
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex', gap: 8,
              }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

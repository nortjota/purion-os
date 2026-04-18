import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  helper?: string
  error?: string
  children: React.ReactNode
  required?: boolean
}

export function FormField({ label, helper, error, children, required }: FormFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label className="label-purion" style={{ marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error ? (
        <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>
      ) : helper ? (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{helper}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const PurionInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('input-purion', className)}
      style={{
        ...(error ? { borderColor: '#EF4444' } : {}),
        ...style,
      }}
      {...props}
    />
  )
)
PurionInput.displayName = 'PurionInput'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const PurionSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, style, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('select-purion', className)}
      style={{
        ...(error ? { borderColor: '#EF4444' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
)
PurionSelect.displayName = 'PurionSelect'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const PurionTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('textarea-purion', className)}
      style={{
        minHeight: 80,
        ...(error ? { borderColor: '#EF4444' } : {}),
        ...style,
      }}
      {...props}
    />
  )
)
PurionTextarea.displayName = 'PurionTextarea'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: number
}

export function PurionModal({ open, onClose, title, subtitle, children, footer, maxWidth = 480 }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-container"
        style={{ maxWidth, padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', flexShrink: 0,
            }}
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

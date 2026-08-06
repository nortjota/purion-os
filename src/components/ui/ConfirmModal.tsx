'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  /** Quando definido, exige que o usuário digite este texto exatamente antes de habilitar a confirmação. */
  confirmText?: string
}

export function ConfirmModal({
  open, title, message, confirmLabel = 'Excluir', cancelLabel = 'Cancelar',
  onConfirm, onCancel, danger = true, confirmText,
}: ConfirmModalProps) {
  const [digitado, setDigitado] = useState('')
  const bloqueado = !!confirmText && digitado !== confirmText

  useEffect(() => {
    if (!open) setDigitado('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !bloqueado) onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel, onConfirm, bloqueado])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="relative z-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          danger ? 'bg-red-500/10' : 'bg-amber-500/10'
        }`}>
          {danger
            ? <Trash2 size={22} className="text-red-400" />
            : <AlertTriangle size={22} className="text-amber-400" />
          }
        </div>

        {/* Text */}
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{message}</p>

        {/* Confirmação por texto digitado */}
        {confirmText && (
          <div className="mb-6">
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
              Digite <strong className="text-[var(--text-primary)]">{confirmText}</strong> para confirmar
            </label>
            <input
              type="text"
              autoFocus
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              className="input-purion w-full"
              placeholder={confirmText}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={bloqueado}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors ${
              bloqueado ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              danger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#C9A84C] hover:bg-[#D4B55E] text-[#0D0D0D]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

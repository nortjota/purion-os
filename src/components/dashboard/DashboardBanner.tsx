'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const BANNER_COLORS = [
  '#C9A84C',
  '#22C55E',
  '#5B8FE8',
  '#E85238',
] as const

const DEFAULT_TEXT = '🚀 PURION OS — Bem-vindo ao sistema operacional da marca. Clique duas vezes para editar este banner.'

const STORAGE_TEXT_KEY   = 'purion:banner-text'
const STORAGE_COLOR_KEY  = 'purion:banner-color'
const STORAGE_DISMISS_KEY = 'purion:banner-dismissed'

interface DashboardBannerProps {
  isAdmin?: boolean
}

export function DashboardBanner({ isAdmin = true }: DashboardBannerProps) {
  const [bannerText, setBannerText]   = useState(DEFAULT_TEXT)
  const [bannerColor, setBannerColor] = useState<string>('#C9A84C')
  const [dismissed, setDismissed]     = useState(false)
  const [isEditing, setIsEditing]     = useState(false)
  const [draft, setDraft]             = useState('')
  const [mounted, setMounted]         = useState(false)

  useEffect(() => {
    setMounted(true)
    const text  = localStorage.getItem(STORAGE_TEXT_KEY)
    const color = localStorage.getItem(STORAGE_COLOR_KEY)
    const disc  = localStorage.getItem(STORAGE_DISMISS_KEY)
    if (text)  setBannerText(text)
    if (color) setBannerColor(color)
    if (disc === 'true') setDismissed(true)
  }, [])

  if (!mounted) return null
  if (dismissed && !isAdmin) return null
  if (dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(STORAGE_DISMISS_KEY, 'true')
  }

  function handleEditStart() {
    if (!isAdmin) return
    setDraft(bannerText)
    setIsEditing(true)
  }

  function handleEditSave() {
    setBannerText(draft)
    localStorage.setItem(STORAGE_TEXT_KEY, draft)
    setIsEditing(false)
  }

  function handleColorChange(color: string) {
    setBannerColor(color)
    localStorage.setItem(STORAGE_COLOR_KEY, color)
  }

  return (
    <div
      style={{
        background: `${bannerColor}18`,
        border: `1px solid ${bannerColor}40`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 0,
      }}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 13, color: 'var(--text-primary)',
                resize: 'none', lineHeight: 1.5,
              }}
              rows={2}
              autoFocus
            />
            <button
              onClick={handleEditSave}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              Salvar
            </button>
          </div>
        ) : (
          <p
            style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, cursor: isAdmin ? 'text' : 'default' }}
            onDoubleClick={handleEditStart}
            title={isAdmin ? 'Clique duplo para editar' : undefined}
          >
            {bannerText}
          </p>
        )}
      </div>

      {/* Admin controls */}
      {isAdmin && !isEditing && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {BANNER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                background: c, border: 'none', cursor: 'pointer',
                outline: bannerColor === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${bannerColor}20`, border: 'none',
          cursor: 'pointer', color: bannerColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useToast } from '@/components/ui/Toast'

interface InlineEditProps {
  value: string | number
  onSave: (val: string) => void | Promise<void>
  type?: 'text' | 'number'
  className?: string
  placeholder?: string
}

export function InlineEdit({ value, onSave, type = 'text', className = '', placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)
  const { success } = useToast()

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  async function commit() {
    setEditing(false)
    await onSave(draft)
    success('Salvo', undefined)
    setTimeout(() => {}, 1500)
  }

  function discard() {
    setDraft(String(value))
    setEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      discard()
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={{
          background: 'rgba(201,168,76,0.08)',
          borderBottom: '1px solid #C9A84C',
          outline: 'none',
          padding: '0 2px',
        }}
      />
    )
  }

  return (
    <span
      className={className}
      onDoubleClick={() => setEditing(true)}
      title="Clique duplo para editar"
      style={{ cursor: 'text' }}
    >
      {value === '' || value === null || value === undefined ? (
        <span style={{ opacity: 0.4 }}>{placeholder ?? '—'}</span>
      ) : (
        value
      )}
    </span>
  )
}

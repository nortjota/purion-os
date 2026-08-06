'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, StickyNote } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export interface QuickNote {
  id: string
  titulo: string
  conteudo: string
  cor: string
  modulo: 'nenhum' | 'lead' | 'tarefa' | 'lote'
  fixada: boolean
  criadaEm: string
}

const COLORS = [
  { value: '#C9A84C', label: 'Dourado' },
  { value: '#22C55E', label: 'Verde'   },
  { value: '#E85238', label: 'Vermelho'},
  { value: '#5B8FE8', label: 'Azul'    },
  { value: '#A0A0A0', label: 'Cinza'   },
]

const STORAGE_KEY = 'purion:quick-notes'

function loadNotes(): QuickNote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

// Export notes state for use in other components (notas-fixadas widget)
export function getFixedNotes(): QuickNote[] {
  return loadNotes().filter((n) => n.fixada)
}

interface QuickNotesProps {
  onNotesChange?: (notes: QuickNote[]) => void
}

export function QuickNotes({ onNotesChange }: QuickNotesProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [cor, setCor] = useState('#C9A84C')
  const [modulo, setModulo] = useState<QuickNote['modulo']>('nenhum')
  const [fixada, setFixada] = useState(false)

  useEffect(() => {
    setNotes(loadNotes())
  }, [])

  async function handleSave() {
    if (!conteudo.trim()) return
    const note: QuickNote = {
      id: `note-${Date.now()}`,
      titulo,
      conteudo,
      cor,
      modulo,
      fixada,
      criadaEm: new Date().toISOString(),
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    onNotesChange?.(updated)

    // Try Supabase
    const sb = supabase
    if (sb) {
      try {
        await sb.from('notas').insert({
          titulo: note.titulo,
          conteudo: note.conteudo,
          cor: note.cor,
          modulo: note.modulo,
          fixada: note.fixada,
          criada_em: note.criadaEm,
        })
      } catch {
        // Silently ignore
      }
    }

    setTitulo('')
    setConteudo('')
    setCor('#C9A84C')
    setModulo('nenhum')
    setFixada(false)
    setShowForm(false)
  }

  function handleDelete(id: string) {
    const updated = notes.filter((n) => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    onNotesChange?.(updated)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        title="Notas rápidas"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          zIndex: 150,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#C9A84C',
          color: '#0D0D0D',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
          fontSize: 22,
          fontWeight: 700,
        }}
        className="purion-quick-notes-btn"
      >
        <StickyNote size={20} />
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 82,
            right: 20,
            zIndex: 150,
            width: 320,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notas Rápidas</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: '#C9A84C', color: '#0D0D0D',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--bg-surface-2)', color: 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
              <input
                className="input-purion"
                placeholder="Título (opcional)"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={{ marginBottom: 8, fontSize: 13 }}
              />
              <textarea
                className="input-purion"
                placeholder="Conteúdo da nota..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontSize: 13, marginBottom: 10 }}
              />

              {/* Color swatches */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCor(c.value)}
                    title={c.label}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: c.value, border: 'none', cursor: 'pointer',
                      outline: cor === c.value ? `2px solid ${c.value}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>

              {/* Module select */}
              <select
                className="input-purion"
                value={modulo}
                onChange={(e) => setModulo(e.target.value as QuickNote['modulo'])}
                style={{ marginBottom: 8, fontSize: 13 }}
              >
                <option value="nenhum">Nenhum módulo</option>
                <option value="lead">Lead</option>
                <option value="tarefa">Tarefa</option>
                <option value="lote">Lote</option>
              </select>

              {/* Pin toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={fixada}
                  onChange={(e) => setFixada(e.target.checked)}
                />
                <span style={{ color: 'var(--text-secondary)' }}>Fixar no dashboard</span>
              </label>

              <button className="btn btn-primary btn-sm" onClick={handleSave} style={{ width: '100%' }}>
                Salvar Nota
              </button>
            </div>
          )}

          {/* Notes list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {notes.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Nenhuma nota ainda
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${note.cor}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {note.titulo && (
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {note.titulo}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {note.conteudo.slice(0, 50)}{note.conteudo.length > 50 ? '...' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

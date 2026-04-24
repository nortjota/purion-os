'use client'

import { useState, useEffect } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp, X, Save } from 'lucide-react'

export interface FilterDef {
  key: string
  label: string
  type: 'select' | 'range' | 'date-range' | 'text'
  options?: { value: string; label: string }[]
}

export interface AdvancedFiltersProps {
  filters: FilterDef[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  moduleKey: string
}

interface SavedFilter {
  name: string
  values: Record<string, unknown>
}

function loadSavedFilters(moduleKey: string): SavedFilter[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`purion:saved-filters:${moduleKey}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSavedFilters(moduleKey: string, filters: SavedFilter[]) {
  localStorage.setItem(`purion:saved-filters:${moduleKey}`, JSON.stringify(filters))
}

function countActiveFilters(values: Record<string, unknown>): number {
  return Object.values(values).filter((v) => v !== '' && v !== undefined && v !== null).length
}

export function AdvancedFilters({ filters, values, onChange, moduleKey }: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const activeCount = countActiveFilters(values)

  useEffect(() => {
    setSavedFilters(loadSavedFilters(moduleKey))
  }, [moduleKey])

  function handleChange(key: string, value: unknown) {
    onChange({ ...values, [key]: value })
  }

  function handleSaveCurrent() {
    const name = prompt('Nome do filtro:')
    if (!name) return
    const newFilter: SavedFilter = { name, values: { ...values } }
    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    saveSavedFilters(moduleKey, updated)
  }

  function handleApplySaved(filter: SavedFilter) {
    onChange(filter.values)
  }

  function handleRemoveSaved(idx: number) {
    const updated = savedFilters.filter((_, i) => i !== idx)
    setSavedFilters(updated)
    saveSavedFilters(moduleKey, updated)
  }

  function handleReset() {
    const empty: Record<string, unknown> = {}
    filters.forEach((f) => { empty[f.key] = '' })
    onChange(empty)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Saved filter pills */}
      {savedFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {savedFilters.map((sf, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                fontSize: 12, color: '#C9A84C',
              }}
            >
              <button onClick={() => handleApplySaved(sf)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', fontSize: 12 }}>
                {sf.name}
              </button>
              <button onClick={() => handleRemoveSaved(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center' }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: expanded ? 'rgba(201,168,76,0.1)' : 'var(--bg-surface-2)',
            border: `1px solid ${expanded ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
            cursor: 'pointer', fontSize: 13, color: expanded ? '#C9A84C' : 'var(--text-secondary)',
          }}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {activeCount > 0 && (
            <span style={{
              background: '#C9A84C', color: '#0D0D0D',
              borderRadius: '50%', width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {activeCount > 0 && (
          <button
            onClick={handleReset}
            style={{
              fontSize: 12, color: 'var(--text-secondary)', background: 'none',
              border: 'none', cursor: 'pointer',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? 400 : 0,
          transition: 'max-height 0.25s ease',
        }}
      >
        <div
          style={{
            padding: 16, marginTop: 8,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            {filters.map((filter) => (
              <div key={filter.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {filter.label}
                </label>

                {filter.type === 'select' && filter.options && (
                  <select
                    className="input-purion"
                    value={String(values[filter.key] ?? '')}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">Todos</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {filter.type === 'text' && (
                  <input
                    className="input-purion"
                    type="text"
                    value={String(values[filter.key] ?? '')}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                )}

                {filter.type === 'range' && (
                  <input
                    className="input-purion"
                    type="number"
                    value={String(values[filter.key] ?? '')}
                    onChange={(e) => handleChange(filter.key, e.target.value ? Number(e.target.value) : '')}
                    style={{ fontSize: 13 }}
                  />
                )}

                {filter.type === 'date-range' && (
                  <input
                    className="input-purion"
                    type="date"
                    value={String(values[filter.key] ?? '')}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveCurrent}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#C9A84C',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <Save size={12} />
            Salvar filtro atual
          </button>
        </div>
      </div>
    </div>
  )
}

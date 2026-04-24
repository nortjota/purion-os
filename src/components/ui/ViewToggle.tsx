'use client'

import { List, Grid3X3, CalendarDays } from 'lucide-react'

export type ViewType = 'list' | 'grid' | 'timeline'

interface ViewToggleProps {
  module: string
  views?: ViewType[]
  current: ViewType
  onChange: (view: ViewType) => void
}

const VIEW_ICONS: Record<ViewType, React.ElementType> = {
  list:     List,
  grid:     Grid3X3,
  timeline: CalendarDays,
}

const VIEW_LABELS: Record<ViewType, string> = {
  list:     'Lista',
  grid:     'Grade',
  timeline: 'Timeline',
}

export function ViewToggle({
  module,
  views = ['list', 'grid', 'timeline'],
  current,
  onChange,
}: ViewToggleProps) {
  function handleChange(view: ViewType) {
    onChange(view)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`purion:view:${module}`, view)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 3,
    }}>
      {views.map((view) => {
        const Icon = VIEW_ICONS[view]
        const isActive = current === view
        return (
          <button
            key={view}
            onClick={() => handleChange(view)}
            title={VIEW_LABELS[view]}
            style={{
              width: 32, height: 28, borderRadius: 7,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? '#C9A84C' : 'transparent',
              color: isActive ? '#0D0D0D' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}

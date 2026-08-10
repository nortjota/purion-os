'use client'

export type InnerTab = { id: string; label: string; badge?: number }

interface Props {
  tabs: InnerTab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

export function InnerTabs({ tabs, activeTab, onChange, className = '', style }: Props) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        flexShrink: 0,
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              position: 'relative',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#F5F5F5' : '#B8B8B8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 150ms',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#E0E0E0' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#B8B8B8' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                  background: 'rgba(201,168,76,0.2)', color: '#C9A84C',
                }}>
                  {tab.badge}
                </span>
              )}
            </span>
            {active && (
              <span style={{
                position: 'absolute', bottom: -1, left: 0, right: 0,
                height: 2, background: '#C9A84C', borderRadius: '2px 2px 0 0',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

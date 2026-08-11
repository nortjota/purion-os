'use client'

import { WidgetShell } from './WidgetShell'

export interface ItemLista {
  id: string
  titulo: string
  subtitulo?: string
  valor?: string
  cor?: string
  badge?: string
}

interface Props {
  title: string
  icon?: React.ElementType
  items: ItemLista[]
  emptyMessage?: string
  isLoading?: boolean
  href?: string
  onItemClick?: (item: ItemLista) => void
  limite?: number
}

export function WidgetLista({ title, icon, items, emptyMessage, isLoading, href, onItemClick, limite = 5 }: Props) {
  const visiveis = items.slice(0, limite)

  return (
    <WidgetShell title={title} icon={icon} isLoading={isLoading} isEmpty={items.length === 0} emptyMessage={emptyMessage} height={160} href={href}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visiveis.map((item, idx) => {
          const ultimo = idx === visiveis.length - 1
          const conteudo = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              {item.cor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.cor, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.titulo}
                </p>
                {item.subtitulo && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.subtitulo}
                  </p>
                )}
              </div>
              {item.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: `${item.cor ?? '#C9A84C'}18`, color: item.cor ?? '#C9A84C', flexShrink: 0 }}>
                  {item.badge}
                </span>
              )}
              {item.valor && (
                <span style={{ fontSize: 12, fontWeight: 700, color: item.cor ?? 'var(--text-primary)', flexShrink: 0 }}>{item.valor}</span>
              )}
            </div>
          )
          const borderStyle = ultimo ? undefined : '1px solid var(--border)'
          return onItemClick ? (
            <button key={item.id} onClick={() => onItemClick(item)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: borderStyle }}>
              {conteudo}
            </button>
          ) : (
            <div key={item.id} style={{ borderBottom: borderStyle }}>{conteudo}</div>
          )
        })}
      </div>
    </WidgetShell>
  )
}

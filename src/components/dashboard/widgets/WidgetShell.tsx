'use client'

import Link from 'next/link'
import { Inbox } from 'lucide-react'

interface Props {
  title: string
  icon?: React.ElementType
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  href?: string
  action?: React.ReactNode
  children: React.ReactNode
  height?: number
}

export function WidgetShell({ title, icon: Icon, isLoading, isEmpty, emptyMessage = 'Sem dados no período', href, action, children, height }: Props) {
  const conteudo = (
    <div className={`card-purion ${href ? 'lift' : ''}`} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', cursor: href ? 'pointer' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={12} />} {title}
        </span>
        {action}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: height ?? 120 }}>
          <div className="skeleton" style={{ height: 24, width: '60%', borderRadius: 6 }} />
          <div className="skeleton" style={{ flex: 1, borderRadius: 8 }} />
        </div>
      ) : isEmpty ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          minHeight: height ?? 120, color: 'var(--text-secondary)', flex: 1,
        }}>
          <Inbox size={22} style={{ opacity: 0.35 }} />
          <span style={{ fontSize: 12 }}>{emptyMessage}</span>
        </div>
      ) : children}

    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{conteudo}</Link>
  }
  return conteudo
}

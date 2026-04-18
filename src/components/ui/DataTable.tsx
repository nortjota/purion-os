'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T, index: number) => React.ReactNode
  numeric?: boolean
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyIcon?: LucideIcon
  emptyText?: string
  emptySubtext?: string
  pageSize?: number
  getKey?: (row: T, index: number) => string
}

export function DataTable<T>({
  columns,
  data,
  emptyIcon: EmptyIcon,
  emptyText = 'Nenhum registro encontrado',
  emptySubtext,
  pageSize = 10,
  getKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(data.length / pageSize)
  const slice = data.slice(page * pageSize, (page + 1) * pageSize)
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, data.length)

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-purion">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.numeric ? 'right' : 'left' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ border: 'none' }}>
                  <div className="empty-state" style={{ height: 200 }}>
                    {EmptyIcon && <EmptyIcon size={32} style={{ opacity: 0.3, color: 'var(--text-secondary)' }} />}
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{emptyText}</p>
                    {emptySubtext && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, margin: 0 }}>{emptySubtext}</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              slice.map((row, i) => (
                <tr key={getKey ? getKey(row, i) : i}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.numeric ? 'td-mono' : undefined}
                    >
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Mostrando {from} a {to} de {data.length} registros
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="icon-btn"
              style={{ opacity: page === 0 ? 0.35 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="icon-btn"
              style={{ opacity: page >= totalPages - 1 ? 0.35 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

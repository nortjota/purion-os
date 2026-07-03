'use client'

import { useState } from 'react'
import { X, Layout } from 'lucide-react'
import { usePurionStore } from '@/store'

export const WIDGET_LIST: Array<{ id: string; label: string }> = [
  { id: 'kpis',               label: 'KPIs Principais'         },
  { id: 'health-score',       label: 'Health Score'            },
  { id: 'atividade',          label: 'Feed de Atividade'       },
  { id: 'tarefas-board',      label: 'Board de Tarefas'        },
  { id: 'pipeline-top5',      label: 'Top 5 Pipeline'          },
  { id: 'estoque',            label: 'Estoque'                 },
  { id: 'creators-top5',      label: 'Top 5 Creators'          },
  { id: 'grafico-financeiro', label: 'Gráfico Financeiro'      },
  { id: 'metas-progress',     label: 'Progresso de Metas'      },
  { id: 'metas-diarias',     label: 'Metas Diárias de hoje'   },
  { id: 'decisoes',           label: 'Decisões Estratégicas'   },
  { id: 'alertas',            label: 'Alertas Automáticos'     },
  { id: 'notas-fixadas',      label: 'Notas Fixadas'           },
]

export function WidgetCustomizer() {
  const [open, setOpen] = useState(false)
  const { dashboardWidgets, setDashboardWidgets } = usePurionStore()
  const [local, setLocal] = useState<string[]>(dashboardWidgets)

  function handleOpen() {
    setLocal([...dashboardWidgets])
    setOpen(true)
  }

  function handleToggle(id: string) {
    setLocal((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  function handleSave() {
    setDashboardWidgets(local)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
          cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
        }}
      >
        <Layout size={13} />
        Personalizar
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, width: 400, maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Personalizar Dashboard</h2>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--bg-surface-2)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
              {WIDGET_LIST.map((widget) => {
                const checked = local.includes(widget.id)
                return (
                  <label
                    key={widget.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: checked ? 'rgba(201,168,76,0.06)' : 'var(--bg-surface-2)',
                      border: `1px solid ${checked ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                      cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(widget.id)}
                      style={{ accentColor: '#C9A84C' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{widget.label}</span>
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

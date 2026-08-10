'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  addDays, differenceInDays, format, startOfDay,
  startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ZoomIn, ZoomOut, CalendarClock } from 'lucide-react'
import type { Tarefa } from '@/store'
import { PRIORIDADE_CONFIG, socioInfo, COLUNAS } from './tarefasHelpers'

interface Props {
  tarefas: Tarefa[]
  onAbrirTarefa: (t: Tarefa) => void
  onAtualizarTarefa: (id: string, dados: Partial<Tarefa>) => void
}

type Zoom = 'dias' | 'semanas' | 'meses'

const CELL_W: Record<Zoom, number> = { dias: 42, semanas: 12, meses: 5 }
const LEFT_W = 240   // largura do painel de nomes
const ROW_H  = 36    // altura de cada linha

interface DragState {
  taskId: string
  type: 'move' | 'resize'
  startX: number
  origStart: string | null
  origDue: string | null
  cellW: number
}

function toDateStr(d: Date): string { return format(d, 'yyyy-MM-dd') }

function calcRange(tarefas: Tarefa[]): { inicio: Date; fim: Date } {
  const datas: Date[] = []
  tarefas.forEach((t) => {
    if (t.startDate) datas.push(new Date(t.startDate))
    if (t.dueDate)   datas.push(new Date(t.dueDate))
  })
  const hoje = startOfDay(new Date())
  const min  = datas.length ? new Date(Math.min(...datas.map((d) => d.getTime()))) : addDays(hoje, -14)
  const max  = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : addDays(hoje, 60)
  return { inicio: addDays(min, -7), fim: addDays(max, 14) }
}

function buildHeader(inicio: Date, fim: Date, zoom: Zoom): Array<{ label: string; span: number }> {
  if (zoom === 'dias') {
    // month bands
    const meses: Array<{ label: string; span: number }> = []
    let cur = startOfMonth(inicio)
    while (cur <= fim) {
      const end = endOfMonth(cur)
      const dias = eachDayOfInterval({ start: cur < inicio ? inicio : cur, end: end > fim ? fim : end })
      meses.push({ label: format(cur, 'MMM yyyy', { locale: ptBR }), span: dias.length })
      cur = addDays(end, 1)
    }
    return meses
  }
  if (zoom === 'semanas') {
    // week bands (Mon label)
    const semanas: Array<{ label: string; span: number }> = []
    let cur = startOfWeek(inicio, { locale: ptBR })
    while (cur <= fim) {
      const end = addDays(cur, 6)
      const dias = differenceInDays(end > fim ? fim : end, cur < inicio ? inicio : cur) + 1
      semanas.push({ label: format(cur < inicio ? inicio : cur, 'dd/MM', { locale: ptBR }), span: dias })
      cur = addDays(end, 1)
    }
    return semanas
  }
  // meses
  const meses: Array<{ label: string; span: number }> = []
  let cur = startOfMonth(inicio)
  while (cur <= fim) {
    const end = endOfMonth(cur)
    const dias = differenceInDays(end > fim ? fim : end, cur < inicio ? inicio : cur) + 1
    meses.push({ label: format(cur, 'MMM yy', { locale: ptBR }), span: dias })
    cur = addDays(end, 1)
  }
  return meses
}

export function TarefaTimelineView({ tarefas, onAbrirTarefa, onAtualizarTarefa }: Props) {
  const [zoom, setZoom] = useState<Zoom>('semanas')
  const scrollRef        = useRef<HTMLDivElement>(null)
  const dragRef          = useRef<DragState | null>(null)
  const dragPreviewRef   = useRef<Record<string, { startDate: string | null; dueDate: string | null }>>({})
  const [dragPreview, setDragPreview] = useState<typeof dragPreviewRef.current>({})

  function applyDragPreview(next: typeof dragPreviewRef.current) {
    dragPreviewRef.current = next
    setDragPreview({ ...next })
  }

  const { com, sem } = useMemo(() => {
    const com: Tarefa[] = []
    const sem: Tarefa[] = []
    tarefas.forEach((t) => {
      if (t.dueDate || t.startDate) com.push(t)
      else sem.push(t)
    })
    return { com, sem }
  }, [tarefas])

  const { inicio, fim } = useMemo(() => calcRange(com), [com])
  const totalDias = differenceInDays(fim, inicio) + 1
  const cellW     = CELL_W[zoom]
  const totalW    = totalDias * cellW

  const header    = useMemo(() => buildHeader(inicio, fim, zoom), [inicio, fim, zoom])
  const hoje      = startOfDay(new Date())
  const hojeOffset = differenceInDays(hoje, inicio)

  /* ── Dias (sub-header) — only for 'dias' zoom ── */
  const diaLabels = useMemo(() => {
    if (zoom !== 'dias') return []
    return eachDayOfInterval({ start: inicio, end: fim }).map((d) => ({
      label: format(d, 'd'),
      isWeekend: [0, 6].includes(d.getDay()),
    }))
  }, [inicio, fim, zoom])

  /* ── Scroll to today on mount / zoom change ── */
  useEffect(() => {
    if (!scrollRef.current) return
    const x = Math.max(0, hojeOffset * cellW - scrollRef.current.clientWidth / 2)
    scrollRef.current.scrollLeft = x
  }, [zoom, hojeOffset, cellW])

  /* ── Drag handlers ── */
  // Stable refs for pointer handlers — no stale closure issues
  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const deltaDias = Math.round((e.clientX - d.startX) / d.cellW)
    if (d.type === 'move') {
      const newStart = d.origStart ? toDateStr(addDays(new Date(d.origStart), deltaDias)) : null
      const newDue   = d.origDue   ? toDateStr(addDays(new Date(d.origDue),   deltaDias)) : null
      applyDragPreview({ ...dragPreviewRef.current, [d.taskId]: { startDate: newStart, dueDate: newDue } })
    } else {
      const origDue = d.origDue ?? d.origStart ?? toDateStr(hoje)
      const newDue  = toDateStr(addDays(new Date(origDue), Math.max(0, deltaDias)))
      applyDragPreview({ ...dragPreviewRef.current, [d.taskId]: { startDate: d.origStart, dueDate: newDue } })
    }
  }, [hoje]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback(() => {
    const d = dragRef.current
    if (d) {
      const preview = dragPreviewRef.current[d.taskId]
      if (preview) {
        onAtualizarTarefa(d.taskId, {
          ...(preview.startDate !== undefined ? { startDate: preview.startDate } : {}),
          ...(preview.dueDate   !== undefined ? { dueDate:   preview.dueDate }   : {}),
        })
      }
    }
    dragRef.current = null
    applyDragPreview({})
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onAtualizarTarefa, onPointerMove]) // eslint-disable-line react-hooks/exhaustive-deps

  function startDrag(e: React.PointerEvent, task: Tarefa, type: 'move' | 'resize') {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      taskId: task.id, type,
      startX: e.clientX,
      origStart: task.startDate,
      origDue: task.dueDate,
      cellW,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function barProps(task: Tarefa): { left: number; width: number } {
    const preview = dragPreview[task.id]
    const sd = (preview?.startDate ?? task.startDate) ?? (preview?.dueDate ?? task.dueDate)
    const dd = (preview?.dueDate   ?? task.dueDate)   ?? sd
    if (!sd || !dd) return { left: 0, width: cellW }
    const left  = Math.max(0, differenceInDays(new Date(sd), inicio)) * cellW
    const width = Math.max(cellW, (differenceInDays(new Date(dd), new Date(sd)) + 1) * cellW)
    return { left, width }
  }

  const subHeaderH = zoom === 'dias' ? 22 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', userSelect: 'none' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <CalendarClock size={15} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          Cronograma
        </span>
        <div style={{ display: 'flex', gap: 1, padding: 2, borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          {(['dias', 'semanas', 'meses'] as Zoom[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} style={{
              height: 26, padding: '0 10px', borderRadius: 5, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', border: 'none', textTransform: 'capitalize',
              background: zoom === z ? '#C9A84C' : 'transparent',
              color: zoom === z ? '#0D0D0D' : 'var(--text-secondary)',
            }}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setZoom((z) => z === 'dias' ? 'semanas' : z === 'semanas' ? 'meses' : 'dias')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
          <ZoomOut size={15} />
        </button>
        <button onClick={() => setZoom((z) => z === 'meses' ? 'semanas' : z === 'semanas' ? 'dias' : 'meses')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
          <ZoomIn size={15} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel (task names) ── */}
        <div style={{
          width: LEFT_W, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* spacer to match timeline header */}
          <div style={{ height: 28 + subHeaderH, flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }} />
          <div style={{ flex: 1, overflowY: 'auto' }} id="gantt-left-scroll">
            {com.map((task) => {
              const info = socioInfo(task.responsavel)
              const prio = PRIORIDADE_CONFIG[task.prioridade]
              return (
                <div key={task.id}
                  onClick={() => onAbrirTarefa(task)}
                  style={{
                    height: ROW_H, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 12px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    width: 4, height: 16, borderRadius: 2, flexShrink: 0,
                    background: prio.cor,
                  }} />
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 800,
                    background: `${info.cor}22`, color: info.cor,
                  }}>
                    {info.inicial}
                  </span>
                  <span style={{
                    fontSize: 12, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {task.titulo}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right panel (timeline) ── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
          onScroll={(e) => {
            // sync left scroll
            const leftScroll = document.getElementById('gantt-left-scroll')
            if (leftScroll) leftScroll.scrollTop = (e.currentTarget.scrollTop ?? 0)
          }}
        >
          <div style={{ width: totalW, display: 'flex', flexDirection: 'column', minWidth: '100%' }}>

            {/* ── Top header (months / weeks / months) ── */}
            <div style={{ display: 'flex', height: 28, flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
              {header.map((h, i) => (
                <div key={i} style={{
                  width: h.span * cellW, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                  textTransform: 'capitalize', overflow: 'hidden',
                }}>
                  {h.span * cellW > 30 ? h.label : ''}
                </div>
              ))}
            </div>

            {/* ── Sub-header (day numbers, only in dias zoom) ── */}
            {zoom === 'dias' && (
              <div style={{ display: 'flex', height: subHeaderH, flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {diaLabels.map((dl, i) => (
                  <div key={i} style={{
                    width: cellW, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 10,
                    color: dl.isWeekend ? 'rgba(184,184,184,0.4)' : 'var(--text-secondary)',
                  }}>
                    {dl.label}
                  </div>
                ))}
              </div>
            )}

            {/* ── Grid + bars ── */}
            <div style={{ position: 'relative', flex: 1, overflowY: 'auto' }}>

              {/* Background grid lines */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                {Array.from({ length: totalDias }).map((_, i) => {
                  const date = addDays(inicio, i)
                  const isWeekend = [0, 6].includes(date.getDay())
                  return (
                    <div key={i} style={{
                      width: cellW, flexShrink: 0, height: '100%',
                      borderRight: '1px solid rgba(255,255,255,0.04)',
                      background: isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                    }} />
                  )
                })}
              </div>

              {/* Today line */}
              {hojeOffset >= 0 && hojeOffset <= totalDias && (
                <div style={{
                  position: 'absolute',
                  left: hojeOffset * cellW + cellW / 2,
                  top: 0, bottom: 0, width: 2,
                  background: 'rgba(201,168,76,0.7)',
                  zIndex: 10, pointerEvents: 'none',
                  borderRadius: 1,
                }} />
              )}

              {/* Task rows */}
              {com.map((task) => {
                const { left, width } = barProps(task)
                const prio = PRIORIDADE_CONFIG[task.prioridade]
                const isDragging = dragPreview[task.id] !== undefined
                const status = COLUNAS.find((c) => c.id === task.status)

                return (
                  <div key={task.id} style={{
                    height: ROW_H, position: 'relative',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {/* Bar */}
                    <div
                      onPointerDown={(e) => startDrag(e, task, 'move')}
                      onClick={() => !isDragging && onAbrirTarefa(task)}
                      style={{
                        position: 'absolute',
                        left, top: 6, height: ROW_H - 12,
                        width: Math.max(width, 4),
                        borderRadius: 5,
                        background: `${prio.cor}CC`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        display: 'flex', alignItems: 'center',
                        overflow: 'hidden',
                        boxShadow: isDragging ? `0 2px 12px ${prio.cor}50` : 'none',
                        transition: isDragging ? 'none' : 'box-shadow 150ms',
                        zIndex: isDragging ? 20 : 1,
                        border: `1px solid ${prio.cor}80`,
                      }}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#0D0D0D',
                        padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {width > 40 ? task.titulo : ''}
                      </span>

                      {/* Status indicator dot */}
                      {status && (
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: status.cor, flexShrink: 0, marginLeft: 'auto', marginRight: 6,
                        }} />
                      )}

                      {/* Resize handle */}
                      <div
                        onPointerDown={(e) => { e.stopPropagation(); startDrag(e, task, 'resize') }}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                          cursor: 'ew-resize',
                          background: 'rgba(0,0,0,0.15)',
                          borderRadius: '0 5px 5px 0',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tarefas sem data ── */}
      {sem.length > 0 && (
        <div style={{
          padding: '8px 16px', flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
            Sem datas ({sem.length}):
          </span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
            {sem.slice(0, 10).map((t) => {
              const prio = PRIORIDADE_CONFIG[t.prioridade]
              return (
                <button
                  key={t.id}
                  onClick={() => onAbrirTarefa(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                    background: `${prio.cor}15`, border: `1px solid ${prio.cor}25`,
                    cursor: 'pointer', fontSize: 11, color: 'var(--text-primary)', flexShrink: 0,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: prio.cor }} />
                  {t.titulo}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

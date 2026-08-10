'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, format,
  addDays, startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Tarefa } from '@/store'
import { PRIORIDADE_CONFIG, SOCIOS, socioInfo } from './tarefasHelpers'

interface Props {
  tarefas: Tarefa[]
  onAbrirTarefa: (t: Tarefa) => void
  onNovaTarefa: (dueDate: string) => void
  onAtualizarTarefa: (id: string, dados: Partial<Tarefa>) => void
}

type ViewMode = 'mes' | 'semana'

const DIA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function tarefaCorBg(t: Tarefa): string {
  const cfg = PRIORIDADE_CONFIG[t.prioridade]
  return cfg.cor
}

export function TarefaCalendarView({ tarefas, onAbrirTarefa, onNovaTarefa, onAtualizarTarefa }: Props) {
  const [dataRef, setDataRef] = useState(() => startOfDay(new Date()))
  const [mode, setMode] = useState<ViewMode>('mes')
  const [dragTarefaId, setDragTarefaId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  /* ── Compute dias a exibir ── */
  const dias = useMemo(() => {
    if (mode === 'mes') {
      const inicio = startOfWeek(startOfMonth(dataRef), { locale: ptBR })
      const fim    = endOfWeek(endOfMonth(dataRef), { locale: ptBR })
      return eachDayOfInterval({ start: inicio, end: fim })
    } else {
      const inicio = startOfWeek(dataRef, { locale: ptBR })
      return eachDayOfInterval({ start: inicio, end: addDays(inicio, 6) })
    }
  }, [dataRef, mode])

  /* ── Tarefas por dia ── */
  const tarefasPorDia = useMemo(() => {
    const mapa: Record<string, Tarefa[]> = {}
    tarefas.forEach((t) => {
      if (!t.dueDate) return
      const key = t.dueDate.slice(0, 10)
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(t)
    })
    return mapa
  }, [tarefas])

  const mesAtual = startOfMonth(dataRef)

  function navAnterior() {
    setDataRef((d) => mode === 'mes' ? subMonths(d, 1) : addDays(d, -7))
  }
  function navProximo() {
    setDataRef((d) => mode === 'mes' ? addMonths(d, 1) : addDays(d, 7))
  }
  function irHoje() {
    setDataRef(startOfDay(new Date()))
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault()
    const id = e.dataTransfer.getData('tarefaId')
    if (!id) return
    const novaData = format(date, 'yyyy-MM-dd')
    onAtualizarTarefa(id, { dueDate: novaData })
    setDragTarefaId(null)
    setDragOverDate(null)
  }

  const tituloHeader = mode === 'mes'
    ? format(mesAtual, 'MMMM yyyy', { locale: ptBR })
    : `${format(dias[0], 'dd MMM', { locale: ptBR })} — ${format(dias[6], 'dd MMM yyyy', { locale: ptBR })}`

  const totalColunas = 7
  const alturaMinCell = mode === 'mes' ? 100 : 200

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={irHoje}
          style={{
            height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          Hoje
        </button>

        <button onClick={navAnterior} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <button onClick={navProximo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={18} />
        </button>

        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textTransform: 'capitalize' }}>
          {tituloHeader}
        </span>

        {/* Mês / Semana toggle */}
        <div style={{
          display: 'flex', gap: 1, padding: 2, borderRadius: 6,
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
        }}>
          {(['mes', 'semana'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              height: 26, padding: '0 10px', borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              border: 'none',
              background: mode === m ? '#C9A84C' : 'transparent',
              color: mode === m ? '#0D0D0D' : 'var(--text-secondary)',
              textTransform: 'capitalize',
            }}>
              {m === 'mes' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade de dias ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header com dias da semana */}
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${totalColunas}, 1fr)`,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {DIA_LABELS.map((d) => (
            <div key={d} style={{
              padding: '6px 0', textAlign: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalColunas}, 1fr)`,
          flex: 1,
        }}>
          {dias.map((dia) => {
            const key    = format(dia, 'yyyy-MM-dd')
            const tarefasDia = tarefasPorDia[key] ?? []
            const hoje   = isToday(dia)
            const outroMes = mode === 'mes' && !isSameMonth(dia, mesAtual)
            const isDragOver = dragOverDate === key

            return (
              <div
                key={key}
                style={{
                  minHeight: alturaMinCell,
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  padding: '4px 6px',
                  background: isDragOver
                    ? 'rgba(201,168,76,0.06)'
                    : outroMes ? 'rgba(0,0,0,0.06)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 120ms',
                  position: 'relative',
                }}
                onClick={() => onNovaTarefa(key)}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(key) }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDrop(e, dia)}
              >
                {/* Número do dia */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%',
                  fontSize: 12, fontWeight: hoje ? 700 : 400,
                  background: hoje ? '#C9A84C' : 'transparent',
                  color: hoje ? '#0D0D0D' : outroMes ? 'rgba(184,184,184,0.4)' : 'var(--text-primary)',
                  marginBottom: 4,
                }}>
                  {format(dia, 'd')}
                </div>

                {/* Tarefas do dia */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tarefasDia.slice(0, 4).map((t) => {
                    const cor = tarefaCorBg(t)
                    const info = socioInfo(t.responsavel)
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('tarefaId', t.id)
                          e.stopPropagation()
                          setDragTarefaId(t.id)
                        }}
                        onDragEnd={() => { setDragTarefaId(null); setDragOverDate(null) }}
                        onClick={(e) => { e.stopPropagation(); onAbrirTarefa(t) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 5px', borderRadius: 4,
                          background: `${cor}18`,
                          border: `1px solid ${cor}30`,
                          cursor: 'pointer',
                          opacity: dragTarefaId === t.id ? 0.4 : 1,
                          transition: 'opacity 150ms',
                        }}
                      >
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: cor, flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 10, color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                        }}>
                          {t.titulo}
                        </span>
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, fontWeight: 800,
                          background: `${info.cor}22`, color: info.cor,
                        }}>
                          {info.inicial}
                        </span>
                      </div>
                    )
                  })}
                  {tarefasDia.length > 4 && (
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', paddingLeft: 4 }}>
                      +{tarefasDia.length - 4} mais
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tarefas sem prazo ── */}
      {tarefas.filter((t) => !t.dueDate).length > 0 && (
        <div style={{
          padding: '10px 20px', flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Calendar size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Sem prazo: {tarefas.filter((t) => !t.dueDate).length} tarefa{tarefas.filter((t) => !t.dueDate).length > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
            {tarefas.filter((t) => !t.dueDate).slice(0, 8).map((t) => {
              const cor = tarefaCorBg(t)
              return (
                <button
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('tarefaId', t.id)
                    setDragTarefaId(t.id)
                  }}
                  onDragEnd={() => setDragTarefaId(null)}
                  onClick={() => onAbrirTarefa(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                    background: `${cor}15`, border: `1px solid ${cor}25`,
                    cursor: 'grab', fontSize: 11, color: 'var(--text-primary)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: cor }} />
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

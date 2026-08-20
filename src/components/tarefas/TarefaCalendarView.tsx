'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameMonth, isToday, format,
  addDays, startOfDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Tarefa } from '@/store'
import { PRIORIDADE_CONFIG, socioInfo } from './tarefasHelpers'

import { useMobile } from '@/hooks/useMobile'

interface Props {
  tarefas: Tarefa[]
  onAbrirTarefa: (t: Tarefa) => void
  onNovaTarefa: (dueDate: string) => void
  onAtualizarTarefa: (id: string, dados: Partial<Tarefa>) => void
}

type ViewMode = 'mes' | 'semana'

const DIA_LABELS_FULL  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_LABELS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function tarefaCor(t: Tarefa): string {
  return PRIORIDADE_CONFIG[t.prioridade].cor
}

export function TarefaCalendarView({ tarefas, onAbrirTarefa, onNovaTarefa, onAtualizarTarefa }: Props) {
  const isMobile = useMobile()
  const [dataRef, setDataRef] = useState(() => startOfDay(new Date()))

  // mobile defaults to semana para células maiores
  const [mode, setMode] = useState<ViewMode>(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 'semana' : 'mes')
  const [dragTarefaId, setDragTarefaId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // se resize altera mobile, ajusta modo
  useEffect(() => {
    if (isMobile && mode === 'mes') setMode('semana')
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  const dias = useMemo(() => {
    if (mode === 'mes') {
      const inicio = startOfWeek(startOfMonth(dataRef), { locale: ptBR })
      const fim    = endOfWeek(endOfMonth(dataRef), { locale: ptBR })
      return eachDayOfInterval({ start: inicio, end: fim })
    }
    const inicio = startOfWeek(dataRef, { locale: ptBR })
    return eachDayOfInterval({ start: inicio, end: addDays(inicio, 6) })
  }, [dataRef, mode])

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

  function navAnterior() { setDataRef((d) => mode === 'mes' ? subMonths(d, 1) : addDays(d, -7)) }
  function navProximo()  { setDataRef((d) => mode === 'mes' ? addMonths(d, 1) : addDays(d, 7))  }
  function irHoje()      { setDataRef(startOfDay(new Date())) }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault()
    const id = e.dataTransfer.getData('tarefaId')
    if (!id) return
    onAtualizarTarefa(id, { dueDate: format(date, 'yyyy-MM-dd') })
    setDragTarefaId(null)
    setDragOverDate(null)
  }

  const tituloHeader = mode === 'mes'
    ? format(mesAtual, 'MMMM yyyy', { locale: ptBR })
    : `${format(dias[0], "dd 'de' MMM", { locale: ptBR })} — ${format(dias[6], "dd 'de' MMM", { locale: ptBR })}`

  // quantas tarefas mostrar por célula depende do modo e dispositivo
  const maxChipsPorCelula = isMobile ? (mode === 'semana' ? 5 : 1) : (mode === 'semana' ? 8 : 3)
  const alturaMinCell = mode === 'semana'
    ? (isMobile ? 140 : 200)
    : (isMobile ? 64 : 100)

  const diaLabels = isMobile ? DIA_LABELS_SHORT : DIA_LABELS_FULL
  const semPrazo  = tarefas.filter((t) => !t.dueDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
        padding: isMobile ? '10px 14px' : '12px 20px',
        flexShrink: 0, borderBottom: '1px solid var(--border)',
      }}>
        {!isMobile && (
          <button onClick={irHoje} style={{ height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Hoje
          </button>
        )}

        <button onClick={navAnterior} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 4 }}>
          <ChevronLeft size={isMobile ? 22 : 18} />
        </button>
        <button onClick={navProximo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 4 }}>
          <ChevronRight size={isMobile ? 22 : 18} />
        </button>

        <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textTransform: 'capitalize' }}>
          {tituloHeader}
        </span>

        {isMobile && (
          <button onClick={irHoje} style={{ height: 30, padding: '0 10px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
            Hoje
          </button>
        )}

        {/* Mês / Semana toggle */}
        <div style={{ display: 'flex', gap: 1, padding: 2, borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          {(['mes', 'semana'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              height: isMobile ? 30 : 26, padding: isMobile ? '0 12px' : '0 10px',
              borderRadius: 5, fontSize: isMobile ? 12 : 11, fontWeight: 500, cursor: 'pointer',
              border: 'none',
              background: mode === m ? '#C9A84C' : 'transparent',
              color: mode === m ? '#0D0D0D' : 'var(--text-secondary)',
            }}>
              {m === 'mes' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {diaLabels.map((d, i) => (
            <div key={i} style={{ padding: isMobile ? '5px 0' : '6px 0', textAlign: 'center', fontSize: isMobile ? 10 : 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {dias.map((dia) => {
            const key        = format(dia, 'yyyy-MM-dd')
            const tarefasDia = tarefasPorDia[key] ?? []
            const ehHoje     = isToday(dia)
            const outroMes   = mode === 'mes' && !isSameMonth(dia, mesAtual)
            const isDragOver = dragOverDate === key
            const extra      = tarefasDia.length - maxChipsPorCelula

            return (
              <div
                key={key}
                style={{
                  minHeight: alturaMinCell,
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  padding: isMobile ? '3px 4px' : '4px 6px',
                  background: isDragOver ? 'rgba(201,168,76,0.06)' : outroMes ? 'rgba(0,0,0,0.05)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                onClick={() => onNovaTarefa(key)}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(key) }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDrop(e, dia)}
              >
                {/* Número do dia */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: isMobile ? 22 : 24, height: isMobile ? 22 : 24, borderRadius: '50%',
                  fontSize: isMobile ? 11 : 12, fontWeight: ehHoje ? 700 : 400,
                  background: ehHoje ? '#C9A84C' : 'transparent',
                  color: ehHoje ? '#0D0D0D' : outroMes ? 'rgba(184,184,184,0.3)' : 'var(--text-primary)',
                  marginBottom: 2,
                }}>
                  {format(dia, 'd')}
                </div>

                {/* Chips de tarefas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {tarefasDia.slice(0, maxChipsPorCelula).map((t) => {
                    const cor  = tarefaCor(t)
                    const info = socioInfo(t.responsavel)
                    return (
                      <div
                        key={t.id}
                        draggable={!isMobile}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('tarefaId', t.id)
                          e.stopPropagation()
                          setDragTarefaId(t.id)
                        }}
                        onDragEnd={() => { setDragTarefaId(null); setDragOverDate(null) }}
                        onClick={(e) => { e.stopPropagation(); onAbrirTarefa(t) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: isMobile ? '3px 5px' : '2px 5px',
                          borderRadius: 4,
                          background: `${cor}18`, border: `1px solid ${cor}28`,
                          cursor: 'pointer',
                          opacity: dragTarefaId === t.id ? 0.4 : 1,
                          minHeight: isMobile ? 24 : 'auto',
                        }}
                      >
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                        <span style={{ fontSize: isMobile ? 10 : 10, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {t.titulo}
                        </span>
                        {!isMobile && (
                          <span style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 800, background: `${info.cor}22`, color: info.cor }}>
                            {info.inicial}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {extra > 0 && (
                    <span style={{ fontSize: 10, color: '#C9A84C', paddingLeft: 4, fontWeight: 600 }}>
                      +{extra}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Sem prazo ── */}
      {semPrazo.length > 0 && (
        <div style={{
          padding: isMobile ? '8px 14px' : '10px 20px', flexShrink: 0,
          borderTop: '1px solid var(--border)', background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Calendar size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
            Sem prazo ({semPrazo.length})
          </span>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
            {semPrazo.slice(0, isMobile ? 4 : 8).map((t) => {
              const cor = tarefaCor(t)
              return (
                <button
                  key={t.id}
                  draggable={!isMobile}
                  onDragStart={(e) => { e.dataTransfer.setData('tarefaId', t.id); setDragTarefaId(t.id) }}
                  onDragEnd={() => setDragTarefaId(null)}
                  onClick={() => onAbrirTarefa(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                    background: `${cor}15`, border: `1px solid ${cor}25`,
                    cursor: 'pointer', fontSize: 11, color: 'var(--text-primary)', flexShrink: 0,
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

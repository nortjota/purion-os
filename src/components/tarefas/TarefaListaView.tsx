'use client'

import React, { useState, useMemo } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, AlertTriangle, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import type { Tarefa } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import {
  STATUS_LABEL, PRIORIDADE_CONFIG, socioInfo, prazoVisual,
  type ColunaTarefa, type GroupBy,
  SOCIOS, MODULOS, COLUNAS,
} from './tarefasHelpers'

type CampoOrdenacao = 'titulo' | 'responsavel' | 'prioridade' | 'status' | 'dueDate' | 'subtarefas'
type Direcao = 'asc' | 'desc'

const PRIO_PESO: Record<string, number> = { baixa: 0, media: 1, alta: 2, urgente: 3 }
const STATUS_PESO: Record<string, number> = { pendente: 0, em_andamento: 1, bloqueada: 2, concluida: 3, cancelada: 4 }

function compararTarefas(a: Tarefa, b: Tarefa, campo: CampoOrdenacao): number {
  switch (campo) {
    case 'titulo':      return a.titulo.localeCompare(b.titulo)
    case 'responsavel': return a.responsavel.localeCompare(b.responsavel)
    case 'prioridade':  return PRIO_PESO[a.prioridade] - PRIO_PESO[b.prioridade]
    case 'status':      return STATUS_PESO[a.status] - STATUS_PESO[b.status]
    case 'dueDate':     return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    case 'subtarefas': {
      const pa = a.subtarefas.length ? a.subtarefas.filter((s) => s.concluida).length / a.subtarefas.length : -1
      const pb = b.subtarefas.length ? b.subtarefas.filter((s) => s.concluida).length / b.subtarefas.length : -1
      return pa - pb
    }
    default: return 0
  }
}

function gruposDeGroupBy(tarefas: Tarefa[], groupBy: GroupBy): Array<{ id: string; label: string; cor?: string; tarefas: Tarefa[] }> {
  if (groupBy === 'none') {
    return [{ id: 'all', label: 'Todas as tarefas', tarefas }]
  }
  if (groupBy === 'status') {
    return COLUNAS.map((col) => ({
      id: col.id, label: col.label, cor: col.cor,
      tarefas: tarefas.filter((t) => t.status === col.id),
    })).filter((g) => g.tarefas.length > 0)
  }
  if (groupBy === 'responsavel') {
    return SOCIOS.map((s) => ({
      id: s.id, label: s.nome, cor: s.cor,
      tarefas: tarefas.filter((t) => t.responsavel === s.id),
    })).filter((g) => g.tarefas.length > 0)
  }
  if (groupBy === 'prioridade') {
    return (['urgente', 'alta', 'media', 'baixa'] as const).map((p) => {
      const cfg = PRIORIDADE_CONFIG[p]
      return {
        id: p, label: cfg.label, cor: cfg.cor,
        tarefas: tarefas.filter((t) => t.prioridade === p),
      }
    }).filter((g) => g.tarefas.length > 0)
  }
  // modulo
  const modulosPresentes = [...new Set([...MODULOS.filter((m) => tarefas.some((t) => t.modulo === m)), ...tarefas.map((t) => t.modulo).filter((m) => !MODULOS.includes(m as never))])]
  return modulosPresentes.map((m) => ({
    id: m, label: m.charAt(0).toUpperCase() + m.slice(1),
    tarefas: tarefas.filter((t) => t.modulo === m),
  })).filter((g) => g.tarefas.length > 0)
}

interface TarefaListaViewProps {
  tarefas: Tarefa[]
  groupBy: GroupBy
  onAbrirTarefa: (tarefa: Tarefa) => void
  onConcluirRapido: (tarefa: Tarefa) => void
  onNovaTarefa: (colunaId: ColunaTarefa) => void
}

function ThSortable({ label, campo, ordenacao, onSort }: {
  label: string; campo: CampoOrdenacao
  ordenacao: { campo: CampoOrdenacao; direcao: Direcao }
  onSort: (campo: CampoOrdenacao) => void
}) {
  const ativo = ordenacao.campo === campo
  return (
    <th onClick={() => onSort(campo)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {ativo
          ? (ordenacao.direcao === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)
          : <ArrowUpDown size={10} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  )
}

function GrupoHeader({ label, cor, count, collapsed, onToggle }: {
  label: string; cor?: string; count: number; collapsed: boolean; onToggle: () => void
}) {
  return (
    <tr>
      <td colSpan={8} style={{ padding: 0 }}>
        <button
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px',
            background: 'var(--bg-surface-2)', border: 'none', cursor: 'pointer',
            borderBottom: '1px solid var(--border)',
            textAlign: 'left',
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          {cor && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
            {label}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
            background: cor ? `${cor}20` : 'var(--bg-surface)',
            color: cor ?? 'var(--text-secondary)',
            border: `1px solid ${cor ? `${cor}30` : 'var(--border)'}`,
          }}>
            {count}
          </span>
        </button>
      </td>
    </tr>
  )
}

function TarefaLinha({ t, onAbrirTarefa, onConcluirRapido }: {
  t: Tarefa
  onAbrirTarefa: (t: Tarefa) => void
  onConcluirRapido: (t: Tarefa) => void
}) {
  const prio = PRIORIDADE_CONFIG[t.prioridade]
  const info = socioInfo(t.responsavel)
  const prazo = prazoVisual(t.dueDate, t.status)
  const subTotal = t.subtarefas.length
  const subFeitas = t.subtarefas.filter((s) => s.concluida).length
  const concluida = t.status === 'concluida'

  return (
    <tr
      onClick={() => onAbrirTarefa(t)}
      style={{ cursor: 'pointer' }}
      className="hover:bg-[rgba(201,168,76,0.03)]"
    >
      <td onClick={(e) => e.stopPropagation()} style={{ width: 36 }}>
        <input
          type="checkbox"
          checked={concluida}
          onChange={() => onConcluirRapido(t)}
          style={{ accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }}
        />
      </td>
      <td style={{ maxWidth: 320 }}>
        <span style={{
          textDecoration: concluida ? 'line-through' : 'none',
          color: concluida ? 'var(--text-secondary)' : 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {t.titulo}
          {t.status === 'bloqueada' && <AlertTriangle size={11} style={{ color: '#E8A838', flexShrink: 0 }} />}
        </span>
      </td>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800,
            backgroundColor: `${info.cor}22`, color: info.cor,
          }}>
            {info.inicial}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{info.nome}</span>
        </span>
      </td>
      <td>
        {t.dueDate ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: prazo?.cor ?? 'var(--text-secondary)' }}>
            {prazo?.label || formatarDataBR(t.dueDate)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
        )}
      </td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: prio.bg, color: prio.cor,
        }}>
          {prio.label}
        </span>
      </td>
      <td>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {t.modulo || '—'}
        </span>
      </td>
      <td>
        {subTotal > 0 ? (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {subFeitas}/{subTotal}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>—</span>
        )}
      </td>
      <td>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {STATUS_LABEL[t.status]}
        </span>
      </td>
    </tr>
  )
}

export function TarefaListaView({ tarefas, groupBy, onAbrirTarefa, onConcluirRapido, onNovaTarefa }: TarefaListaViewProps) {
  const isMobile = useMobile()
  const [ordenacao, setOrdenacao] = useState<{ campo: CampoOrdenacao; direcao: Direcao }>({ campo: 'dueDate', direcao: 'asc' })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  function handleSort(campo: CampoOrdenacao) {
    setOrdenacao((prev) => prev.campo === campo
      ? { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
      : { campo, direcao: 'asc' })
  }

  function toggleGrupo(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const ordenadas = useMemo(() => {
    const sorted = [...tarefas].sort((a, b) => compararTarefas(a, b, ordenacao.campo))
    return ordenacao.direcao === 'desc' ? sorted.reverse() : sorted
  }, [tarefas, ordenacao])

  const grupos = useMemo(() => gruposDeGroupBy(ordenadas, groupBy), [ordenadas, groupBy])

  if (tarefas.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhuma tarefa encontrada</p>
        <p className="empty-state-subtitle">Crie uma nova tarefa ou ajuste os filtros.</p>
      </div>
    )
  }

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {grupos.map((grupo) => (
          <div key={grupo.id}>
            {groupBy !== 'none' && (
              <button
                onClick={() => toggleGrupo(grupo.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'none', border: 'none', padding: '4px 0 8px', cursor: 'pointer',
                }}
              >
                {collapsed[grupo.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {grupo.cor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: grupo.cor }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{grupo.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{grupo.tarefas.length}</span>
              </button>
            )}
            {!collapsed[grupo.id] && grupo.tarefas.map((t) => {
              const prio = PRIORIDADE_CONFIG[t.prioridade]
              const info = socioInfo(t.responsavel)
              const prazo = prazoVisual(t.dueDate, t.status)
              return (
                <button
                  key={t.id}
                  onClick={() => onAbrirTarefa(t)}
                  className="mobile-card-item text-left w-full"
                  style={{ marginBottom: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{t.titulo}</p>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800,
                      backgroundColor: `${info.cor}22`, color: info.cor,
                    }}>
                      {info.inicial}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: prio.bg, color: prio.cor }}>
                      {prio.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{STATUS_LABEL[t.status]}</span>
                    {t.dueDate && prazo && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: prazo.cor }}>
                        {prazo.label || formatarDataBR(t.dueDate)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  /* ── Desktop ── */
  return (
    <div className="card-purion" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-purion" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ minWidth: 220 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <ThSortable label="Nome"         campo="titulo"     ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Responsável"  campo="responsavel" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Prazo"        campo="dueDate"    ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Prioridade"   campo="prioridade" ordenacao={ordenacao} onSort={handleSort} />
              <th>Área</th>
              <ThSortable label="Subtarefas"   campo="subtarefas" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Status"       campo="status"     ordenacao={ordenacao} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <React.Fragment key={grupo.id}>
                {groupBy !== 'none' && (
                  <GrupoHeader
                    label={grupo.label}
                    cor={grupo.cor}
                    count={grupo.tarefas.length}
                    collapsed={!!collapsed[grupo.id]}
                    onToggle={() => toggleGrupo(grupo.id)}
                  />
                )}
                {!collapsed[grupo.id] && grupo.tarefas.map((t) => (
                  <TarefaLinha
                    key={t.id}
                    t={t}
                    onAbrirTarefa={onAbrirTarefa}
                    onConcluirRapido={onConcluirRapido}
                  />
                ))}
                {!collapsed[grupo.id] && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <button
                        onClick={() => onNovaTarefa('pendente')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          width: '100%', padding: '8px 12px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--text-secondary)', fontSize: 12,
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <Plus size={12} /> Adicionar tarefa
                      </button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { CampoOrdenacao, Direcao }

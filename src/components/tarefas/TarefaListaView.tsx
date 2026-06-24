'use client'

import { useState, useMemo } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, AlertTriangle } from 'lucide-react'
import type { Tarefa } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import { STATUS_LABEL, PRIORIDADE_CONFIG, socioInfo, prazoVisual } from './tarefasHelpers'

type CampoOrdenacao = 'titulo' | 'responsavel' | 'prioridade' | 'status' | 'dueDate' | 'subtarefas'
type Direcao = 'asc' | 'desc'

const PRIO_PESO: Record<string, number> = { baixa: 0, media: 1, alta: 2, urgente: 3 }
const STATUS_PESO: Record<string, number> = { pendente: 0, em_andamento: 1, bloqueada: 2, concluida: 3, cancelada: 4 }

interface TarefaListaViewProps {
  tarefas: Tarefa[]
  onAbrirTarefa: (tarefa: Tarefa) => void
  onConcluirRapido: (tarefa: Tarefa) => void
}

function compararTarefas(a: Tarefa, b: Tarefa, campo: CampoOrdenacao): number {
  switch (campo) {
    case 'titulo':       return a.titulo.localeCompare(b.titulo)
    case 'responsavel':  return a.responsavel.localeCompare(b.responsavel)
    case 'prioridade':   return PRIO_PESO[a.prioridade] - PRIO_PESO[b.prioridade]
    case 'status':       return STATUS_PESO[a.status] - STATUS_PESO[b.status]
    case 'dueDate':       return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    case 'subtarefas': {
      const pa = a.subtarefas.length ? a.subtarefas.filter((s) => s.concluida).length / a.subtarefas.length : -1
      const pb = b.subtarefas.length ? b.subtarefas.filter((s) => s.concluida).length / b.subtarefas.length : -1
      return pa - pb
    }
    default: return 0
  }
}

function ThSortable({ label, campo, ordenacao, onSort }: {
  label: string; campo: CampoOrdenacao
  ordenacao: { campo: CampoOrdenacao; direcao: Direcao }
  onSort: (campo: CampoOrdenacao) => void
}) {
  const ativo = ordenacao.campo === campo
  return (
    <th onClick={() => onSort(campo)} style={{ cursor: 'pointer' }}>
      <span className="inline-flex items-center gap-1">
        {label}
        {ativo
          ? (ordenacao.direcao === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)
          : <ArrowUpDown size={10} className="opacity-30" />}
      </span>
    </th>
  )
}

export function TarefaListaView({ tarefas, onAbrirTarefa, onConcluirRapido }: TarefaListaViewProps) {
  const isMobile = useMobile()
  const [ordenacao, setOrdenacao] = useState<{ campo: CampoOrdenacao; direcao: Direcao }>({ campo: 'dueDate', direcao: 'asc' })

  function handleSort(campo: CampoOrdenacao) {
    setOrdenacao((prev) => prev.campo === campo
      ? { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
      : { campo, direcao: 'asc' })
  }

  const ordenadas = useMemo(() => {
    const sorted = [...tarefas].sort((a, b) => compararTarefas(a, b, ordenacao.campo))
    return ordenacao.direcao === 'desc' ? sorted.reverse() : sorted
  }, [tarefas, ordenacao])

  if (tarefas.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhuma tarefa aqui ainda</p>
        <p className="empty-state-subtitle">Crie uma nova tarefa ou ajuste os filtros.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2.5">
        {ordenadas.map((t) => {
          const prio = PRIORIDADE_CONFIG[t.prioridade]
          const info = socioInfo(t.responsavel)
          const prazo = prazoVisual(t.dueDate, t.status)
          const subTotal = t.subtarefas.length
          const subFeitas = t.subtarefas.filter((s) => s.concluida).length
          return (
            <button key={t.id} onClick={() => onAbrirTarefa(t)} className="mobile-card-item text-left w-full">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] flex-1">{t.titulo}</p>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: `${info.cor}25`, color: info.cor }}>
                  {info.inicial}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: prio.bg, color: prio.cor }}>{prio.label}</span>
                <span className="caption">{STATUS_LABEL[t.status]}</span>
                {t.dueDate && prazo && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: prazo.bg, color: prazo.cor }}>
                    {prazo.label || formatarDataBR(t.dueDate)}
                  </span>
                )}
                {subTotal > 0 && <span className="caption">{subFeitas}/{subTotal} subtarefas</span>}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card-purion overflow-hidden">
      <div style={{ overflowX: 'auto' }}>
        <table className="table-purion">
          <thead>
            <tr>
              <th style={{ width: 36 }} />
              <ThSortable label="Título" campo="titulo" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Responsável" campo="responsavel" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Prioridade" campo="prioridade" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Status" campo="status" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Prazo" campo="dueDate" ordenacao={ordenacao} onSort={handleSort} />
              <ThSortable label="Subtarefas" campo="subtarefas" ordenacao={ordenacao} onSort={handleSort} />
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((t) => {
              const prio = PRIORIDADE_CONFIG[t.prioridade]
              const info = socioInfo(t.responsavel)
              const prazo = prazoVisual(t.dueDate, t.status)
              const subTotal = t.subtarefas.length
              const subFeitas = t.subtarefas.filter((s) => s.concluida).length
              return (
                <tr key={t.id} onClick={() => onAbrirTarefa(t)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={t.status === 'concluida'}
                      onChange={() => onConcluirRapido(t)}
                      style={{ accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span className={t.status === 'concluida' ? 'line-through text-[var(--text-secondary)]' : ''}>{t.titulo}</span>
                    {t.status === 'bloqueada' && <AlertTriangle size={11} className="inline-block ml-1.5 text-[#E8A838]" />}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" style={{ backgroundColor: `${info.cor}25`, color: info.cor }}>
                        {info.inicial}
                      </span>
                      {info.nome}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: prio.bg, color: prio.cor, borderColor: 'transparent' }}>{prio.label}</span>
                  </td>
                  <td>
                    <span className="caption">{STATUS_LABEL[t.status]}</span>
                  </td>
                  <td>
                    {t.dueDate && prazo ? (
                      <span className="text-[12px] font-semibold" style={{ color: prazo.cor }}>
                        {prazo.label || formatarDataBR(t.dueDate)}
                      </span>
                    ) : <span className="caption">—</span>}
                  </td>
                  <td>
                    {subTotal > 0 ? <span className="caption">{subFeitas}/{subTotal}</span> : <span className="caption">—</span>}
                  </td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge badge-neutral" style={{ fontSize: 10 }}>#{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { CampoOrdenacao, Direcao }

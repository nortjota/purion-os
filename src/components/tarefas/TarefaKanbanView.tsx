'use client'

import { useState, useCallback } from 'react'
import { Plus, Flag, Calendar, MessageSquare, Paperclip, CheckSquare } from 'lucide-react'
import type { Tarefa, StatusTarefa } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import {
  COLUNAS, PRIORIDADE_CONFIG, socioInfo, prazoVisual, type ColunaTarefa,
} from './tarefasHelpers'

interface TarefaCardProps {
  tarefa: Tarefa
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOverCard: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onAbrir: (tarefa: Tarefa) => void
}

function TarefaCardKanban({ tarefa, isDragging, onDragStart, onDragEnd, onDragOverCard, onDrop, onAbrir }: TarefaCardProps) {
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade]
  const info = socioInfo(tarefa.responsavel)
  const prazo = prazoVisual(tarefa.dueDate, tarefa.status)
  const subTotal = tarefa.subtarefas.length
  const subFeitas = tarefa.subtarefas.filter((s) => s.concluida).length

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tarefa.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverCard(e, tarefa.id)}
      onDrop={(e) => onDrop(e, tarefa.id)}
      onClick={() => onAbrir(tarefa)}
      className={`
        rounded-xl border p-3 cursor-pointer
        bg-[var(--bg-surface)] border-[var(--border)]
        hover:border-[rgba(201,168,76,0.25)]
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${tarefa.status === 'bloqueada' ? 'border-[rgba(232,168,56,0.3)] bg-[rgba(232,168,56,0.04)]' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider" style={{ backgroundColor: prio.bg, color: prio.cor }}>
          <Flag size={8} /> {prio.label}
        </span>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ backgroundColor: `${info.cor}25`, color: info.cor }} title={info.nome}>
          {info.inicial}
        </span>
      </div>

      <h3 className="text-[12.5px] font-semibold text-[var(--text-primary)] mb-1.5 leading-snug line-clamp-2">
        {tarefa.titulo}
      </h3>

      <div className="flex items-center gap-2 flex-wrap">
        {tarefa.dueDate && prazo && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: prazo.bg, color: prazo.cor }}>
            <Calendar size={8} /> {prazo.label || formatarDataBR(tarefa.dueDate)}
          </span>
        )}
        {subTotal > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-secondary)]">
            <CheckSquare size={9} /> {subFeitas}/{subTotal}
          </span>
        )}
        {tarefa.comentarios.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-secondary)]">
            <MessageSquare size={9} /> {tarefa.comentarios.length}
          </span>
        )}
        {tarefa.anexos.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-secondary)]">
            <Paperclip size={9} /> {tarefa.anexos.length}
          </span>
        )}
      </div>
    </div>
  )
}

interface KanbanColunaProps {
  coluna: typeof COLUNAS[number]
  tarefas: Tarefa[]
  dragTarefaId: string | null
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOverCard: (e: React.DragEvent, id: string) => void
  onDropOnCard: (e: React.DragEvent, id: string) => void
  onDragOverColuna: (e: React.DragEvent, colId: ColunaTarefa) => void
  onDragLeaveColuna: () => void
  onDropOnColuna: (e: React.DragEvent, colId: ColunaTarefa) => void
  onAbrirTarefa: (tarefa: Tarefa) => void
  onNovaTarefa: (colId: ColunaTarefa) => void
}

function KanbanColuna({
  coluna, tarefas, dragTarefaId, isDragOver,
  onDragStart, onDragEnd, onDragOverCard, onDropOnCard,
  onDragOverColuna, onDragLeaveColuna, onDropOnColuna,
  onAbrirTarefa, onNovaTarefa,
}: KanbanColunaProps) {
  const Icon = coluna.icon
  return (
    <div
      onDragOver={(e) => onDragOverColuna(e, coluna.id)}
      onDragLeave={onDragLeaveColuna}
      onDrop={(e) => onDropOnColuna(e, coluna.id)}
      className="flex flex-col min-w-[270px] max-w-[300px] flex-1 rounded-xl border transition-colors duration-150"
      style={{
        background: 'var(--bg-surface-2)',
        borderColor: isDragOver ? 'rgba(201,168,76,0.4)' : 'var(--border)',
        scrollSnapAlign: 'start',
      }}
    >
      <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <Icon size={13} style={{ color: coluna.cor }} />
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1">{coluna.label}</span>
        <span className="text-[11px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${coluna.cor}20`, color: coluna.cor }}>
          {tarefas.length}
        </span>
      </div>

      <div className="p-2 flex flex-col gap-2 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 120 }}>
        {tarefas.length === 0 && (
          <p className="text-center text-[11px] text-[var(--text-secondary)] py-6">Nenhuma tarefa aqui ainda</p>
        )}
        {tarefas.map((t) => (
          <TarefaCardKanban
            key={t.id}
            tarefa={t}
            isDragging={dragTarefaId === t.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOverCard={onDragOverCard}
            onDrop={onDropOnCard}
            onAbrir={onAbrirTarefa}
          />
        ))}
      </div>

      <div className="p-2 border-t border-[var(--border)] shrink-0">
        <button
          onClick={() => onNovaTarefa(coluna.id)}
          className="w-full py-2 rounded-lg text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[#C9A84C] border border-dashed border-[var(--border)] hover:border-[rgba(201,168,76,0.25)] hover:bg-[rgba(201,168,76,0.04)] transition-all flex items-center justify-center gap-1"
        >
          <Plus size={10} /> Nova tarefa
        </button>
      </div>
    </div>
  )
}

interface TarefaKanbanViewProps {
  tarefas: Tarefa[]
  onAbrirTarefa: (tarefa: Tarefa) => void
  onNovaTarefa: (colId: ColunaTarefa) => void
  onReordenar: (atualizacoes: Array<{ id: string; ordem: number; status?: StatusTarefa }>) => void
}

export function TarefaKanbanView({ tarefas, onAbrirTarefa, onNovaTarefa, onReordenar }: TarefaKanbanViewProps) {
  const [dragTarefaId, setDragTarefaId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<ColunaTarefa | null>(null)

  const colunas = COLUNAS.map((col) => ({
    ...col,
    tarefas: tarefas.filter((t) => t.status === col.id).sort((a, b) => a.ordem - b.ordem),
  }))

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('tarefaId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragTarefaId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragTarefaId(null)
    setDragOverColId(null)
  }, [])

  const handleDragOverCard = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragOverColuna = useCallback((e: React.DragEvent, colId: ColunaTarefa) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColId(colId)
  }, [])

  const handleDragLeaveColuna = useCallback(() => setDragOverColId(null), [])

  function moverParaPosicao(id: string, colId: ColunaTarefa, targetId: string | null) {
    const colunaDestino = colunas.find((c) => c.id === colId)
    if (!colunaDestino) return
    const listaSemMovido = colunaDestino.tarefas.filter((t) => t.id !== id)
    const tarefaMovida = tarefas.find((t) => t.id === id)
    if (!tarefaMovida) return

    let insertIdx = listaSemMovido.length
    if (targetId) {
      const idx = listaSemMovido.findIndex((t) => t.id === targetId)
      if (idx !== -1) insertIdx = idx
    }
    listaSemMovido.splice(insertIdx, 0, tarefaMovida)

    const atualizacoes = listaSemMovido.map((t, idx) => ({
      id: t.id,
      ordem: idx,
      ...(t.id === id && t.status !== colId ? { status: colId as StatusTarefa } : {}),
    }))
    onReordenar(atualizacoes)
  }

  const handleDropOnCard = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('tarefaId')
    if (!id || id === targetId) { setDragTarefaId(null); setDragOverColId(null); return }
    const colunaDoTarget = colunas.find((c) => c.tarefas.some((t) => t.id === targetId))
    if (colunaDoTarget) moverParaPosicao(id, colunaDoTarget.id, targetId)
    setDragTarefaId(null)
    setDragOverColId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colunas])

  const handleDropOnColuna = useCallback((e: React.DragEvent, colId: ColunaTarefa) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('tarefaId')
    if (id) moverParaPosicao(id, colId, null)
    setDragTarefaId(null)
    setDragOverColId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colunas])

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 tarefas-kanban-scroll" style={{ scrollSnapType: 'x proximity' }}>
      {colunas.map((col) => (
        <KanbanColuna
          key={col.id}
          coluna={col}
          tarefas={col.tarefas}
          dragTarefaId={dragTarefaId}
          isDragOver={dragOverColId === col.id}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverCard={handleDragOverCard}
          onDropOnCard={handleDropOnCard}
          onDragOverColuna={handleDragOverColuna}
          onDragLeaveColuna={handleDragLeaveColuna}
          onDropOnColuna={handleDropOnColuna}
          onAbrirTarefa={onAbrirTarefa}
          onNovaTarefa={onNovaTarefa}
        />
      ))}
    </div>
  )
}

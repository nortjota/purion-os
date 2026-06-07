'use client'

/**
 * PURION OS — Módulo de Tarefas
 * Board kanban por sócio com 4 colunas: A Fazer, Em Andamento, Concluído, Bloqueado.
 * Modal de nova tarefa com campo obrigatório de motivo de bloqueio.
 */

import { useState, useMemo } from 'react'
import {
  CheckSquare, AlertTriangle, Plus, X,
  ChevronDown, Flag, Zap, Calendar, Pencil, Trash2,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Tarefa, StatusTarefa, PrioridadeTarefa, PerfilUsuario } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useTarefas } from '@/hooks/useTarefas'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const DATA_REF = '2024-02-12'

type ColunaTarefa = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada'

const COLUNAS: Array<{
  id: ColunaTarefa
  label: string
  cor: string
  icon: React.ElementType
}> = [
  { id: 'pendente',     label: 'A Fazer',       cor: '#6B6B6B', icon: CheckSquare },
  { id: 'em_andamento', label: 'Em Andamento',  cor: '#5B8FE8', icon: Zap         },
  { id: 'concluida',    label: 'Concluído',     cor: '#4CAF7A', icon: CheckSquare },
  { id: 'bloqueada',    label: 'Bloqueado',     cor: '#E8A838', icon: AlertTriangle},
]

const PRIORIDADE_CONFIG: Record<PrioridadeTarefa, { label: string; cor: string; bg: string }> = {
  urgente: { label: 'Urgente',  cor: '#E85238', bg: 'rgba(232,82,56,0.15)'   },
  alta:    { label: 'Alta',     cor: '#E8A838', bg: 'rgba(232,168,56,0.15)'  },
  media:   { label: 'Média',    cor: '#5B8FE8', bg: 'rgba(91,143,232,0.12)' },
  baixa:   { label: 'Baixa',    cor: '#4A4A4A', bg: 'rgba(74,74,74,0.3)'    },
}

const SOCIOS: Array<{ id: PerfilUsuario; nome: string; cor: string; inicial: string; dominio: string }> = [
  { id: 'matheus', nome: 'Matheus', cor: '#C9A84C', inicial: 'M', dominio: 'Estratégia & B2B' },
  { id: 'joao',    nome: 'João',    cor: '#5B8FE8', inicial: 'J', dominio: 'Marketing & Growth' },
  { id: 'gabriel', nome: 'Gabriel', cor: '#4CAF7A', inicial: 'G', dominio: 'Produção & Qualidade' },
]

// Módulos disponíveis para nova tarefa
const MODULOS = ['crm', 'marketing', 'producao', 'financeiro', 'geral'] as const

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

function isVencida(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate < DATA_REF
}

// ─────────────────────────────────────────────
// CARD DE TAREFA
// ─────────────────────────────────────────────

interface TarefaCardProps {
  tarefa: Tarefa
  onMover: (id: string, status: StatusTarefa) => void
  onEditar?: (tarefa: Tarefa) => void
  onDeletar?: (tarefa: Tarefa) => void
}

function TarefaCard({ tarefa, onMover, onEditar, onDeletar }: TarefaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade]
  const vencida = isVencida(tarefa.dueDate)

  return (
    <div className={`
      rounded-xl border p-3.5 bg-[var(--bg-surface)] group relative
      transition-all duration-150
      ${tarefa.status === 'bloqueada'
        ? 'border-[rgba(232,168,56,0.3)] bg-[rgba(232,168,56,0.04)]'
        : 'border-[var(--border)] hover:border-[rgba(201,168,76,0.2)]'
      }
    `}>

      {/* Prioridade + Ações */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: prio.bg, color: prio.cor }}
        >
          <Flag size={8} />
          {prio.label}
        </span>

        {/* Actions: edit, delete, move */}
        <div className="relative flex items-center gap-0.5">
          {onEditar && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditar(tarefa) }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[#5B8FE8] transition-all"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDeletar && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeletar(tarefa) }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[#E85238] transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[var(--text-primary)] transition-all"
          >
            <ChevronDown size={11} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg py-1 min-w-[140px] shadow-xl">
                {COLUNAS.filter((c) => c.id !== tarefa.status).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onMover(tarefa.id, c.id); setShowMenu(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#8A8A8A] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  >
                    → {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Título */}
      <h3 className="text-xs font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
        {tarefa.titulo}
      </h3>

      {/* Descrição (2 linhas) */}
      <p className="text-[10px] text-[#6B6B6B] mb-2.5 leading-relaxed line-clamp-2">
        {tarefa.descricao}
      </p>

      {/* Motivo de bloqueio */}
      {tarefa.status === 'bloqueada' && tarefa.motivoBloqueio && (
        <div className="mb-2.5 p-2.5 rounded-lg bg-[rgba(232,168,56,0.08)] border border-[rgba(232,168,56,0.25)]">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={10} className="text-[#E8A838] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[#E8A838] leading-relaxed">
              {tarefa.motivoBloqueio}
            </p>
          </div>
        </div>
      )}

      {/* Footer: prazo + módulo */}
      <div className="flex items-center justify-between gap-2">
        {tarefa.dueDate ? (
          <div className={`
            flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold
            ${vencida
              ? 'bg-[rgba(232,82,56,0.15)] text-[#E85238]'
              : 'bg-[#2A2A2A] text-[#6B6B6B]'
            }
          `}>
            <Calendar size={8} />
            {vencida && '⚠ '}
            {tarefa.dueDate}
          </div>
        ) : (
          <span />
        )}
        <span className="text-[9px] text-[#3A3A3A] uppercase tracking-wider">{tarefa.modulo}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COLUNA DO BOARD
// ─────────────────────────────────────────────

interface ColunaBoardProps {
  coluna: typeof COLUNAS[number]
  tarefas: Tarefa[]
  onAbrirModal: (colunaId: ColunaTarefa) => void
  onMover: (id: string, status: StatusTarefa) => void
  onEditar: (tarefa: Tarefa) => void
  onDeletar: (tarefa: Tarefa) => void
}

function ColunaBoard({ coluna, tarefas, onAbrirModal, onMover, onEditar, onDeletar }: ColunaBoardProps) {
  const Icon = coluna.icon
  return (
    <div className="flex flex-col min-w-[260px] flex-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <Icon size={13} style={{ color: coluna.cor }} />
        <span className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider flex-1">
          {coluna.label}
        </span>
        <span
          className="text-[11px] font-black px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${coluna.cor}20`, color: coluna.cor }}
        >
          {tarefas.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
        {tarefas.map((t) => (
          <TarefaCard key={t.id} tarefa={t} onMover={onMover} onEditar={onEditar} onDeletar={onDeletar} />
        ))}
      </div>

      {/* Botão nova tarefa */}
      <div className="p-2 border-t border-[#1A1A1A] shrink-0">
        <button
          onClick={() => onAbrirModal(coluna.id)}
          className="
            w-full py-2 rounded-lg text-[10px] font-semibold
            text-[#4A4A4A] hover:text-[#C9A84C]
            border border-dashed border-[var(--border)] hover:border-[rgba(201,168,76,0.25)]
            hover:bg-[rgba(201,168,76,0.04)]
            transition-all flex items-center justify-center gap-1
          "
        >
          <Plus size={10} /> Nova tarefa
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL NOVA TAREFA
// ─────────────────────────────────────────────

interface FormTarefa {
  titulo: string
  descricao: string
  prioridade: PrioridadeTarefa
  dueDate: string
  modulo: string
  responsavel: PerfilUsuario
  motivoBloqueio: string
}

interface ModalNovaTarefaProps {
  statusInicial: ColunaTarefa
  perfilAtivo: PerfilUsuario
  onCriar: (tarefa: Omit<Tarefa, 'id' | 'createdAt' | 'completedAt' | 'tags'>) => void
  onFechar: () => void
}

function ModalNovaTarefa({ statusInicial, perfilAtivo, onCriar, onFechar }: ModalNovaTarefaProps) {
  const [form, setForm] = useState<FormTarefa>({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    dueDate: '',
    modulo: 'geral',
    responsavel: perfilAtivo,
    motivoBloqueio: '',
  })
  const [erro, setErro] = useState('')

  function set<K extends keyof FormTarefa>(k: K, v: FormTarefa[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.titulo.trim()) { setErro('Informe o título.'); return }
    if (statusInicial === 'bloqueada' && !form.motivoBloqueio.trim()) {
      setErro('Motivo de bloqueio é obrigatório.'); return
    }
    onCriar({
      titulo:         form.titulo.trim(),
      descricao:      form.descricao.trim(),
      status:         statusInicial,
      prioridade:     form.prioridade,
      responsavel:    form.responsavel,
      modulo:         form.modulo,
      dueDate:        form.dueDate || null,
      motivoBloqueio: form.motivoBloqueio.trim() || undefined,
    })
    onFechar()
  }

  const inputCls = 'input-purion'

  const colLabel = COLUNAS.find((c) => c.id === statusInicial)?.label ?? statusInicial

  return (
    <div className="modal-backdrop">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Nova Tarefa</h3>
            <p className="caption mt-0.5">
              Coluna: <span className="text-[#C9A84C]">{colLabel}</span>
            </p>
          </div>
          <button onClick={onFechar} className="icon-btn border-0">
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Título */}
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Título da tarefa *"
            className={inputCls}
            autoFocus
            maxLength={100}
          />

          {/* Descrição */}
          <textarea
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Descrição (opcional)"
            rows={3}
            className={`${inputCls} resize-none`}
            maxLength={500}
          />

          {/* Linha: Prioridade + Responsável */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select
                value={form.prioridade}
                onChange={(e) => set('prioridade', e.target.value as PrioridadeTarefa)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="baixa">Prioridade: Baixa</option>
                <option value="media">Prioridade: Média</option>
                <option value="alta">Prioridade: Alta</option>
                <option value="urgente">Prioridade: Urgente</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>

            <div className="relative flex-1">
              <select
                value={form.responsavel}
                onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {SOCIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
          </div>

          {/* Linha: Prazo + Módulo */}
          <div className="flex gap-3">
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <div className="relative flex-1">
              <select
                value={form.modulo}
                onChange={(e) => set('modulo', e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {MODULOS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
          </div>

          {/* Motivo bloqueio (só quando statusInicial === 'bloqueada') */}
          {statusInicial === 'bloqueada' && (
            <div className="bg-[rgba(232,168,56,0.06)] border border-[rgba(232,168,56,0.2)] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#E8A838] font-semibold">
                <AlertTriangle size={12} />
                Motivo do bloqueio — obrigatório
              </div>
              <textarea
                value={form.motivoBloqueio}
                onChange={(e) => set('motivoBloqueio', e.target.value)}
                placeholder="Descreva o que está impedindo o avanço desta tarefa..."
                rows={3}
                className="
                  w-full bg-[var(--bg-primary)] border border-[rgba(232,168,56,0.2)] rounded-lg px-3 py-2.5
                  text-xs text-[var(--text-primary)] placeholder-[#4A4A4A] resize-none
                  focus:outline-none focus:border-[rgba(232,168,56,0.5)] transition-colors
                "
                maxLength={400}
              />
            </div>
          )}

          {/* Erro */}
          {erro && <p className="text-xs text-[#E85238]">{erro}</p>}

          {/* Ações */}
          <div className="modal-footer">
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL EDITAR TAREFA
// ─────────────────────────────────────────────

interface ModalEditarTarefaProps {
  tarefa: Tarefa
  onSalvar: (id: string, dados: Partial<Tarefa>) => void
  onFechar: () => void
}

function ModalEditarTarefa({ tarefa, onSalvar, onFechar }: ModalEditarTarefaProps) {
  const [form, setForm] = useState<FormTarefa>({
    titulo:         tarefa.titulo,
    descricao:      tarefa.descricao,
    prioridade:     tarefa.prioridade,
    dueDate:        tarefa.dueDate ?? '',
    modulo:         tarefa.modulo,
    responsavel:    tarefa.responsavel,
    motivoBloqueio: tarefa.motivoBloqueio ?? '',
  })
  const [erro, setErro] = useState('')

  function set<K extends keyof FormTarefa>(k: K, v: FormTarefa[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.titulo.trim()) { setErro('Informe o título.'); return }
    if (tarefa.status === 'bloqueada' && !form.motivoBloqueio.trim()) {
      setErro('Motivo de bloqueio é obrigatório.'); return
    }
    onSalvar(tarefa.id, {
      titulo:         form.titulo.trim(),
      descricao:      form.descricao.trim(),
      prioridade:     form.prioridade,
      responsavel:    form.responsavel,
      modulo:         form.modulo,
      dueDate:        form.dueDate || null,
      motivoBloqueio: form.motivoBloqueio.trim() || undefined,
    })
    onFechar()
  }

  const inputCls = 'input-purion'

  return (
    <div className="modal-backdrop">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Editar Tarefa</h3>
            <p className="caption mt-0.5 line-clamp-1">{tarefa.titulo}</p>
          </div>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input
            type="text" value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Título da tarefa *" className={inputCls} autoFocus maxLength={100}
          />
          <textarea
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Descrição (opcional)" rows={3}
            className={`${inputCls} resize-none`} maxLength={500}
          />
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value as PrioridadeTarefa)}
                className={`${inputCls} appearance-none cursor-pointer`}>
                <option value="baixa">Prioridade: Baixa</option>
                <option value="media">Prioridade: Média</option>
                <option value="alta">Prioridade: Alta</option>
                <option value="urgente">Prioridade: Urgente</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)}
                className={`${inputCls} appearance-none cursor-pointer`}>
                {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={`${inputCls} flex-1`} />
            <div className="relative flex-1">
              <select value={form.modulo} onChange={(e) => set('modulo', e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}>
                {MODULOS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
          </div>
          {tarefa.status === 'bloqueada' && (
            <div className="bg-[rgba(232,168,56,0.06)] border border-[rgba(232,168,56,0.2)] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#E8A838] font-semibold">
                <AlertTriangle size={12} /> Motivo do bloqueio
              </div>
              <textarea
                value={form.motivoBloqueio}
                onChange={(e) => set('motivoBloqueio', e.target.value)}
                placeholder="Descreva o bloqueio..." rows={3}
                className="w-full bg-[var(--bg-primary)] border border-[rgba(232,168,56,0.2)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[#4A4A4A] resize-none focus:outline-none focus:border-[rgba(232,168,56,0.5)] transition-colors"
                maxLength={400}
              />
            </div>
          )}
          {erro && <p className="text-xs text-[#E85238]">{erro}</p>}
          <div className="modal-footer">
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BOARD DE UM SÓCIO
// ─────────────────────────────────────────────

interface BoardSocioProps {
  perfilId: PerfilUsuario
  tarefas: Tarefa[]
  onCriarTarefa: (colunaId: ColunaTarefa) => void
  onMoverTarefa: (id: string, status: StatusTarefa) => void
  onEditar: (tarefa: Tarefa) => void
  onDeletar: (tarefa: Tarefa) => void
}

function BoardSocio({ perfilId, tarefas, onCriarTarefa, onMoverTarefa, onEditar, onDeletar }: BoardSocioProps) {
  const info = SOCIOS.find((s) => s.id === perfilId)!

  // Contadores
  const abertas     = tarefas.filter((t) => t.status === 'pendente').length
  const emAndamento = tarefas.filter((t) => t.status === 'em_andamento').length
  const bloqueadas  = tarefas.filter((t) => t.status === 'bloqueada').length
  const concluidas  = tarefas.filter((t) => t.status === 'concluida').length

  return (
    <div className="flex flex-col gap-4">
      {/* Contador */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-[#E8A838] font-semibold">{abertas} abertas</span>
        <span className="text-[#5B8FE8] font-semibold">{emAndamento} em andamento</span>
        <span className="text-[#E85238] font-semibold">{bloqueadas} bloqueadas</span>
        <span className="text-[#4CAF7A] font-semibold">{concluidas} concluídas</span>
      </div>

      {/* 4 colunas */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUNAS.map((col) => {
          const tarefasCol = tarefas.filter((t) => t.status === col.id)
          return (
            <ColunaBoard
              key={col.id}
              coluna={col}
              tarefas={tarefasCol}
              onAbrirModal={onCriarTarefa}
              onMover={onMoverTarefa}
              onEditar={onEditar}
              onDeletar={onDeletar}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function TarefasDashboard() {
  const isMobile = useMobile()
  const { tarefas, perfilAtivo } = usePurionStore()
  const { adicionarTarefa: adicionarTarefaDB, atualizarTarefa: atualizarTarefaDB, deletarTarefa } = useTarefas()

  const [abaAtiva, setAbaAtiva]   = useState<PerfilUsuario>(perfilAtivo)
  const [modal, setModal]         = useState<{ aberto: boolean; colunaId: ColunaTarefa }>({
    aberto: false,
    colunaId: 'pendente',
  })
  const [editandoTarefa, setEditandoTarefa]     = useState<Tarefa | null>(null)
  const [deletandoTarefa, setDeletandoTarefa]   = useState<Tarefa | null>(null)
  // Mobile-specific state
  const [mobileColunaAtiva, setMobileColunaAtiva] = useState<ColunaTarefa>('pendente')
  const [mobileTarefaId, setMobileTarefaId] = useState<string | null>(null)

  // Tarefas do perfil ativo (exclui canceladas)
  const tarefasAba = useMemo(
    () => tarefas.filter((t) => t.responsavel === abaAtiva && t.status !== 'cancelada'),
    [tarefas, abaAtiva]
  )

  function handleCriarTarefa(colunaId: ColunaTarefa) {
    setModal({ aberto: true, colunaId })
  }

  function handleMoverTarefa(id: string, status: StatusTarefa) {
    atualizarTarefaDB(id, { status })
  }

  function handleCriarNovoItem(dados: Omit<Tarefa, 'id' | 'createdAt' | 'completedAt' | 'tags'>) {
    adicionarTarefaDB({
      ...dados,
      completedAt: dados.status === 'concluida' ? new Date().toISOString() : null,
      tags: [],
    })
  }

  const infoAba = SOCIOS.find((s) => s.id === abaAtiva)!
  const mobileTarefaAtual = useMemo(
    () => tarefas.find((t) => t.id === mobileTarefaId) ?? null,
    [tarefas, mobileTarefaId]
  )

  // ── MOBILE VIEW ──────────────────────────────
  if (isMobile) {
    const tarefasDaAba = tarefas.filter((t) => t.responsavel === abaAtiva && t.status !== 'cancelada')
    const tarefasDaColuna = tarefasDaAba.filter((t) => t.status === mobileColunaAtiva)

    return (
      <div className="page-content section-gap">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="caption mt-1">Board por sócio</p>
        </div>

        {/* Partner pills — 3 equal width */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {SOCIOS.map((socio) => {
            const ativo = abaAtiva === socio.id
            const bloq = tarefas.filter((t) => t.responsavel === socio.id && t.status === 'bloqueada').length
            return (
              <button
                key={socio.id}
                onClick={() => setAbaAtiva(socio.id)}
                style={{
                  padding: '10px 4px', borderRadius: 8, border: `1px solid ${ativo ? socio.cor : 'var(--border)'}`,
                  background: ativo ? `${socio.cor}18` : 'transparent',
                  color: ativo ? socio.cor : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  minHeight: 44, position: 'relative',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: ativo ? socio.cor : 'var(--text-secondary)' }}>{socio.inicial}</span>
                <span>{socio.nome}</span>
                {bloq > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 6, height: 6, borderRadius: '50%', background: '#E8A838',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Column tabs — horizontal scroll */}
        <div className="mobile-tabs-scroll" style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
          {COLUNAS.map((col) => {
            const count = tarefasDaAba.filter((t) => t.status === col.id).length
            const ativo = mobileColunaAtiva === col.id
            return (
              <button
                key={col.id}
                onClick={() => setMobileColunaAtiva(col.id)}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${ativo ? col.cor : 'var(--border)'}`,
                  background: ativo ? `${col.cor}15` : 'transparent',
                  color: ativo ? col.cor : 'var(--text-secondary)',
                  minHeight: 36,
                }}
              >
                {col.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Add task button */}
        <button
          onClick={() => setModal({ aberto: true, colunaId: mobileColunaAtiva })}
          style={{
            width: '100%', height: 44, borderRadius: 8, border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Plus size={14} /> Nova tarefa
        </button>

        {/* Task list */}
        {tarefasDaColuna.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Nenhuma tarefa
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tarefasDaColuna.map((t) => {
              const prio = PRIORIDADE_CONFIG[t.prioridade]
              const vencida = isVencida(t.dueDate)
              return (
                <button
                  key={t.id}
                  onClick={() => setMobileTarefaId(t.id)}
                  className="mobile-card-item"
                  style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 12,
                    padding: '14px 16px', width: '100%',
                    border: t.status === 'bloqueada' ? '1px solid rgba(232,168,56,0.4)' : '1px solid var(--border)',
                    background: t.status === 'bloqueada' ? 'rgba(232,168,56,0.04)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: prio.bg, color: prio.cor }}>
                      {prio.label}
                    </span>
                    {t.dueDate && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: vencida ? 'rgba(232,82,56,0.15)' : 'var(--bg-surface-2)',
                        color: vencida ? '#E85238' : 'var(--text-secondary)',
                      }}>
                        {t.dueDate}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{t.titulo}</p>
                  {t.status === 'bloqueada' && t.motivoBloqueio && (
                    <p style={{ fontSize: 11, color: '#E8A838', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                      <AlertTriangle size={10} /> {t.motivoBloqueio}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Task detail — bottom sheet */}
        {mobileTarefaAtual && (
          <BottomSheet
            open={!!mobileTarefaAtual}
            onClose={() => setMobileTarefaId(null)}
            title={mobileTarefaAtual.titulo}
            footer={
              <div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
                {COLUNAS.filter((c) => c.id !== mobileTarefaAtual.status).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { handleMoverTarefa(mobileTarefaAtual.id, c.id); setMobileTarefaId(null) }}
                    style={{
                      flex: 1, height: 44, borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: `1px solid ${c.cor}40`, background: `${c.cor}10`,
                      color: c.cor, cursor: 'pointer',
                    }}
                  >
                    → {c.label}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Descrição</p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{mobileTarefaAtual.descricao || 'Sem descrição'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Prioridade', valor: PRIORIDADE_CONFIG[mobileTarefaAtual.prioridade].label },
                  { label: 'Módulo', valor: mobileTarefaAtual.modulo },
                  { label: 'Prazo', valor: mobileTarefaAtual.dueDate ?? 'Sem prazo' },
                  { label: 'Status', valor: COLUNAS.find((c) => c.id === mobileTarefaAtual.status)?.label ?? '' },
                ].map(({ label, valor }) => (
                  <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{valor}</p>
                  </div>
                ))}
              </div>
              {mobileTarefaAtual.status === 'bloqueada' && mobileTarefaAtual.motivoBloqueio && (
                <div style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#E8A838', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={11} /> Motivo do bloqueio
                  </p>
                  <p style={{ fontSize: 12, color: '#E8A838' }}>{mobileTarefaAtual.motivoBloqueio}</p>
                </div>
              )}
            </div>
          </BottomSheet>
        )}

        {/* New task modal */}
        {modal.aberto && (
          <ModalNovaTarefa
            statusInicial={modal.colunaId}
            perfilAtivo={abaAtiva}
            onCriar={handleCriarNovoItem}
            onFechar={() => setModal({ aberto: false, colunaId: 'pendente' })}
          />
        )}
      </div>
    )
  }

  return (
    <div className="page-content section-gap max-w-[1600px]">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Tarefas</h1>
        <p className="caption mt-1">Boards por sócio · A Fazer / Em Andamento / Concluído / Bloqueado</p>
      </div>

      {/* ── Abas dos sócios ── */}
      <div className="flex gap-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl p-1 w-fit">
        {SOCIOS.map((socio) => {
          const count = tarefas.filter(
            (t) => t.responsavel === socio.id && t.status !== 'cancelada'
          ).length
          const bloqueadasSocio = tarefas.filter(
            (t) => t.responsavel === socio.id && t.status === 'bloqueada'
          ).length

          return (
            <button
              key={socio.id}
              onClick={() => setAbaAtiva(socio.id)}
              className={`
                flex items-center gap-2.5 px-4 py-2.5 rounded-lg
                text-sm font-semibold transition-all duration-150
                ${abaAtiva === socio.id
                  ? 'shadow-sm'
                  : 'text-[#6B6B6B] hover:text-[var(--text-primary)]'
                }
              `}
              style={abaAtiva === socio.id ? {
                backgroundColor: `${socio.cor}18`,
                color: socio.cor,
                border: `1px solid ${socio.cor}35`,
              } : {}}
            >
              {/* Avatar */}
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                style={abaAtiva === socio.id
                  ? { backgroundColor: `${socio.cor}30`, color: socio.cor }
                  : { backgroundColor: '#2A2A2A', color: '#6B6B6B' }}
              >
                {socio.inicial}
              </span>
              {socio.nome}
              {/* Badge count */}
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: abaAtiva === socio.id ? `${socio.cor}25` : '#2A2A2A',
                  color: abaAtiva === socio.id ? socio.cor : '#6B6B6B',
                }}
              >
                {count}
              </span>
              {/* Badge bloqueadas */}
              {bloqueadasSocio > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8A838]" title={`${bloqueadasSocio} bloqueada(s)`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Subtítulo da aba ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
          style={{ backgroundColor: `${infoAba.cor}20`, color: infoAba.cor }}
        >
          {infoAba.inicial}
        </div>
        <div>
          <span className="text-sm font-bold text-[var(--text-primary)]">{infoAba.nome}</span>
          <span className="text-sm text-[#6B6B6B]"> · {infoAba.dominio}</span>
        </div>
      </div>

      {/* ── Board ── */}
      <BoardSocio
        perfilId={abaAtiva}
        tarefas={tarefasAba}
        onCriarTarefa={handleCriarTarefa}
        onMoverTarefa={handleMoverTarefa}
        onEditar={(t) => setEditandoTarefa(t)}
        onDeletar={(t) => setDeletandoTarefa(t)}
      />

      {/* ── Modal nova tarefa ── */}
      {modal.aberto && (
        <ModalNovaTarefa
          statusInicial={modal.colunaId}
          perfilAtivo={abaAtiva}
          onCriar={handleCriarNovoItem}
          onFechar={() => setModal({ aberto: false, colunaId: 'pendente' })}
        />
      )}

      {/* ── Modal editar ── */}
      {editandoTarefa && (
        <ModalEditarTarefa
          tarefa={editandoTarefa}
          onSalvar={atualizarTarefaDB}
          onFechar={() => setEditandoTarefa(null)}
        />
      )}

      {/* ── Confirmar delete ── */}
      <ConfirmModal
        open={!!deletandoTarefa}
        title="Excluir Tarefa"
        message={`Deseja excluir "${deletandoTarefa?.titulo}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => { if (deletandoTarefa) { deletarTarefa(deletandoTarefa.id); setDeletandoTarefa(null) } }}
        onCancel={() => setDeletandoTarefa(null)}
      />
    </div>
  )
}

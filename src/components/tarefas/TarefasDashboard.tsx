'use client'

/**
 * PURION OS — Módulo de Tarefas
 * Board kanban por sócio com 4 colunas: A Fazer, Em Andamento, Concluído, Bloqueado.
 * Modal de nova tarefa com campo obrigatório de motivo de bloqueio.
 */

import { useState, useMemo } from 'react'
import {
  CheckSquare, Clock, AlertTriangle, Plus, X,
  ChevronDown, Flag, Zap, Calendar,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Tarefa, StatusTarefa, PrioridadeTarefa, PerfilUsuario } from '@/store'

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
}

function TarefaCard({ tarefa, onMover }: TarefaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade]
  const vencida = isVencida(tarefa.dueDate)

  return (
    <div className={`
      rounded-xl border p-3.5 bg-[#1A1A1A] group relative
      transition-all duration-150
      ${tarefa.status === 'bloqueada'
        ? 'border-[rgba(232,168,56,0.3)] bg-[rgba(232,168,56,0.04)]'
        : 'border-[#2A2A2A] hover:border-[rgba(201,168,76,0.2)]'
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

        {/* Mini menu "mover" */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[#FAFAF8] transition-all"
          >
            <ChevronDown size={11} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[#141414] border border-[#2A2A2A] rounded-lg py-1 min-w-[140px] shadow-xl">
                {COLUNAS.filter((c) => c.id !== tarefa.status).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onMover(tarefa.id, c.id); setShowMenu(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#8A8A8A] hover:text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
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
      <h3 className="text-xs font-bold text-[#FAFAF8] mb-1.5 leading-snug">
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
}

function ColunaBoard({ coluna, tarefas, onAbrirModal, onMover }: ColunaBoardProps) {
  const Icon = coluna.icon
  return (
    <div className="flex flex-col min-w-[260px] flex-1 bg-[#141414] border border-[#2A2A2A] rounded-xl">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#2A2A2A] flex items-center gap-2 shrink-0">
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
          <TarefaCard key={t.id} tarefa={t} onMover={onMover} />
        ))}
      </div>

      {/* Botão nova tarefa */}
      <div className="p-2 border-t border-[#1A1A1A] shrink-0">
        <button
          onClick={() => onAbrirModal(coluna.id)}
          className="
            w-full py-2 rounded-lg text-[10px] font-semibold
            text-[#4A4A4A] hover:text-[#C9A84C]
            border border-dashed border-[#2A2A2A] hover:border-[rgba(201,168,76,0.25)]
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

  const inputCls = `
    w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5
    text-sm text-[#FAFAF8] placeholder-[#4A4A4A]
    focus:outline-none focus:border-[rgba(201,168,76,0.5)]
    transition-colors
  `

  const colLabel = COLUNAS.find((c) => c.id === statusInicial)?.label ?? statusInicial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative z-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <div>
            <h3 className="font-black text-[#FAFAF8] text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Nova Tarefa
            </h3>
            <p className="text-[10px] text-[#6B6B6B] mt-0.5">
              Coluna: <span className="text-[#C9A84C]">{colLabel}</span>
            </p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[#FAFAF8] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3.5">

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
                  w-full bg-[#0D0D0D] border border-[rgba(232,168,56,0.2)] rounded-lg px-3 py-2.5
                  text-xs text-[#FAFAF8] placeholder-[#4A4A4A] resize-none
                  focus:outline-none focus:border-[rgba(232,168,56,0.5)] transition-colors
                "
                maxLength={400}
              />
            </div>
          )}

          {/* Erro */}
          {erro && <p className="text-xs text-[#E85238]">{erro}</p>}

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[#6B6B6B] border border-[#2A2A2A] hover:text-[#FAFAF8] hover:border-[#3A3A3A] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C9A84C] text-[#0D0D0D] hover:bg-[#D4B55E] active:scale-[0.99] transition-all"
            >
              Criar Tarefa
            </button>
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
}

function BoardSocio({ perfilId, tarefas, onCriarTarefa, onMoverTarefa }: BoardSocioProps) {
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
  const { tarefas, adicionarTarefa, atualizarTarefa, perfilAtivo } = usePurionStore()

  const [abaAtiva, setAbaAtiva]   = useState<PerfilUsuario>(perfilAtivo)
  const [modal, setModal]         = useState<{ aberto: boolean; colunaId: ColunaTarefa }>({
    aberto: false,
    colunaId: 'pendente',
  })

  // Tarefas do perfil ativo (exclui canceladas)
  const tarefasAba = useMemo(
    () => tarefas.filter((t) => t.responsavel === abaAtiva && t.status !== 'cancelada'),
    [tarefas, abaAtiva]
  )

  function handleCriarTarefa(colunaId: ColunaTarefa) {
    setModal({ aberto: true, colunaId })
  }

  function handleMoverTarefa(id: string, status: StatusTarefa) {
    atualizarTarefa(id, { status })
  }

  function handleCriarNovoItem(dados: Omit<Tarefa, 'id' | 'createdAt' | 'completedAt' | 'tags'>) {
    adicionarTarefa({
      ...dados,
      id: `tar-${Date.now()}`,
      createdAt: new Date().toISOString(),
      completedAt: dados.status === 'concluida' ? new Date().toISOString() : null,
      tags: [],
    })
  }

  const infoAba = SOCIOS.find((s) => s.id === abaAtiva)!

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-[#FAFAF8] tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Tarefas
        </h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">Boards por sócio · A Fazer / Em Andamento / Concluído / Bloqueado</p>
      </div>

      {/* ── Abas dos sócios ── */}
      <div className="flex gap-1 bg-[#141414] border border-[#2A2A2A] rounded-xl p-1 w-fit">
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
                  : 'text-[#6B6B6B] hover:text-[#FAFAF8]'
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
          <span className="text-sm font-bold text-[#FAFAF8]">{infoAba.nome}</span>
          <span className="text-sm text-[#6B6B6B]"> · {infoAba.dominio}</span>
        </div>
      </div>

      {/* ── Board ── */}
      <BoardSocio
        perfilId={abaAtiva}
        tarefas={tarefasAba}
        onCriarTarefa={handleCriarTarefa}
        onMoverTarefa={handleMoverTarefa}
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
    </div>
  )
}

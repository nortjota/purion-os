'use client'

import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import type { Tarefa, PerfilUsuario, StatusTarefa, PrioridadeTarefa } from '@/store'
import { SOCIOS, STATUS_LABEL, PRIORIDADE_CONFIG, MODULOS } from './tarefasHelpers'

export interface FiltrosTarefas {
  busca: string
  responsavel: PerfilUsuario | 'todos'
  status: StatusTarefa | 'todos'
  prioridade: PrioridadeTarefa | 'todos'
  modulo: string
  prazo: 'todos' | 'hoje' | 'semana' | 'atrasadas' | 'sem_prazo'
  tag: string
}

export const FILTROS_VAZIOS: FiltrosTarefas = {
  busca: '', responsavel: 'todos', status: 'todos', prioridade: 'todos',
  modulo: 'todos', prazo: 'todos', tag: 'todos',
}

export function aplicarFiltros(tarefas: Tarefa[], f: FiltrosTarefas): Tarefa[] {
  return tarefas.filter((t) => {
    if (f.busca.trim()) {
      const q = f.busca.trim().toLowerCase()
      if (!t.titulo.toLowerCase().includes(q) && !t.descricao.toLowerCase().includes(q)) return false
    }
    if (f.responsavel !== 'todos' && t.responsavel !== f.responsavel) return false
    if (f.status !== 'todos' && t.status !== f.status) return false
    if (f.prioridade !== 'todos' && t.prioridade !== f.prioridade) return false
    if (f.modulo !== 'todos' && t.modulo !== f.modulo) return false
    if (f.tag !== 'todos' && !t.tags.includes(f.tag)) return false
    if (f.prazo !== 'todos') {
      const hoje = new Date().toISOString().slice(0, 10)
      const fimSemana = new Date(); fimSemana.setDate(fimSemana.getDate() + 7)
      const fimSemanaStr = fimSemana.toISOString().slice(0, 10)
      if (f.prazo === 'sem_prazo' && t.dueDate) return false
      if (f.prazo === 'hoje' && t.dueDate !== hoje) return false
      if (f.prazo === 'semana' && (!t.dueDate || t.dueDate < hoje || t.dueDate > fimSemanaStr)) return false
      if (f.prazo === 'atrasadas' && (!t.dueDate || t.dueDate >= hoje || t.status === 'concluida' || t.status === 'cancelada')) return false
    }
    return true
  })
}

const PRAZO_LABEL: Record<FiltrosTarefas['prazo'], string> = {
  todos: 'Todos', hoje: 'Hoje', semana: 'Esta semana', atrasadas: 'Atrasadas', sem_prazo: 'Sem prazo',
}

interface ChipDef { key: keyof FiltrosTarefas; label: string }

function chipsAtivos(f: FiltrosTarefas): ChipDef[] {
  const chips: ChipDef[] = []
  if (f.busca.trim())          chips.push({ key: 'busca',       label: `Busca: "${f.busca.trim()}"` })
  if (f.responsavel !== 'todos') chips.push({ key: 'responsavel', label: SOCIOS.find((s) => s.id === f.responsavel)?.nome ?? f.responsavel })
  if (f.status !== 'todos')    chips.push({ key: 'status',      label: STATUS_LABEL[f.status as StatusTarefa] })
  if (f.prioridade !== 'todos') chips.push({ key: 'prioridade', label: PRIORIDADE_CONFIG[f.prioridade as PrioridadeTarefa].label })
  if (f.modulo !== 'todos')    chips.push({ key: 'modulo',      label: f.modulo })
  if (f.prazo !== 'todos')     chips.push({ key: 'prazo',       label: PRAZO_LABEL[f.prazo] })
  if (f.tag !== 'todos')       chips.push({ key: 'tag',         label: `#${f.tag}` })
  return chips
}

interface TarefaFiltrosProps {
  tarefas: Tarefa[]
  filtros: FiltrosTarefas
  onChange: (f: FiltrosTarefas) => void
}

export function TarefaFiltros({ tarefas, filtros, onChange }: TarefaFiltrosProps) {
  const tagsDisponiveis = useMemo(() => {
    const set = new Set<string>()
    tarefas.forEach((t) => t.tags.forEach((tag) => set.add(tag)))
    return [...set].sort()
  }, [tarefas])

  function set<K extends keyof FiltrosTarefas>(k: K, v: FiltrosTarefas[K]) {
    onChange({ ...filtros, [k]: v })
  }

  const chips = chipsAtivos(filtros)
  const selectCls = 'select-purion'

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Busca */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 40 }}
        >
          <Search size={14} color="var(--text-secondary)" />
          <input
            value={filtros.busca}
            onChange={(e) => set('busca', e.target.value)}
            placeholder="Buscar por título ou descrição…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%', height: '100%' }}
          />
        </div>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.responsavel} onChange={(e) => set('responsavel', e.target.value as FiltrosTarefas['responsavel'])}>
          <option value="todos">Todos os responsáveis</option>
          {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.status} onChange={(e) => set('status', e.target.value as FiltrosTarefas['status'])}>
          <option value="todos">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as StatusTarefa[]).filter((s) => s !== 'cancelada').map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.prioridade} onChange={(e) => set('prioridade', e.target.value as FiltrosTarefas['prioridade'])}>
          <option value="todos">Todas as prioridades</option>
          {(Object.keys(PRIORIDADE_CONFIG) as PrioridadeTarefa[]).map((p) => (
            <option key={p} value={p}>{PRIORIDADE_CONFIG[p].label}</option>
          ))}
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.modulo} onChange={(e) => set('modulo', e.target.value)}>
          <option value="todos">Todos os módulos</option>
          {MODULOS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.prazo} onChange={(e) => set('prazo', e.target.value as FiltrosTarefas['prazo'])}>
          {(Object.keys(PRAZO_LABEL) as FiltrosTarefas['prazo'][]).map((p) => (
            <option key={p} value={p}>{p === 'todos' ? 'Qualquer prazo' : PRAZO_LABEL[p]}</option>
          ))}
        </select>

        {tagsDisponiveis.length > 0 && (
          <select className={selectCls} style={{ width: 'auto' }} value={filtros.tag} onChange={(e) => set('tag', e.target.value)}>
            <option value="todos">Todas as tags</option>
            {tagsDisponiveis.map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
          </select>
        )}
      </div>

      {/* Chips ativos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 text-[12px]"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', borderRadius: 20, padding: '4px 10px' }}
            >
              {c.label}
              <button onClick={() => set(c.key, FILTROS_VAZIOS[c.key] as never)} style={{ display: 'flex', cursor: 'pointer' }}>
                <X size={11} />
              </button>
            </span>
          ))}
          <button onClick={() => onChange(FILTROS_VAZIOS)} className="text-[12px]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}

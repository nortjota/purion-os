'use client'

import { useState } from 'react'
import { X, ChevronDown, AlertTriangle } from 'lucide-react'
import type { Tarefa, StatusTarefa, PrioridadeTarefa, PerfilUsuario, RecorrenciaTarefa } from '@/store'
import { SOCIOS, MODULOS, COLUNAS, RECORRENCIA_LABEL, type ColunaTarefa } from './tarefasHelpers'

interface FormTarefa {
  titulo: string
  descricao: string
  prioridade: PrioridadeTarefa
  responsavel: PerfilUsuario
  modulo: string
  startDate: string
  dueDate: string
  lembreteEm: string
  recorrencia: RecorrenciaTarefa
  recorrenciaAte: string
  estimativaMin: string
  motivoBloqueio: string
}

interface TarefaModalNovaProps {
  statusInicial: ColunaTarefa
  perfilAtivo: PerfilUsuario
  onCriar: (tarefa: Omit<Tarefa, 'id' | 'createdAt' | 'subtarefas' | 'comentarios' | 'anexos'>) => void
  onFechar: () => void
}

export function TarefaModalNova({ statusInicial, perfilAtivo, onCriar, onFechar }: TarefaModalNovaProps) {
  const [form, setForm] = useState<FormTarefa>({
    titulo: '', descricao: '', prioridade: 'media', responsavel: perfilAtivo, modulo: 'geral',
    startDate: '', dueDate: '', lembreteEm: '', recorrencia: 'nenhuma', recorrenciaAte: '',
    estimativaMin: '', motivoBloqueio: '',
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
      titulo:          form.titulo.trim(),
      descricao:       form.descricao.trim(),
      status:          statusInicial as StatusTarefa,
      prioridade:      form.prioridade,
      responsavel:     form.responsavel,
      modulo:          form.modulo,
      dueDate:         form.dueDate || null,
      completedAt:     null,
      motivoBloqueio:  form.motivoBloqueio.trim() || undefined,
      tags:            [],
      startDate:       form.startDate || null,
      lembreteEm:      form.lembreteEm || null,
      recorrencia:     form.recorrencia,
      recorrenciaAte:  form.recorrenciaAte || null,
      ordem:           0,
      estimativaMin:   form.estimativaMin ? Number(form.estimativaMin) : null,
    })
    onFechar()
  }

  const inputCls = 'input-purion'
  const colLabel = COLUNAS.find((c) => c.id === statusInicial)?.label ?? statusInicial

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Nova Tarefa</h3>
            <p className="caption mt-0.5">Coluna: <span className="text-[#C9A84C]">{colLabel}</span></p>
          </div>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input type="text" value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
            placeholder="Título da tarefa *" className={inputCls} autoFocus maxLength={100} />

          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)}
            placeholder="Descrição (opcional)" rows={3} className={`${inputCls} resize-none`} maxLength={500} />

          {/* Prioridade + Responsável */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value as PrioridadeTarefa)} className={`${inputCls} appearance-none cursor-pointer`}>
                <option value="baixa">Prioridade: Baixa</option>
                <option value="media">Prioridade: Média</option>
                <option value="alta">Prioridade: Alta</option>
                <option value="urgente">Prioridade: Urgente</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)} className={`${inputCls} appearance-none cursor-pointer`}>
                {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
            </div>
          </div>

          {/* Módulo */}
          <div className="relative">
            <select value={form.modulo} onChange={(e) => set('modulo', e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
              {MODULOS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
          </div>

          {/* Datas: início + prazo */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label-purion">Início</label>
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="label-purion">Prazo</label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Lembrete + Estimativa */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label-purion">Lembrete</label>
              <input type="datetime-local" value={form.lembreteEm} onChange={(e) => set('lembreteEm', e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="label-purion">Estimativa (min)</label>
              <input type="number" min={0} value={form.estimativaMin} onChange={(e) => set('estimativaMin', e.target.value)} placeholder="ex: 60" className={inputCls} />
            </div>
          </div>

          {/* Recorrência */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <label className="label-purion">Recorrência</label>
              <select value={form.recorrencia} onChange={(e) => set('recorrencia', e.target.value as RecorrenciaTarefa)} className={`${inputCls} appearance-none cursor-pointer`}>
                {Object.entries(RECORRENCIA_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 bottom-3 text-[#4A4A4A] pointer-events-none" />
            </div>
            {form.recorrencia !== 'nenhuma' && (
              <div className="flex-1">
                <label className="label-purion">Repetir até</label>
                <input type="date" value={form.recorrenciaAte} onChange={(e) => set('recorrenciaAte', e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          {/* Motivo bloqueio */}
          {statusInicial === 'bloqueada' && (
            <div className="bg-[rgba(232,168,56,0.06)] border border-[rgba(232,168,56,0.2)] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#E8A838] font-semibold">
                <AlertTriangle size={12} /> Motivo do bloqueio — obrigatório
              </div>
              <textarea value={form.motivoBloqueio} onChange={(e) => set('motivoBloqueio', e.target.value)}
                placeholder="Descreva o que está impedindo o avanço desta tarefa..." rows={3}
                className="w-full bg-[var(--bg-primary)] border border-[rgba(232,168,56,0.2)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[#4A4A4A] resize-none focus:outline-none focus:border-[rgba(232,168,56,0.5)] transition-colors"
                maxLength={400} />
            </div>
          )}

          {erro && <p className="text-xs text-[#E85238]">{erro}</p>}

          <div className="modal-footer">
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Criar Tarefa</button>
          </div>
        </form>
      </div>
    </div>
  )
}

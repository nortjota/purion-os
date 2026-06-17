'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { Tarefa, PerfilUsuario, StatusTarefa, PrioridadeTarefa } from '@/store'

// ─── Schema compat: DB uses old values, app uses new values ───────────────────
// Remove this mapping once supabase-migration-fix.sql is executed in production.

type DbStatus     = 'aberta' | 'em_progresso' | 'bloqueada' | 'concluida' | 'cancelada'
type DbPrioridade = 'baixa'  | 'media'        | 'alta'      | 'critica'

const STATUS_DB_TO_APP: Record<string, StatusTarefa> = {
  aberta:       'pendente',
  em_progresso: 'em_andamento',
  bloqueada:    'bloqueada',
  concluida:    'concluida',
  cancelada:    'cancelada',
  // already-migrated values pass through
  pendente:     'pendente',
  em_andamento: 'em_andamento',
}

const STATUS_APP_TO_DB: Record<StatusTarefa, DbStatus> = {
  pendente:     'aberta',
  em_andamento: 'em_progresso',
  bloqueada:    'bloqueada',
  concluida:    'concluida',
  cancelada:    'cancelada',
}

const PRIO_DB_TO_APP: Record<string, PrioridadeTarefa> = {
  critica: 'urgente',
  urgente: 'urgente',
  alta:    'alta',
  media:   'media',
  baixa:   'baixa',
}

const PRIO_APP_TO_DB: Record<PrioridadeTarefa, DbPrioridade> = {
  urgente: 'critica',
  alta:    'alta',
  media:   'media',
  baixa:   'baixa',
}
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

function toTarefa(r: Row): Tarefa {
  const rawStatus = String(r.status ?? 'aberta')
  const rawPrio   = String(r.prioridade ?? 'media')
  return {
    id:             String(r.id),
    titulo:         String(r.titulo         ?? ''),
    descricao:      String(r.descricao      ?? ''),
    status:         (STATUS_DB_TO_APP[rawStatus] ?? 'pendente') as StatusTarefa,
    prioridade:     (PRIO_DB_TO_APP[rawPrio]     ?? 'media')    as PrioridadeTarefa,
    responsavel:    String(r.responsavel    ?? 'matheus')  as PerfilUsuario,
    modulo:         String(r.modulo         ?? 'geral'),
    dueDate:        r.due_date      ? String(r.due_date)      : null,
    createdAt:      String(r.created_at     ?? new Date().toISOString()),
    completedAt:    r.completed_at  ? String(r.completed_at)  : null,
    motivoBloqueio: r.motivo_bloqueio ? String(r.motivo_bloqueio) : undefined,
    tags:           Array.isArray(r.tags) ? (r.tags as string[]) : [],
  }
}

export function useTarefas() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) { console.warn('[useTarefas] supabase não configurado'); return }

    const load = async () => {
      const { data, error } = await sb
        .from('tarefas')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      dbLog('SELECT', 'tarefas', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setTarefas(data.map(toTarefa))
    }

    load()

    const ch = sb.channel(`tarefas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarTarefa: async (t: Omit<Tarefa, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const payload = {
        titulo:          t.titulo,
        descricao:       t.descricao,
        status:          STATUS_APP_TO_DB[t.status],
        prioridade:      PRIO_APP_TO_DB[t.prioridade],
        responsavel:     t.responsavel,
        modulo:          t.modulo,
        due_date:        t.dueDate        ?? null,
        completed_at:    t.completedAt    ?? null,
        motivo_bloqueio: t.motivoBloqueio ?? null,
        tags:            t.tags,
      }
      console.log('[useTarefas] INSERT payload:', payload)
      const { data, error } = await sb.from('tarefas').insert(payload).select().single()
      dbLog('INSERT', 'tarefas', error, data?.id)
      if (error) { toastError('Erro ao criar tarefa', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarTarefa({
          ...t, id: String(data.id), createdAt: String(data.created_at),
        })
        success('Tarefa criada')
      }
    },

    atualizarTarefa: async (id: string, dados: Partial<Tarefa>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarTarefa(id, dados)
        return
      }
      const { error: upErr } = await sb.from('tarefas').update({
        ...(dados.titulo         !== undefined && { titulo:          dados.titulo }),
        ...(dados.descricao      !== undefined && { descricao:       dados.descricao }),
        ...(dados.status         !== undefined && { status:          STATUS_APP_TO_DB[dados.status] }),
        ...(dados.prioridade     !== undefined && { prioridade:      PRIO_APP_TO_DB[dados.prioridade] }),
        ...(dados.responsavel    !== undefined && { responsavel:     dados.responsavel }),
        ...(dados.modulo         !== undefined && { modulo:          dados.modulo }),
        ...(dados.dueDate        !== undefined && { due_date:        dados.dueDate }),
        ...(dados.completedAt    !== undefined && { completed_at:    dados.completedAt }),
        ...(dados.motivoBloqueio !== undefined && { motivo_bloqueio: dados.motivoBloqueio }),
      }).eq('id', id)
      dbLog('UPDATE', 'tarefas', upErr, id)
      if (upErr) { toastError('Erro ao salvar tarefa', upErr.message); return }
      usePurionStore.getState().atualizarTarefa(id, dados)
      if (dados.titulo !== undefined || dados.descricao !== undefined || dados.prioridade !== undefined || dados.dueDate !== undefined || dados.modulo !== undefined || dados.responsavel !== undefined || dados.motivoBloqueio !== undefined) {
        success('Tarefa atualizada')
      }
    },

    deletarTarefa: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('tarefas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'tarefas', error, id)
        if (error) { toastError('Erro ao excluir tarefa', error.message); return }
      }
      usePurionStore.getState().removerTarefa(id)
      success('Tarefa excluída', 'Você pode restaurar na Lixeira')
    },
  }
}

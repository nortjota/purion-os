'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
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

function dbLog(op: string, table: string, error: unknown, data?: unknown) {
  if (error) {
    const msg = `[PURION DB] ${op} ${table} FALHOU: ${JSON.stringify(error)}`
    console.error(msg)
    // Show visible alert so user knows something went wrong
    if (typeof window !== 'undefined') {
      const existing = document.getElementById('purion-db-error')
      if (!existing) {
        const el = document.createElement('div')
        el.id = 'purion-db-error'
        el.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;background:#E85238;color:#fff;padding:12px 16px;border-radius:8px;font-size:12px;font-family:monospace;max-height:120px;overflow:auto'
        el.textContent = msg
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 15000)
      }
    }
  } else {
    console.log(`[PURION DB] ${op} ${table} OK`, data ?? '')
  }
}

export function useTarefas() {
  useEffect(() => {
    const sb = supabase
    if (!sb) { console.warn('[useTarefas] supabase não configurado'); return }

    const load = async () => {
      const { data, error } = await sb
        .from('tarefas')
        .select('*')
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
      if (data) usePurionStore.getState().adicionarTarefa({
        ...t, id: String(data.id), createdAt: String(data.created_at),
      })
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
      usePurionStore.getState().atualizarTarefa(id, dados)
    },

    deletarTarefa: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('tarefas').delete().eq('id', id)
      usePurionStore.getState().removerTarefa(id)
    },

    restaurarTarefa: async (tarefa: Tarefa) => {
      // Hard-delete schema: restore not available; re-insert as new row.
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('tarefas').insert({
        titulo:          tarefa.titulo,
        descricao:       tarefa.descricao,
        status:          STATUS_APP_TO_DB[tarefa.status],
        prioridade:      PRIO_APP_TO_DB[tarefa.prioridade],
        responsavel:     tarefa.responsavel,
        modulo:          tarefa.modulo,
        due_date:        tarefa.dueDate        ?? null,
        completed_at:    tarefa.completedAt    ?? null,
        motivo_bloqueio: tarefa.motivoBloqueio ?? null,
        tags:            tarefa.tags,
      }).select().single()
      if (data) usePurionStore.getState().adicionarTarefa({
        ...tarefa, id: String(data.id), createdAt: String(data.created_at),
      })
    },
  }
}

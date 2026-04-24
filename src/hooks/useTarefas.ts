'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type { Tarefa, PerfilUsuario, StatusTarefa, PrioridadeTarefa } from '@/store'

type Row = Record<string, unknown>

function toTarefa(r: Row): Tarefa {
  return {
    id:             String(r.id),
    titulo:         String(r.titulo         ?? ''),
    descricao:      String(r.descricao      ?? ''),
    status:         String(r.status         ?? 'pendente') as StatusTarefa,
    prioridade:     String(r.prioridade     ?? 'media')    as PrioridadeTarefa,
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
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data } = await sb
        .from('tarefas')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setTarefas(data.map(toTarefa))
    }

    load()

    const ch = sb.channel('tarefas-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarTarefa: async (t: Omit<Tarefa, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('tarefas').insert({
        titulo:          t.titulo,
        descricao:       t.descricao,
        status:          t.status,
        prioridade:      t.prioridade,
        responsavel:     t.responsavel,
        modulo:          t.modulo,
        due_date:        t.dueDate        ?? null,
        completed_at:    t.completedAt    ?? null,
        motivo_bloqueio: t.motivoBloqueio ?? null,
        tags:            t.tags,
      }).select().single()
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
      await sb.from('tarefas').update({
        ...(dados.titulo         !== undefined && { titulo:          dados.titulo }),
        ...(dados.descricao      !== undefined && { descricao:       dados.descricao }),
        ...(dados.status         !== undefined && { status:          dados.status }),
        ...(dados.prioridade     !== undefined && { prioridade:      dados.prioridade }),
        ...(dados.responsavel    !== undefined && { responsavel:     dados.responsavel }),
        ...(dados.modulo         !== undefined && { modulo:          dados.modulo }),
        ...(dados.dueDate        !== undefined && { due_date:        dados.dueDate }),
        ...(dados.completedAt    !== undefined && { completed_at:    dados.completedAt }),
        ...(dados.motivoBloqueio !== undefined && { motivo_bloqueio: dados.motivoBloqueio }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      usePurionStore.getState().atualizarTarefa(id, dados)
    },

    deletarTarefa: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('tarefas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      usePurionStore.getState().removerTarefa(id)
    },

    restaurarTarefa: async (tarefa: Tarefa) => {
      const sb = supabase
      if (sb) await sb.from('tarefas').update({ deleted_at: null }).eq('id', tarefa.id)
      usePurionStore.getState().adicionarTarefa(tarefa)
    },
  }
}

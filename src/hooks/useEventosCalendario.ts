'use client'

import { useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { EventoCalendario, TipoEvento, PerfilUsuario } from '@/store'
import { useToast } from '@/components/ui/Toast'

type Row = Record<string, unknown>

export const COR_TIPO_EVENTO: Record<TipoEvento, string> = {
  reuniao:          '#C9A84C',
  tarefa:           '#5B8FE8',
  followup:         '#4CAF7A',
  data_importante:  '#E85238',
  post:             '#A855F7',
  outro:            '#B8B8B8',
}

function toEvento(r: Row): EventoCalendario {
  return {
    id:               String(r.id),
    titulo:           String(r.titulo ?? ''),
    descricao:        r.descricao ? String(r.descricao) : null,
    dataInicio:       String(r.data_inicio),
    dataFim:          r.data_fim ? String(r.data_fim) : null,
    diaInteiro:       Boolean(r.dia_inteiro),
    tipo:             String(r.tipo ?? 'outro') as TipoEvento,
    origemTabela:     r.origem_tabela ? String(r.origem_tabela) : null,
    origemId:         r.origem_id ? String(r.origem_id) : null,
    cor:              r.cor ? String(r.cor) : null,
    responsavel:      r.responsavel ? String(r.responsavel) as PerfilUsuario : null,
    lembreteMinutos:  Number(r.lembrete_minutos ?? 60),
    googleEventId:    r.google_event_id ? String(r.google_event_id) : null,
    concluido:        Boolean(r.concluido),
    createdAt:        String(r.created_at ?? new Date().toISOString()),
  }
}

/** Carrega os eventos reais (tabela eventos_calendario) + compõe eventos virtuais
 *  derivados ao vivo de reuniões, tarefas com prazo e follow-ups B2B (D+21). */
export function useEventosCalendario() {
  const { success, error: toastError } = useToast()

  // Reuniões, tarefas e leads já são carregados globalmente pelo StoreProvider
  // (SupabaseSync) — não é preciso chamar os hooks de novo aqui.

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('eventos_calendario')
        .select('*')
        .is('deleted_at', null)
        .order('data_inicio', { ascending: true })
      dbLog('SELECT', 'eventos_calendario', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setEventosCalendario(data.map(toEvento))
    }

    load()

    const ch = sb.channel(`eventos-calendario-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_calendario' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  const { eventosCalendario, reunioes, tarefas, leads } = usePurionStore()

  const eventosVirtuais = useMemo<EventoCalendario[]>(() => {
    const virtuais: EventoCalendario[] = []

    reunioes
      .filter((r) => r.status !== 'cancelada')
      .forEach((r) => {
        virtuais.push({
          id: `virtual-reuniao-${r.id}`,
          titulo: r.titulo,
          descricao: r.pauta.join(', ') || null,
          dataInicio: r.data,
          dataFim: null,
          diaInteiro: false,
          tipo: 'reuniao',
          origemTabela: 'reunioes',
          origemId: r.id,
          cor: null,
          responsavel: r.participantes[0] ?? null,
          lembreteMinutos: 60,
          googleEventId: r.googleEventId ?? null,
          concluido: r.status === 'realizada',
          createdAt: r.createdAt,
          virtual: true,
        })
      })

    tarefas
      .filter((t) => t.dueDate && t.status !== 'cancelada')
      .forEach((t) => {
        virtuais.push({
          id: `virtual-tarefa-${t.id}`,
          titulo: `Prazo: ${t.titulo}`,
          descricao: t.descricao || null,
          dataInicio: t.dueDate as string,
          dataFim: null,
          diaInteiro: true,
          tipo: 'tarefa',
          origemTabela: 'tarefas',
          origemId: t.id,
          cor: null,
          responsavel: t.responsavel,
          lembreteMinutos: 60,
          googleEventId: t.googleEventId ?? null,
          concluido: t.status === 'concluida',
          createdAt: t.createdAt,
          virtual: true,
        })
      })

    leads
      .filter((l) => l.status === 'parceiro_ativo')
      .forEach((l) => {
        const dataFollowUp = new Date(new Date(l.updatedAt).getTime() + 21 * 86_400_000)
        virtuais.push({
          id: `virtual-followup-${l.id}`,
          titulo: `Follow-up: ${l.nomeEmpresa}`,
          descricao: `Reposição D+21 · ${l.cidade}/${l.regiao}`,
          dataInicio: dataFollowUp.toISOString(),
          dataFim: null,
          diaInteiro: true,
          tipo: 'followup',
          origemTabela: 'leads_crm',
          origemId: l.id,
          cor: null,
          responsavel: l.responsavel,
          lembreteMinutos: 60,
          googleEventId: null,
          concluido: false,
          createdAt: l.createdAt,
          virtual: true,
        })
      })

    return virtuais
  }, [reunioes, tarefas, leads])

  const todosEventos = useMemo(
    () => [...eventosCalendario, ...eventosVirtuais].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
    [eventosCalendario, eventosVirtuais]
  )

  async function syncGoogle(evento: EventoCalendario): Promise<void> {
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: evento.googleEventId ? 'atualizar' : 'criar',
          tabela: 'eventos_calendario',
          reuniaoId: evento.id,
          titulo: evento.titulo,
          descricao: evento.descricao ?? undefined,
          inicio: evento.dataInicio,
          duracaoMin: evento.diaInteiro ? undefined : 60,
          allDay: evento.diaInteiro,
          googleEventId: evento.googleEventId,
        }),
      })
      const json = await res.json()
      if (json?.ok && json?.googleEventId) {
        usePurionStore.getState().atualizarEventoCalendario(evento.id, { googleEventId: json.googleEventId })
        success('Evento sincronizado com o Google Calendar')
      } else {
        toastError('Não sincronizado', json?.msg ?? json?.error ?? 'Google Calendar não configurado')
      }
    } catch {
      toastError('Erro ao sincronizar com o Google Calendar')
    }
  }

  return {
    eventos: todosEventos,
    eventosReais: eventosCalendario,
    carregando: false,

    criarEvento: async (dados: {
      titulo: string; descricao: string | null; dataInicio: string; dataFim: string | null
      diaInteiro: boolean; tipo: TipoEvento; responsavel: PerfilUsuario | null; lembreteMinutos: number
    }): Promise<EventoCalendario | null> => {
      const sb = supabase
      if (!sb) return null
      const { data, error } = await sb.from('eventos_calendario').insert({
        titulo:           dados.titulo,
        descricao:        dados.descricao,
        data_inicio:      dados.dataInicio,
        data_fim:         dados.dataFim,
        dia_inteiro:      dados.diaInteiro,
        tipo:             dados.tipo,
        responsavel:      dados.responsavel,
        lembrete_minutos: dados.lembreteMinutos,
      }).select().single()
      dbLog('INSERT', 'eventos_calendario', error, data?.id)
      if (error) { toastError('Erro ao criar evento', error.message); return null }
      if (data) {
        const novo = toEvento(data as Row)
        usePurionStore.getState().adicionarEventoCalendario(novo)
        success('Evento criado')
        return novo
      }
      return null
    },

    atualizarEvento: async (id: string, dados: Partial<{
      titulo: string; descricao: string | null; dataInicio: string; dataFim: string | null
      diaInteiro: boolean; tipo: TipoEvento; responsavel: PerfilUsuario | null; lembreteMinutos: number; concluido: boolean
    }>): Promise<void> => {
      const sb = supabase
      if (!sb) { usePurionStore.getState().atualizarEventoCalendario(id, dados); return }
      const { error } = await sb.from('eventos_calendario').update({
        ...(dados.titulo          !== undefined && { titulo: dados.titulo }),
        ...(dados.descricao       !== undefined && { descricao: dados.descricao }),
        ...(dados.dataInicio      !== undefined && { data_inicio: dados.dataInicio }),
        ...(dados.dataFim         !== undefined && { data_fim: dados.dataFim }),
        ...(dados.diaInteiro      !== undefined && { dia_inteiro: dados.diaInteiro }),
        ...(dados.tipo            !== undefined && { tipo: dados.tipo }),
        ...(dados.responsavel     !== undefined && { responsavel: dados.responsavel }),
        ...(dados.lembreteMinutos !== undefined && { lembrete_minutos: dados.lembreteMinutos }),
        ...(dados.concluido       !== undefined && { concluido: dados.concluido }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'eventos_calendario', error, id)
      if (error) { toastError('Erro ao atualizar evento', error.message); return }
      usePurionStore.getState().atualizarEventoCalendario(id, dados)
    },

    deletarEvento: async (id: string): Promise<void> => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('eventos_calendario').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('UPDATE', 'eventos_calendario', error, id)
        if (error) { toastError('Erro ao excluir evento', error.message); return }
      }
      usePurionStore.getState().removerEventoCalendario(id)
      success('Evento excluído')
    },

    syncGoogle,
  }
}

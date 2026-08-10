'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type {
  Tarefa, PerfilUsuario, StatusTarefa, PrioridadeTarefa, RecorrenciaTarefa,
  Subtarefa, Comentario, Anexo,
} from '@/store'

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

function toTarefaBase(r: Row): Omit<Tarefa, 'subtarefas' | 'comentarios' | 'anexos'> {
  const rawStatus = String(r.status ?? 'aberta')
  const rawPrio   = String(r.prioridade ?? 'media')
  return {
    id:              String(r.id),
    titulo:          String(r.titulo         ?? ''),
    descricao:       String(r.descricao      ?? ''),
    status:          (STATUS_DB_TO_APP[rawStatus] ?? 'pendente') as StatusTarefa,
    prioridade:      (PRIO_DB_TO_APP[rawPrio]     ?? 'media')    as PrioridadeTarefa,
    responsavel:     String(r.responsavel    ?? 'matheus')  as PerfilUsuario,
    modulo:          String(r.modulo         ?? 'geral'),
    dueDate:         r.due_date         ? String(r.due_date)         : null,
    createdAt:       String(r.created_at     ?? new Date().toISOString()),
    completedAt:     r.completed_at     ? String(r.completed_at)     : null,
    motivoBloqueio:  r.motivo_bloqueio  ? String(r.motivo_bloqueio)  : undefined,
    tags:            Array.isArray(r.tags) ? (r.tags as string[]) : [],
    startDate:       r.start_date       ? String(r.start_date)       : null,
    lembreteEm:      r.lembrete_em      ? String(r.lembrete_em)      : null,
    recorrencia:     (String(r.recorrencia ?? 'nenhuma')) as RecorrenciaTarefa,
    recorrenciaAte:  r.recorrencia_ate  ? String(r.recorrencia_ate)  : null,
    ordem:           Number(r.ordem ?? 0),
    estimativaMin:   r.estimativa_min != null ? Number(r.estimativa_min) : null,
    googleEventId:   r.google_event_id ? String(r.google_event_id) : null,
    objetivoId:      r.objetivo_id ? String(r.objetivo_id) : null,
  }
}

// ── Sync best-effort com Google Calendar (prazos como all-day) — nunca lança, nunca bloqueia ──
async function syncCalendarTarefa(body: {
  acao: 'criar' | 'atualizar' | 'deletar'
  tarefaId: string
  titulo?: string
  descricao?: string
  inicio?: string
  googleEventId?: string | null
}) {
  try {
    const res = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, tabela: 'tarefas', reuniaoId: body.tarefaId, allDay: true }),
    })
    const json = await res.json().catch(() => null)
    dbLog('SYNC', 'google_calendar (tarefa)', json?.ok ? null : (json?.error ?? json?.msg ?? 'falha desconhecida'), body.tarefaId)
    if (json?.ok && json?.googleEventId) {
      usePurionStore.getState().atualizarTarefa(body.tarefaId, { googleEventId: json.googleEventId })
    }
    if (body.acao === 'deletar' && json?.ok) {
      usePurionStore.getState().atualizarTarefa(body.tarefaId, { googleEventId: null })
    }
  } catch (err) {
    dbLog('SYNC', 'google_calendar (tarefa)', err, body.tarefaId)
  }
}

function toSubtarefa(r: Row): Subtarefa {
  return {
    id:        String(r.id),
    tarefaId:  String(r.tarefa_id),
    titulo:    String(r.titulo ?? ''),
    concluida: Boolean(r.concluida),
    ordem:     Number(r.ordem ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

function toComentario(r: Row): Comentario {
  return {
    id:        String(r.id),
    tarefaId:  String(r.tarefa_id),
    autor:     String(r.autor ?? ''),
    texto:     String(r.texto ?? ''),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

function toAnexo(r: Row): Anexo {
  return {
    id:        String(r.id),
    tarefaId:  String(r.tarefa_id),
    nome:      String(r.nome ?? ''),
    url:       String(r.url ?? ''),
    tipo:      String(r.tipo ?? ''),
    tamanhoKb: Number(r.tamanho_kb ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

function proximaDataRecorrencia(dataBase: string, recorrencia: RecorrenciaTarefa): string {
  const d = new Date(dataBase + 'T00:00:00')
  if (recorrencia === 'diaria')  d.setDate(d.getDate() + 1)
  if (recorrencia === 'semanal') d.setDate(d.getDate() + 7)
  if (recorrencia === 'mensal')  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function useTarefas() {
  const { success, error: toastError } = useToast()
  const { perfil } = useAuthContext()

  const rawTarefas    = useRef<Row[]>([])
  const rawSubtarefas = useRef<Subtarefa[]>([])
  const rawComentarios = useRef<Comentario[]>([])
  const rawAnexos     = useRef<Anexo[]>([])

  useEffect(() => {
    const sb = supabase
    if (!sb) { console.warn('[useTarefas] supabase não configurado'); return }

    function montar() {
      const merged: Tarefa[] = rawTarefas.current.map((r) => {
        const base = toTarefaBase(r)
        return {
          ...base,
          subtarefas: rawSubtarefas.current
            .filter((s) => s.tarefaId === base.id)
            .sort((a, b) => a.ordem - b.ordem),
          comentarios: rawComentarios.current
            .filter((c) => c.tarefaId === base.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          anexos: rawAnexos.current
            .filter((a) => a.tarefaId === base.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        }
      })
      usePurionStore.getState().setTarefas(merged)
    }

    const loadTarefas = async () => {
      const { data, error } = await sb
        .from('tarefas')
        .select('*')
        .is('deleted_at', null)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false })
      dbLog('SELECT', 'tarefas', error, `${data?.length ?? 0} rows`)
      if (data) { rawTarefas.current = data; montar() }
    }

    const loadSubtarefas = async () => {
      const { data, error } = await sb.from('subtarefas').select('*').order('ordem', { ascending: true })
      dbLog('SELECT', 'subtarefas', error, `${data?.length ?? 0} rows`)
      if (data) { rawSubtarefas.current = data.map(toSubtarefa); montar() }
    }

    const loadComentarios = async () => {
      const { data, error } = await sb.from('tarefa_comentarios').select('*').order('created_at', { ascending: true })
      dbLog('SELECT', 'tarefa_comentarios', error, `${data?.length ?? 0} rows`)
      if (data) { rawComentarios.current = data.map(toComentario); montar() }
    }

    const loadAnexos = async () => {
      const { data, error } = await sb.from('tarefa_anexos').select('*').order('created_at', { ascending: false })
      dbLog('SELECT', 'tarefa_anexos', error, `${data?.length ?? 0} rows`)
      if (data) { rawAnexos.current = data.map(toAnexo); montar() }
    }

    loadTarefas(); loadSubtarefas(); loadComentarios(); loadAnexos()

    const chT = sb.channel(`tarefas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, loadTarefas)
      .subscribe()
    const chS = sb.channel(`subtarefas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtarefas' }, loadSubtarefas)
      .subscribe()
    const chC = sb.channel(`tarefa-comentarios-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefa_comentarios' }, loadComentarios)
      .subscribe()
    const chA = sb.channel(`tarefa-anexos-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefa_anexos' }, loadAnexos)
      .subscribe()

    return () => { sb.removeChannel(chT); sb.removeChannel(chS); sb.removeChannel(chC); sb.removeChannel(chA) }
  }, [])

  async function gerarProximaRecorrencia(tarefa: Tarefa) {
    const sb = supabase
    if (!sb || tarefa.recorrencia === 'nenhuma' || !tarefa.dueDate) return

    const proximaData = proximaDataRecorrencia(tarefa.dueDate, tarefa.recorrencia)
    if (tarefa.recorrenciaAte && proximaData > tarefa.recorrenciaAte) return

    const novoStartDate = tarefa.startDate ? proximaDataRecorrencia(tarefa.startDate, tarefa.recorrencia) : null

    const payload = {
      titulo:          tarefa.titulo,
      descricao:       tarefa.descricao,
      status:          STATUS_APP_TO_DB.pendente,
      prioridade:      PRIO_APP_TO_DB[tarefa.prioridade],
      responsavel:     tarefa.responsavel,
      modulo:          tarefa.modulo,
      due_date:        proximaData,
      start_date:      novoStartDate,
      recorrencia:     tarefa.recorrencia,
      recorrencia_ate: tarefa.recorrenciaAte,
      estimativa_min:  tarefa.estimativaMin,
      tags:            tarefa.tags,
    }
    const { data, error } = await sb.from('tarefas').insert(payload).select().single()
    dbLog('INSERT', 'tarefas (recorrencia)', error, data?.id)
    if (!error) success('Próxima ocorrência criada', `Prazo: ${proximaData}`)
  }

  return {
    // ── TAREFAS ──
    adicionarTarefa: async (t: Omit<Tarefa, 'id' | 'createdAt' | 'subtarefas' | 'comentarios' | 'anexos'>) => {
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
        start_date:      t.startDate       ?? null,
        lembrete_em:     t.lembreteEm      ?? null,
        recorrencia:     t.recorrencia     ?? 'nenhuma',
        recorrencia_ate: t.recorrenciaAte  ?? null,
        ordem:           t.ordem           ?? 0,
        estimativa_min:  t.estimativaMin   ?? null,
        objetivo_id:     t.objetivoId      ?? null,
      }
      const { data, error } = await sb.from('tarefas').insert(payload).select().single()
      dbLog('INSERT', 'tarefas', error, data?.id)
      if (error) { toastError('Erro ao criar tarefa', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarTarefa({
          ...t, id: String(data.id), createdAt: String(data.created_at),
          subtarefas: [], comentarios: [], anexos: [],
        })
        success('Tarefa criada')
        if (t.dueDate) {
          syncCalendarTarefa({
            acao: 'criar', tarefaId: String(data.id),
            titulo: `Prazo: ${t.titulo}`, descricao: t.descricao, inicio: t.dueDate,
          })
        }
      }
    },

    atualizarTarefa: async (id: string, dados: Partial<Tarefa>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarTarefa(id, dados)
        return
      }
      const tarefaAtual = usePurionStore.getState().tarefas.find((t) => t.id === id)
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
        ...(dados.startDate      !== undefined && { start_date:      dados.startDate }),
        ...(dados.lembreteEm     !== undefined && { lembrete_em:     dados.lembreteEm }),
        ...(dados.recorrencia    !== undefined && { recorrencia:     dados.recorrencia }),
        ...(dados.recorrenciaAte !== undefined && { recorrencia_ate: dados.recorrenciaAte }),
        ...(dados.ordem          !== undefined && { ordem:           dados.ordem }),
        ...(dados.estimativaMin  !== undefined && { estimativa_min:  dados.estimativaMin }),
        ...(dados.objetivoId     !== undefined && { objetivo_id:     dados.objetivoId }),
      }).eq('id', id)
      dbLog('UPDATE', 'tarefas', upErr, id)
      if (upErr) { toastError('Erro ao salvar tarefa', upErr.message); return }
      usePurionStore.getState().atualizarTarefa(id, dados)

      // Recorrência: ao concluir, gera a próxima ocorrência
      if (dados.status === 'concluida' && tarefaAtual && tarefaAtual.recorrencia !== 'nenhuma') {
        gerarProximaRecorrencia({ ...tarefaAtual, ...dados })
      }

      if (dados.titulo !== undefined || dados.descricao !== undefined || dados.prioridade !== undefined || dados.dueDate !== undefined || dados.modulo !== undefined || dados.responsavel !== undefined || dados.motivoBloqueio !== undefined) {
        success('Tarefa atualizada')
      }

      if (tarefaAtual) {
        const merged = { ...tarefaAtual, ...dados }
        if (dados.status === 'concluida' || dados.status === 'cancelada') {
          if (tarefaAtual.googleEventId) syncCalendarTarefa({ acao: 'deletar', tarefaId: id, googleEventId: tarefaAtual.googleEventId })
        } else if ((dados.dueDate !== undefined || dados.titulo !== undefined) && merged.dueDate) {
          syncCalendarTarefa({
            acao: 'atualizar', tarefaId: id,
            titulo: `Prazo: ${merged.titulo}`, descricao: merged.descricao, inicio: merged.dueDate,
            googleEventId: tarefaAtual.googleEventId,
          })
        }
      }
    },

    deletarTarefa: async (id: string) => {
      const tarefaAtual = usePurionStore.getState().tarefas.find((t) => t.id === id)
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('tarefas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'tarefas', error, id)
        if (error) { toastError('Erro ao excluir tarefa', error.message); return }
      }
      usePurionStore.getState().removerTarefa(id)
      success('Tarefa excluída', 'Você pode restaurar na Lixeira')
      if (tarefaAtual?.googleEventId) {
        syncCalendarTarefa({ acao: 'deletar', tarefaId: id, googleEventId: tarefaAtual.googleEventId })
      }
    },

    reordenarTarefas: async (atualizacoes: Array<{ id: string; ordem: number; status?: StatusTarefa }>) => {
      const sb = supabase
      atualizacoes.forEach(({ id, ordem, status }) => {
        usePurionStore.getState().atualizarTarefa(id, { ordem, ...(status ? { status } : {}) })
      })
      if (!sb) return
      await Promise.all(atualizacoes.map(({ id, ordem, status }) =>
        sb.from('tarefas').update({
          ordem,
          ...(status ? { status: STATUS_APP_TO_DB[status] } : {}),
        }).eq('id', id)
      ))
      dbLog('UPDATE', 'tarefas (reordenar)', null, `${atualizacoes.length} tarefas`)
    },

    // ── SUBTAREFAS ──
    adicionarSubtarefa: async (tarefaId: string, titulo: string, ordem: number) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('subtarefas').insert({ tarefa_id: tarefaId, titulo, concluida: false, ordem }).select().single()
      dbLog('INSERT', 'subtarefas', error, data?.id)
      if (error) toastError('Erro ao adicionar subtarefa', error.message)
    },

    atualizarSubtarefa: async (id: string, dados: Partial<Pick<Subtarefa, 'titulo' | 'concluida' | 'ordem'>>) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('subtarefas').update(dados).eq('id', id)
      dbLog('UPDATE', 'subtarefas', error, id)
      if (error) toastError('Erro ao salvar subtarefa', error.message)
    },

    deletarSubtarefa: async (id: string) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('subtarefas').delete().eq('id', id)
      dbLog('DELETE', 'subtarefas', error, id)
      if (error) toastError('Erro ao excluir subtarefa', error.message)
    },

    reordenarSubtarefas: async (atualizacoes: Array<{ id: string; ordem: number }>) => {
      const sb = supabase
      if (!sb) return
      await Promise.all(atualizacoes.map(({ id, ordem }) => sb.from('subtarefas').update({ ordem }).eq('id', id)))
      dbLog('UPDATE', 'subtarefas (reordenar)', null, `${atualizacoes.length} subtarefas`)
    },

    // ── COMENTÁRIOS ──
    adicionarComentario: async (tarefaId: string, texto: string) => {
      const sb = supabase
      if (!sb) return
      const autor = perfil?.nome ?? 'Usuário'
      const { data, error } = await sb.from('tarefa_comentarios').insert({ tarefa_id: tarefaId, autor, texto }).select().single()
      dbLog('INSERT', 'tarefa_comentarios', error, data?.id)
      if (error) { toastError('Erro ao comentar', error.message); return }
      success('Comentário adicionado')
    },

    deletarComentario: async (id: string) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('tarefa_comentarios').delete().eq('id', id)
      dbLog('DELETE', 'tarefa_comentarios', error, id)
      if (error) toastError('Erro ao excluir comentário', error.message)
    },

    // ── ANEXOS ──
    uploadAnexo: async (tarefaId: string, file: File) => {
      const sb = supabase
      if (!sb) return
      if (file.size > 10 * 1024 * 1024) {
        toastError('Arquivo muito grande', 'Limite de 10MB por arquivo')
        return
      }
      const path = `${tarefaId}/${Date.now()}-${file.name}`
      const { error: upErr } = await sb.storage.from('tarefa-anexos').upload(path, file)
      dbLog('UPLOAD', 'tarefa-anexos (storage)', upErr, path)
      if (upErr) { toastError('Erro ao enviar anexo', upErr.message); return }

      const { data: pub } = sb.storage.from('tarefa-anexos').getPublicUrl(path)
      const { data, error } = await sb.from('tarefa_anexos').insert({
        tarefa_id: tarefaId,
        nome: file.name,
        url: pub.publicUrl,
        tipo: file.type,
        tamanho_kb: Math.round(file.size / 1024),
      }).select().single()
      dbLog('INSERT', 'tarefa_anexos', error, data?.id)
      if (error) { toastError('Erro ao salvar anexo', error.message); return }
      success('Anexo enviado')
    },

    deletarAnexo: async (id: string, url: string) => {
      const sb = supabase
      if (!sb) return
      const path = url.split('/tarefa-anexos/')[1]
      if (path) await sb.storage.from('tarefa-anexos').remove([decodeURIComponent(path)])
      const { error } = await sb.from('tarefa_anexos').delete().eq('id', id)
      dbLog('DELETE', 'tarefa_anexos', error, id)
      if (error) { toastError('Erro ao excluir anexo', error.message); return }
      success('Anexo excluído')
    },
  }
}

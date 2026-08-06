'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface SocialPilar {
  id: string
  nome: string
  percentual: number
  cor: string | null
  descricao: string | null
  exemplos: string[]
  ordem: number
}

export type NovoPilar = Omit<SocialPilar, 'id'>

export const DIAS_SEMANA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const
export type DiaSemana = typeof DIAS_SEMANA[number]

export interface SocialCalendarioItem {
  id: string
  diaSemana: DiaSemana
  rede: string
  pilar: string
  formato: string
  ideia: string
  horario: string | null
  responsavel: string | null
}

export type NovoItemCalendario = Omit<SocialCalendarioItem, 'id'>

type Row = Record<string, unknown>

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string' && val.trim()) {
    return val.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

const CORES_PILAR = ['#C9A84C', '#5B8FE8', '#4CAF7A', '#E8A838', '#A855F7']

function toPilar(r: Row, idx: number): SocialPilar {
  return {
    id:          String(r.id),
    nome:        String(r.nome ?? ''),
    percentual:  Number(r.percentual ?? 0),
    cor:         r.cor ? String(r.cor) : CORES_PILAR[idx % CORES_PILAR.length],
    descricao:   r.descricao ? String(r.descricao) : null,
    exemplos:    toArray(r.exemplos),
    ordem:       Number(r.ordem ?? idx),
  }
}

function toCalendarioItem(r: Row): SocialCalendarioItem {
  return {
    id:           String(r.id),
    diaSemana:    String(r.dia_semana ?? 'segunda') as DiaSemana,
    rede:         String(r.rede ?? ''),
    pilar:        String(r.pilar ?? ''),
    formato:      String(r.formato ?? ''),
    ideia:        String(r.ideia ?? ''),
    horario:      r.horario ? String(r.horario) : null,
    responsavel:  r.responsavel ? String(r.responsavel) : null,
  }
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useSocialEstrategia() {
  const { success, error: toastError } = useToast()
  const [pilares, setPilares] = useState<SocialPilar[]>([])
  const [calendario, setCalendario] = useState<SocialCalendarioItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }

    const [pilaresRes, calRes] = await Promise.all([
      sb.from('social_pilares').select('*').order('ordem', { ascending: true }),
      sb.from('social_calendario').select('*'),
    ])
    dbLog('SELECT', 'social_pilares', pilaresRes.error, `${pilaresRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'social_calendario', calRes.error, `${calRes.data?.length ?? 0} rows`)
    if (pilaresRes.data) setPilares(pilaresRes.data.map(toPilar))
    if (calRes.data) setCalendario(calRes.data.map(toCalendarioItem))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`social-estrategia-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_pilares' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_calendario' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  // ── Pilares ──
  async function atualizarPilar(id: string, dados: Partial<NovoPilar>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('social_pilares').update({
      ...(dados.nome        !== undefined && { nome: dados.nome }),
      ...(dados.percentual  !== undefined && { percentual: dados.percentual }),
      ...(dados.cor         !== undefined && { cor: dados.cor }),
      ...(dados.descricao   !== undefined && { descricao: dados.descricao }),
      ...(dados.exemplos    !== undefined && { exemplos: dados.exemplos }),
    }).eq('id', id)
    dbLog('UPDATE', 'social_pilares', error, id)
    if (error) { toastError('Erro ao atualizar pilar', error.message); return }
    setPilares((prev) => prev.map((p) => p.id === id ? { ...p, ...dados } : p))
    success('Pilar atualizado')
  }

  // ── Calendário editorial ──
  async function criarItemCalendario(d: NovoItemCalendario) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('social_calendario').insert({
      dia_semana:   d.diaSemana,
      rede:         d.rede,
      pilar:        d.pilar,
      formato:      d.formato,
      ideia:        d.ideia,
      horario:      d.horario ?? null,
      responsavel:  d.responsavel ?? null,
    }).select().single()
    dbLog('INSERT', 'social_calendario', error, data?.id)
    if (error) { toastError('Erro ao criar item', error.message); return }
    if (data) setCalendario((prev) => [...prev, toCalendarioItem(data as Row)])
    success('Item adicionado ao calendário')
  }

  async function atualizarItemCalendario(id: string, dados: Partial<NovoItemCalendario>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('social_calendario').update({
      ...(dados.diaSemana    !== undefined && { dia_semana: dados.diaSemana }),
      ...(dados.rede         !== undefined && { rede: dados.rede }),
      ...(dados.pilar        !== undefined && { pilar: dados.pilar }),
      ...(dados.formato      !== undefined && { formato: dados.formato }),
      ...(dados.ideia        !== undefined && { ideia: dados.ideia }),
      ...(dados.horario      !== undefined && { horario: dados.horario }),
      ...(dados.responsavel  !== undefined && { responsavel: dados.responsavel }),
    }).eq('id', id)
    dbLog('UPDATE', 'social_calendario', error, id)
    if (error) { toastError('Erro ao atualizar item', error.message); return }
    setCalendario((prev) => prev.map((c) => c.id === id ? { ...c, ...dados } : c))
    success('Item atualizado')
  }

  async function deletarItemCalendario(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('social_calendario').delete().eq('id', id)
    dbLog('DELETE', 'social_calendario', error, id)
    if (error) { toastError('Erro ao excluir item', error.message); return }
    setCalendario((prev) => prev.filter((c) => c.id !== id))
    success('Item removido')
  }

  return {
    pilares, calendario, carregando,
    atualizarPilar,
    criarItemCalendario, atualizarItemCalendario, deletarItemCalendario,
  }
}

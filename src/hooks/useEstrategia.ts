'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export type StatusFase = 'concluida' | 'atual' | 'futura'

export interface EstrategiaFase {
  id: string
  nome: string
  ordem: number
  status: StatusFase
  percentualConclusao: number
  dataInicio: string | null
  dataFim: string | null
  descricao: string | null
  marcoPrincipal: string | null
}

export interface EstrategiaObjetivo {
  id: string
  faseId: string | null
  titulo: string
  categoria: string | null
  trimestre: string | null
}

export interface EstrategiaResultado {
  id: string
  objetivoId: string | null
  descricao: string
  meta: number
  atual: number
  unidade: string | null
}

export interface EstrategiaDecisao {
  id: string
  data: string
  titulo: string
  justificativa: string
  categoria: string
  createdAt: string
}

export type NovaDecisao = Omit<EstrategiaDecisao, 'id' | 'createdAt'>

type Row = Record<string, unknown>

function toFase(r: Row): EstrategiaFase {
  return {
    id:                   String(r.id),
    nome:                 String(r.nome ?? ''),
    ordem:                Number(r.ordem ?? 0),
    status:               String(r.status ?? 'futura') as StatusFase,
    percentualConclusao:  Number(r.percentual_conclusao ?? 0),
    dataInicio:           r.data_inicio ? String(r.data_inicio) : null,
    dataFim:              r.data_fim ? String(r.data_fim) : null,
    descricao:            r.descricao ? String(r.descricao) : null,
    marcoPrincipal:       r.marco_principal ? String(r.marco_principal) : null,
  }
}

function toObjetivo(r: Row): EstrategiaObjetivo {
  return {
    id:         String(r.id),
    faseId:     r.fase_id ? String(r.fase_id) : null,
    titulo:     String(r.titulo ?? r.objetivo ?? ''),
    categoria:  r.categoria ? String(r.categoria) : null,
    trimestre:  r.trimestre ? String(r.trimestre) : null,
  }
}

function toResultado(r: Row): EstrategiaResultado {
  return {
    id:          String(r.id),
    objetivoId:  r.objetivo_id ? String(r.objetivo_id) : null,
    descricao:   String(r.descricao ?? ''),
    meta:        Number(r.meta ?? 0),
    atual:       Number(r.atual ?? 0),
    unidade:     r.unidade ? String(r.unidade) : null,
  }
}

function toDecisao(r: Row): EstrategiaDecisao {
  return {
    id:             String(r.id),
    data:           String(r.data ?? r.created_at ?? new Date().toISOString()),
    titulo:         String(r.titulo ?? ''),
    justificativa:  String(r.justificativa ?? ''),
    categoria:      String(r.categoria ?? 'geral'),
    createdAt:      String(r.created_at ?? new Date().toISOString()),
  }
}

// ─────────────────────────────────────────────
// Roadmap: fases + objetivos + resultados
// ─────────────────────────────────────────────

export function useEstrategiaRoadmap() {
  const { error: toastError, success } = useToast()
  const [fases, setFases] = useState<EstrategiaFase[]>([])
  const [objetivos, setObjetivos] = useState<EstrategiaObjetivo[]>([])
  const [resultados, setResultados] = useState<EstrategiaResultado[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }

    const [fasesRes, objRes, resRes] = await Promise.all([
      sb.from('estrategia_fases').select('*').order('ordem', { ascending: true }),
      sb.from('estrategia_objetivos').select('*'),
      sb.from('estrategia_resultados').select('*'),
    ])
    dbLog('SELECT', 'estrategia_fases', fasesRes.error, `${fasesRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'estrategia_objetivos', objRes.error, `${objRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'estrategia_resultados', resRes.error, `${resRes.data?.length ?? 0} rows`)
    if (fasesRes.data) setFases(fasesRes.data.map(toFase))
    if (objRes.data) setObjetivos(objRes.data.map(toObjetivo))
    if (resRes.data) setResultados(resRes.data.map(toResultado))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`estrategia-roadmap-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estrategia_fases' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estrategia_objetivos' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estrategia_resultados' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function atualizarFase(id: string, dados: Partial<Pick<EstrategiaFase, 'status' | 'percentualConclusao'>>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_fases').update({
      ...(dados.status !== undefined && { status: dados.status }),
      ...(dados.percentualConclusao !== undefined && { percentual_conclusao: dados.percentualConclusao }),
    }).eq('id', id)
    dbLog('UPDATE', 'estrategia_fases', error, id)
    if (error) { toastError('Erro ao atualizar fase', error.message); return }
    setFases((prev) => prev.map((f) => f.id === id ? { ...f, ...dados } : f))
    success('Fase atualizada')
  }

  return { fases, objetivos, resultados, carregando, atualizarFase }
}

// ─────────────────────────────────────────────
// Decisões estratégicas
// ─────────────────────────────────────────────

export function useEstrategiaDecisoes() {
  const { success, error: toastError } = useToast()
  const [decisoes, setDecisoes] = useState<EstrategiaDecisao[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('estrategia_decisoes').select('*').order('data', { ascending: false })
    dbLog('SELECT', 'estrategia_decisoes', error, `${data?.length ?? 0} rows`)
    if (data) setDecisoes(data.map(toDecisao))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`estrategia-decisoes-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estrategia_decisoes' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function criarDecisao(d: NovaDecisao) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('estrategia_decisoes').insert({
      data:           d.data,
      titulo:         d.titulo,
      justificativa:  d.justificativa,
      categoria:      d.categoria,
    }).select().single()
    dbLog('INSERT', 'estrategia_decisoes', error, data?.id)
    if (error) { toastError('Erro ao registrar decisão', error.message); return }
    if (data) setDecisoes((prev) => [toDecisao(data as Row), ...prev].sort((a, b) => b.data.localeCompare(a.data)))
    success('Decisão registrada')
  }

  async function deletarDecisao(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_decisoes').delete().eq('id', id)
    dbLog('DELETE', 'estrategia_decisoes', error, id)
    if (error) { toastError('Erro ao excluir', error.message); return }
    setDecisoes((prev) => prev.filter((d) => d.id !== id))
    success('Decisão removida')
  }

  return { decisoes, carregando, criarDecisao, deletarDecisao }
}

// Wrapper de compatibilidade (CommandCenter)
export function useEstrategia() {
  const { fases, carregando } = useEstrategiaRoadmap()
  return { fases, carregando }
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

export type EtapaAARRR = 'aquisicao' | 'ativacao' | 'retencao' | 'receita' | 'recomendacao'
export type StatusExperimento = 'backlog' | 'rodando' | 'escalar' | 'iterar' | 'matar'

export interface GrowthExperimento {
  id: string
  nome: string
  etapa: EtapaAARRR
  hipotese: string
  impacto: number
  confianca: number
  facilidade: number
  score: number
  status: StatusExperimento
  metricaAlvo: string
  prazo: string | null
  responsavel: string | null
  aprendizado: string | null
  createdAt: string
  updatedAt: string
}

export interface FunilB2BMeta {
  id: string
  etapa: string
  ordem: number
  metaSemanal: number
  taxaConversao: number
}

type Row = Record<string, unknown>

function toExp(r: Row): GrowthExperimento {
  const i = Number(r.impacto ?? 5)
  const c = Number(r.confianca ?? 5)
  const f = Number(r.facilidade ?? 5)
  return {
    id:           String(r.id),
    nome:         String(r.nome ?? ''),
    etapa:        String(r.etapa ?? 'aquisicao') as EtapaAARRR,
    hipotese:     String(r.hipotese ?? ''),
    impacto:      i,
    confianca:    c,
    facilidade:   f,
    score:        Number(r.score ?? ((i + c + f) / 3).toFixed(1)),
    status:       String(r.status ?? 'backlog') as StatusExperimento,
    metricaAlvo:  String(r.metrica_alvo ?? ''),
    prazo:        r.prazo ? String(r.prazo) : null,
    responsavel:  r.responsavel ? String(r.responsavel) : null,
    aprendizado:  r.aprendizado ? String(r.aprendizado) : null,
    createdAt:    String(r.created_at ?? new Date().toISOString()),
    updatedAt:    String(r.updated_at ?? new Date().toISOString()),
  }
}

function toFunil(r: Row): FunilB2BMeta {
  return {
    id:             String(r.id),
    etapa:          String(r.etapa ?? ''),
    ordem:          Number(r.ordem ?? 0),
    metaSemanal:    Number(r.meta_semanal ?? 0),
    taxaConversao:  Number(r.taxa_conversao ?? 0),
  }
}

export type NovoExperimento = Omit<GrowthExperimento, 'id' | 'score' | 'createdAt' | 'updatedAt'>

export function useGrowth() {
  const { success, error: toastError } = useToast()
  const [experimentos, setExperimentos] = useState<GrowthExperimento[]>([])
  const [funilMetas, setFunilMetas] = useState<FunilB2BMeta[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }

    const [expRes, funilRes] = await Promise.all([
      sb.from('growth_experimentos').select('*').order('score', { ascending: false }),
      sb.from('funil_b2b_metas').select('*').order('ordem', { ascending: true }),
    ])
    dbLog('SELECT', 'growth_experimentos', expRes.error, `${expRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'funil_b2b_metas', funilRes.error, `${funilRes.data?.length ?? 0} rows`)
    if (expRes.data) setExperimentos(expRes.data.map(toExp))
    if (funilRes.data) setFunilMetas(funilRes.data.map(toFunil))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()

    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`growth-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'growth_experimentos' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function criarExperimento(d: NovoExperimento) {
    const sb = supabase
    if (!sb) return
    const score = parseFloat(((d.impacto + d.confianca + d.facilidade) / 3).toFixed(1))
    const { data, error } = await sb.from('growth_experimentos').insert({
      nome:         d.nome,
      etapa:        d.etapa,
      hipotese:     d.hipotese,
      impacto:      d.impacto,
      confianca:    d.confianca,
      facilidade:   d.facilidade,
      score,
      status:       d.status,
      metrica_alvo: d.metricaAlvo,
      prazo:        d.prazo ?? null,
      responsavel:  d.responsavel ?? null,
      aprendizado:  d.aprendizado ?? null,
    }).select().single()
    dbLog('INSERT', 'growth_experimentos', error, data?.id)
    if (error) { toastError('Erro ao criar experimento', error.message); return }
    if (data) setExperimentos((prev) => [toExp(data as Row), ...prev])
    success('Experimento criado')
  }

  async function atualizarExperimento(id: string, dados: Partial<NovoExperimento>) {
    const sb = supabase
    if (!sb) return
    const current = experimentos.find((e) => e.id === id)
    if (!current) return
    const i = dados.impacto ?? current.impacto
    const c = dados.confianca ?? current.confianca
    const f = dados.facilidade ?? current.facilidade
    const score = parseFloat(((i + c + f) / 3).toFixed(1))
    const { error } = await sb.from('growth_experimentos').update({
      ...(dados.nome         !== undefined && { nome:         dados.nome }),
      ...(dados.etapa        !== undefined && { etapa:        dados.etapa }),
      ...(dados.hipotese     !== undefined && { hipotese:     dados.hipotese }),
      ...(dados.impacto      !== undefined && { impacto:      dados.impacto }),
      ...(dados.confianca    !== undefined && { confianca:    dados.confianca }),
      ...(dados.facilidade   !== undefined && { facilidade:   dados.facilidade }),
      ...(dados.status       !== undefined && { status:       dados.status }),
      ...(dados.metricaAlvo  !== undefined && { metrica_alvo: dados.metricaAlvo }),
      ...(dados.prazo        !== undefined && { prazo:        dados.prazo }),
      ...(dados.responsavel  !== undefined && { responsavel:  dados.responsavel }),
      ...(dados.aprendizado  !== undefined && { aprendizado:  dados.aprendizado }),
      score,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    dbLog('UPDATE', 'growth_experimentos', error, id)
    if (error) { toastError('Erro ao atualizar experimento', error.message); return }
    setExperimentos((prev) => prev.map((e) => e.id === id ? { ...e, ...dados, score } : e))
    success('Experimento atualizado')
  }

  async function deletarExperimento(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('growth_experimentos').delete().eq('id', id)
    dbLog('DELETE', 'growth_experimentos', error, id)
    if (error) { toastError('Erro ao excluir', error.message); return }
    setExperimentos((prev) => prev.filter((e) => e.id !== id))
    success('Experimento removido')
  }

  async function moverStatus(id: string, status: StatusExperimento) {
    return atualizarExperimento(id, { status })
  }

  return { experimentos, funilMetas, carregando, criarExperimento, atualizarExperimento, deletarExperimento, moverStatus }
}

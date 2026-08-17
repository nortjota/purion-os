'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import { usePurionStore } from '@/store'
import type { EstrategiaObjetivo, EstrategiaResultado } from './useEstrategia'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface MetaMedicaoMensal {
  id: string
  objetivoId: string
  ano: number
  mes: number
  valorMeta: number | null
  valorRealizado: number | null
  observacao: string | null
  atualizadoEm: string
}

export interface RMRReuniao {
  id: string
  ano: number
  mes: number
  resumo: string | null
  gargaloPrincipal: string | null
  decisao: string | null
  percentualGeral: number | null
  concluida: boolean
  concluidaEm: string | null
  createdAt: string
}

type Row = Record<string, unknown>

function toMedicao(r: Row): MetaMedicaoMensal {
  return {
    id:             String(r.id),
    objetivoId:     String(r.objetivo_id),
    ano:            Number(r.ano),
    mes:            Number(r.mes),
    valorMeta:      r.valor_meta != null ? Number(r.valor_meta) : null,
    valorRealizado: r.valor_realizado != null ? Number(r.valor_realizado) : null,
    observacao:     r.observacao ? String(r.observacao) : null,
    atualizadoEm:   String(r.atualizado_em ?? new Date().toISOString()),
  }
}

function toRMR(r: Row): RMRReuniao {
  return {
    id:               String(r.id),
    ano:              Number(r.ano),
    mes:              Number(r.mes),
    resumo:           r.resumo ? String(r.resumo) : null,
    gargaloPrincipal: r.gargalo_principal ? String(r.gargalo_principal) : null,
    decisao:          r.decisao ? String(r.decisao) : null,
    percentualGeral:  r.percentual_geral != null ? Number(r.percentual_geral) : null,
    concluida:        Boolean(r.concluida),
    concluidaEm:      r.concluida_em ? String(r.concluida_em) : null,
    createdAt:        String(r.created_at ?? new Date().toISOString()),
  }
}

// ─────────────────────────────────────────────
// Cores e cálculo de percentual (régua mensal)
// ─────────────────────────────────────────────

export const MESES_LABEL = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const COR_SEM_DADOS = '#3A3A3A'
export const COR_VERDE     = '#22C55E'
export const COR_AMARELO   = '#E8A838'
export const COR_VERMELHO  = '#E85238'

export function percentualMedicao(m: Pick<MetaMedicaoMensal, 'valorMeta' | 'valorRealizado'> | null | undefined): number | null {
  if (!m || m.valorMeta == null || m.valorMeta <= 0 || m.valorRealizado == null) return null
  return Math.round((m.valorRealizado / m.valorMeta) * 100)
}

export function corPercentual(pct: number | null): string {
  if (pct == null) return COR_SEM_DADOS
  if (pct >= 90) return COR_VERDE
  if (pct >= 60) return COR_AMARELO
  return COR_VERMELHO
}

export type Tendencia = 'melhorando' | 'piorando' | 'estavel'

/** Compara os últimos meses com dado contra os anteriores — visão simples de tendência. */
export function calcularTendencia(percentuaisEmOrdem: (number | null)[]): Tendencia | null {
  const comDado = percentuaisEmOrdem.filter((p): p is number => p != null)
  if (comDado.length < 2) return null
  const ultimo = comDado[comDado.length - 1]
  const anterior = comDado[comDado.length - 2]
  const diff = ultimo - anterior
  if (diff >= 5) return 'melhorando'
  if (diff <= -5) return 'piorando'
  return 'estavel'
}

// ─────────────────────────────────────────────
// Auto (CRM) — apenas fontes com data por registro fazem sentido por mês
// ─────────────────────────────────────────────

export type FonteAutoMensal = Extract<NonNullable<EstrategiaResultado['fonteAuto']>, 'vendas_total' | 'receita_total'>

/** Se algum resultado-chave do objetivo tem fonte automática "mensalizável", usa ela como sugestão. */
export function fonteAutoMensalDoObjetivo(objetivoId: string, resultados: EstrategiaResultado[]): FonteAutoMensal | null {
  const r = resultados.find((r) => r.objetivoId === objetivoId && (r.fonteAuto === 'vendas_total' || r.fonteAuto === 'receita_total'))
  return (r?.fonteAuto as FonteAutoMensal | undefined) ?? null
}

export function useValorAutoMensal() {
  const vendas = usePurionStore((s) => s.vendas)
  const receitas = usePurionStore((s) => s.receitas)

  return useCallback((fonte: FonteAutoMensal, ano: number, mes: number): number => {
    const chave = `${ano}-${String(mes).padStart(2, '0')}`
    if (fonte === 'vendas_total') {
      return vendas
        .filter((v) => v.status === 'aprovado' && v.dataVenda?.startsWith(chave))
        .reduce((s, v) => s + v.valorLiquido, 0)
    }
    return receitas
      .filter((r) => r.data?.startsWith(chave))
      .reduce((s, r) => s + r.valor, 0)
  }, [vendas, receitas])
}

// ─────────────────────────────────────────────
// Percentual geral ponderado (usado no RMR e no painel executivo)
// ─────────────────────────────────────────────

/** Média ponderada pelo peso das metas. Meta sem peso não entra na conta; meta sem dado no mês conta como 0%. */
export function percentualPonderado(
  objetivos: EstrategiaObjetivo[],
  getPercentualDoMes: (objetivoId: string) => number | null
): number | null {
  const comPeso = objetivos.filter((o) => o.peso > 0)
  const pesoTotal = somaPesosLocal(comPeso)
  if (pesoTotal <= 0) return null
  const soma = comPeso.reduce((s, o) => {
    const pct = getPercentualDoMes(o.id) ?? 0
    return s + pct * o.peso
  }, 0)
  return Math.round(soma / pesoTotal)
}

function somaPesosLocal(objetivos: EstrategiaObjetivo[]): number {
  return objetivos.reduce((s, o) => s + (o.peso || 0), 0)
}

// ─────────────────────────────────────────────
// Hook: medições mensais (carrega o ano inteiro, todas as metas)
// ─────────────────────────────────────────────

export function useMedicoesMensais(ano: number) {
  const { error: toastError } = useToast()
  const [medicoes, setMedicoes] = useState<MetaMedicaoMensal[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('meta_medicoes_mensais').select('*').eq('ano', ano)
    dbLog('SELECT', 'meta_medicoes_mensais', error, `${data?.length ?? 0} rows`)
    if (data) setMedicoes(data.map(toMedicao))
    setCarregando(false)
  }, [ano])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`meta-medicoes-sync-${ano}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_medicoes_mensais' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load, ano])

  async function registrarMedicao(dados: {
    objetivoId: string
    ano: number
    mes: number
    valorMeta: number | null
    valorRealizado: number | null
    observacao: string | null
  }) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('meta_medicoes_mensais').upsert({
      objetivo_id:     dados.objetivoId,
      ano:             dados.ano,
      mes:             dados.mes,
      valor_meta:      dados.valorMeta,
      valor_realizado: dados.valorRealizado,
      observacao:      dados.observacao,
      atualizado_em:   new Date().toISOString(),
    }, { onConflict: 'objetivo_id,ano,mes' }).select().single()
    dbLog('UPSERT', 'meta_medicoes_mensais', error, `${dados.objetivoId}/${dados.ano}-${dados.mes}`)
    if (error) { toastError('Erro ao registrar medição', error.message); return }
    if (data) {
      const nova = toMedicao(data as Row)
      setMedicoes((prev) => [...prev.filter((m) => m.id !== nova.id), nova])
    }
  }

  function medicaoDoMes(objetivoId: string, mes: number): MetaMedicaoMensal | null {
    return medicoes.find((m) => m.objetivoId === objetivoId && m.mes === mes) ?? null
  }

  return { medicoes, carregando, registrarMedicao, medicaoDoMes }
}

// ─────────────────────────────────────────────
// Hook: RMR — Reunião Mensal de Resultados
// ─────────────────────────────────────────────

export function useRMR() {
  const { success, error: toastError } = useToast()
  const [reunioes, setReunioes] = useState<RMRReuniao[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('rmr_reunioes').select('*').order('ano', { ascending: false }).order('mes', { ascending: false })
    dbLog('SELECT', 'rmr_reunioes', error, `${data?.length ?? 0} rows`)
    if (data) setReunioes(data.map(toRMR))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`rmr-reunioes-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rmr_reunioes' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function salvarRMR(ano: number, mes: number, dados: {
    resumo?: string | null
    gargaloPrincipal?: string | null
    decisao?: string | null
  }) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('rmr_reunioes').upsert({
      ano, mes,
      ...(dados.resumo !== undefined && { resumo: dados.resumo }),
      ...(dados.gargaloPrincipal !== undefined && { gargalo_principal: dados.gargaloPrincipal }),
      ...(dados.decisao !== undefined && { decisao: dados.decisao }),
    }, { onConflict: 'tenant_id,ano,mes' }).select().single()
    dbLog('UPSERT', 'rmr_reunioes', error, `${ano}-${mes}`)
    if (error) { toastError('Erro ao salvar RMR', error.message); return }
    if (data) {
      const nova = toRMR(data as Row)
      setReunioes((prev) => [nova, ...prev.filter((r) => r.id !== nova.id)])
    }
  }

  async function concluirRMR(ano: number, mes: number, percentualGeral: number | null) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('rmr_reunioes').upsert({
      ano, mes,
      concluida: true,
      concluida_em: new Date().toISOString(),
      percentual_geral: percentualGeral,
    }, { onConflict: 'tenant_id,ano,mes' }).select().single()
    dbLog('UPSERT', 'rmr_reunioes (concluir)', error, `${ano}-${mes}`)
    if (error) { toastError('Erro ao concluir RMR', error.message); return }
    if (data) {
      const nova = toRMR(data as Row)
      setReunioes((prev) => [nova, ...prev.filter((r) => r.id !== nova.id)])
    }
    success('RMR concluída — snapshot do mês salvo')
  }

  function reuniaoDoMes(ano: number, mes: number): RMRReuniao | null {
    return reunioes.find((r) => r.ano === ano && r.mes === mes) ?? null
  }

  return { reunioes, carregando, salvarRMR, concluirRMR, reuniaoDoMes }
}

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import { usePurionStore, type PerfilUsuario } from '@/store'

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

export type StatusObjetivo = 'em_dia' | 'em_risco' | 'em_atraso' | 'concluido' | 'pausado'
export type PrioridadeObjetivo = 'P1' | 'P2' | 'P3'

export interface EstrategiaObjetivo {
  id: string
  faseId: string | null
  parentId: string | null
  titulo: string
  descricao: string | null
  categoria: string | null
  trimestre: string | null
  tipo: string
  status: StatusObjetivo
  statusManual: boolean
  progresso: number
  responsavel: PerfilUsuario | null
  equipe: string | null
  dataAlvo: string | null
  createdAt: string
  peso: number
  prioridade: PrioridadeObjetivo
}

export type FonteAuto = 'vendas_total' | 'leads_clientes' | 'creators_ativos' | 'receita_total' | 'estoque_atual'

export interface EstrategiaResultado {
  id: string
  objetivoId: string | null
  descricao: string
  meta: number
  atual: number
  unidade: string | null
  fonteAuto: FonteAuto | null
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

export interface EstrategiaProgressoHistorico {
  id: string
  objetivoId: string
  progresso: number
  status: StatusObjetivo
  registradoEm: string
}

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
    id:            String(r.id),
    faseId:        r.fase_id ? String(r.fase_id) : null,
    parentId:      r.parent_id ? String(r.parent_id) : null,
    titulo:        String(r.titulo ?? r.objetivo ?? ''),
    descricao:     r.descricao ? String(r.descricao) : null,
    categoria:     r.categoria ? String(r.categoria) : null,
    trimestre:     r.trimestre ? String(r.trimestre) : null,
    tipo:          String(r.tipo ?? 'objetivo'),
    status:        (String(r.status ?? 'em_dia')) as StatusObjetivo,
    statusManual:  Boolean(r.status_manual),
    progresso:     Number(r.progresso ?? 0),
    responsavel:   r.responsavel ? (String(r.responsavel) as PerfilUsuario) : null,
    equipe:        r.equipe ? String(r.equipe) : null,
    dataAlvo:      r.data_alvo ? String(r.data_alvo) : null,
    createdAt:     String(r.created_at ?? new Date().toISOString()),
    peso:          Number(r.peso ?? 0),
    prioridade:    (String(r.prioridade ?? 'P2')) as PrioridadeObjetivo,
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
    fonteAuto:   r.fonte_auto ? (String(r.fonte_auto) as FonteAuto) : null,
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

function toHistorico(r: Row): EstrategiaProgressoHistorico {
  return {
    id:           String(r.id),
    objetivoId:   String(r.objetivo_id),
    progresso:    Number(r.progresso ?? 0),
    status:       String(r.status ?? 'em_dia') as StatusObjetivo,
    registradoEm: String(r.registrado_em ?? new Date().toISOString()),
  }
}

// ─────────────────────────────────────────────
// Goals — progresso automático (o coração do Asana)
// ─────────────────────────────────────────────

export interface MetricasCRM {
  vendasAprovadasTotal: number
  leadsClientesAtivos: number
  creatorsAtivos: number
  receitaTotal: number
  estoqueAtual: number
}

interface CrmSlice {
  vendas: { status: string; valorLiquido: number }[]
  leads: { status: string }[]
  creators: { status: string }[]
  receitas: { valor: number }[]
  estoqueProduto: { quantidadeAtual: number } | null
}

function calcularMetricasCRM(s: CrmSlice): MetricasCRM {
  return {
    vendasAprovadasTotal: s.vendas.filter((v) => v.status === 'aprovado').reduce((sum, v) => sum + v.valorLiquido, 0),
    leadsClientesAtivos:  s.leads.filter((l) => l.status === 'parceiro_ativo').length,
    creatorsAtivos:       s.creators.filter((c) => c.status === 'pago' || c.status === 'parceiro_recorrente').length,
    receitaTotal:         s.receitas.reduce((sum, r) => sum + r.valor, 0),
    estoqueAtual:         s.estoqueProduto?.quantidadeAtual ?? 0,
  }
}

/** Snapshot não-reativo — usado em rotinas de sincronização em background. */
function metricasAtuaisSnapshot(): MetricasCRM {
  return calcularMetricasCRM(usePurionStore.getState())
}

/** Hook reativo — usado para exibir números ao vivo na UI (cards, modais). */
export function useMetricasCRM(): MetricasCRM {
  const vendas          = usePurionStore((s) => s.vendas)
  const leads            = usePurionStore((s) => s.leads)
  const creators          = usePurionStore((s) => s.creators)
  const receitas          = usePurionStore((s) => s.receitas)
  const estoqueProduto    = usePurionStore((s) => s.estoqueProduto)
  return useMemo(
    () => calcularMetricasCRM({ vendas, leads, creators, receitas, estoqueProduto }),
    [vendas, leads, creators, receitas, estoqueProduto]
  )
}

export const FONTE_AUTO_LABEL: Record<FonteAuto, string> = {
  vendas_total:     'Vendas aprovadas (R$)',
  leads_clientes:   'Clientes ativos (B2B)',
  creators_ativos:  'Creators ativos',
  receita_total:    'Receita total (financeiro)',
  estoque_atual:    'Estoque atual (frascos)',
}

export function valorAutomaticoCRM(fonte: FonteAuto, m: MetricasCRM): number {
  switch (fonte) {
    case 'vendas_total':    return m.vendasAprovadasTotal
    case 'leads_clientes':  return m.leadsClientesAtivos
    case 'creators_ativos': return m.creatorsAtivos
    case 'receita_total':   return m.receitaTotal
    case 'estoque_atual':   return m.estoqueAtual
  }
}

/** Valor "atual" efetivo de um resultado-chave — puxado do CRM se tiver fonte automática. */
export function valorEfetivoResultado(r: EstrategiaResultado, metricas: MetricasCRM): number {
  return r.fonteAuto ? valorAutomaticoCRM(r.fonteAuto, metricas) : r.atual
}

export function progressoResultadoEfetivo(r: EstrategiaResultado, metricas: MetricasCRM): number {
  if (r.meta <= 0) return 0
  const atual = valorEfetivoResultado(r, metricas)
  return Math.max(0, Math.min(100, Math.round((atual / r.meta) * 100)))
}

/** Progresso do objetivo = média do progresso dos filhos (resultados-chave + sub-objetivos). Recursivo. */
export function progressoObjetivo(
  objetivo: EstrategiaObjetivo,
  objetivos: EstrategiaObjetivo[],
  resultados: EstrategiaResultado[],
  metricas: MetricasCRM
): number {
  const subObjetivos = objetivos.filter((o) => o.parentId === objetivo.id)
  const resultadosDoObjetivo = resultados.filter((r) => r.objetivoId === objetivo.id)
  const valores = [
    ...resultadosDoObjetivo.map((r) => progressoResultadoEfetivo(r, metricas)),
    ...subObjetivos.map((sub) => progressoObjetivo(sub, objetivos, resultados, metricas)),
  ]
  if (valores.length === 0) return objetivo.progresso
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length)
}

/**
 * Status automático: compara progresso% com % de tempo decorrido até a data-alvo.
 * Sem prazo definido não dá para avaliar ritmo — mantém "em dia" por padrão.
 */
export function calcularStatusAutomatico(progresso: number, createdAt: string, dataAlvo: string | null): StatusObjetivo {
  if (progresso >= 100) return 'concluido'
  if (!dataAlvo) return 'em_dia'

  const inicio = new Date(createdAt).getTime()
  const alvo   = new Date(`${dataAlvo}T23:59:59`).getTime()
  const agora  = Date.now()

  if (alvo <= inicio) return 'em_atraso'

  const tempoDecorridoPct = Math.max(0, Math.min(100, ((agora - inicio) / (alvo - inicio)) * 100))
  const diferenca = progresso - tempoDecorridoPct

  if (diferenca >= -10) return 'em_dia'
  if (diferenca >= -25) return 'em_risco'
  return 'em_atraso'
}

/** Persiste progresso/status calculados quando divergem do valor salvo, e registra histórico. */
async function sincronizarProgresso(objetivos: EstrategiaObjetivo[], resultados: EstrategiaResultado[]) {
  const sb = supabase
  if (!sb || objetivos.length === 0) return
  const metricas = metricasAtuaisSnapshot()

  for (const obj of objetivos) {
    const progressoCalc = progressoObjetivo(obj, objetivos, resultados, metricas)
    const statusCalc = obj.statusManual ? obj.status : calcularStatusAutomatico(progressoCalc, obj.createdAt, obj.dataAlvo)
    const progressoMudou = Math.abs(progressoCalc - obj.progresso) >= 1
    const statusMudou = !obj.statusManual && statusCalc !== obj.status
    if (!progressoMudou && !statusMudou) continue

    const { error } = await sb.from('estrategia_objetivos').update({
      progresso: progressoCalc,
      ...(obj.statusManual ? {} : { status: statusCalc }),
    }).eq('id', obj.id)
    dbLog('UPDATE', 'estrategia_objetivos (progresso automatico)', error, obj.id)
    if (!error) {
      const { error: histErr } = await sb.from('estrategia_progresso_historico').insert({
        objetivo_id: obj.id,
        progresso: progressoCalc,
        status: obj.statusManual ? obj.status : statusCalc,
      })
      dbLog('INSERT', 'estrategia_progresso_historico', histErr, obj.id)
    }
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

    const objetivosCarregados = objRes.data ? objRes.data.map(toObjetivo) : []
    const resultadosCarregados = resRes.data ? resRes.data.map(toResultado) : []

    if (fasesRes.data) setFases(fasesRes.data.map(toFase))
    if (objRes.data) setObjetivos(objetivosCarregados)
    if (resRes.data) setResultados(resultadosCarregados)
    setCarregando(false)

    sincronizarProgresso(objetivosCarregados, resultadosCarregados)
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

  // ── Goals: objetivos ──
  async function criarObjetivo(dados: {
    titulo: string
    descricao?: string | null
    categoria?: string | null
    trimestre?: string | null
    faseId?: string | null
    parentId?: string | null
    tipo?: string
    responsavel?: PerfilUsuario | null
    equipe?: string | null
    dataAlvo?: string | null
    peso?: number
    prioridade?: PrioridadeObjetivo
  }): Promise<EstrategiaObjetivo | null> {
    const sb = supabase
    if (!sb) return null
    const { data, error } = await sb.from('estrategia_objetivos').insert({
      titulo:      dados.titulo,
      descricao:   dados.descricao ?? null,
      categoria:   dados.categoria ?? null,
      trimestre:   dados.trimestre ?? null,
      fase_id:     dados.faseId ?? null,
      parent_id:   dados.parentId ?? null,
      tipo:        dados.tipo ?? 'objetivo',
      responsavel: dados.responsavel ?? null,
      equipe:      dados.equipe ?? null,
      data_alvo:   dados.dataAlvo ?? null,
      peso:        dados.peso ?? 0,
      prioridade:  dados.prioridade ?? 'P2',
    }).select().single()
    dbLog('INSERT', 'estrategia_objetivos', error, data?.id)
    if (error) { toastError('Erro ao criar meta', error.message); return null }
    success('Meta criada')
    return data ? toObjetivo(data as Row) : null
  }

  async function atualizarObjetivo(id: string, dados: Partial<{
    titulo: string
    descricao: string | null
    categoria: string | null
    trimestre: string | null
    faseId: string | null
    parentId: string | null
    tipo: string
    responsavel: PerfilUsuario | null
    equipe: string | null
    dataAlvo: string | null
    status: StatusObjetivo
    peso: number
    prioridade: PrioridadeObjetivo
  }>, opts?: { silencioso?: boolean }) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_objetivos').update({
      ...(dados.titulo      !== undefined && { titulo: dados.titulo }),
      ...(dados.descricao   !== undefined && { descricao: dados.descricao }),
      ...(dados.categoria   !== undefined && { categoria: dados.categoria }),
      ...(dados.trimestre   !== undefined && { trimestre: dados.trimestre }),
      ...(dados.faseId      !== undefined && { fase_id: dados.faseId }),
      ...(dados.parentId    !== undefined && { parent_id: dados.parentId }),
      ...(dados.tipo        !== undefined && { tipo: dados.tipo }),
      ...(dados.responsavel !== undefined && { responsavel: dados.responsavel }),
      ...(dados.equipe      !== undefined && { equipe: dados.equipe }),
      ...(dados.dataAlvo    !== undefined && { data_alvo: dados.dataAlvo }),
      ...(dados.peso        !== undefined && { peso: dados.peso }),
      ...(dados.prioridade  !== undefined && { prioridade: dados.prioridade }),
      // status setado manualmente aqui sempre vira override manual
      ...(dados.status      !== undefined && { status: dados.status, status_manual: true }),
    }).eq('id', id)
    dbLog('UPDATE', 'estrategia_objetivos', error, id)
    if (error) { toastError('Erro ao atualizar meta', error.message); return }
    if (!opts?.silencioso) success('Meta atualizada')
  }

  async function reverterStatusAutomatico(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_objetivos').update({ status_manual: false }).eq('id', id)
    dbLog('UPDATE', 'estrategia_objetivos (reverter status)', error, id)
    if (error) { toastError('Erro ao reverter status', error.message); return }
    success('Status voltou a ser calculado automaticamente')
  }

  async function removerObjetivo(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_objetivos').delete().eq('id', id)
    dbLog('DELETE', 'estrategia_objetivos', error, id)
    if (error) { toastError('Erro ao excluir meta', error.message); return }
    success('Meta excluída')
  }

  // ── Goals: resultados-chave ──
  async function criarResultado(dados: {
    objetivoId: string
    descricao: string
    meta: number
    atual?: number
    unidade?: string | null
    fonteAuto?: FonteAuto | null
  }): Promise<EstrategiaResultado | null> {
    const sb = supabase
    if (!sb) return null
    const { data, error } = await sb.from('estrategia_resultados').insert({
      objetivo_id: dados.objetivoId,
      descricao:   dados.descricao,
      meta:        dados.meta,
      atual:       dados.atual ?? 0,
      unidade:     dados.unidade ?? null,
      fonte_auto:  dados.fonteAuto ?? null,
    }).select().single()
    dbLog('INSERT', 'estrategia_resultados', error, data?.id)
    if (error) { toastError('Erro ao criar resultado-chave', error.message); return null }
    success('Resultado-chave criado')
    return data ? toResultado(data as Row) : null
  }

  async function atualizarResultado(id: string, dados: Partial<{
    descricao: string; meta: number; atual: number; unidade: string | null; fonteAuto: FonteAuto | null
  }>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_resultados').update({
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.meta      !== undefined && { meta: dados.meta }),
      ...(dados.atual     !== undefined && { atual: dados.atual }),
      ...(dados.unidade   !== undefined && { unidade: dados.unidade }),
      ...(dados.fonteAuto !== undefined && { fonte_auto: dados.fonteAuto }),
    }).eq('id', id)
    dbLog('UPDATE', 'estrategia_resultados', error, id)
    if (error) { toastError('Erro ao atualizar resultado-chave', error.message); return }
    success('Resultado-chave atualizado')
  }

  async function removerResultado(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('estrategia_resultados').delete().eq('id', id)
    dbLog('DELETE', 'estrategia_resultados', error, id)
    if (error) { toastError('Erro ao excluir resultado-chave', error.message); return }
    success('Resultado-chave excluído')
  }

  return {
    fases, objetivos, resultados, carregando, atualizarFase,
    criarObjetivo, atualizarObjetivo, removerObjetivo, reverterStatusAutomatico,
    criarResultado, atualizarResultado, removerResultado,
  }
}

// ─────────────────────────────────────────────
// Histórico de progresso de um objetivo (sob demanda, para o painel de detalhe)
// ─────────────────────────────────────────────

export function useHistoricoObjetivo(objetivoId: string | null) {
  const [historico, setHistorico] = useState<EstrategiaProgressoHistorico[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!objetivoId) { setHistorico([]); return }
    const sb = supabase
    if (!sb) return
    setCarregando(true)
    sb.from('estrategia_progresso_historico')
      .select('*')
      .eq('objetivo_id', objetivoId)
      .order('registrado_em', { ascending: true })
      .then(({ data, error }) => {
        dbLog('SELECT', 'estrategia_progresso_historico', error, `${data?.length ?? 0} rows`)
        setHistorico(data ? data.map(toHistorico) : [])
        setCarregando(false)
      })
  }, [objetivoId])

  return { historico, carregando }
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

'use client'

import { useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useTikTokStore } from '@/hooks/useTikTok'
import { gerarAlertas, type AlertaAcao } from '@/lib/tiktok/automacoes'
import { useNomesCreators, useTotais } from './comum'

let ultimaSync = 0
let assinaturaSync = ''

/**
 * Alertas do Action Center + sincronização idempotente com Tarefas:
 * - alerta com criaTarefa e sem tarefa → cria (índice único impede duplicar);
 * - tarefa automática cujo alerta sumiu (resolvido) → conclui sozinha.
 * Nada publica conteúdo nem mexe em orçamento.
 */
export function useAlertas(): AlertaAcao[] {
  const estado = useTikTokStore((s) => s.estado)
  const videos = useTikTokStore((s) => s.videos)
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const entregas = useTikTokStore((s) => s.entregas)
  const totais = useTotais()
  const { nome } = useNomesCreators()

  const alertas = useMemo(
    () => gerarAlertas({ videos, colaboracoes, entregas, totais, nomeCreator: (id) => nome(id) }),
    [videos, colaboracoes, entregas, totais, nome],
  )

  useEffect(() => {
    if (estado !== 'ok' || !supabase) return
    const comTarefa = alertas.filter((a) => a.criaTarefa)
    const assinatura = comTarefa.map((a) => a.id).sort().join('|')
    if (assinatura === assinaturaSync && Date.now() - ultimaSync < 60_000) return
    assinaturaSync = assinatura
    ultimaSync = Date.now()
    sincronizarTarefas(comTarefa).catch(() => { /* silencioso: o Action Center continua funcionando */ })
  }, [alertas, estado])

  return alertas
}

async function sincronizarTarefas(alertas: AlertaAcao[]) {
  const sb = supabase
  if (!sb) return
  const { data: abertas, error } = await sb.from('tarefas')
    .select('id, origem_tipo, origem_id, regra, status')
    .eq('modulo', 'tiktok').not('regra', 'is', null)
  if (error) { dbLog('SELECT', 'tarefas (tiktok auto)', error); return }
  const existentes = new Map((abertas ?? []).map((t) => [`${t.regra}:${t.origem_id}`, t]))
  const ativos = new Set(alertas.map((a) => a.id))

  for (const a of alertas) {
    if (existentes.has(a.id)) continue
    const { error: e } = await sb.from('tarefas').insert({
      titulo: a.titulo, descricao: `${a.detalhe}\n\nCriada automaticamente pelo TikTok Command Center.`,
      status: 'aberta', prioridade: a.prioridade === 'alta' ? 'alta' : a.prioridade, responsavel: a.responsavel,
      modulo: 'tiktok', due_date: a.prazo, tags: ['tiktok', 'automatica'], recorrencia: 'nenhuma', ordem: 0,
      origem_tipo: a.origemTipo, origem_id: a.origemId, regra: a.regra,
    })
    if (e && e.code !== '23505') dbLog('INSERT', 'tarefas (tiktok auto)', e, a.id)
  }
  const resolvidas = (abertas ?? []).filter((t) => !['concluida', 'cancelada'].includes(String(t.status)) && !ativos.has(`${t.regra}:${t.origem_id}`))
  if (resolvidas.length) {
    const { error: e } = await sb.from('tarefas').update({ status: 'concluida', completed_at: new Date().toISOString() }).in('id', resolvidas.map((t) => t.id))
    dbLog('UPDATE', 'tarefas (tiktok resolvidas)', e, `${resolvidas.length}`)
  }
}

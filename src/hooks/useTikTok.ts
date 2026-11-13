'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import type {
  Asset, Atribuicao, Campanha, Colaboracao, Entrega, HistoricoItem, Metrica, Publicacao, StatusVideo, Variante, Video,
} from '@/lib/tiktok/tipos'

type Row = Record<string, unknown>
const s = (v: unknown) => (v == null || v === '' ? null : String(v))
const n = (v: unknown) => (v == null || v === '' ? null : Number(v))

export const toVideo = (r: Row): Video => ({
  id: String(r.id), codigo: String(r.codigo ?? '—'), titulo: String(r.titulo ?? ''), pilar: s(r.pilar), campanhaId: s(r.campanha_id),
  objetivoComercial: (s(r.objetivo_comercial) ?? 'awareness') as Video['objetivoComercial'], publico: s(r.publico), formato: s(r.formato),
  gancho: s(r.gancho), ganchoTipo: s(r.gancho_tipo), roteiro: s(r.roteiro), cta: s(r.cta), duracaoSeg: n(r.duracao_seg),
  status: (s(r.status) ?? 'ideia') as StatusVideo, prioridade: (s(r.prioridade) ?? 'media') as Video['prioridade'],
  responsavel: String(r.responsavel ?? 'matheus'), creatorId: s(r.creator_id), colaboracaoId: s(r.colaboracao_id),
  dataGravacao: s(r.data_gravacao), dataPrevista: s(r.data_prevista_publicacao), thumbnailPath: s(r.thumbnail_path),
  direitosUso: (s(r.direitos_uso) ?? 'organico') as Video['direitosUso'], direitosAte: s(r.direitos_ate),
  custoProducao: Number(r.custo_producao ?? 0), proximasAcoes: s(r.proximas_acoes), aprendizado: s(r.aprendizado), notas: s(r.notas),
  scoreIdeia: n(r.score_ideia), aprovadoPor: s(r.aprovado_por), aprovadoEm: s(r.aprovado_em),
  statusDesde: String(r.status_desde ?? r.updated_at ?? new Date().toISOString()),
  createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? ''),
})

const CAMPOS_VIDEO: Record<keyof Video, string | null> = {
  id: null, codigo: null, createdAt: null, updatedAt: null, statusDesde: null,
  titulo: 'titulo', pilar: 'pilar', campanhaId: 'campanha_id', objetivoComercial: 'objetivo_comercial', publico: 'publico',
  formato: 'formato', gancho: 'gancho', ganchoTipo: 'gancho_tipo', roteiro: 'roteiro', cta: 'cta', duracaoSeg: 'duracao_seg',
  status: 'status', prioridade: 'prioridade', responsavel: 'responsavel', creatorId: 'creator_id', colaboracaoId: 'colaboracao_id',
  dataGravacao: 'data_gravacao', dataPrevista: 'data_prevista_publicacao', thumbnailPath: 'thumbnail_path',
  direitosUso: 'direitos_uso', direitosAte: 'direitos_ate', custoProducao: 'custo_producao', proximasAcoes: 'proximas_acoes',
  aprendizado: 'aprendizado', notas: 'notas', scoreIdeia: 'score_ideia', aprovadoPor: 'aprovado_por', aprovadoEm: 'aprovado_em',
}
export function videoParaDb(d: Partial<Video>): Row {
  const out: Row = {}
  for (const [k, v] of Object.entries(d)) {
    const col = CAMPOS_VIDEO[k as keyof Video]
    if (col) out[col] = v === '' ? null : v
  }
  return out
}

const toCampanha = (r: Row): Campanha => ({
  id: String(r.id), nome: String(r.nome ?? ''), tipo: (s(r.tipo) ?? 'organica') as Campanha['tipo'], objetivoId: s(r.objetivo_id),
  status: (s(r.status) ?? 'planejada') as Campanha['status'], inicio: s(r.inicio), fim: s(r.fim),
  orcamentoPrevisto: Number(r.orcamento_previsto ?? 0), publico: s(r.publico), hipotese: s(r.hipotese),
  metaPrincipal: (s(r.meta_principal) ?? 'views') as Campanha['metaPrincipal'], metaValor: n(r.meta_valor),
  utmCampaign: s(r.utm_campaign), responsavel: String(r.responsavel ?? 'matheus'),
})
export function campanhaParaDb(c: Partial<Campanha>): Row {
  const m: Record<string, string> = { nome: 'nome', tipo: 'tipo', objetivoId: 'objetivo_id', status: 'status', inicio: 'inicio', fim: 'fim',
    orcamentoPrevisto: 'orcamento_previsto', publico: 'publico', hipotese: 'hipotese', metaPrincipal: 'meta_principal',
    metaValor: 'meta_valor', utmCampaign: 'utm_campaign', responsavel: 'responsavel' }
  const out: Row = {}
  for (const [k, v] of Object.entries(c)) if (m[k]) out[m[k]] = v === '' ? null : v
  return out
}

const toPublicacao = (r: Row): Publicacao => ({
  id: String(r.id), videoId: String(r.video_id), varianteId: s(r.variante_id), conta: s(r.conta), url: s(r.url),
  tiktokItemId: s(r.tiktok_item_id), publicadoEm: String(r.publicado_em ?? r.created_at), tipo: (s(r.tipo) ?? 'organico') as Publicacao['tipo'],
  utmContent: s(r.utm_content), cupom: s(r.cupom),
})
const toMetrica = (r: Row): Metrica => ({
  id: String(r.id), publicacaoId: String(r.publicacao_id), dataReferencia: String(r.data_referencia), views: Number(r.views ?? 0),
  likes: Number(r.likes ?? 0), comentarios: Number(r.comentarios ?? 0), compartilhamentos: Number(r.compartilhamentos ?? 0),
  salvos: Number(r.salvos ?? 0), seguidoresGanhos: n(r.seguidores_ganhos), tempoMedioSeg: n(r.tempo_medio_seg),
  retencao3s: n(r.retencao_3s), conclusaoPct: n(r.conclusao_pct), cliques: n(r.cliques), gasto: n(r.gasto), origem: String(r.origem ?? 'manual'),
})
const toColab = (r: Row): Colaboracao => ({
  id: String(r.id), creatorId: String(r.creator_id), campanhaId: s(r.campanha_id), etapa: (s(r.etapa) ?? 'prospect') as Colaboracao['etapa'],
  tipoAcordo: (s(r.tipo_acordo) ?? 'permuta') as Colaboracao['tipoAcordo'], cache: Number(r.cache ?? 0), comissaoPct: Number(r.comissao_pct ?? 0),
  cupom: s(r.cupom), prazoEntrega: s(r.prazo_entrega), direitosUso: (s(r.direitos_uso) ?? 'organico') as Colaboracao['direitosUso'],
  direitosAte: s(r.direitos_ate), contratoUrl: s(r.contrato_url), responsavel: String(r.responsavel ?? 'matheus'), notas: s(r.notas),
  updatedAt: String(r.updated_at ?? r.created_at ?? ''),
})
export function colabParaDb(c: Partial<Colaboracao>): Row {
  const m: Record<string, string> = { creatorId: 'creator_id', campanhaId: 'campanha_id', etapa: 'etapa', tipoAcordo: 'tipo_acordo', cache: 'cache',
    comissaoPct: 'comissao_pct', cupom: 'cupom', prazoEntrega: 'prazo_entrega', direitosUso: 'direitos_uso', direitosAte: 'direitos_ate',
    contratoUrl: 'contrato_url', responsavel: 'responsavel', notas: 'notas' }
  const out: Row = {}
  for (const [k, v] of Object.entries(c)) if (m[k]) out[m[k]] = v === '' ? null : v
  return out
}
const toEntrega = (r: Row): Entrega => ({
  id: String(r.id), colaboracaoId: String(r.colaboracao_id), videoId: s(r.video_id), descricao: String(r.descricao ?? ''),
  prazo: s(r.prazo), status: (s(r.status) ?? 'pendente') as Entrega['status'], recebidaEm: s(r.recebida_em), link: s(r.link),
})
const toAtrib = (r: Row): Atribuicao => ({
  id: String(r.id), vendaId: String(r.venda_id), videoId: s(r.video_id), publicacaoId: s(r.publicacao_id), campanhaId: s(r.campanha_id),
  creatorId: s(r.creator_id), metodo: (s(r.metodo) ?? 'manual') as Atribuicao['metodo'], valor: Number(r.valor ?? 0),
  confianca: (s(r.confianca) ?? 'baixa') as Atribuicao['confianca'],
})
export const toVariante = (r: Row): Variante => ({
  id: String(r.id), videoId: String(r.video_id), rotulo: String(r.rotulo ?? 'A'), oQueMuda: String(r.o_que_muda ?? 'gancho'),
  descricao: s(r.descricao), gancho: s(r.gancho), duracaoSeg: n(r.duracao_seg), status: String(r.status ?? 'planejada'),
})
export const toAsset = (r: Row): Asset => ({
  id: String(r.id), videoId: String(r.video_id), tipo: String(r.tipo ?? 'outro'), nome: String(r.nome ?? ''), storagePath: s(r.storage_path),
  urlExterna: s(r.url_externa), mime: s(r.mime), tamanho: n(r.tamanho), createdAt: String(r.created_at ?? ''),
})
export const toHistorico = (r: Row): HistoricoItem => ({
  id: String(r.id), deStatus: s(r.de_status), paraStatus: s(r.para_status), autor: s(r.autor), comentario: s(r.comentario), createdAt: String(r.created_at),
})

export type EstadoCarga = 'carregando' | 'ok' | 'sem_tabelas' | 'erro'

interface TikTokState {
  estado: EstadoCarga
  erro: string | null
  videos: Video[]
  campanhas: Campanha[]
  publicacoes: Publicacao[]
  metricas: Metrica[]
  colaboracoes: Colaboracao[]
  entregas: Entrega[]
  atribuicoes: Atribuicao[]
  set: (p: Partial<TikTokState>) => void
}

export const useTikTokStore = create<TikTokState>((set) => ({
  estado: 'carregando', erro: null, videos: [], campanhas: [], publicacoes: [], metricas: [], colaboracoes: [], entregas: [], atribuicoes: [],
  set: (p) => set(p),
}))

const tabelaFaltando = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? ''))

export async function recarregarTikTok() {
  const sb = supabase
  const st = useTikTokStore.getState()
  if (!sb) {
    if (process.env.NODE_ENV === 'development') {
      const d = await import('@/lib/tiktok/demo')
      st.set({ estado: 'ok', erro: null, videos: d.DEMO_VIDEOS, campanhas: d.DEMO_CAMPANHAS, publicacoes: d.DEMO_PUBLICACOES,
        metricas: d.DEMO_METRICAS, colaboracoes: d.DEMO_COLABS, entregas: d.DEMO_ENTREGAS, atribuicoes: [] })
      return
    }
    st.set({ estado: 'erro', erro: 'Supabase não configurado' }); return
  }
  const [v, c, p, m, co, e, a] = await Promise.all([
    sb.from('tt_videos').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    sb.from('tt_campanhas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    sb.from('tt_publicacoes').select('*').order('publicado_em', { ascending: false }),
    sb.from('tt_metricas').select('*').order('data_referencia', { ascending: false }).limit(5000),
    sb.from('tt_colaboracoes').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    sb.from('tt_entregas').select('*').order('prazo', { ascending: true }),
    sb.from('tt_atribuicoes').select('*'),
  ])
  dbLog('SELECT', 'tt_videos', v.error, `${v.data?.length ?? 0} rows`)
  const erros = [v, c, p, m, co, e, a].map((r) => r.error).filter(Boolean)
  if (erros.some(tabelaFaltando)) { st.set({ estado: 'sem_tabelas', erro: null }); return }
  if (erros.length) { st.set({ estado: 'erro', erro: erros[0]!.message }); return }
  st.set({
    estado: 'ok', erro: null,
    videos: (v.data ?? []).map(toVideo), campanhas: (c.data ?? []).map(toCampanha), publicacoes: (p.data ?? []).map(toPublicacao),
    metricas: (m.data ?? []).map(toMetrica), colaboracoes: (co.data ?? []).map(toColab), entregas: (e.data ?? []).map(toEntrega),
    atribuicoes: (a.data ?? []).map(toAtrib),
  })
}

/** Monta a carga + realtime uma vez (no hub do módulo). */
export function useTikTokSync() {
  useEffect(() => {
    const sb = supabase
    recarregarTikTok()
    if (!sb) return
    let t: ReturnType<typeof setTimeout> | null = null
    const agendar = () => { if (t) clearTimeout(t); t = setTimeout(recarregarTikTok, 400) }
    const ch = sb.channel(`tiktok-sync-${Math.random().toString(36).slice(2)}`)
    for (const tabela of ['tt_videos', 'tt_campanhas', 'tt_publicacoes', 'tt_metricas', 'tt_colaboracoes', 'tt_entregas', 'tt_atribuicoes']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, agendar)
    }
    ch.subscribe()
    return () => { if (t) clearTimeout(t); sb.removeChannel(ch) }
  }, [])
}

// ─────────────────────────────────────────────
// Escritas (RLS garante o tenant; nunca enviamos tenant_id)
// ─────────────────────────────────────────────
type Res<T = void> = { ok: true; data?: T } | { ok: false; erro: string }
const falha = (e: { message: string } | null): Res<never> => ({ ok: false, erro: e?.message ?? 'Erro desconhecido' })

export async function criarVideo(d: Partial<Video>): Promise<Res<Video>> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { data, error } = await sb.from('tt_videos').insert(videoParaDb(d)).select().single()
  dbLog('INSERT', 'tt_videos', error, data?.id)
  if (error) return falha(error)
  const v = toVideo(data)
  useTikTokStore.setState((st) => ({ videos: [v, ...st.videos] }))
  return { ok: true, data: v }
}

export async function atualizarVideos(ids: string[], d: Partial<Video>): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const anteriores = useTikTokStore.getState().videos
  useTikTokStore.setState((st) => ({ videos: st.videos.map((v) => (ids.includes(v.id) ? { ...v, ...d, ...(d.status && d.status !== v.status ? { statusDesde: new Date().toISOString() } : {}) } : v)) }))
  const { error } = await sb.from('tt_videos').update(videoParaDb(d)).in('id', ids)
  dbLog('UPDATE', 'tt_videos', error, ids.join(','))
  if (error) { useTikTokStore.setState({ videos: anteriores }); return falha(error) }
  return { ok: true }
}

export async function arquivarVideos(ids: string[]): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_videos').update({ deleted_at: new Date().toISOString() }).in('id', ids)
  dbLog('UPDATE', 'tt_videos (lixeira)', error, ids.join(','))
  if (error) return falha(error)
  useTikTokStore.setState((st) => ({ videos: st.videos.filter((v) => !ids.includes(v.id)) }))
  return { ok: true }
}

export async function salvarCampanha(c: Partial<Campanha> & { id?: string }): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const payload = campanhaParaDb(c)
  const { error } = c.id ? await sb.from('tt_campanhas').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', c.id)
    : await sb.from('tt_campanhas').insert(payload)
  dbLog(c.id ? 'UPDATE' : 'INSERT', 'tt_campanhas', error, c.id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export async function excluirCampanha(id: string): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_campanhas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  dbLog('UPDATE', 'tt_campanhas (lixeira)', error, id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export async function salvarColaboracao(c: Partial<Colaboracao> & { id?: string }): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const payload = { ...colabParaDb(c), updated_at: new Date().toISOString() }
  if (c.id) useTikTokStore.setState((st) => ({ colaboracoes: st.colaboracoes.map((x) => (x.id === c.id ? { ...x, ...c, updatedAt: payload.updated_at } : x)) }))
  const { error } = c.id ? await sb.from('tt_colaboracoes').update(payload).eq('id', c.id) : await sb.from('tt_colaboracoes').insert(payload)
  dbLog(c.id ? 'UPDATE' : 'INSERT', 'tt_colaboracoes', error, c.id)
  if (error) { await recarregarTikTok(); return falha(error) }
  if (!c.id) await recarregarTikTok()
  return { ok: true }
}

export async function excluirColaboracao(id: string): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_colaboracoes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  dbLog('UPDATE', 'tt_colaboracoes (lixeira)', error, id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export async function salvarEntrega(e: Partial<Entrega> & { id?: string }): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const payload: Row = {}
  if (e.colaboracaoId !== undefined) payload.colaboracao_id = e.colaboracaoId
  if (e.videoId !== undefined) payload.video_id = e.videoId
  if (e.descricao !== undefined) payload.descricao = e.descricao
  if (e.prazo !== undefined) payload.prazo = e.prazo || null
  if (e.link !== undefined) payload.link = e.link || null
  if (e.status !== undefined) {
    payload.status = e.status
    if (e.status !== 'pendente') payload.recebida_em = new Date().toISOString()
  }
  const { error } = e.id ? await sb.from('tt_entregas').update(payload).eq('id', e.id) : await sb.from('tt_entregas').insert(payload)
  dbLog(e.id ? 'UPDATE' : 'INSERT', 'tt_entregas', error, e.id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export async function excluirEntrega(id: string): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_entregas').delete().eq('id', id)
  dbLog('DELETE', 'tt_entregas', error, id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export async function criarPublicacao(p: Partial<Publicacao> & { videoId: string }): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_publicacoes').insert({
    video_id: p.videoId, variante_id: p.varianteId ?? null, conta: p.conta || null, url: p.url || null,
    tiktok_item_id: p.tiktokItemId || extrairItemId(p.url) || null, publicado_em: p.publicadoEm ?? new Date().toISOString(),
    tipo: p.tipo ?? 'organico', utm_content: p.utmContent || null, cupom: p.cupom ? p.cupom.toUpperCase() : null,
  })
  dbLog('INSERT', 'tt_publicacoes', error)
  if (error) return falha(error.code === '23505' ? { message: 'Este vídeo do TikTok já está cadastrado em outra publicação' } : error)
  await recarregarTikTok()
  return { ok: true }
}

export async function excluirPublicacao(id: string): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_publicacoes').delete().eq('id', id)
  dbLog('DELETE', 'tt_publicacoes', error, id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

/** Upsert por (publicação, data, origem): relançar a mesma data atualiza em vez de duplicar. */
export async function lancarMetrica(m: Partial<Metrica> & { publicacaoId: string; dataReferencia: string }): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_metricas').upsert({
    publicacao_id: m.publicacaoId, data_referencia: m.dataReferencia, origem: 'manual',
    views: m.views ?? 0, likes: m.likes ?? 0, comentarios: m.comentarios ?? 0, compartilhamentos: m.compartilhamentos ?? 0,
    salvos: m.salvos ?? 0, seguidores_ganhos: m.seguidoresGanhos ?? null, conclusao_pct: m.conclusaoPct ?? null,
    tempo_medio_seg: m.tempoMedioSeg ?? null, cliques: m.cliques ?? null, gasto: m.gasto ?? null, coletado_em: new Date().toISOString(),
  }, { onConflict: 'publicacao_id,data_referencia,origem' })
  dbLog('UPSERT', 'tt_metricas', error, m.publicacaoId)
  if (error) return falha(error)
  await sb.from('integracao_sync_logs').insert({ integracao: 'manual', operacao: 'metrica_manual', status: 'ok', registros_lidos: 1, atualizados: 1 })
  await recarregarTikTok()
  return { ok: true }
}

export async function atribuirVendas(itens: Array<Omit<Atribuicao, 'id'>>, autor: string): Promise<Res<number>> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  if (!itens.length) return { ok: true, data: 0 }
  const { data, error } = await sb.from('tt_atribuicoes').upsert(itens.map((a) => ({
    venda_id: a.vendaId, video_id: a.videoId, publicacao_id: a.publicacaoId, campanha_id: a.campanhaId, creator_id: a.creatorId,
    metodo: a.metodo, valor: a.valor, confianca: a.confianca, autor, modelo: 'ultimo_toque',
  })), { onConflict: 'venda_id,modelo', ignoreDuplicates: true }).select('id')
  dbLog('UPSERT', 'tt_atribuicoes', error, `${data?.length ?? 0}`)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true, data: data?.length ?? 0 }
}

export async function removerAtribuicao(id: string): Promise<Res> {
  const sb = supabase; if (!sb) return { ok: false, erro: 'offline' }
  const { error } = await sb.from('tt_atribuicoes').delete().eq('id', id)
  dbLog('DELETE', 'tt_atribuicoes', error, id)
  if (error) return falha(error)
  await recarregarTikTok()
  return { ok: true }
}

export function extrairItemId(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/video\/(\d{8,})/)
  return m ? m[1] : null
}

// ── Detalhe do vídeo (carregado sob demanda na ficha) ──
export async function carregarDetalheVideo(videoId: string) {
  const sb = supabase
  if (!sb) return { variantes: [], assets: [], historico: [] }
  const [va, as, hi] = await Promise.all([
    sb.from('tt_variantes').select('*').eq('video_id', videoId).order('rotulo'),
    sb.from('tt_assets').select('*').eq('video_id', videoId).order('created_at', { ascending: false }),
    sb.from('tt_video_historico').select('*').eq('video_id', videoId).order('created_at', { ascending: false }).limit(50),
  ])
  return {
    variantes: (va.data ?? []).map(toVariante),
    assets: (as.data ?? []).map(toAsset),
    historico: (hi.data ?? []).map(toHistorico),
  }
}

export const BUCKET_MIDIA = 'tiktok-midia'

export async function urlAssinada(path: string): Promise<string | null> {
  const sb = supabase; if (!sb) return null
  const { data } = await sb.storage.from(BUCKET_MIDIA).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

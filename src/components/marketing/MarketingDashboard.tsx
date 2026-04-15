'use client'

/**
 * PURION OS — Módulo 6: Marketing & Creators
 * KPIs, tracker de creators, calendário semanal de conteúdo.
 */

import { useState, useMemo } from 'react'
import { Plus, ExternalLink, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import {
  usePurionStore,
  type Creator,
  type ConteudoCalendario,
  type PerfilUsuario,
  type FormatoConteudo,
  type StatusConteudo,
} from '@/store'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const META_KITS = 30
const META_VIDEOS = 60

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const STATUS_KIT_LABEL: Record<string, string> = {
  contatado:    'Não enviado',
  negociando:   'Não enviado',
  kit_enviado:  'Enviado',
  postado:      'Publicado',
  pago:         'Publicado',
  inativo:      'Sem retorno',
}

const STATUS_KIT_COLOR: Record<string, string> = {
  contatado:    'text-[#6B6B6B] bg-[#2A2A2A]',
  negociando:   'text-[#6B6B6B] bg-[#2A2A2A]',
  kit_enviado:  'text-blue-400 bg-blue-400/10',
  postado:      'text-emerald-400 bg-emerald-400/10',
  pago:         'text-emerald-400 bg-emerald-400/10',
  inativo:      'text-amber-400 bg-amber-400/10',
}

const PLATAFORMA_COLOR: Record<string, string> = {
  instagram: 'text-pink-400 bg-pink-400/10',
  tiktok:    'text-sky-400 bg-sky-400/10',
  youtube:   'text-red-400 bg-red-400/10',
}

const FORMATO_COLOR: Record<FormatoConteudo, string> = {
  reels:    'text-pink-400 bg-pink-400/10',
  post:     'text-blue-400 bg-blue-400/10',
  stories:  'text-purple-400 bg-purple-400/10',
  tiktok:   'text-sky-400 bg-sky-400/10',
  youtube:  'text-red-400 bg-red-400/10',
  live:     'text-amber-400 bg-amber-400/10',
}

const STATUS_CONTEUDO_COLOR: Record<StatusConteudo, string> = {
  planejado:    'text-[#6B6B6B]',
  em_producao:  'text-amber-400',
  publicado:    'text-emerald-400',
  cancelado:    'text-red-400',
}

const SOCIO_INICIAL: Record<PerfilUsuario, string> = {
  matheus: 'M',
  joao: 'J',
  gabriel: 'G',
}

const SOCIO_COLOR: Record<PerfilUsuario, string> = {
  matheus: 'bg-[#C9A84C] text-[#0D0D0D]',
  joao:    'bg-blue-500 text-white',
  gabriel: 'bg-emerald-600 text-white',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function fmtSeguidores(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

/** Retorna segunda-feira da semana que contém `date` */
function inicioSemana(date: Date): Date {
  const d = new Date(date)
  const dia = d.getUTCDay() // 0=Dom, 1=Seg...
  const diff = (dia === 0 ? -6 : 1 - dia)
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function fmtDia(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

// ─────────────────────────────────────────────
// MODAIS
// ─────────────────────────────────────────────

function ModalCreator({ onSalvar, onFechar }: {
  onSalvar: (c: Creator) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    nome: '', instagram: '', tiktok: '', seguidores: '',
    nicho: '', status: 'contatado' as Creator['status'],
    cache: '', responsavel: 'joao' as PerfilUsuario, notas: '',
  })

  const handleSubmit = () => {
    if (!form.nome || !form.instagram) return
    const creator: Creator = {
      id: `cre-${Date.now()}`,
      nome: form.nome,
      instagram: form.instagram,
      tiktok: form.tiktok || undefined,
      seguidores: parseInt(form.seguidores, 10) || 0,
      nichoPrincipal: form.nicho,
      status: form.status,
      cacheCombinado: parseFloat(form.cache) || 0,
      produtosEnviados: [],
      postagens: [],
      roi: 0,
      createdAt: new Date().toISOString(),
      responsavel: form.responsavel,
      notas: form.notas,
    }
    onSalvar(creator)
  }

  const F = ({ label, field, type = 'text', placeholder = '' }: {
    label: string; field: keyof typeof form; type?: string; placeholder?: string
  }) => (
    <div>
      <label className="text-xs text-[#8A8A8A] block mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[field] as string}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[#FAFAF8] mb-4">Adicionar Creator</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><F label="Nome" field="nome" placeholder="ex: Lucas Automania" /></div>
          <F label="Instagram" field="instagram" placeholder="@usuario" />
          <F label="TikTok (opcional)" field="tiktok" placeholder="@usuario" />
          <F label="Seguidores" field="seguidores" type="number" placeholder="0" />
          <F label="Nicho principal" field="nicho" placeholder="ex: Automotivo" />
          <F label="Cachê combinado (R$)" field="cache" type="number" placeholder="0" />
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Status inicial</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Creator['status'] })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            >
              <option value="contatado">Contatado</option>
              <option value="negociando">Negociando</option>
              <option value="kit_enviado">Kit Enviado</option>
              <option value="postado">Postado</option>
              <option value="pago">Pago</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Responsável</label>
            <select
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value as PerfilUsuario })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            >
              <option value="joao">João</option>
              <option value="matheus">Matheus</option>
              <option value="gabriel">Gabriel</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[#8A8A8A] block mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A]">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalConteudo({
  dataInicial,
  onSalvar,
  onFechar,
}: {
  dataInicial: string
  onSalvar: (c: ConteudoCalendario) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    data: dataInicial,
    formato: 'reels' as FormatoConteudo,
    responsavel: 'joao' as PerfilUsuario,
    status: 'planejado' as StatusConteudo,
    descricao: '',
  })

  const handleSubmit = () => {
    if (!form.descricao) return
    const conteudo: ConteudoCalendario = {
      id: `cnt-${Date.now()}`,
      data: form.data,
      formato: form.formato,
      responsavel: form.responsavel,
      status: form.status,
      descricao: form.descricao,
    }
    onSalvar(conteudo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[#FAFAF8] mb-4">Novo Conteúdo</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Formato</label>
              <select
                value={form.formato}
                onChange={(e) => setForm({ ...form, formato: e.target.value as FormatoConteudo })}
                className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              >
                <option value="reels">Reels</option>
                <option value="post">Post</option>
                <option value="stories">Stories</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusConteudo })}
                className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              >
                <option value="planejado">Planejado</option>
                <option value="em_producao">Em produção</option>
                <option value="publicado">Publicado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Responsável</label>
            <select
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value as PerfilUsuario })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            >
              <option value="joao">João</option>
              <option value="matheus">Matheus</option>
              <option value="gabriel">Gabriel</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Descrição</label>
            <textarea
              rows={2}
              placeholder="Descreva o conteúdo..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[#2A2A2A] rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function MarketingDashboard() {
  const { creators, adicionarCreator, conteudosCalendario, adicionarConteudo } = usePurionStore()

  // KPI calculations
  const kitsEnviados = creators.filter(
    (c) => c.status === 'kit_enviado' || c.status === 'postado' || c.status === 'pago'
  ).length
  const videosPublicados = creators.reduce((acc, c) => acc + c.postagens.length, 0)

  // Filters
  const [filtroPlatforma, setFiltroPlatforma] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [modalCreator, setModalCreator] = useState(false)
  const [modalConteudo, setModalConteudo] = useState<string | null>(null) // date string or null

  // Calendar week navigation — start at week of 2024-02-12
  const [semanaBase, setSemanaBase] = useState(() => inicioSemana(new Date('2024-02-12')))

  const diasSemanaAtual = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i)),
  [semanaBase])

  const conteudosPorDia = useMemo(() => {
    const map: Record<string, ConteudoCalendario[]> = {}
    diasSemanaAtual.forEach((d) => { map[isoDate(d)] = [] })
    conteudosCalendario.forEach((c) => {
      if (map[c.data]) map[c.data].push(c)
    })
    return map
  }, [conteudosCalendario, diasSemanaAtual])

  const creatoresFiltrados = useMemo(() => {
    return creators.filter((c) => {
      if (filtroPlatforma !== 'todos') {
        if (filtroPlatforma === 'instagram' && !c.instagram) return false
        if (filtroPlatforma === 'tiktok' && !c.tiktok) return false
      }
      if (filtroStatus !== 'todos') {
        const statusKit = STATUS_KIT_LABEL[c.status]
        if (filtroStatus === 'Não enviado' && statusKit !== 'Não enviado') return false
        if (filtroStatus === 'Enviado' && statusKit !== 'Enviado') return false
        if (filtroStatus === 'Publicado' && statusKit !== 'Publicado') return false
        if (filtroStatus === 'Sem retorno' && statusKit !== 'Sem retorno') return false
      }
      return true
    })
  }, [creators, filtroPlatforma, filtroStatus])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-lg font-black tracking-widest text-[#FAFAF8] uppercase">Marketing & Creators</h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">KPIs, tracker de influenciadores e calendário de conteúdo</p>
      </div>

      {/* ══════════════════════════════════════
          SEÇÃO 1 — KPIs
      ══════════════════════════════════════ */}
      <section>
        <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">KPIs de Creators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kits enviados */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">Kits Enviados</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#C9A84C]">{kitsEnviados}</span>
                  <span className="text-sm text-[#4A4A4A]">/ {META_KITS}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#C9A84C]">
                {Math.round((kitsEnviados / META_KITS) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (kitsEnviados / META_KITS) * 100)}%`, backgroundColor: '#C9A84C' }}
              />
            </div>
            <p className="text-[10px] text-[#4A4A4A] mt-2">Meta: {META_KITS} kits no mês</p>
          </div>

          {/* Vídeos publicados */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">Vídeos Publicados</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#C9A84C]">{videosPublicados}</span>
                  <span className="text-sm text-[#4A4A4A]">/ {META_VIDEOS}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#C9A84C]">
                {Math.round((videosPublicados / META_VIDEOS) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (videosPublicados / META_VIDEOS) * 100)}%`, backgroundColor: '#C9A84C' }}
              />
            </div>
            <p className="text-[10px] text-[#4A4A4A] mt-2">Meta: {META_VIDEOS} vídeos no trimestre</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 2 — TRACKER DE CREATORS
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
            Tracker de Creators ({creatoresFiltrados.length})
          </h2>
          <div className="flex items-center gap-2">
            {/* Filtro plataforma */}
            <div className="flex items-center gap-1.5">
              <Filter size={11} className="text-[#6B6B6B]" />
              <select
                value={filtroPlatforma}
                onChange={(e) => setFiltroPlatforma(e.target.value)}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-md px-2 py-1 text-xs text-[#8A8A8A] outline-none focus:border-[#C9A84C]"
              >
                <option value="todos">Todas plataformas</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            {/* Filtro status kit */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-md px-2 py-1 text-xs text-[#8A8A8A] outline-none focus:border-[#C9A84C]"
            >
              <option value="todos">Todos os status</option>
              <option value="Não enviado">Não enviado</option>
              <option value="Enviado">Enviado</option>
              <option value="Publicado">Publicado</option>
              <option value="Sem retorno">Sem retorno</option>
            </select>
            <button
              onClick={() => setModalCreator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
            >
              <Plus size={12} />
              Adicionar creator
            </button>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 px-4 py-2.5 border-b border-[#2A2A2A]">
            {['Nome', 'Plataforma', 'Seguidores', 'Status Kit', 'Data Envio', 'Link Conteúdo'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {creatoresFiltrados.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#4A4A4A]">
              Nenhum creator encontrado
            </div>
          )}

          {creatoresFiltrados.map((creator) => {
            const primeiraPostagem = creator.postagens[0]
            const dataEnvio = creator.produtosEnviados.length > 0
              ? primeiraPostagem?.data ?? '—'
              : null
            const linkConteudo = primeiraPostagem?.url

            return (
              <div
                key={creator.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 px-4 py-3 border-b border-[#2A2A2A] last:border-0 items-center hover:bg-[rgba(255,255,255,0.02)]"
              >
                {/* Nome */}
                <div>
                  <p className="text-xs font-semibold text-[#FAFAF8]">{creator.nome}</p>
                  <p className="text-[10px] text-[#6B6B6B]">{creator.nichoPrincipal}</p>
                </div>

                {/* Plataformas */}
                <div className="flex flex-wrap gap-1">
                  {creator.instagram && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PLATAFORMA_COLOR.instagram}`}>
                      IG
                    </span>
                  )}
                  {creator.tiktok && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PLATAFORMA_COLOR.tiktok}`}>
                      TT
                    </span>
                  )}
                </div>

                {/* Seguidores */}
                <span className="text-xs text-[#FAFAF8] font-semibold">
                  {fmtSeguidores(creator.seguidores)}
                </span>

                {/* Status Kit */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start mt-0.5 ${STATUS_KIT_COLOR[creator.status]}`}>
                  {STATUS_KIT_LABEL[creator.status]}
                </span>

                {/* Data envio */}
                <span className="text-xs text-[#8A8A8A]">
                  {dataEnvio
                    ? new Date(dataEnvio + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '—'
                  }
                </span>

                {/* Link conteúdo */}
                {linkConteudo ? (
                  <a
                    href={linkConteudo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#C9A84C] hover:text-[#D4B568] truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={11} />
                    <span className="truncate">Ver post</span>
                  </a>
                ) : (
                  <span className="text-xs text-[#4A4A4A]">—</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — CALENDÁRIO DE CONTEÚDO
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
            Calendário de Conteúdo
          </h2>
          <div className="flex items-center gap-2">
            {/* Navegação de semana */}
            <button
              onClick={() => setSemanaBase((d) => addDays(d, -7))}
              className="p-1.5 rounded-md text-[#6B6B6B] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)]"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-[#8A8A8A] min-w-[130px] text-center">
              {fmtDia(diasSemanaAtual[0])} — {fmtDia(diasSemanaAtual[6])}
            </span>
            <button
              onClick={() => setSemanaBase((d) => addDays(d, 7))}
              className="p-1.5 rounded-md text-[#6B6B6B] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)]"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setModalConteudo(isoDate(diasSemanaAtual[0]))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
            >
              <Plus size={12} />
              Novo conteúdo
            </button>
          </div>
        </div>

        {/* Grid 7 colunas */}
        <div className="grid grid-cols-7 gap-2">
          {diasSemanaAtual.map((dia, idx) => {
            const key = isoDate(dia)
            const cards = conteudosPorDia[key] ?? []
            return (
              <div key={key} className="flex flex-col gap-1.5">
                {/* Header do dia */}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-[#6B6B6B] uppercase">{DIAS_SEMANA[idx]}</p>
                  <p className="text-xs text-[#8A8A8A]">{fmtDia(dia)}</p>
                </div>

                {/* Coluna do dia */}
                <div
                  className="min-h-[120px] bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1.5 flex flex-col gap-1.5"
                >
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#141414] border border-[#2A2A2A] rounded-md p-2 flex flex-col gap-1"
                    >
                      {/* Formato badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded self-start uppercase ${FORMATO_COLOR[c.formato]}`}>
                        {c.formato}
                      </span>
                      {/* Descrição */}
                      <p className="text-[10px] text-[#8A8A8A] leading-tight line-clamp-2">{c.descricao}</p>
                      {/* Footer: status + responsável */}
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[9px] font-semibold ${STATUS_CONTEUDO_COLOR[c.status]}`}>
                          {c.status === 'planejado' ? 'Planejado' :
                           c.status === 'em_producao' ? 'Em prod.' :
                           c.status === 'publicado' ? 'Publicado' : 'Cancelado'}
                        </span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${SOCIO_COLOR[c.responsavel]}`}>
                          {SOCIO_INICIAL[c.responsavel]}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Botão add no dia */}
                  <button
                    onClick={() => setModalConteudo(key)}
                    className="text-[10px] text-[#3A3A3A] hover:text-[#C9A84C] py-1 text-center rounded transition-colors"
                  >
                    + add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Modais ── */}
      {modalCreator && (
        <ModalCreator
          onSalvar={(c) => { adicionarCreator(c); setModalCreator(false) }}
          onFechar={() => setModalCreator(false)}
        />
      )}
      {modalConteudo !== null && (
        <ModalConteudo
          dataInicial={modalConteudo}
          onSalvar={(c) => { adicionarConteudo(c); setModalConteudo(null) }}
          onFechar={() => setModalConteudo(null)}
        />
      )}
    </div>
  )
}

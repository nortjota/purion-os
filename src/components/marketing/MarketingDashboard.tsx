'use client'

/**
 * PURION OS — Módulo 6: Marketing & Creators
 * KPIs, tracker de creators, calendário semanal de conteúdo.
 */

import { useState, useMemo } from 'react'
import { Plus, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  usePurionStore,
  type ConteudoCalendario,
  type PerfilUsuario,
  type FormatoConteudo,
  type StatusConteudo,
} from '@/store'
import Link from 'next/link'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const META_KITS = 30
const META_VIDEOS = 60

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const FORMATO_COLOR: Record<FormatoConteudo, string> = {
  reels:    'text-pink-400 bg-pink-400/10',
  post:     'text-blue-400 bg-blue-400/10',
  stories:  'text-purple-400 bg-purple-400/10',
  tiktok:   'text-sky-400 bg-sky-400/10',
  youtube:  'text-red-400 bg-red-400/10',
  live:     'text-amber-400 bg-amber-400/10',
}

const STATUS_CONTEUDO_COLOR: Record<StatusConteudo, string> = {
  planejado:    'text-[#B8B8B8]',
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
  matheus: 'bg-[#F5F5F0] text-[#0B0B0B]',
  joao:    'bg-[#4A90D9] text-white',
  gabriel: 'bg-[#8A8A8A] text-white',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Novo Conteúdo</h3>
        </div>
        <div className="p-7 flex flex-col gap-3">
          <div className="field-gap">
            <label className="label-purion">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="input-purion"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-gap">
              <label className="label-purion">Formato</label>
              <select
                value={form.formato}
                onChange={(e) => setForm({ ...form, formato: e.target.value as FormatoConteudo })}
                className="select-purion"
              >
                <option value="reels">Reels</option>
                <option value="post">Post</option>
                <option value="stories">Stories</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="field-gap">
              <label className="label-purion">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusConteudo })}
                className="select-purion"
              >
                <option value="planejado">Planejado</option>
                <option value="em_producao">Em produção</option>
                <option value="publicado">Publicado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="field-gap">
            <label className="label-purion">Responsável</label>
            <select
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value as PerfilUsuario })}
              className="select-purion"
            >
              <option value="joao">João</option>
              <option value="matheus">Matheus</option>
            </select>
          </div>
          <div className="field-gap">
            <label className="label-purion">Descrição</label>
            <textarea
              rows={2}
              placeholder="Descreva o conteúdo..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="textarea-purion"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary btn-sm">Adicionar</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function MarketingDashboard() {
  const { creators, conteudosCalendario, adicionarConteudo } = usePurionStore()

  // KPI calculations
  const kitsEnviados = creators.filter(
    (c) => c.status === 'kit_enviado' || c.status === 'postado' || c.status === 'pago'
  ).length
  const videosPublicados = creators.reduce((acc, c) => acc + c.postagens.length, 0)

  // Filters
  const [modalConteudo, setModalConteudo] = useState<string | null>(null) // date string or null

  // Navegação semanal do calendário — abre na semana atual
  const [semanaBase, setSemanaBase] = useState(() => inicioSemana(new Date()))

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

  return (
    <div className="page-content section-gap">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Conteúdo</h1>
        <p className="caption mt-1">Metas de kits e vídeos e o calendário de conteúdo da semana.</p>
      </div>

      {/* ══════════════════════════════════════
          SEÇÃO 1 — KPIs
      ══════════════════════════════════════ */}
      <section>
        <p className="kpi-label mb-4">KPIs de Creators</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kits enviados */}
          <div className="kpi-card flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="kpi-label">Kits Enviados</p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="kpi-value">{kitsEnviados}</span>
                  <span className="caption">/ {META_KITS}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {Math.round((kitsEnviados / META_KITS) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(100, (kitsEnviados / META_KITS) * 100)}%` }} />
            </div>
            <p className="caption">Meta: {META_KITS} kits no mês</p>
          </div>

          {/* Vídeos publicados */}
          <div className="kpi-card flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="kpi-label">Vídeos Publicados</p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="kpi-value">{videosPublicados}</span>
                  <span className="caption">/ {META_VIDEOS}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {Math.round((videosPublicados / META_VIDEOS) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(100, (videosPublicados / META_VIDEOS) * 100)}%` }} />
            </div>
            <p className="caption">Meta: {META_VIDEOS} vídeos no trimestre</p>
          </div>
        </div>
      </section>

      {/* O acompanhamento de creators (cadastro, kits, status) vive em UM lugar só: o módulo Creators. */}
      <Link href="/creators" className="card-purion lift" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {creators.length} creator{creators.length !== 1 ? 's' : ''} na base · {kitsEnviados} com kit enviado
          </span>
          <span className="caption" style={{ display: 'block' }}>Cadastro, pipeline de kits e resultados ficam em Creators.</span>
        </span>
        <span className="btn btn-secondary btn-sm">Abrir Creators <ExternalLink size={12} /></span>
      </Link>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — CALENDÁRIO DE CONTEÚDO
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="kpi-label">
            Calendário de Conteúdo
          </p>
          <div className="flex items-center gap-2">
            {/* Navegação de semana */}
            <button
              onClick={() => setSemanaBase((d) => addDays(d, -7))}
              className="p-1.5 rounded-md text-[#B8B8B8] hover:text-[var(--brand-accent)] hover:bg-[rgba(212,252,60,0.08)]"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-[var(--text-secondary)] min-w-[130px] text-center">
              {fmtDia(diasSemanaAtual[0])} — {fmtDia(diasSemanaAtual[6])}
            </span>
            <button
              onClick={() => setSemanaBase((d) => addDays(d, 7))}
              className="p-1.5 rounded-md text-[#B8B8B8] hover:text-[var(--brand-accent)] hover:bg-[rgba(212,252,60,0.08)]"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setModalConteudo(isoDate(diasSemanaAtual[0]))}
              className="btn btn-primary btn-sm"
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
                  <p className="text-[10px] font-bold text-[#B8B8B8] uppercase">{DIAS_SEMANA[idx]}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{fmtDia(dia)}</p>
                </div>

                {/* Coluna do dia */}
                <div
                  className="min-h-[120px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1.5 flex flex-col gap-1.5"
                >
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-md p-2 flex flex-col gap-1"
                    >
                      {/* Formato badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded self-start uppercase ${FORMATO_COLOR[c.formato]}`}>
                        {c.formato}
                      </span>
                      {/* Descrição */}
                      <p className="text-[10px] text-[var(--text-secondary)] leading-tight line-clamp-2">{c.descricao}</p>
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
                    className="text-[10px] text-[#8A8A8A] hover:text-[var(--brand-accent)] py-1 text-center rounded transition-colors"
                  >
                    + adicionar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Modais ── */}
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

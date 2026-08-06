'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, Plus, Settings2, Sparkles, Target, TrendingUp } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { PerfilUsuario, CategoriaMeta, MetaDiaria } from '@/store'
import { useMetas } from '@/hooks/useMetas'
import { useMobile } from '@/hooks/useMobile'
import { MetaCard } from './MetaCard'
import { MetaHeatmap } from './MetaHeatmap'
import { ModalMetaCompleta, type NovaMetaCompleta } from './ModalMetaCompleta'
import { ModalTemplates } from './ModalTemplates'
import {
  SOCIOS, CATEGORIAS, corSocio,
  hojeISO, deslocarData, formatarDataExtensa,
  metasDoDia, metasPorEscopo, calcularStreak, calcularResumoSemanal,
  TEMPLATES_POR_SOCIO,
  type EscopoFiltro,
} from './metasHelpers'

// ─────────────────────────────────────────────
// Saudação + anel de progresso
// ─────────────────────────────────────────────

function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function AnelProgresso({ pct, size = 128, largura = 10, cor = '#C9A84C' }: {
  pct: number; size?: number; largura?: number; cor?: string
}) {
  const raio = (size - largura) / 2
  const circ = 2 * Math.PI * raio
  const offset = circ * (1 - Math.min(100, pct) / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={raio} stroke="var(--bg-surface-2)" strokeWidth={largura} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={raio} stroke={cor} strokeWidth={largura} fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: cor }}>{pct}%</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Quick add inline
// ─────────────────────────────────────────────

function QuickAdd({ onCriar, onAbrirModal }: { onCriar: (titulo: string) => void; onAbrirModal: () => void }) {
  const [valor, setValor] = useState('')

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!valor.trim()) return
    onCriar(valor.trim())
    setValor('')
  }

  return (
    <form onSubmit={submeter} className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
      <Plus size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Nova meta… e Enter"
        style={{
          flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
          outline: 'none', fontSize: 13, color: 'var(--text-primary)', padding: '4px 0',
        }}
      />
      <button type="button" onClick={onAbrirModal} title="Configurar detalhes" className="icon-btn" style={{ width: 24, height: 24, flexShrink: 0 }}>
        <Settings2 size={12} />
      </button>
    </form>
  )
}

// ─────────────────────────────────────────────
// Coluna genérica (time ou sócio)
// ─────────────────────────────────────────────

interface ColunaProps {
  chaveOrdem: string
  titulo: string
  subtitulo?: string
  cor: string
  avatar: React.ReactNode
  metas: MetaDiaria[]
  pct: number
  streak: number
  onQuickAdd: (titulo: string) => void
  onAbrirModal: () => void
  onTemplate?: () => void
  acoes: {
    onIncrementar: (id: string) => void
    onDecrementar: (id: string) => void
    onDefinirValor: (id: string, v: number) => void
    onEditar: (id: string, dados: { titulo?: string; valorAlvo?: number | null; unidade?: string | null }) => void
    onConcluir: (id: string, c: boolean) => void
    onDeletar: (id: string) => void
    onAdicionarItem: (id: string, texto: string) => void
    onRemoverItem: (id: string) => void
    onMarcarItem: (id: string, feito: boolean) => void
  }
}

function ColunaMetas({ chaveOrdem, titulo, subtitulo, cor, avatar, metas, pct, streak, onQuickAdd, onAbrirModal, onTemplate, acoes }: ColunaProps) {
  const { metaChecklistItens } = usePurionStore()
  const [ordem, setOrdem] = useState<string[]>([])
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const idsAtuais = metas.map((m) => m.id).join(',')

  useEffect(() => {
    setOrdem((prev) => {
      const ids = idsAtuais ? idsAtuais.split(',') : []
      const preservados = prev.filter((id) => ids.includes(id))
      const novos = ids.filter((id) => !preservados.includes(id))
      return [...preservados, ...novos]
    })
  }, [chaveOrdem, idsAtuais])

  const metasOrdenadas = ordem.map((id) => metas.find((m) => m.id === id)).filter((m): m is MetaDiaria => !!m)

  function onDrop(id: string) {
    if (!arrastandoId || arrastandoId === id) return
    setOrdem((prev) => {
      const semArrastado = prev.filter((x) => x !== arrastandoId)
      const idx = semArrastado.indexOf(id)
      semArrastado.splice(idx, 0, arrastandoId)
      return semArrastado
    })
    setArrastandoId(null)
  }

  return (
    <div className="flex flex-col" style={{ flex: 1, minWidth: 260 }}>
      <div className="flex items-center gap-2.5 mb-3">
        {avatar}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</p>
          {subtitulo && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{subtitulo}</p>}
        </div>
        {streak > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E8A838', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Flame size={12} /> {streak}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 800, color: cor }}>{pct}%</span>
      </div>

      <div style={{ height: 3, background: 'var(--bg-surface-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: cor, borderRadius: 999 }}
        />
      </div>

      <QuickAdd onCriar={onQuickAdd} onAbrirModal={onAbrirModal} />

      {onTemplate && (
        <button onClick={onTemplate} className="btn btn-secondary btn-sm" style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <Sparkles size={11} /> Usar modelo
        </button>
      )}

      <div className="flex flex-col gap-2">
        {metasOrdenadas.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <Target size={26} className="empty-state-icon" />
            <p className="empty-state-title" style={{ fontSize: 12 }}>Nenhuma meta ainda hoje</p>
            <p className="empty-state-subtitle" style={{ fontSize: 11 }}>Que tal começar?</p>
          </div>
        ) : (
          metasOrdenadas.map((meta) => (
            <MetaCard
              key={meta.id}
              meta={meta}
              itens={metaChecklistItens}
              cor={cor}
              draggable
              isDragging={arrastandoId === meta.id}
              onDragStart={() => setArrastandoId(meta.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(meta.id)}
              onIncrementar={() => acoes.onIncrementar(meta.id)}
              onDecrementar={() => acoes.onDecrementar(meta.id)}
              onDefinirValor={(v) => acoes.onDefinirValor(meta.id, v)}
              onEditar={(d) => acoes.onEditar(meta.id, d)}
              onConcluir={(c) => acoes.onConcluir(meta.id, c)}
              onDeletar={() => acoes.onDeletar(meta.id)}
              onAdicionarItem={(t) => acoes.onAdicionarItem(meta.id, t)}
              onRemoverItem={acoes.onRemoverItem}
              onMarcarItem={acoes.onMarcarItem}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export function MetasDashboard() {
  const isMobile = useMobile()
  const { metasDiarias } = usePurionStore()
  const {
    criarMeta, incrementarProgresso, decrementarProgresso, atualizarProgresso, editarMeta,
    concluirMeta, deletarMeta, adicionarItemChecklist, removerItemChecklist, marcarItem,
  } = useMetas()

  const [selectedDate, setSelectedDate] = useState(hojeISO())
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaMeta | 'todas'>('todas')
  const [abaMobile, setAbaMobile] = useState<EscopoFiltro>('time')
  const [modalCompleta, setModalCompleta] = useState<{ escopo: 'time' | 'individual'; responsavel: PerfilUsuario | null; tituloInicial: string } | null>(null)
  const [modalTemplate, setModalTemplate] = useState<PerfilUsuario | null>(null)
  const [escopoHistorico, setEscopoHistorico] = useState<EscopoFiltro>('time')

  const isHoje = selectedDate === hojeISO()

  const metasFiltroCategoria = useMemo(
    () => filtroCategoria === 'todas' ? metasDiarias : metasDiarias.filter((m) => m.categoria === filtroCategoria),
    [metasDiarias, filtroCategoria]
  )

  const metasDoDiaAtual = useMemo(() => metasDoDia(metasFiltroCategoria, selectedDate), [metasFiltroCategoria, selectedDate])

  const pctGeralHoje = useMemo(() => {
    const todasHoje = metasDoDia(metasDiarias, hojeISO())
    if (todasHoje.length === 0) return 0
    return Math.round((todasHoje.filter((m) => m.concluida).length / todasHoje.length) * 100)
  }, [metasDiarias])

  const totaisHoje = useMemo(() => {
    const todasHoje = metasDoDia(metasDiarias, hojeISO())
    return { total: todasHoje.length, feitas: todasHoje.filter((m) => m.concluida).length }
  }, [metasDiarias])

  const streakTime = useMemo(() => calcularStreak(metasPorEscopo(metasDiarias, 'time')), [metasDiarias])

  const resumoSemanal = useMemo(() => calcularResumoSemanal(metasDiarias), [metasDiarias])

  const acoes = {
    onIncrementar: incrementarProgresso,
    onDecrementar: decrementarProgresso,
    onDefinirValor: atualizarProgresso,
    onEditar: editarMeta,
    onConcluir: concluirMeta,
    onDeletar: deletarMeta,
    onAdicionarItem: adicionarItemChecklist,
    onRemoverItem: removerItemChecklist,
    onMarcarItem: marcarItem,
  }

  function criarRapida(escopo: 'time' | 'individual', responsavel: PerfilUsuario | null, titulo: string) {
    criarMeta({
      titulo, tipo: 'numerica', escopo, responsavel, categoria: 'geral',
      valorAlvo: 1, unidade: null, recorrente: false, data: selectedDate,
    })
  }

  async function aplicarTemplates(socio: PerfilUsuario, indices: number[]) {
    const templates = TEMPLATES_POR_SOCIO[socio]
    for (const i of indices) {
      const t = templates[i]
      await criarMeta({
        titulo: t.titulo, tipo: t.tipo, escopo: 'individual', responsavel: socio,
        categoria: t.categoria, valorAlvo: t.valorAlvo, unidade: t.unidade,
        recorrente: true, data: selectedDate,
      })
    }
    setModalTemplate(null)
  }

  const metasTime = metasPorEscopo(metasDoDiaAtual, 'time')
  const pctTime = metasTime.length > 0 ? Math.round((metasTime.filter((m) => m.concluida).length / metasTime.length) * 100) : 0

  const colunaTime = (
    <ColunaMetas
      chaveOrdem="time"
      titulo="Metas do Time"
      subtitulo="Escopo compartilhado"
      cor="#C9A84C"
      avatar={
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={16} style={{ color: '#C9A84C' }} />
        </div>
      }
      metas={metasTime}
      pct={pctTime}
      streak={streakTime}
      onQuickAdd={(t) => criarRapida('time', null, t)}
      onAbrirModal={() => setModalCompleta({ escopo: 'time', responsavel: null, tituloInicial: '' })}
      acoes={acoes}
    />
  )

  const colunasSocios = SOCIOS.map(({ id, nome, cor, inicial }) => {
    const metasSocio = metasPorEscopo(metasDoDiaAtual, id)
    const pct = metasSocio.length > 0 ? Math.round((metasSocio.filter((m) => m.concluida).length / metasSocio.length) * 100) : 0
    const streak = calcularStreak(metasPorEscopo(metasDiarias, id))
    return (
      <ColunaMetas
        key={id}
        chaveOrdem={id}
        titulo={nome}
        cor={cor}
        avatar={
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: `${cor}18`, border: `1px solid ${cor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: cor,
          }}>
            {inicial}
          </div>
        }
        metas={metasSocio}
        pct={pct}
        streak={streak}
        onQuickAdd={(t) => criarRapida('individual', id, t)}
        onAbrirModal={() => setModalCompleta({ escopo: 'individual', responsavel: id, tituloInicial: '' })}
        onTemplate={() => setModalTemplate(id)}
        acoes={acoes}
      />
    )
  })

  return (
    <div className="page-content section-gap">
      {/* ── HERO DO DIA ── */}
      <div className="card-purion" style={{
        padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(201,168,76,0.08), transparent)',
        borderColor: 'rgba(201,168,76,0.25)',
      }}>
        <AnelProgresso pct={pctGeralHoje} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSelectedDate((d) => deslocarData(d, -1))} className="icon-btn"><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {formatarDataExtensa(selectedDate)}
            </span>
            <button onClick={() => setSelectedDate((d) => deslocarData(d, 1))} disabled={isHoje} className="icon-btn" style={{ opacity: isHoje ? 0.3 : 1 }}>
              <ChevronRight size={14} />
            </button>
            {!isHoje && (
              <button onClick={() => setSelectedDate(hojeISO())} className="btn btn-secondary btn-sm">hoje</button>
            )}
          </div>
          <h1 className="page-title">{saudacao()}, time PURION 👋</h1>
          <p style={{ fontSize: 15, marginTop: 6 }}>
            <strong style={{ color: '#C9A84C' }}>{totaisHoje.feitas} de {totaisHoje.total}</strong>
            <span style={{ color: 'var(--text-secondary)' }}> metas batidas hoje</span>
          </p>
          {streakTime > 0 && (
            <p style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, color: '#E8A838', fontWeight: 600 }}>
              <Flame size={15} /> {streakTime} dia{streakTime !== 1 ? 's' : ''} seguido{streakTime !== 1 ? 's' : ''} do time
            </p>
          )}
        </div>
      </div>

      {/* ── Filtro de categoria ── */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setFiltroCategoria('todas')}
          className="px-3 py-1.5 rounded-md text-xs font-medium"
          style={filtroCategoria === 'todas' ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
        >
          Todas categorias
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltroCategoria(c.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={filtroCategoria === c.id ? { background: `${c.cor}22`, color: c.cor } : { color: 'var(--text-secondary)' }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Metas do time ── */}
      {(!isMobile || abaMobile === 'time') && <div>{colunaTime}</div>}

      {/* ── Colunas por sócio ── */}
      {isMobile ? (
        <div>
          <div className="flex gap-1 mb-4" style={{ overflowX: 'auto' }}>
            {(['time', ...SOCIOS.map((s) => s.id)] as EscopoFiltro[]).map((e) => {
              const nome = e === 'time' ? 'Time' : SOCIOS.find((s) => s.id === e)?.nome
              return (
                <button
                  key={e}
                  onClick={() => setAbaMobile(e)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={abaMobile === e ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
                >
                  {nome}
                </button>
              )
            })}
          </div>
          {abaMobile !== 'time' && colunasSocios[SOCIOS.findIndex((s) => s.id === abaMobile)]}
        </div>
      ) : (
        <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
          {colunasSocios}
        </div>
      )}

      {/* ── Resumo semanal + Heatmap ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr' }}>
        <div className="card-purion" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Resumo da Semana</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Metas batidas</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{resumoSemanal.totalConcluidas} / {resumoSemanal.totalMetas}</span>
            </div>
            {resumoSemanal.melhorDia && (
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Melhor dia</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {new Date(`${resumoSemanal.melhorDia.data}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })} · {resumoSemanal.melhorDia.pct}%
                </span>
              </div>
            )}
            {resumoSemanal.socioDestaque && (
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sócio destaque</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: corSocio(resumoSemanal.socioDestaque.socio) }}>
                  {SOCIOS.find((s) => s.id === resumoSemanal.socioDestaque!.socio)?.nome} · {resumoSemanal.socioDestaque.pct}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="card-purion" style={{ padding: '16px 18px' }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p style={{ fontSize: 13, fontWeight: 700 }}>Histórico</p>
            <div className="flex gap-1">
              {(['time', ...SOCIOS.map((s) => s.id)] as EscopoFiltro[]).map((e) => {
                const nome = e === 'time' ? 'Time' : SOCIOS.find((s) => s.id === e)?.nome
                return (
                  <button
                    key={e}
                    onClick={() => setEscopoHistorico(e)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={escopoHistorico === e ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
                  >
                    {nome}
                  </button>
                )
              })}
            </div>
          </div>
          <MetaHeatmap metasEscopo={metasPorEscopo(metasDiarias, escopoHistorico)} />
        </div>
      </div>

      {modalCompleta && (
        <ModalMetaCompleta
          escopo={modalCompleta.escopo}
          responsavel={modalCompleta.responsavel}
          tituloInicial={modalCompleta.tituloInicial}
          onFechar={() => setModalCompleta(null)}
          onSalvar={(dados: NovaMetaCompleta) => {
            criarMeta({
              titulo: dados.titulo, tipo: dados.tipo, escopo: modalCompleta.escopo,
              responsavel: modalCompleta.responsavel, categoria: dados.categoria,
              valorAlvo: dados.valorAlvo, unidade: dados.unidade, recorrente: dados.recorrente,
              data: selectedDate, itensChecklist: dados.itensChecklist,
            })
            setModalCompleta(null)
          }}
        />
      )}

      {modalTemplate && (
        <ModalTemplates
          socio={modalTemplate}
          onFechar={() => setModalTemplate(null)}
          onAplicar={(indices) => aplicarTemplates(modalTemplate, indices)}
        />
      )}
    </div>
  )
}

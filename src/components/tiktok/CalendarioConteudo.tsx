'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, Columns3, Grid3x3 } from 'lucide-react'
import { Segmentado } from '@/components/ui/Segmentado'
import { useToast } from '@/components/ui/Toast'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { atualizarVideos, useTikTokStore } from '@/hooks/useTikTok'
import { jaPublicado, type Video } from '@/lib/tiktok/tipos'
import { corPilar, fmtData, hojeISO, SeloStatus, useNomesCreators, usePilares, useTotais, fmtNum, Vazio } from './comum'
import { useNavTikTok } from './TikTokHub'

type Visao = 'semana' | 'mes' | 'lista'
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10) }
const somar = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const inicioSemana = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

/** Data que o vídeo ocupa no calendário: a publicação real, senão a prevista. */
function dataDoVideo(v: Video, publicadoEm: string | null): string | null {
  if (jaPublicado(v.status) && publicadoEm) return publicadoEm.slice(0, 10)
  return v.dataPrevista
}

export function CalendarioConteudo() {
  const videos = useTikTokStore((s) => s.videos)
  const pilares = usePilares()
  const totais = useTotais()
  const { abrirVideo } = useNavTikTok()
  const { nome } = useNomesCreators()
  const toast = useToast()
  const [visao, setVisao] = useEstadoPersistido<Visao>('tt-cal-visao', 'semana')
  const [fPilar, setFPilar] = useEstadoPersistido('tt-cal-pilar', '')
  const [ref, setRef] = useState(() => new Date())
  const [arrastando, setArrastando] = useState<string | null>(null)
  const hoje = hojeISO()

  const porDia = useMemo(() => {
    const m = new Map<string, Video[]>()
    for (const v of videos) {
      if (v.status === 'arquivado' || (fPilar && v.pilar !== fPilar)) continue
      const d = dataDoVideo(v, totais.get(v.id)?.publicadoEm ?? null)
      if (!d) continue
      m.set(d, [...(m.get(d) ?? []), v])
    }
    return m
  }, [videos, totais, fPilar])
  const semData = videos.filter((v) => v.status !== 'arquivado' && !jaPublicado(v.status) && !v.dataPrevista && (!fPilar || v.pilar === fPilar))

  const mover = async (id: string, dia: string) => {
    const v = videos.find((x) => x.id === id)
    if (!v || v.dataPrevista === dia) return
    if (jaPublicado(v.status)) { toast.error('Já publicado', 'A data de um vídeo publicado vem da publicação'); return }
    const r = await atualizarVideos([id], { dataPrevista: dia })
    if (!r.ok) toast.error('Não foi possível mudar a data', r.erro)
  }

  const navegar = (dir: number) => setRef((d) => (visao === 'mes' ? new Date(d.getFullYear(), d.getMonth() + dir, 1) : somar(d, 7 * dir)))

  const Card = ({ v }: { v: Video }) => {
    const t = totais.get(v.id)
    const atrasado = v.dataPrevista && v.dataPrevista < hoje && !jaPublicado(v.status) && v.status !== 'agendado'
    return (
      <button className="tt-cal-card" draggable onDragStart={() => setArrastando(v.id)} onDragEnd={() => setArrastando(null)}
        onClick={() => abrirVideo(v.id)} style={{ ['--tom' as string]: corPilar(pilares, v.pilar) }} data-atrasado={atrasado || undefined}>
        <span className="tt-cal-card-titulo">{v.titulo}</span>
        <span className="caption">{v.codigo}{v.creatorId ? ` · ${nome(v.creatorId)}` : ''}{t?.views ? ` · ${fmtNum(t.views)}` : ''}</span>
      </button>
    )
  }

  const celula = (dia: string, conteudo: React.ReactNode, extra?: React.ReactNode) => (
    <div key={dia} className="tt-cal-dia" data-hoje={dia === hoje || undefined}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (arrastando) mover(arrastando, dia) }}>
      {extra}
      {conteudo}
    </div>
  )

  let corpo: React.ReactNode
  let titulo: string
  if (visao === 'semana') {
    const ini = inicioSemana(ref)
    const dias = Array.from({ length: 7 }, (_, i) => iso(somar(ini, i)))
    titulo = `${fmtData(dias[0])} – ${fmtData(dias[6])}`
    corpo = (
      <div className="tt-cal-semana">
        {dias.map((d, i) => celula(d, (porDia.get(d) ?? []).map((v) => <Card key={v.id} v={v} />),
          <p className="tt-cal-cab"><span>{DIAS[i]}</span><span className="tnum">{d.slice(8)}</span></p>))}
      </div>
    )
  } else if (visao === 'mes') {
    const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1, 12)
    const ini = inicioSemana(primeiro)
    const dias = Array.from({ length: 42 }, (_, i) => somar(ini, i))
    titulo = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    corpo = (
      <>
        <div className="tt-cal-mes-cab">{DIAS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="tt-cal-mes">
          {dias.map((d) => {
            const k = iso(d)
            const itens = porDia.get(k) ?? []
            return celula(k, (
              <>
                {itens.slice(0, 3).map((v) => <Card key={v.id} v={v} />)}
                {itens.length > 3 && <span className="caption">+{itens.length - 3}</span>}
              </>
            ), <p className="tt-cal-num tnum" data-fora={d.getMonth() !== primeiro.getMonth() || undefined}>{d.getDate()}</p>)
          })}
        </div>
      </>
    )
  } else {
    titulo = 'Próximos e recentes'
    const linhas = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).filter(([d]) => d >= iso(somar(new Date(), -14)))
    corpo = linhas.length === 0 ? <Vazio icone={CalendarDays} titulo="Nada no calendário" texto="Defina a data de publicação na ficha do vídeo." /> : (
      <div className="card-purion" style={{ overflowX: 'auto' }}>
        <table className="table-purion tabela-compacta">
          <thead><tr><th>Data</th><th>Código</th><th>Título</th><th>Pilar</th><th>Status</th></tr></thead>
          <tbody>{linhas.flatMap(([d, vs]) => vs.map((v) => (
            <tr key={v.id} className="linha-clicavel" onClick={() => abrirVideo(v.id)}>
              <td className="tnum" style={{ color: d === hoje ? 'var(--brand-accent)' : undefined }}>{fmtData(d)}</td>
              <td className="td-mono">{v.codigo}</td><td>{v.titulo}</td><td>{v.pilar ?? '—'}</td><td><SeloStatus status={v.status} /></td>
            </tr>)))}</tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="dash">
      <div className="toolbar">
        {visao !== 'lista' && (
          <>
            <button className="icon-btn" onClick={() => navegar(-1)} aria-label="Anterior"><ChevronLeft size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRef(new Date())}>Hoje</button>
            <button className="icon-btn" onClick={() => navegar(1)} aria-label="Próximo"><ChevronRight size={14} /></button>
          </>
        )}
        <span className="t-h3" style={{ textTransform: 'capitalize' }}>{titulo}</span>
        <span className="toolbar-espaco" />
        <select className="filtro" data-ativo={fPilar || undefined} value={fPilar} onChange={(e) => setFPilar(e.target.value)} aria-label="Pilar">
          <option value="">Todos os pilares</option>{pilares.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
        </select>
        <Segmentado rotulo="Visão" valor={visao} onChange={setVisao} opcoes={[
          { id: 'semana', label: 'Semana', icon: Columns3 }, { id: 'mes', label: 'Mês', icon: Grid3x3 }, { id: 'lista', label: 'Lista', icon: List },
        ]} />
      </div>
      {pilares.length > 0 && (
        <div className="toolbar" style={{ gap: 12 }}>
          {pilares.map((p) => <span key={p.nome} className="caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="tt-selo-ponto" style={{ background: p.cor }} />{p.nome}</span>)}
        </div>
      )}
      {corpo}
      {semData.length > 0 && visao !== 'lista' && (
        <section className="dash-secao">
          <div className="dash-secao-cabecalho"><span className="dash-secao-titulo">Sem data · arraste para um dia <span className="dash-secao-sub">{semData.length}</span></span></div>
          <div className="tt-sem-data">{semData.map((v) => <Card key={v.id} v={v} />)}</div>
        </section>
      )}
    </div>
  )
}

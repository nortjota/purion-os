'use client'

import { useMemo, useState } from 'react'
import { AlarmClock, CheckCircle2, Lightbulb, ShieldCheck, Video, Users2, ArrowUpRight, BarChart3, ListChecks } from 'lucide-react'
import Link from 'next/link'
import { Segmentado } from '@/components/ui/Segmentado'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useTikTokStore } from '@/hooks/useTikTok'
import type { AlertaAcao, RegraAcao } from '@/lib/tiktok/automacoes'
import { DIMENSOES, desempenhoPorDimensao, AMOSTRA_MIN, type Dimensao } from '@/lib/tiktok/inteligencia'
import { FORMATOS, GANCHOS } from '@/lib/tiktok/tipos'
import { fmtData, fmtNum, fmtPct, hojeISO, nomePessoa, PESSOAS, useAgora, useNomesCreators, useTotais, Vazio } from './comum'
import { useAlertas } from './useAlertas'
import { useNavTikTok } from './TikTokHub'

type Filtro = 'agora' | 'atrasadas' | 'semana' | 'sugestoes'

const ICONE: Record<RegraAcao, typeof Video> = {
  atrasado: AlarmClock, aprovacao_parada: ShieldCheck, gravar: Video, sem_metrica: BarChart3, revisar: Lightbulb, escalar: ArrowUpRight,
  entrega_atrasada: Users2, amostra_sem_conteudo: Users2, direitos_vencendo: ShieldCheck, sem_data: AlarmClock,
}
const TOM = { alta: 'var(--status-danger)', media: 'var(--status-warning)', baixa: 'var(--text-secondary)' }

export function ActionCenter() {
  const alertas = useAlertas()
  const [filtro, setFiltro] = useEstadoPersistido<Filtro>('tt-acoes-filtro', 'agora')
  const [fResp, setFResp] = useEstadoPersistido('tt-acoes-resp', '')
  const { abrirVideo, irPara } = useNavTikTok()
  const agora = useAgora()
  const hoje = hojeISO()
  const daquiSete = new Date(agora + 7 * 86_400_000).toISOString().slice(0, 10)

  const base = alertas.filter((a) => !fResp || a.responsavel === fResp)
  const grupos: Record<Filtro, AlertaAcao[]> = {
    agora: base.filter((a) => !a.sugestao && (!a.prazo || a.prazo <= hoje)),
    atrasadas: base.filter((a) => a.regra === 'atrasado' || a.regra === 'entrega_atrasada'),
    semana: base.filter((a) => !a.sugestao && a.prazo && a.prazo > hoje && a.prazo <= daquiSete),
    sugestoes: base.filter((a) => a.sugestao),
  }
  const lista = grupos[filtro]

  const abrir = (a: AlertaAcao) => {
    if (a.origemTipo === 'tt_video') abrirVideo(a.origemId)
    else irPara('creators')
  }

  return (
    <div className="dash">
      <div className="toolbar">
        <Segmentado rotulo="Fila" valor={filtro} onChange={setFiltro} opcoes={[
          { id: 'agora', label: 'Fazer hoje', contagem: grupos.agora.length },
          { id: 'atrasadas', label: 'Atrasadas', contagem: grupos.atrasadas.length },
          { id: 'semana', label: 'Esta semana', contagem: grupos.semana.length },
          { id: 'sugestoes', label: 'Sugestões', contagem: grupos.sugestoes.length },
        ]} />
        <select className="filtro" data-ativo={fResp || undefined} value={fResp} onChange={(e) => setFResp(e.target.value)} aria-label="Responsável">
          <option value="">Todos</option>{PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <span className="toolbar-espaco" />
        <Link href="/meu-trabalho" className="link-limpar"><ListChecks size={13} /> As obrigações viram tarefas em Meu trabalho</Link>
      </div>

      {lista.length === 0 ? (
        <Vazio icone={CheckCircle2} titulo={filtro === 'sugestoes' ? 'Sem sugestões por enquanto' : 'Nada pendente aqui'}
          texto={filtro === 'sugestoes' ? `Sugestões só aparecem com pelo menos ${AMOSTRA_MIN} vídeos publicados no mesmo pilar, para não tirar conclusão de amostra pequena.` : 'A fila se atualiza sozinha quando os vídeos e as colaborações mudam.'} />
      ) : (
        <ul className="tt-acoes">
          {lista.map((a) => {
            const Icone = ICONE[a.regra]
            return (
              <li key={a.id}>
                <button className="tt-acao" onClick={() => abrir(a)} style={{ ['--tom' as string]: TOM[a.prioridade] }}>
                  <span className="tt-acao-icone"><Icone size={15} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tt-acao-titulo">{a.titulo}</span>
                    <span className="tt-acao-detalhe">{a.detalhe}</span>
                  </span>
                  <span className="tt-acao-meta">
                    {a.sugestao ? <span className="badge badge-info">sugestão</span> : a.criaTarefa ? <span className="badge badge-neutral">tarefa criada</span> : null}
                    <span className="caption">{nomePessoa(a.responsavel)}{a.prazo ? ` · ${a.prazo < hoje ? 'venceu ' : ''}${fmtData(a.prazo)}` : ''}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Aprendizado />
    </div>
  )
}

/** Padrões por dimensão — só destaca grupos com amostra suficiente. */
function Aprendizado() {
  const videos = useTikTokStore((s) => s.videos)
  const campanhas = useTikTokStore((s) => s.campanhas)
  const totais = useTotais()
  const { nome } = useNomesCreators()
  const [dim, setDim] = useState<Dimensao>('ganchoTipo')
  const grupos = useMemo(() => desempenhoPorDimensao(videos, totais, dim), [videos, totais, dim])
  const rotulo = (k: string) => dim === 'ganchoTipo' ? GANCHOS[k as keyof typeof GANCHOS] ?? k
    : dim === 'formato' ? FORMATOS[k as keyof typeof FORMATOS] ?? k
    : dim === 'creatorId' ? nome(k) : dim === 'campanhaId' ? campanhas.find((c) => c.id === k)?.nome ?? k : k
  const max = Math.max(1, ...grupos.map((g) => g.medianaViews ?? 0))

  return (
    <section className="dash-secao">
      <div className="dash-secao-cabecalho">
        <span className="dash-secao-titulo">O que está funcionando <span className="dash-secao-sub">mediana de views por vídeo</span></span>
        <select className="filtro" value={dim} onChange={(e) => setDim(e.target.value as Dimensao)} aria-label="Dimensão">
          {Object.entries(DIMENSOES).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </div>
      {grupos.length === 0 ? <p className="caption">Lance métricas dos vídeos publicados para ver padrões.</p> : (
        <div className="card-purion" style={{ padding: 14, display: 'grid', gap: 10 }}>
          {grupos.map((g) => (
            <div key={g.chave} className="tt-barra-linha" data-fraco={!g.suficiente || undefined}>
              <span className="tt-barra-rotulo">{rotulo(g.chave)}</span>
              <span className="tt-barra"><span style={{ width: `${((g.medianaViews ?? 0) / max) * 100}%` }} /></span>
              <span className="tnum caption" style={{ minWidth: 190, textAlign: 'right' }}>
                {fmtNum(Math.round(g.medianaViews ?? 0))} · concl. {fmtPct(g.medianaConclusao)} · n={g.n}{!g.suficiente ? ' · amostra pequena' : ''}
              </span>
            </div>
          ))}
          <p className="caption">Grupos com menos de {AMOSTRA_MIN} vídeos ou de 3 semanas diferentes aparecem apagados: ainda não são conclusão.</p>
        </div>
      )}
    </section>
  )
}

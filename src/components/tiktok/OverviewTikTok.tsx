'use client'

import { useMemo } from 'react'
import { ArrowUpRight, Clapperboard } from 'lucide-react'
import { Bar, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricStrip } from '@/components/ui/MetricStrip'
import { Segmentado } from '@/components/ui/Segmentado'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useTikTokStore } from '@/hooks/useTikTok'
import { chaveSemana } from '@/lib/tiktok/inteligencia'
import { calcContribuicaoOrganica, CUSTO_PRODUCAO_FRASCO, CUSTOS_VARIAVEIS_FRASCO, PRECO_B2C_OFICIAL } from '@/lib/precificacao'
import { COLUNAS_STUDIO, STATUS_INFO } from '@/lib/tiktok/tipos'
import { fmtData, fmtMoeda, fmtNum, fmtPct, hojeISO, useAgora, useNomesCreators, useTotais, Vazio } from './comum'
import { useAlertas } from './useAlertas'
import { useNavTikTok } from './TikTokHub'

type Periodo = 7 | 30 | 90
const CONTRIBUICAO = calcContribuicaoOrganica(PRECO_B2C_OFICIAL, CUSTO_PRODUCAO_FRASCO, CUSTOS_VARIAVEIS_FRASCO)

export function OverviewTikTok() {
  const videos = useTikTokStore((s) => s.videos)
  const atribuicoes = useTikTokStore((s) => s.atribuicoes)
  const entregas = useTikTokStore((s) => s.entregas)
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const totais = useTotais()
  const alertas = useAlertas()
  const { nome } = useNomesCreators()
  const { abrirVideo, irPara } = useNavTikTok()
  const [periodo, setPeriodo] = useEstadoPersistido<Periodo>('tt-overview-periodo', 30)

  const agora = useAgora()
  const desde = new Date(agora - periodo * 86_400_000).toISOString()
  const noPeriodo = useMemo(() => videos.filter((v) => { const t = totais.get(v.id); return t?.publicadoEm && t.publicadoEm >= desde }), [videos, totais, desde])
  const soma = noPeriodo.reduce((s, v) => {
    const t = totais.get(v.id)!
    s.views += t.views; s.vendas += t.vendas; s.receita += t.receita; s.custo += v.custoProducao + t.gasto
    if (t.conclusaoPct != null) { s.concl += t.conclusaoPct * t.views; s.pesoConcl += t.views }
    return s
  }, { views: 0, vendas: 0, receita: 0, custo: 0, concl: 0, pesoConcl: 0 })
  const custoColabs = colaboracoes.filter((c) => c.updatedAt >= desde && ['fechado', 'amostra_enviada', 'produzindo', 'entregue', 'pago'].includes(c.etapa)).reduce((s, c) => s + c.cache, 0)
  const custoTotal = soma.custo + custoColabs

  const funil = COLUNAS_STUDIO.map((s) => ({ s, n: videos.filter((v) => v.status === s).length }))
  const maxFunil = Math.max(1, ...funil.map((f) => f.n))
  const gargalo = funil.filter((f) => !['publicado', 'analisado', 'ideia'].includes(f.s)).sort((a, b) => b.n - a.n)[0]

  const top = [...noPeriodo].sort((a, b) => (totais.get(b.id)!.views) - (totais.get(a.id)!.views)).slice(0, 5)

  const semanas = useMemo(() => {
    const m = new Map<string, { semana: string; views: number; vendas: number; ordem: string }>()
    for (const v of videos) {
      const t = totais.get(v.id)
      if (!t?.publicadoEm || t.publicadoEm < new Date(agora - 84 * 86_400_000).toISOString()) continue
      const k = chaveSemana(t.publicadoEm)
      const r = m.get(k) ?? { semana: fmtData(t.publicadoEm), views: 0, vendas: 0, ordem: t.publicadoEm }
      r.views += t.views
      if (t.publicadoEm < r.ordem) { r.ordem = t.publicadoEm; r.semana = fmtData(t.publicadoEm) }
      m.set(k, r)
    }
    for (const a of atribuicoes) {
      const v = videos.find((x) => x.id === a.videoId); const t = v ? totais.get(v.id) : null
      if (!t?.publicadoEm) continue
      const r = m.get(chaveSemana(t.publicadoEm)); if (r) r.vendas += 1
    }
    return [...m.values()].sort((a, b) => a.ordem.localeCompare(b.ordem))
  }, [videos, totais, atribuicoes, agora])

  const proximasEntregas = entregas.filter((e) => e.status === 'pendente' && e.prazo && e.prazo <= new Date(agora + 7 * 86_400_000).toISOString().slice(0, 10))
    .sort((a, b) => (a.prazo ?? '').localeCompare(b.prazo ?? '')).slice(0, 5)
  const hoje = hojeISO()

  if (videos.length === 0) {
    return <Vazio icone={Clapperboard} titulo="Comece pelo Creative Studio" texto="Cadastre ideias, mova pelo quadro até publicar e lance as métricas. Este painel se monta sozinho."
      acao={<button className="btn btn-accent btn-sm" onClick={() => irPara('studio')}>Abrir Creative Studio</button>} />
  }

  return (
    <div className="dash">
      <div className="toolbar">
        <Segmentado rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={[{ id: 7, label: '7 dias' }, { id: 30, label: '30 dias' }, { id: 90, label: '90 dias' }]} />
      </div>
      <MetricStrip rotulo="TikTok no período" metricas={[
        { label: 'Publicados', valor: noPeriodo.length, onClick: () => irPara('studio') },
        { label: 'Views', valor: fmtNum(soma.views) },
        { label: 'Conclusão', valor: fmtPct(soma.pesoConcl ? soma.concl / soma.pesoConcl : null), dica: 'Média ponderada pelas views' },
        { label: 'Vendas atribuídas', valor: soma.vendas, sub: fmtMoeda(soma.receita) },
        { label: 'Custo', valor: fmtMoeda(custoTotal), dica: 'Produção dos vídeos + mídia lançada + cachês fechados no período' },
        { label: 'Custo por venda', valor: soma.vendas ? fmtMoeda(custoTotal / soma.vendas) : '—', tom: soma.vendas && custoTotal / soma.vendas > CONTRIBUICAO ? 'danger' : undefined, dica: `Acima de ${fmtMoeda(CONTRIBUICAO)} (contribuição por frasco depois de produção, taxas, frete e impostos) a venda dá prejuízo` },
      ]} />

      <div className="tt-overview-grade">
        <section className="dash-secao card-purion" style={{ padding: 16 }}>
          <div className="dash-secao-cabecalho">
            <button className="dash-secao-titulo" onClick={() => irPara('studio')}>Funil de produção <ArrowUpRight size={12} /></button>
            {gargalo && gargalo.n > 0 && <span className="caption">gargalo: <strong>{STATUS_INFO[gargalo.s].label}</strong></span>}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {funil.map((f) => (
              <div key={f.s} className="tt-barra-linha">
                <span className="tt-barra-rotulo">{STATUS_INFO[f.s].label}</span>
                <span className="tt-barra"><span style={{ width: `${(f.n / maxFunil) * 100}%`, background: STATUS_INFO[f.s].cor }} /></span>
                <span className="tnum caption" style={{ minWidth: 24, textAlign: 'right' }}>{f.n}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-secao card-purion" style={{ padding: 16 }}>
          <div className="dash-secao-cabecalho">
            <button className="dash-secao-titulo" onClick={() => irPara('acoes')}>Atenção agora <ArrowUpRight size={12} /></button>
            <span className="caption tnum">{alertas.filter((a) => !a.sugestao).length}</span>
          </div>
          {alertas.filter((a) => !a.sugestao).slice(0, 5).map((a) => (
            <button key={a.id} className="fila-item" style={{ background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => (a.origemTipo === 'tt_video' ? abrirVideo(a.origemId) : irPara('creators'))}>
              <span className="fila-item-valor" style={{ ['--tom' as string]: a.prioridade === 'alta' ? 'var(--status-danger)' : 'var(--status-warning)' }}>!</span>
              <span style={{ minWidth: 0 }}><span className="fila-item-titulo">{a.titulo}</span><span className="fila-item-detalhe">{a.detalhe}</span></span>
            </button>
          ))}
          {alertas.filter((a) => !a.sugestao).length === 0 && <p className="caption">Tudo em dia.</p>}
        </section>

        <section className="dash-secao card-purion" style={{ padding: 16 }}>
          <span className="dash-secao-titulo">Top vídeos do período</span>
          {top.length === 0 ? <p className="caption">Sem vídeos publicados com métricas no período.</p> : (
            <table className="tabela-compacta" style={{ fontSize: 12.5 }}>
              <tbody>{top.map((v) => { const t = totais.get(v.id)!; return (
                <tr key={v.id} className="linha-clicavel" onClick={() => abrirVideo(v.id)}>
                  <td className="td-mono">{v.codigo}</td><td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo}</td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{fmtNum(t.views)}</td><td className="tnum" style={{ textAlign: 'right' }}>{fmtPct(t.conclusaoPct)}</td><td className="tnum" style={{ textAlign: 'right' }}>{t.vendas} v.</td>
                </tr>) })}</tbody>
            </table>
          )}
        </section>

        <section className="dash-secao card-purion" style={{ padding: 16 }}>
          <button className="dash-secao-titulo" onClick={() => irPara('creators')}>Entregas de creators · 7 dias <ArrowUpRight size={12} /></button>
          {proximasEntregas.length === 0 ? <p className="caption">Nenhuma entrega vencendo.</p> : proximasEntregas.map((e) => {
            const c = colaboracoes.find((x) => x.id === e.colaboracaoId)
            return (
              <div key={e.id} className="fila-item">
                <span className="fila-item-valor tnum" style={{ ['--tom' as string]: e.prazo! < hoje ? 'var(--status-danger)' : 'var(--status-info)' }}>{e.prazo!.slice(8)}</span>
                <span style={{ minWidth: 0 }}><span className="fila-item-titulo">{c ? nome(c.creatorId) : 'Creator'}</span><span className="fila-item-detalhe">{e.descricao}</span></span>
              </div>
            )
          })}
        </section>
      </div>

      {semanas.length > 1 && (
        <section className="dash-secao card-purion" style={{ padding: 16 }}>
          <span className="dash-secao-titulo">Views × vendas por semana de publicação · 12 semanas</span>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={semanas} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="v" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(x) => fmtNum(Number(x))} />
                <YAxis yAxisId="s" orientation="right" allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(val, n) => [n === 'views' ? fmtNum(Number(val)) : String(val), n === 'views' ? 'Views' : 'Vendas']} />
                <Bar yAxisId="v" dataKey="views" fill="var(--brand-accent)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line yAxisId="s" dataKey="vendas" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}

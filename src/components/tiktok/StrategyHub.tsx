'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Megaphone, Plus, Target, X, ArrowUpRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { confirmar } from '@/components/ui/Confirmar'
import { useSocioAtual } from '@/components/meu-trabalho/useSocioAtual'
import { excluirCampanha, salvarCampanha, useTikTokStore } from '@/hooks/useTikTok'
import { METAS, STATUS_CAMPANHA, TIPOS_CAMPANHA, type Campanha } from '@/lib/tiktok/tipos'
import { Campo, fmtData, fmtMoeda, fmtNum, PESSOAS, useAgora, usePilares, useTotais, Vazio } from './comum'
import { useNavTikTok } from './TikTokHub'

interface ObjetivoResumo { id: string; titulo: string; progresso: number; status: string; dataAlvo: string | null }

export function StrategyHub() {
  const campanhas = useTikTokStore((s) => s.campanhas)
  const videos = useTikTokStore((s) => s.videos)
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const atribuicoes = useTikTokStore((s) => s.atribuicoes)
  const totais = useTotais()
  const pilares = usePilares()
  const { irPara } = useNavTikTok()
  const [editando, setEditando] = useState<Partial<Campanha> | null>(null)
  const [objetivos, setObjetivos] = useState<ObjetivoResumo[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase.from('estrategia_objetivos').select('id, titulo, objetivo, categoria, progresso, status, data_alvo').then(({ data }) => {
      setObjetivos((data ?? [])
        .filter((r) => /tiktok|conte[uú]do|social|creator|ugc/i.test(`${r.titulo ?? r.objetivo ?? ''} ${r.categoria ?? ''}`))
        .map((r) => ({ id: String(r.id), titulo: String(r.titulo ?? r.objetivo ?? ''), progresso: Number(r.progresso ?? 0), status: String(r.status ?? ''), dataAlvo: r.data_alvo ? String(r.data_alvo) : null })))
    })
  }, [])

  // distribuição real de pilares nos últimos 30 dias (vídeos criados ou publicados)
  const agora = useAgora()
  const desde = new Date(agora - 30 * 86_400_000).toISOString()
  const recentes = videos.filter((v) => v.status !== 'arquivado' && (v.createdAt >= desde || (totais.get(v.id)?.publicadoEm ?? '') >= desde))
  const realPilar = (nome: string) => recentes.length ? (recentes.filter((v) => v.pilar === nome).length / recentes.length) * 100 : 0

  const porCampanha = useMemo(() => {
    const m = new Map<string, { videos: number; views: number; vendas: number; receita: number; gasto: number }>()
    for (const c of campanhas) m.set(c.id, { videos: 0, views: 0, vendas: 0, receita: 0, gasto: 0 })
    for (const v of videos) {
      if (!v.campanhaId || !m.has(v.campanhaId)) continue
      const r = m.get(v.campanhaId)!, t = totais.get(v.id)
      r.videos += 1; r.views += t?.views ?? 0; r.gasto += v.custoProducao + (t?.gasto ?? 0)
    }
    for (const c of colaboracoes) if (c.campanhaId && m.has(c.campanhaId)) m.get(c.campanhaId)!.gasto += c.cache
    for (const a of atribuicoes) if (a.campanhaId && m.has(a.campanhaId)) { const r = m.get(a.campanhaId)!; r.vendas += 1; r.receita += a.valor }
    return m
  }, [campanhas, videos, colaboracoes, atribuicoes, totais])

  const atingido = (c: Campanha) => {
    const r = porCampanha.get(c.id)
    if (!r || !c.metaValor) return null
    const atual = c.metaPrincipal === 'views' ? r.views : c.metaPrincipal === 'vendas' ? r.vendas : null
    return atual == null ? null : Math.min(100, (atual / c.metaValor) * 100)
  }

  return (
    <div className="dash">
      <section className="dash-secao">
        <div className="dash-secao-cabecalho">
          <span className="dash-secao-titulo"><Target size={13} /> Objetivos</span>
          <Link href="/estrategias" className="link-limpar">Gerenciar em Estratégias <ArrowUpRight size={12} /></Link>
        </div>
        {objetivos.length === 0 ? (
          <p className="caption">Nenhum objetivo de conteúdo/TikTok em Estratégias. Crie um com “TikTok” no título ou na categoria e ele aparece aqui.</p>
        ) : (
          <div className="tt-objetivos">
            {objetivos.map((o) => (
              <div key={o.id} className="card-purion" style={{ padding: 14 }}>
                <p style={{ fontSize: 13.5, fontWeight: 500 }}>{o.titulo}</p>
                <div className="progress-bar" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: `${o.progresso}%` }} /></div>
                <p className="caption tnum" style={{ marginTop: 6 }}>{Math.round(o.progresso)}%{o.dataAlvo ? ` · até ${fmtData(o.dataAlvo)}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dash-secao">
        <div className="dash-secao-cabecalho">
          <span className="dash-secao-titulo">Pilares editoriais <span className="dash-secao-sub">plano × últimos 30 dias</span></span>
          <Link href="/estrategias?tab=social" className="link-limpar">Editar pilares <ArrowUpRight size={12} /></Link>
        </div>
        {pilares.length === 0 ? <p className="caption">Cadastre os pilares em Estratégias → Social; eles viram as cores do calendário.</p> : (
          <div className="card-purion" style={{ padding: 14, display: 'grid', gap: 10 }}>
            {pilares.map((p) => {
              const real = realPilar(p.nome)
              const desvio = real - p.percentual
              return (
                <div key={p.nome} className="tt-barra-linha">
                  <span className="tt-barra-rotulo"><span className="tt-selo-ponto" style={{ background: p.cor }} /> {p.nome}</span>
                  <span className="tt-barra tt-barra-dupla">
                    <span style={{ width: `${Math.min(100, real)}%`, background: p.cor }} />
                    <i style={{ left: `${Math.min(100, p.percentual)}%` }} title={`Plano: ${p.percentual}%`} />
                  </span>
                  <span className="tnum caption" style={{ minWidth: 120, textAlign: 'right', color: Math.abs(desvio) > 15 ? 'var(--status-warning)' : undefined }}>
                    {Math.round(real)}% de {p.percentual}%
                  </span>
                </div>
              )
            })}
            <p className="caption">A marca vertical é o plano. Diferença acima de 15 pontos fica em amarelo.</p>
          </div>
        )}
      </section>

      <section className="dash-secao">
        <div className="dash-secao-cabecalho">
          <span className="dash-secao-titulo"><Megaphone size={13} /> Campanhas</span>
          <button className="btn btn-accent btn-sm" onClick={() => setEditando({ tipo: 'organica', status: 'planejada', metaPrincipal: 'views' })}><Plus size={13} /> Campanha</button>
        </div>
        {campanhas.length === 0 ? (
          <Vazio icone={Megaphone} titulo="Nenhuma campanha" texto="Agrupe vídeos e creators por campanha para comparar orçamento, metas e vendas." />
        ) : (
          <div className="card-purion" style={{ overflowX: 'auto' }}>
            <table className="table-purion tabela-compacta">
              <thead><tr><th>Campanha</th><th>Tipo</th><th>Período</th><th>Status</th><th>Hipótese</th><th style={{ textAlign: 'right' }}>Orçamento</th><th style={{ textAlign: 'right' }}>Gasto</th><th style={{ textAlign: 'right' }}>Vídeos</th><th style={{ textAlign: 'right' }}>Vendas</th><th>Meta</th></tr></thead>
              <tbody>
                {campanhas.map((c) => {
                  const r = porCampanha.get(c.id)!
                  const pct = atingido(c)
                  return (
                    <tr key={c.id} className="linha-clicavel" onClick={() => setEditando(c)}>
                      <td><strong style={{ fontWeight: 500 }}>{c.nome}</strong>{c.utmCampaign && <span className="caption td-mono"> · {c.utmCampaign}</span>}</td>
                      <td>{TIPOS_CAMPANHA[c.tipo]}</td>
                      <td className="tnum">{fmtData(c.inicio)} – {fmtData(c.fim)}</td>
                      <td><span className={`badge ${c.status === 'ativa' ? 'badge-success' : c.status === 'pausada' ? 'badge-warning' : 'badge-neutral'}`}>{STATUS_CAMPANHA[c.status]}</span></td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="caption">{c.hipotese ?? '—'}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{fmtMoeda(c.orcamentoPrevisto)}</td>
                      <td className="tnum" style={{ textAlign: 'right', color: c.orcamentoPrevisto && r.gasto > c.orcamentoPrevisto ? 'var(--status-danger)' : undefined }}>{fmtMoeda(r.gasto)}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{r.videos}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{r.vendas}</td>
                      <td className="tnum">{c.metaValor ? `${pct != null ? `${Math.round(pct)}% de ` : ''}${fmtNum(c.metaValor)} ${METAS[c.metaPrincipal].toLowerCase()}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <button className="link-limpar" style={{ justifySelf: 'start' }} onClick={() => irPara('studio')}>Ver vídeos por campanha no Studio →</button>
      </section>

      {editando && <ModalCampanha inicial={editando} onFechar={() => setEditando(null)} />}
    </div>
  )
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
}

function ModalCampanha({ inicial, onFechar }: { inicial: Partial<Campanha>; onFechar: () => void }) {
  const socio = useSocioAtual()
  const toast = useToast()
  const [c, setC] = useState<Partial<Campanha>>({ responsavel: socio, orcamentoPrevisto: 0, ...inicial })
  const [salvando, setSalvando] = useState(false)
  const set = <K extends keyof Campanha>(k: K, v: Campanha[K] | null) => setC((x) => ({ ...x, [k]: v }))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!c.nome?.trim()) { toast.error('Dê um nome à campanha'); return }
    if (c.inicio && c.fim && c.fim < c.inicio) { toast.error('O fim deve ser depois do início'); return }
    if ((c.orcamentoPrevisto ?? 0) < 0) { toast.error('Orçamento não pode ser negativo'); return }
    setSalvando(true)
    const r = await salvarCampanha({ ...c, nome: c.nome.trim(), utmCampaign: c.utmCampaign?.trim() || slug(c.nome) })
    setSalvando(false)
    if (!r.ok) toast.error('Não foi possível salvar', r.erro.includes('uq_tt_camp_utm') ? 'Já existe campanha com essa UTM' : r.erro)
    else { toast.success('Campanha salva'); onFechar() }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <form className="modal-container" style={{ maxWidth: 620 }} onSubmit={salvar}>
        <div className="modal-header"><h2 className="modal-title">{inicial.id ? 'Editar campanha' : 'Nova campanha'}</h2><button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar"><X size={14} /></button></div>
        <div className="tt-grade">
          <Campo label="Nome" largura="1 / -1"><input className="input-purion" autoFocus value={c.nome ?? ''} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Dia dos Pais — presente para quem dirige" /></Campo>
          <Campo label="Tipo">
            <select className="select-purion" value={c.tipo} onChange={(e) => set('tipo', e.target.value as Campanha['tipo'])}>
              {Object.entries(TIPOS_CAMPANHA).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Status">
            <select className="select-purion" value={c.status} onChange={(e) => set('status', e.target.value as Campanha['status'])}>
              {Object.entries(STATUS_CAMPANHA).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Início"><input type="date" className="input-purion" value={c.inicio ?? ''} onChange={(e) => set('inicio', e.target.value || null)} /></Campo>
          <Campo label="Fim"><input type="date" className="input-purion" value={c.fim ?? ''} onChange={(e) => set('fim', e.target.value || null)} /></Campo>
          <Campo label="Orçamento previsto (R$)"><input type="number" min={0} step="0.01" className="input-purion" value={c.orcamentoPrevisto ?? 0} onChange={(e) => set('orcamentoPrevisto', Number(e.target.value || 0))} /></Campo>
          <Campo label="Responsável">
            <select className="select-purion" value={c.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
              {PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Meta principal">
            <select className="select-purion" value={c.metaPrincipal} onChange={(e) => set('metaPrincipal', e.target.value as Campanha['metaPrincipal'])}>
              {Object.entries(METAS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Valor da meta"><input type="number" min={0} className="input-purion" value={c.metaValor ?? ''} onChange={(e) => set('metaValor', e.target.value ? Number(e.target.value) : null)} /></Campo>
          <Campo label="Público" largura="1 / -1"><input className="input-purion" value={c.publico ?? ''} onChange={(e) => set('publico', e.target.value)} /></Campo>
          <Campo label="Hipótese" largura="1 / -1"><textarea className="textarea-purion" rows={2} value={c.hipotese ?? ''} onChange={(e) => set('hipotese', e.target.value)} placeholder="Se fizermos X para o público Y, esperamos Z porque…" /></Campo>
          <Campo label="utm_campaign"><input className="input-purion td-mono" value={c.utmCampaign ?? ''} onChange={(e) => set('utmCampaign', e.target.value)} placeholder={c.nome ? slug(c.nome) : 'gerada do nome'} /></Campo>
        </div>
        <div className="modal-footer">
          {inicial.id && <button type="button" className="btn btn-ghost" style={{ color: 'var(--status-danger)', marginRight: 'auto' }} onClick={async () => {
            if (!(await confirmar({ titulo: 'Excluir campanha?', mensagem: 'Os vídeos continuam, só perdem o vínculo.', rotuloConfirmar: 'Excluir' }))) return
            const r = await excluirCampanha(inicial.id!); if (r.ok) onFechar()
          }}>Excluir</button>}
          <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-accent" disabled={salvando}>Salvar</button>
        </div>
      </form>
    </div>
  )
}

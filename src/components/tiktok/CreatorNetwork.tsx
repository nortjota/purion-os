'use client'

import { useMemo, useState } from 'react'
import { Columns3, List, Plus, Search, Users2, X, Trash2, Package, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { Segmentado } from '@/components/ui/Segmentado'
import { useToast } from '@/components/ui/Toast'
import { confirmar } from '@/components/ui/Confirmar'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useDoacoesUGC } from '@/hooks/useDoacoesUGC'
import { usePurionStore } from '@/store'
import { useSocioAtual } from '@/components/meu-trabalho/useSocioAtual'
import { excluirColaboracao, excluirEntrega, salvarColaboracao, salvarEntrega, useTikTokStore } from '@/hooks/useTikTok'
import { ACORDOS, COLUNAS_FUNIL, DIREITOS, ETAPA_INFO, ETAPAS_COLAB, STATUS_ENTREGA, type Colaboracao, type EtapaColab } from '@/lib/tiktok/tipos'
import { Campo, fmtData, fmtMoeda, fmtNum, hojeISO, nomePessoa, PESSOAS, useNomesCreators, useTotais, Vazio } from './comum'
import { useNavTikTok } from './TikTokHub'

export function CreatorNetwork() {
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const entregas = useTikTokStore((s) => s.entregas)
  const campanhas = useTikTokStore((s) => s.campanhas)
  const videos = useTikTokStore((s) => s.videos)
  const atribuicoes = useTikTokStore((s) => s.atribuicoes)
  const totais = useTotais()
  const { creators, nome, handle } = useNomesCreators()
  const toast = useToast()
  const [visao, setVisao] = useEstadoPersistido<'funil' | 'lista'>('tt-creators-visao', 'funil')
  const [busca, setBusca] = useEstadoPersistido('tt-creators-busca', '')
  const [fCampanha, setFCampanha] = useEstadoPersistido('tt-creators-campanha', '')
  const [aberta, setAberta] = useState<string | null>(null)
  const [nova, setNova] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const hoje = hojeISO()

  const resultado = useMemo(() => {
    const m = new Map<string, { views: number; vendas: number; receita: number; videos: number }>()
    for (const v of videos) {
      if (!v.creatorId) continue
      const t = totais.get(v.id)
      const r = m.get(v.creatorId) ?? { views: 0, vendas: 0, receita: 0, videos: 0 }
      r.videos += 1; r.views += t?.views ?? 0
      m.set(v.creatorId, r)
    }
    for (const a of atribuicoes) {
      if (!a.creatorId) continue
      const r = m.get(a.creatorId) ?? { views: 0, vendas: 0, receita: 0, videos: 0 }
      r.vendas += 1; r.receita += a.valor
      m.set(a.creatorId, r)
    }
    return m
  }, [videos, totais, atribuicoes])

  const filtradas = colaboracoes.filter((c) => (!fCampanha || c.campanhaId === fCampanha)
    && (!busca.trim() || `${nome(c.creatorId)} ${handle(c.creatorId)} ${c.cupom ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase())))

  const mover = async (id: string, etapa: EtapaColab) => {
    const r = await salvarColaboracao({ id, etapa })
    if (!r.ok) toast.error('Não foi possível mover', r.erro)
  }

  const custo = (c: Colaboracao) => c.cache
  const colabAberta = colaboracoes.find((c) => c.id === aberta) ?? null

  return (
    <div className="dash">
      <div className="toolbar">
        <label className="busca"><Search size={13} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar creator, @ ou cupom" /></label>
        <select className="filtro" data-ativo={fCampanha || undefined} value={fCampanha} onChange={(e) => setFCampanha(e.target.value)} aria-label="Campanha">
          <option value="">Campanha</option>{campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <span className="toolbar-espaco" />
        <Segmentado rotulo="Visão" valor={visao} onChange={setVisao} opcoes={[{ id: 'funil', label: 'Funil', icon: Columns3 }, { id: 'lista', label: 'Lista', icon: List }]} />
        <button className="btn btn-accent btn-sm" onClick={() => setNova(true)}><Plus size={13} /> Colaboração</button>
      </div>

      {colaboracoes.length === 0 ? (
        <Vazio icone={Users2} titulo="Nenhuma colaboração ainda" texto="Comece pelos creators que você já tem cadastrados — cada colaboração acompanha negociação, amostra, entregas, direitos e resultado."
          acao={<button className="btn btn-secondary btn-sm" onClick={() => setNova(true)}><Plus size={13} /> Nova colaboração</button>} />
      ) : visao === 'funil' ? (
        <div className="tt-quadro">
          {COLUNAS_FUNIL.map((etapa) => {
            const itens = filtradas.filter((c) => c.etapa === etapa)
            return (
              <section key={etapa} className="tt-coluna" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (arrastando) mover(arrastando, etapa) }}>
                <header className="tt-coluna-topo"><span>{ETAPA_INFO[etapa]}</span><span className="tt-coluna-n tnum">{itens.length}</span></header>
                <div className="tt-coluna-itens">
                  {itens.map((c) => {
                    const pend = entregas.filter((e) => e.colaboracaoId === c.id && e.status === 'pendente')
                    const atrasada = pend.some((e) => e.prazo && e.prazo < hoje)
                    const r = resultado.get(c.creatorId)
                    return (
                      <article key={c.id} className="tt-card" draggable onDragStart={() => setArrastando(c.id)} onDragEnd={() => setArrastando(null)} onClick={() => setAberta(c.id)}>
                        <p className="tt-card-titulo">{nome(c.creatorId)}</p>
                        <p className="caption">{handle(c.creatorId) || '—'}</p>
                        <div className="tt-card-rodape">
                          <span>{ACORDOS[c.tipoAcordo]}{c.cache ? ` · ${fmtMoeda(c.cache)}` : ''}</span>
                          {r?.vendas ? <span className="tnum">{r.vendas} venda(s)</span> : c.prazoEntrega ? <span className="tnum">{fmtData(c.prazoEntrega)}</span> : null}
                        </div>
                        {atrasada && <span className="badge badge-danger" style={{ marginTop: 6 }}>entrega atrasada</span>}
                        {!atrasada && pend.length > 0 && <span className="badge badge-warning" style={{ marginTop: 6 }}>{pend.length} entrega(s) pendente(s)</span>}
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="card-purion" style={{ overflowX: 'auto' }}>
          <table className="table-purion tabela-compacta">
            <thead><tr><th>Creator</th><th>Etapa</th><th>Acordo</th><th>Cupom</th><th>Direitos</th><th>Responsável</th><th style={{ textAlign: 'right' }}>Vídeos</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Vendas</th><th style={{ textAlign: 'right' }}>Custo/venda</th></tr></thead>
            <tbody>
              {filtradas.map((c) => {
                const r = resultado.get(c.creatorId)
                return (
                  <tr key={c.id} className="linha-clicavel" onClick={() => setAberta(c.id)}>
                    <td>{nome(c.creatorId)} <span className="caption">{handle(c.creatorId)}</span></td>
                    <td>{ETAPA_INFO[c.etapa]}</td>
                    <td>{ACORDOS[c.tipoAcordo]}{c.cache ? ` · ${fmtMoeda(c.cache)}` : ''}</td>
                    <td className="td-mono">{c.cupom ?? '—'}</td>
                    <td>{DIREITOS[c.direitosUso]}{c.direitosAte ? ` até ${fmtData(c.direitosAte)}` : ''}</td>
                    <td>{nomePessoa(c.responsavel)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{r?.videos ?? 0}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{r?.views ? fmtNum(r.views) : '—'}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{r?.vendas ?? 0}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{r?.vendas ? fmtMoeda(custo(c) / r.vendas) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {nova && <ModalNovaColaboracao creators={creators} onFechar={() => setNova(false)} />}
      {colabAberta && <FichaColaboracao colab={colabAberta} resultado={resultado.get(colabAberta.creatorId)} onFechar={() => setAberta(null)} />}
      <p className="caption">Etapas encerrado e recusado ficam na visão Lista. Cadastro completo do creator continua em <a className="link-limpar" href="/creators">Creators</a>.</p>
    </div>
  )
}

function ModalNovaColaboracao({ creators, onFechar }: { creators: ReturnType<typeof useNomesCreators>['creators']; onFechar: () => void }) {
  const socio = useSocioAtual()
  const toast = useToast()
  const [creatorId, setCreatorId] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoTiktok, setNovoTiktok] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    let id = creatorId
    setSalvando(true)
    if (!id) {
      if (!novoNome.trim() || !supabase) { setSalvando(false); toast.error('Escolha um creator ou informe o nome'); return }
      const { data, error } = await supabase.from('creators').insert({
        nome: novoNome.trim(), instagram: '', tiktok: novoTiktok.trim() || null, tiktok_handle: novoTiktok.trim() || null,
        nicho: 'automotivo', seguidores: 0, status: 'contatado', cache_combinado: 0, produtos_enviados: [], postagens: [], roi: 0, responsavel: socio, notas: '',
      }).select().single()
      dbLog('INSERT', 'creators (tiktok)', error, data?.id)
      if (error || !data) { setSalvando(false); toast.error('Erro ao cadastrar creator', error?.message); return }
      id = String(data.id)
    }
    const r = await salvarColaboracao({ creatorId: id, etapa: 'prospect', responsavel: socio })
    setSalvando(false)
    if (!r.ok) toast.error('Erro ao criar colaboração', r.erro); else { toast.success('Colaboração criada'); onFechar() }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <form className="modal-container" onSubmit={salvar}>
        <div className="modal-header"><h2 className="modal-title">Nova colaboração</h2><button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar"><X size={14} /></button></div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Campo label="Creator cadastrado">
            <select className="select-purion" value={creatorId} onChange={(e) => setCreatorId(e.target.value)} autoFocus>
              <option value="">Novo creator…</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.tiktok ? ` · ${c.tiktok}` : ''}</option>)}
            </select>
          </Campo>
          {!creatorId && (
            <div className="tt-grade">
              <Campo label="Nome"><input className="input-purion" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} /></Campo>
              <Campo label="@ no TikTok"><input className="input-purion" value={novoTiktok} onChange={(e) => setNovoTiktok(e.target.value)} placeholder="@creator" /></Campo>
            </div>
          )}
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button><button className="btn btn-accent" disabled={salvando}>Criar</button></div>
      </form>
    </div>
  )
}

function FichaColaboracao({ colab, resultado, onFechar }: { colab: Colaboracao; resultado?: { views: number; vendas: number; receita: number; videos: number }; onFechar: () => void }) {
  const { nome, handle } = useNomesCreators()
  const campanhas = useTikTokStore((s) => s.campanhas)
  const entregas = useTikTokStore((s) => s.entregas).filter((e) => e.colaboracaoId === colab.id)
  const videos = useTikTokStore((s) => s.videos).filter((v) => v.creatorId === colab.creatorId)
  const amostras = usePurionStore((s) => s.doacoesUGC).filter((d) => d.creatorId === colab.creatorId)
  const { criarDoacao } = useDoacoesUGC()
  const { abrirVideo } = useNavTikTok()
  const toast = useToast()
  const [descEntrega, setDescEntrega] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const k = colab.id + colab.updatedAt

  const salvar = async (d: Partial<Colaboracao>) => {
    const r = await salvarColaboracao({ id: colab.id, ...d })
    if (!r.ok) toast.error('Não foi possível salvar', r.erro)
  }
  const roi = resultado?.receita && colab.cache ? resultado.receita / colab.cache : null

  return (
    <div data-modal className="ficha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <aside className="ficha-painel tt-ficha" role="dialog" aria-label={`Colaboração com ${nome(colab.creatorId)}`}>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p className="kpi-label">Creator</p>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, fontWeight: 700 }}>{nome(colab.creatorId)}</h2>
            <p className="caption">{handle(colab.creatorId)}</p>
          </div>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar"><X size={14} /></button>
        </div>

        <div className="tt-numeros" style={{ marginTop: 14 }}>
          <div><span className="kpi-label">Vídeos</span><strong className="tnum">{resultado?.videos ?? 0}</strong></div>
          <div><span className="kpi-label">Views</span><strong className="tnum">{fmtNum(resultado?.views ?? 0)}</strong></div>
          <div><span className="kpi-label">Vendas</span><strong className="tnum">{resultado?.vendas ?? 0}</strong></div>
          <div><span className="kpi-label">Retorno</span><strong className="tnum">{roi ? `${roi.toFixed(1).replace('.', ',')}x` : '—'}</strong></div>
        </div>

        <div className="tt-grade" style={{ marginTop: 16 }}>
          <Campo label="Etapa">
            <select className="select-purion" value={colab.etapa} onChange={(e) => salvar({ etapa: e.target.value as EtapaColab })}>
              {ETAPAS_COLAB.map((x) => <option key={x} value={x}>{ETAPA_INFO[x]}</option>)}
            </select>
          </Campo>
          <Campo label="Campanha">
            <select className="select-purion" value={colab.campanhaId ?? ''} onChange={(e) => salvar({ campanhaId: e.target.value || null })}>
              <option value="">—</option>{campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Acordo">
            <select className="select-purion" value={colab.tipoAcordo} onChange={(e) => salvar({ tipoAcordo: e.target.value as Colaboracao['tipoAcordo'] })}>
              {Object.entries(ACORDOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Cachê (R$)"><input type="number" min={0} step="0.01" className="input-purion" key={`${k}-c`} defaultValue={colab.cache || ''} onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== colab.cache) salvar({ cache: v }) }} /></Campo>
          <Campo label="Comissão (%)"><input type="number" min={0} max={100} step="0.5" className="input-purion" key={`${k}-p`} defaultValue={colab.comissaoPct || ''} onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== colab.comissaoPct) salvar({ comissaoPct: v }) }} /></Campo>
          <Campo label="Cupom"><input className="input-purion" key={`${k}-cu`} defaultValue={colab.cupom ?? ''} onBlur={(e) => { const v = e.target.value.trim().toUpperCase() || null; if (v !== colab.cupom) salvar({ cupom: v }) }} /></Campo>
          <Campo label="Prazo de entrega"><input type="date" className="input-purion" value={colab.prazoEntrega ?? ''} onChange={(e) => salvar({ prazoEntrega: e.target.value || null })} /></Campo>
          <Campo label="Responsável">
            <select className="select-purion" value={colab.responsavel} onChange={(e) => salvar({ responsavel: e.target.value })}>
              {PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Direito de uso">
            <select className="select-purion" value={colab.direitosUso} onChange={(e) => salvar({ direitosUso: e.target.value as Colaboracao['direitosUso'] })}>
              {Object.entries(DIREITOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Direitos até"><input type="date" className="input-purion" value={colab.direitosAte ?? ''} onChange={(e) => salvar({ direitosAte: e.target.value || null })} /></Campo>
          <Campo label="Contrato (link)" largura="1 / -1"><input className="input-purion" key={`${k}-ct`} defaultValue={colab.contratoUrl ?? ''} onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== colab.contratoUrl) salvar({ contratoUrl: v }) }} /></Campo>
          <Campo label="Notas" largura="1 / -1"><textarea className="textarea-purion" rows={2} key={`${k}-n`} defaultValue={colab.notas ?? ''} onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== colab.notas) salvar({ notas: v }) }} /></Campo>
        </div>

        <section className="dash-secao" style={{ marginTop: 22 }}>
          <span className="dash-secao-titulo">Entregas</span>
          <ul className="ficha-linha">
            {entregas.map((e) => (
              <li key={e.id}><div className="ficha-evento">
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13 }}>{e.descricao}</p>
                  <p className="caption" style={{ color: e.status === 'pendente' && e.prazo && e.prazo < hojeISO() ? 'var(--status-danger)' : undefined }}>prazo {fmtData(e.prazo)}</p>
                </div>
                <select className="filtro" value={e.status} onChange={(ev) => salvarEntrega({ id: e.id, status: ev.target.value as typeof e.status })} aria-label="Status da entrega">
                  {Object.entries(STATUS_ENTREGA).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                </select>
                <button className="icon-btn" aria-label="Excluir entrega" onClick={() => excluirEntrega(e.id)}><Trash2 size={12} /></button>
              </div></li>
            ))}
          </ul>
          <form className="toolbar" onSubmit={async (e) => {
            e.preventDefault(); if (!descEntrega.trim()) return
            const r = await salvarEntrega({ colaboracaoId: colab.id, descricao: descEntrega.trim(), prazo: prazoEntrega || colab.prazoEntrega })
            if (r.ok) { setDescEntrega(''); setPrazoEntrega('') } else toast.error('Erro', r.erro)
          }}>
            <input className="input-purion" style={{ flex: 1, minWidth: 160, height: 32 }} value={descEntrega} onChange={(e) => setDescEntrega(e.target.value)} placeholder="Ex.: 1 vídeo POV no carro, 30s" />
            <input type="date" className="input-purion" style={{ height: 32, width: 150 }} value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} aria-label="Prazo" />
            <button className="btn btn-secondary btn-sm" disabled={!descEntrega.trim()}><Plus size={13} /> Entrega</button>
          </form>
        </section>

        <section className="dash-secao" style={{ marginTop: 22 }}>
          <div className="dash-secao-cabecalho">
            <span className="dash-secao-titulo">Amostras enviadas</span>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              await criarDoacao({ creatorId: colab.creatorId, quantidade: 1, contrapartida: 'Conteúdo TikTok', observacoes: `Colaboração TikTok${colab.cupom ? ` · cupom ${colab.cupom}` : ''}` })
              if (['prospect', 'contatado', 'negociando', 'fechado'].includes(colab.etapa)) await salvar({ etapa: 'amostra_enviada' })
            }}><Package size={13} /> Registrar amostra</button>
          </div>
          {amostras.length === 0 ? <p className="caption">Nenhuma amostra registrada. Registrar dá baixa no estoque como em Doações UGC.</p> : (
            <ul className="ficha-linha">{amostras.map((a) => (
              <li key={a.id}><div className="ficha-evento"><span className="ficha-icone"><Package size={12} /></span>
                <div><p style={{ fontSize: 13 }}>{a.quantidade} un. · {a.statusEnvio}{a.codigoRastreio ? ` · ${a.codigoRastreio}` : ''}</p><p className="caption">{fmtData(a.dataEnvio)}{a.entregueConteudo ? ' · conteúdo entregue' : ''}</p></div>
              </div></li>
            ))}</ul>
          )}
        </section>

        <section className="dash-secao" style={{ marginTop: 22 }}>
          <span className="dash-secao-titulo">Vídeos deste creator</span>
          {videos.length === 0 ? <p className="caption">Nenhum vídeo vinculado. Na ficha do vídeo, escolha este creator.</p> : (
            <ul className="ficha-linha">{videos.map((v) => (
              <li key={v.id}><button className="ficha-evento" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={() => { onFechar(); abrirVideo(v.id) }}>
                <span className="ficha-icone"><ExternalLink size={12} /></span><div><p style={{ fontSize: 13 }}>{v.codigo} · {v.titulo}</p></div>
              </button></li>
            ))}</ul>
          )}
        </section>

        <div className="toolbar" style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <span className="toolbar-espaco" />
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={async () => {
            if (!(await confirmar({ titulo: 'Excluir colaboração?', mensagem: 'O cadastro do creator continua em Creators.', rotuloConfirmar: 'Excluir' }))) return
            const r = await excluirColaboracao(colab.id); if (r.ok) onFechar()
          }}><Trash2 size={13} /> Excluir colaboração</button>
        </div>
      </aside>
    </div>
  )
}

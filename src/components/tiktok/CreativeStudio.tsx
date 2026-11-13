'use client'

import { useMemo, useRef, useState } from 'react'
import { Clapperboard, Columns3, List, Plus, Search, Lock } from 'lucide-react'
import { Segmentado } from '@/components/ui/Segmentado'
import { BulkActionsBar } from '@/components/ui/BulkActionsBar'
import { confirmar } from '@/components/ui/Confirmar'
import { useToast } from '@/components/ui/Toast'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useAcaoRapida } from '@/lib/acaoRapida'
import { arquivarVideos, atualizarVideos, criarVideo, useTikTokStore } from '@/hooks/useTikTok'
import { COLUNAS_STUDIO, exigeAprovacao, FORMATOS, STATUS_INFO, type StatusVideo, type Video } from '@/lib/tiktok/tipos'
import { useSocioAtual } from '@/components/meu-trabalho/useSocioAtual'
import { corPilar, fmtData, fmtNum, hojeISO, nomePessoa, PESSOAS, SeloStatus, useNomesCreators, usePilares, usePodeAprovar, useTotais, Vazio } from './comum'
import { useNavTikTok } from './TikTokHub'

type Visao = 'quadro' | 'lista'

export function CreativeStudio() {
  const videos = useTikTokStore((s) => s.videos)
  const campanhas = useTikTokStore((s) => s.campanhas)
  const pilares = usePilares()
  const totais = useTotais()
  const { creators, nome: nomeCreator } = useNomesCreators()
  const { abrirVideo } = useNavTikTok()
  const podeAprovar = usePodeAprovar()
  const socio = useSocioAtual()
  const toast = useToast()

  const [visao, setVisao] = useEstadoPersistido<Visao>('tt-studio-visao', 'quadro')
  const [busca, setBusca] = useEstadoPersistido('tt-studio-busca', '')
  const [fPilar, setFPilar] = useEstadoPersistido('tt-studio-pilar', '')
  const [fCreator, setFCreator] = useEstadoPersistido('tt-studio-creator', '')
  const [fResp, setFResp] = useEstadoPersistido('tt-studio-resp', '')
  const [fCampanha, setFCampanha] = useEstadoPersistido('tt-studio-campanha', '')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [novaIdeia, setNovaIdeia] = useState('')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<StatusVideo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useAcaoRapida('nova-ideia-video', () => inputRef.current?.focus())

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return videos.filter((v) => v.status !== 'arquivado'
      && (!fPilar || v.pilar === fPilar) && (!fCreator || v.creatorId === fCreator)
      && (!fResp || v.responsavel === fResp) && (!fCampanha || v.campanhaId === fCampanha)
      && (!q || `${v.codigo} ${v.titulo} ${v.gancho ?? ''} ${v.roteiro ?? ''}`.toLowerCase().includes(q)))
  }, [videos, busca, fPilar, fCreator, fResp, fCampanha])

  const temFiltro = !!(busca || fPilar || fCreator || fResp || fCampanha)
  const limpar = () => { setBusca(''); setFPilar(''); setFCreator(''); setFResp(''); setFCampanha('') }

  async function capturar(e: React.FormEvent) {
    e.preventDefault()
    const titulo = novaIdeia.trim()
    if (!titulo) return
    setNovaIdeia('')
    const r = await criarVideo({ titulo, status: 'ideia', responsavel: socio, pilar: fPilar || null, campanhaId: fCampanha || null, creatorId: fCreator || null })
    if (!r.ok) toast.error('Não foi possível criar a ideia', r.erro)
    else toast.success(`${r.data?.codigo} criada`, 'Abra o card para escrever o gancho e o roteiro')
  }

  async function mover(v: Video, para: StatusVideo) {
    if (v.status === para) return
    if (exigeAprovacao(v.status, para) && !podeAprovar) {
      toast.error('Precisa de aprovação', 'Só master ou admin aprova roteiro e corte final')
      return
    }
    const aprovou = exigeAprovacao(v.status, para)
    const r = await atualizarVideos([v.id], { status: para, ...(aprovou ? { aprovadoPor: socio, aprovadoEm: new Date().toISOString() } : {}) })
    if (!r.ok) toast.error('Não foi possível mover', r.erro)
  }

  async function emLote(d: Partial<Video>, msg: string) {
    const ids = [...selecionados]
    if (d.status && !podeAprovar && videos.some((v) => ids.includes(v.id) && exigeAprovacao(v.status, d.status!))) {
      toast.error('Precisa de aprovação', 'Alguns itens saem de uma etapa de aprovação')
      return
    }
    const r = await atualizarVideos(ids, d)
    if (!r.ok) toast.error('Erro na ação em lote', r.erro)
    else { toast.success(msg, `${ids.length} vídeo(s)`); setSelecionados(new Set()) }
  }

  const alternar = (id: string) => setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="dash">
      <div className="toolbar">
        <form onSubmit={capturar} className="tt-captura">
          <Plus size={14} />
          <input ref={inputRef} value={novaIdeia} onChange={(e) => setNovaIdeia(e.target.value)} placeholder="Nova ideia de vídeo — digite e Enter" aria-label="Nova ideia" />
        </form>
        <span className="toolbar-espaco" />
        <Segmentado rotulo="Visão" valor={visao} onChange={setVisao}
          opcoes={[{ id: 'quadro', label: 'Quadro', icon: Columns3 }, { id: 'lista', label: 'Lista', icon: List }]} />
      </div>

      <div className="toolbar">
        <label className="busca"><Search size={13} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar código, título, gancho…" /></label>
        <select className="filtro" data-ativo={fPilar || undefined} value={fPilar} onChange={(e) => setFPilar(e.target.value)} aria-label="Pilar">
          <option value="">Pilar</option>{pilares.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
        </select>
        <select className="filtro" data-ativo={fCampanha || undefined} value={fCampanha} onChange={(e) => setFCampanha(e.target.value)} aria-label="Campanha">
          <option value="">Campanha</option>{campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="filtro" data-ativo={fCreator || undefined} value={fCreator} onChange={(e) => setFCreator(e.target.value)} aria-label="Creator">
          <option value="">Creator</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="filtro" data-ativo={fResp || undefined} value={fResp} onChange={(e) => setFResp(e.target.value)} aria-label="Responsável">
          <option value="">Responsável</option>{PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {temFiltro && <button className="link-limpar" onClick={limpar}>Limpar filtros</button>}
        <span className="toolbar-espaco" />
        <span className="caption tnum">{filtrados.length} vídeo(s)</span>
      </div>

      {videos.length === 0 ? (
        <Vazio icone={Clapperboard} titulo="Nenhuma ideia ainda" texto="Digite a primeira ideia no campo acima e aperte Enter. Ela vira um card com código TT-0001." />
      ) : visao === 'quadro' ? (
        <div className="tt-quadro">
          {COLUNAS_STUDIO.map((col) => {
            const itens = filtrados.filter((v) => v.status === col)
            const bloqueada = !podeAprovar && (col === 'producao' || col === 'agendado')
            return (
              <section key={col} className="tt-coluna" data-sobre={sobre === col || undefined}
                onDragOver={(e) => { e.preventDefault(); setSobre(col) }}
                onDragLeave={() => setSobre((s) => (s === col ? null : s))}
                onDrop={(e) => { e.preventDefault(); setSobre(null); const v = videos.find((x) => x.id === arrastando); if (v) mover(v, col) }}>
                <header className="tt-coluna-topo">
                  <span className="tt-selo-ponto" style={{ background: STATUS_INFO[col].cor }} />
                  <span>{STATUS_INFO[col].label}</span>
                  {bloqueada && <Lock size={11} aria-label="Exige aprovação" />}
                  <span className="tt-coluna-n tnum">{itens.length}</span>
                </header>
                <div className="tt-coluna-itens">
                  {itens.map((v) => {
                    const t = totais.get(v.id)
                    const atrasado = v.dataPrevista && v.dataPrevista < hojeISO() && !['agendado', 'publicado', 'analisado'].includes(v.status)
                    return (
                      <article key={v.id} className="tt-card" draggable data-arrastando={arrastando === v.id || undefined}
                        onDragStart={(e) => { setArrastando(v.id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => setArrastando(null)}
                        onClick={() => abrirVideo(v.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') abrirVideo(v.id) }}>
                        <div className="tt-card-topo">
                          <span className="tnum caption">{v.codigo}</span>
                          {v.pilar && <span className="tt-pilar" style={{ ['--tom' as string]: corPilar(pilares, v.pilar) }}>{v.pilar}</span>}
                        </div>
                        <p className="tt-card-titulo">{v.titulo}</p>
                        {v.gancho && <p className="tt-card-gancho">“{v.gancho}”</p>}
                        <div className="tt-card-rodape">
                          <span>{v.creatorId ? nomeCreator(v.creatorId) : nomePessoa(v.responsavel)}</span>
                          {t && t.views > 0 ? <span className="tnum">{fmtNum(t.views)} views</span>
                            : v.dataPrevista ? <span className="tnum" style={{ color: atrasado ? 'var(--status-danger)' : undefined }}>{fmtData(v.dataPrevista)}</span> : null}
                        </div>
                        {(!v.roteiro && ['roteiro', 'aprovacao_roteiro'].includes(v.status)) && <span className="badge badge-warning" style={{ marginTop: 6 }}>sem roteiro</span>}
                      </article>
                    )
                  })}
                  {itens.length === 0 && <p className="tt-coluna-vazia">Arraste um card para cá</p>}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="card-purion" style={{ overflowX: 'auto' }}>
          <table className="table-purion tabela-compacta">
            <thead><tr>
              <th style={{ width: 32 }}><input type="checkbox" className="sel-check" aria-label="Selecionar todos"
                checked={filtrados.length > 0 && filtrados.every((v) => selecionados.has(v.id))}
                onChange={(e) => setSelecionados(e.target.checked ? new Set(filtrados.map((v) => v.id)) : new Set())} /></th>
              <th>Código</th><th>Título</th><th>Status</th><th>Pilar</th><th>Formato</th><th>Creator</th><th>Responsável</th><th>Publicação</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Vendas</th>
            </tr></thead>
            <tbody>
              {filtrados.map((v) => {
                const t = totais.get(v.id)
                return (
                  <tr key={v.id} className="linha-clicavel" data-selecionada={selecionados.has(v.id) || undefined} onClick={() => abrirVideo(v.id)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="sel-check" checked={selecionados.has(v.id)} onChange={() => alternar(v.id)} aria-label={`Selecionar ${v.codigo}`} /></td>
                    <td className="td-mono">{v.codigo}</td>
                    <td style={{ maxWidth: 280 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo}</span></td>
                    <td><SeloStatus status={v.status} /></td>
                    <td>{v.pilar ?? '—'}</td>
                    <td>{v.formato ? FORMATOS[v.formato as keyof typeof FORMATOS] ?? v.formato : '—'}</td>
                    <td>{nomeCreator(v.creatorId)}</td>
                    <td>{nomePessoa(v.responsavel)}</td>
                    <td className="tnum">{fmtData(v.dataPrevista)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{t?.views ? fmtNum(t.views) : '—'}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{t?.vendas || '—'}</td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && <tr><td colSpan={11}><Vazio icone={Search} titulo="Nada com esses filtros" acao={<button className="link-limpar" onClick={limpar}>Limpar filtros</button>} /></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <BulkActionsBar
        selecionados={selecionados.size} total={filtrados.length}
        onLimpar={() => setSelecionados(new Set())}
        onSelecionarTodos={() => setSelecionados(new Set(filtrados.map((v) => v.id)))}
        rotuloArquivar="Excluir"
        onArquivar={async () => {
          if (!(await confirmar({ titulo: `Excluir ${selecionados.size} vídeo(s)?`, mensagem: 'Saem do Studio e do calendário.', rotuloConfirmar: 'Excluir' }))) return
          const r = await arquivarVideos([...selecionados])
          if (!r.ok) toast.error('Erro ao excluir', r.erro); else { toast.success('Excluídos'); setSelecionados(new Set()) }
        }}
        campos={[
          { key: 'status', label: 'Status', options: COLUNAS_STUDIO.concat('arquivado').map((s) => ({ value: s, label: STATUS_INFO[s].label })), onAplicar: (v) => emLote({ status: v as StatusVideo }, 'Status atualizado') },
          { key: 'resp', label: 'Responsável', options: PESSOAS.map((p) => ({ value: p.id, label: p.nome })), onAplicar: (v) => emLote({ responsavel: v }, 'Responsável atualizado') },
          { key: 'pilar', label: 'Pilar', options: pilares.map((p) => ({ value: p.nome, label: p.nome })), onAplicar: (v) => emLote({ pilar: v }, 'Pilar atualizado') },
          { key: 'campanha', label: 'Campanha', options: campanhas.map((c) => ({ value: c.id, label: c.nome })), onAplicar: (v) => emLote({ campanhaId: v }, 'Campanha atualizada') },
        ]}
      />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, FileUp, Link2, Trash2, X, Plus, Wand2, ShieldCheck, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import { confirmar } from '@/components/ui/Confirmar'
import { Segmentado } from '@/components/ui/Segmentado'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { usePurionStore } from '@/store'
import { useSocioAtual } from '@/components/meu-trabalho/useSocioAtual'
import {
  arquivarVideos, atribuirVendas, atualizarVideos, BUCKET_MIDIA, carregarDetalheVideo, criarPublicacao, criarVideo, excluirPublicacao,
  lancarMetrica, removerAtribuicao, urlAssinada, useTikTokStore,
} from '@/hooks/useTikTok'
import { ultimoSnapshotPorPublicacao, compararVariantes } from '@/lib/tiktok/inteligencia'
import {
  DIREITOS, exigeAprovacao, FORMATOS, GANCHOS, OBJETIVOS, STATUS_INFO, STATUS_VIDEO,
  type Asset, type HistoricoItem, type StatusVideo, type Variante, type Video,
} from '@/lib/tiktok/tipos'
import { Campo, fmtData, fmtMoeda, fmtNum, fmtPct, hojeISO, nomePessoa, PESSOAS, SeloStatus, useNomesCreators, usePilares, usePodeAprovar, useTotais } from './comum'

type Aba = 'briefing' | 'roteiro' | 'versoes' | 'arquivos' | 'publicacao' | 'vendas' | 'historico'
const ABAS: Array<{ id: Aba; label: string }> = [
  { id: 'briefing', label: 'Briefing' }, { id: 'roteiro', label: 'Roteiro' }, { id: 'versoes', label: 'Versões' },
  { id: 'arquivos', label: 'Arquivos' }, { id: 'publicacao', label: 'Métricas' }, { id: 'vendas', label: 'Vendas' }, { id: 'historico', label: 'Histórico' },
]

export function FichaVideo({ videoId, onFechar }: { videoId: string; onFechar: () => void }) {
  const video = useTikTokStore((s) => s.videos.find((v) => v.id === videoId))
  const [aba, setAba] = useState<Aba>('briefing')
  const [detalhe, setDetalhe] = useState<{ variantes: Variante[]; assets: Asset[]; historico: HistoricoItem[] }>({ variantes: [], assets: [], historico: [] })
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const podeAprovar = usePodeAprovar()
  const socio = useSocioAtual()
  const toast = useToast()

  const recarregarDetalhe = useCallback(() => { carregarDetalheVideo(videoId).then(setDetalhe) }, [videoId])
  useEffect(() => { recarregarDetalhe() }, [recarregarDetalhe, video?.status])
  useEffect(() => {
    let vivo = true
    const p = video?.thumbnailPath
    Promise.resolve(p ? urlAssinada(p) : null).then((u) => { if (vivo) setThumbUrl(u) })
    return () => { vivo = false }
  }, [video?.thumbnailPath])

  if (!video) {
    return (
      <div data-modal className="ficha-fundo" onClick={onFechar}>
        <aside className="ficha-painel"><p className="caption">Vídeo não encontrado (pode ter sido excluído).</p></aside>
      </div>
    )
  }

  const salvar = async (d: Partial<Video>) => {
    const r = await atualizarVideos([video.id], d)
    if (!r.ok) toast.error('Não foi possível salvar', r.erro)
  }

  const mudarStatus = async (para: StatusVideo) => {
    if (exigeAprovacao(video.status, para) && !podeAprovar) { toast.error('Precisa de aprovação', 'Só master ou admin aprova'); return }
    const aprovou = exigeAprovacao(video.status, para)
    await salvar({ status: para, ...(aprovou ? { aprovadoPor: socio, aprovadoEm: new Date().toISOString() } : {}) })
  }

  const proximaAcao = PROXIMO[video.status]

  return (
    <div data-modal className="ficha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <aside className="ficha-painel tt-ficha" role="dialog" aria-label={`Vídeo ${video.codigo}`}>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          {thumbUrl && <img src={thumbUrl} alt="" className="tt-thumb" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="kpi-label tnum">{video.codigo}</p>
            <input className="tt-titulo-edit" defaultValue={video.titulo} key={video.id + video.updatedAt}
              onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== video.titulo) salvar({ titulo: t }) }} aria-label="Título" />
            <div className="toolbar" style={{ marginTop: 6, gap: 6 }}>
              <SeloStatus status={video.status} />
              <select className="filtro" value={video.status} onChange={(e) => mudarStatus(e.target.value as StatusVideo)} aria-label="Status">
                {STATUS_VIDEO.map((s) => <option key={s} value={s} disabled={exigeAprovacao(video.status, s) && !podeAprovar}>{STATUS_INFO[s].label}</option>)}
              </select>
              {proximaAcao && (!proximaAcao.aprovacao || podeAprovar) && (
                <button className="btn btn-accent btn-sm" onClick={() => mudarStatus(proximaAcao.para)}>
                  {proximaAcao.aprovacao ? <ShieldCheck size={13} /> : <Check size={13} />}{proximaAcao.label}
                </button>
              )}
              {proximaAcao?.aprovacao && podeAprovar && (
                <button className="btn btn-secondary btn-sm" onClick={() => mudarStatus(proximaAcao.voltar!)}><RotateCcw size={13} /> Pedir ajuste</button>
              )}
              {proximaAcao?.aprovacao && !podeAprovar && <span className="caption">Aguardando master/admin</span>}
            </div>
          </div>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)"><X size={14} /></button>
        </div>

        <div className="tt-ficha-abas mobile-tabs-scroll">
          <Segmentado rotulo="Seções" valor={aba} onChange={setAba} opcoes={ABAS} />
        </div>

        {aba === 'briefing' && <AbaBriefing video={video} salvar={salvar} />}
        {aba === 'roteiro' && <AbaRoteiro video={video} salvar={salvar} />}
        {aba === 'versoes' && <AbaVersoes video={video} variantes={detalhe.variantes} recarregar={recarregarDetalhe} />}
        {aba === 'arquivos' && <AbaArquivos video={video} assets={detalhe.assets} recarregar={recarregarDetalhe} salvar={salvar} />}
        {aba === 'publicacao' && <AbaPublicacao video={video} variantes={detalhe.variantes} />}
        {aba === 'vendas' && <AbaVendas video={video} />}
        {aba === 'historico' && <AbaHistorico historico={detalhe.historico} />}

        <div className="toolbar" style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const r = await criarVideo({ ...video, status: 'ideia', titulo: `${video.titulo} (cópia)`, aprovadoEm: null, aprovadoPor: null, thumbnailPath: null })
            if (r.ok) toast.success(`${r.data?.codigo} criado como cópia`)
          }}><Copy size={13} /> Duplicar</button>
          <span className="toolbar-espaco" />
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={async () => {
            if (!(await confirmar({ titulo: `Excluir ${video.codigo}?`, mensagem: 'O vídeo sai do Studio e do calendário.', rotuloConfirmar: 'Excluir' }))) return
            const r = await arquivarVideos([video.id]); if (r.ok) onFechar()
          }}><Trash2 size={13} /> Excluir</button>
        </div>
      </aside>
    </div>
  )
}

const PROXIMO: Partial<Record<StatusVideo, { para: StatusVideo; label: string; aprovacao?: boolean; voltar?: StatusVideo }>> = {
  ideia: { para: 'roteiro', label: 'Escrever roteiro' },
  roteiro: { para: 'aprovacao_roteiro', label: 'Enviar para aprovação' },
  aprovacao_roteiro: { para: 'producao', label: 'Aprovar roteiro', aprovacao: true, voltar: 'roteiro' },
  producao: { para: 'edicao', label: 'Gravado' },
  edicao: { para: 'aprovacao_final', label: 'Enviar corte final' },
  aprovacao_final: { para: 'agendado', label: 'Aprovar corte', aprovacao: true, voltar: 'edicao' },
  agendado: { para: 'publicado', label: 'Marcar publicado' },
  publicado: { para: 'analisado', label: 'Marcar analisado' },
}

// ─────────────────────────────────────────────

function AbaBriefing({ video, salvar }: { video: Video; salvar: (d: Partial<Video>) => void }) {
  const pilares = usePilares()
  const campanhas = useTikTokStore((s) => s.campanhas)
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const { creators } = useNomesCreators()
  const k = video.id + video.updatedAt
  const txt = (campo: keyof Video) => ({
    defaultValue: (video[campo] as string | null) ?? '',
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value.trim() || null
      if (v !== (video[campo] ?? null)) salvar({ [campo]: v } as Partial<Video>)
    },
  })
  return (
    <div className="tt-grade">
      <Campo label="Pilar">
        <select className="select-purion" value={video.pilar ?? ''} onChange={(e) => salvar({ pilar: e.target.value || null })}>
          <option value="">—</option>{pilares.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
          {video.pilar && !pilares.some((p) => p.nome === video.pilar) && <option value={video.pilar}>{video.pilar}</option>}
        </select>
      </Campo>
      <Campo label="Objetivo comercial">
        <select className="select-purion" value={video.objetivoComercial} onChange={(e) => salvar({ objetivoComercial: e.target.value as Video['objetivoComercial'] })}>
          {Object.entries(OBJETIVOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </Campo>
      <Campo label="Formato">
        <select className="select-purion" value={video.formato ?? ''} onChange={(e) => salvar({ formato: e.target.value || null })}>
          <option value="">—</option>{Object.entries(FORMATOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </Campo>
      <Campo label="Campanha">
        <select className="select-purion" value={video.campanhaId ?? ''} onChange={(e) => salvar({ campanhaId: e.target.value || null })}>
          <option value="">—</option>{campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Público" largura="1 / -1"><input className="input-purion" placeholder="Ex.: homens 25–45, carro próprio, gostam de perfumaria" key={`${k}-publico`} {...txt('publico')} /></Campo>
      <Campo label="Responsável">
        <select className="select-purion" value={video.responsavel} onChange={(e) => salvar({ responsavel: e.target.value })}>
          {PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Creator">
        <select className="select-purion" value={video.creatorId ?? ''} onChange={(e) => {
          const creatorId = e.target.value || null
          const colab = colaboracoes.find((c) => c.creatorId === creatorId && !['encerrado', 'recusado'].includes(c.etapa))
          salvar({ creatorId, colaboracaoId: colab?.id ?? null })
        }}>
          <option value="">Marca (sem creator)</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Gravação"><input type="date" className="input-purion" value={video.dataGravacao ?? ''} onChange={(e) => salvar({ dataGravacao: e.target.value || null })} /></Campo>
      <Campo label="Publicação prevista"><input type="date" className="input-purion" value={video.dataPrevista ?? ''} onChange={(e) => salvar({ dataPrevista: e.target.value || null })} /></Campo>
      <Campo label="Prioridade">
        <select className="select-purion" value={video.prioridade} onChange={(e) => salvar({ prioridade: e.target.value as Video['prioridade'] })}>
          <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
      </Campo>
      <Campo label="Nota da ideia (1–10)">
        <input type="number" min={1} max={10} className="input-purion" key={`${k}-score`} defaultValue={video.scoreIdeia ?? ''}
          onBlur={(e) => { const v = e.target.value ? Math.min(10, Math.max(1, Number(e.target.value))) : null; if (v !== video.scoreIdeia) salvar({ scoreIdeia: v }) }} />
      </Campo>
      <Campo label="Direito de uso publicitário">
        <select className="select-purion" value={video.direitosUso} onChange={(e) => salvar({ direitosUso: e.target.value as Video['direitosUso'] })}>
          {Object.entries(DIREITOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </Campo>
      <Campo label="Direito válido até"><input type="date" className="input-purion" value={video.direitosAte ?? ''} onChange={(e) => salvar({ direitosAte: e.target.value || null })} /></Campo>
      <Campo label="Custo de produção (R$)">
        <input type="number" step="0.01" min={0} className="input-purion" key={`${k}-custo`} defaultValue={video.custoProducao || ''}
          onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== video.custoProducao) salvar({ custoProducao: v }) }} />
      </Campo>
      <Campo label="Próximas ações" largura="1 / -1"><textarea className="textarea-purion" rows={2} key={`${k}-proximasAcoes`} {...txt('proximasAcoes')} /></Campo>
      <Campo label="Aprendizado" largura="1 / -1"><textarea className="textarea-purion" rows={2} placeholder="O que este vídeo ensinou (aparece na Inteligência)" key={`${k}-aprendizado`} {...txt('aprendizado')} /></Campo>
      <Campo label="Notas" largura="1 / -1"><textarea className="textarea-purion" rows={2} key={`${k}-notas`} {...txt('notas')} /></Campo>
    </div>
  )
}

function AbaRoteiro({ video, salvar }: { video: Video; salvar: (d: Partial<Video>) => void }) {
  const k = video.id + video.updatedAt
  const blur = (campo: 'gancho' | 'roteiro' | 'cta') => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value.trim() || null
    if (v !== video[campo]) salvar({ [campo]: v })
  }
  const inserirModelo = () => salvar({ roteiro: MODELO_ROTEIRO })
  return (
    <div className="tt-grade">
      <Campo label="Tipo de gancho">
        <select className="select-purion" value={video.ganchoTipo ?? ''} onChange={(e) => salvar({ ganchoTipo: e.target.value || null })}>
          <option value="">—</option>{Object.entries(GANCHOS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </Campo>
      <Campo label="Duração (segundos)">
        <input type="number" min={3} max={600} className="input-purion" key={`${k}-dur`} defaultValue={video.duracaoSeg ?? ''}
          onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== video.duracaoSeg) salvar({ duracaoSeg: v }) }} />
      </Campo>
      <Campo label="Gancho (primeiros 3 segundos)" largura="1 / -1">
        <input className="input-purion" key={`${k}-g`} defaultValue={video.gancho ?? ''} onBlur={blur('gancho')} placeholder="A frase ou imagem que segura o polegar" />
      </Campo>
      <Campo label="Roteiro" largura="1 / -1">
        <textarea className="textarea-purion tt-roteiro" rows={12} key={`${k}-r`} defaultValue={video.roteiro ?? ''} onBlur={blur('roteiro')}
          placeholder="Cena a cena: o que aparece, o que se fala, texto na tela." />
      </Campo>
      {!video.roteiro && <button className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }} onClick={inserirModelo}><Wand2 size={13} /> Usar estrutura padrão</button>}
      <Campo label="CTA" largura="1 / -1"><input className="input-purion" key={`${k}-cta`} defaultValue={video.cta ?? ''} onBlur={blur('cta')} placeholder="Ex.: link na bio / cupom no comentário fixado" /></Campo>
    </div>
  )
}

const MODELO_ROTEIRO = `0–3s  GANCHO:
3–8s  CONTEXTO (o problema / a cena):
8–20s PRODUTO EM USO (close no frasco, borrifada, reação):
20–25s PROVA / DETALHE (fixação, acabamento, embalagem):
25–30s CTA:

Texto na tela:
Áudio / trilha:
Legenda: `

function AbaVersoes({ video, variantes, recarregar }: { video: Video; variantes: Variante[]; recarregar: () => void }) {
  const publicacoes = useTikTokStore((s) => s.publicacoes)
  const metricas = useTikTokStore((s) => s.metricas)
  const toast = useToast()
  const [oQue, setOQue] = useState('gancho')
  const [desc, setDesc] = useState('')

  const ult = useMemo(() => ultimoSnapshotPorPublicacao(metricas), [metricas])
  const desempenho = (vid: string) => {
    const pubs = publicacoes.filter((p) => p.videoId === video.id && p.varianteId === vid)
    let views = 0, conclusao: number | null = null
    for (const p of pubs) { const m = ult.get(p.id); if (m) { views += m.views; conclusao = m.conclusaoPct ?? conclusao } }
    return { views, conclusao }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !desc.trim()) return
    const rotulo = String.fromCharCode(65 + variantes.length)
    const { error } = await supabase.from('tt_variantes').insert({ video_id: video.id, rotulo, o_que_muda: oQue, descricao: desc.trim() })
    dbLog('INSERT', 'tt_variantes', error)
    if (error) toast.error('Erro ao criar versão', error.message); else { setDesc(''); recarregar() }
  }

  const [a, b] = variantes
  const comp = a && b ? (() => {
    const da = desempenho(a.id), dbb = desempenho(b.id)
    return compararVariantes({ rotulo: a.rotulo, views: da.views, taxa: da.conclusao }, { rotulo: b.rotulo, views: dbb.views, taxa: dbb.conclusao })
  })() : null

  return (
    <div className="dash-secao">
      <p className="caption">Versões do mesmo vídeo para teste A/B. Mude uma coisa por vez.</p>
      <ul className="ficha-linha">
        {variantes.map((v) => {
          const d = desempenho(v.id)
          return (
            <li key={v.id}><div className="ficha-evento">
              <span className="ficha-icone" style={{ fontWeight: 700 }}>{v.rotulo}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13 }}>{v.descricao}</p>
                <p className="caption">muda: {v.oQueMuda} · {d.views ? `${fmtNum(d.views)} views · conclusão ${fmtPct(d.conclusao)}` : 'sem métricas'}</p>
              </div>
              <button className="icon-btn" aria-label="Excluir versão" onClick={async () => {
                if (!supabase) return
                const { error } = await supabase.from('tt_variantes').delete().eq('id', v.id)
                dbLog('DELETE', 'tt_variantes', error, v.id); recarregar()
              }}><Trash2 size={13} /></button>
            </div></li>
          )
        })}
      </ul>
      {comp && <div className="nota-regras"><strong>Comparação A × B:</strong> {comp.motivo}</div>}
      <form onSubmit={adicionar} className="toolbar">
        <select className="filtro" value={oQue} onChange={(e) => setOQue(e.target.value)} aria-label="O que muda">
          {['gancho', 'thumbnail', 'cta', 'duracao', 'musica', 'legenda', 'creator'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <input className="input-purion" style={{ flex: 1, minWidth: 180, height: 32 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`Versão ${String.fromCharCode(65 + variantes.length)}: o que muda?`} />
        <button className="btn btn-secondary btn-sm" disabled={!desc.trim()}><Plus size={13} /> Versão</button>
      </form>
    </div>
  )
}

function AbaArquivos({ video, assets, recarregar, salvar }: { video: Video; assets: Asset[]; recarregar: () => void; salvar: (d: Partial<Video>) => void }) {
  const { perfil } = useAuthContext()
  const socio = useSocioAtual()
  const toast = useToast()
  const [enviando, setEnviando] = useState(false)
  const [link, setLink] = useState('')
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let vivo = true
    Promise.all(assets.filter((a) => a.storagePath).map(async (a) => [a.id, await urlAssinada(a.storagePath!)] as const))
      .then((pares) => { if (vivo) setUrls(Object.fromEntries(pares.filter(([, u]) => u) as Array<[string, string]>)) })
    return () => { vivo = false }
  }, [assets])

  async function enviar(files: FileList | null) {
    const sb = supabase
    if (!sb || !files?.length) return
    if (!perfil?.tenant_id) { toast.error('Sessão sem empresa', 'Entre novamente para enviar arquivos'); return }
    setEnviando(true)
    for (const f of Array.from(files)) {
      if (f.size > 200 * 1024 * 1024) { toast.error(`${f.name} passa de 200 MB`); continue }
      const path = `${perfil.tenant_id}/${video.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`
      const { error: up } = await sb.storage.from(BUCKET_MIDIA).upload(path, f, { contentType: f.type })
      if (up) { toast.error('Falha no upload', up.message); continue }
      const tipo = f.type.startsWith('image/') ? (assets.some((a) => a.tipo === 'thumbnail') ? 'referencia' : 'thumbnail') : f.type.startsWith('video/') ? 'bruto' : 'outro'
      const { data, error } = await sb.from('tt_assets').insert({ video_id: video.id, tipo, nome: f.name, storage_path: path, mime: f.type, tamanho: f.size, enviado_por: socio }).select().single()
      dbLog('INSERT', 'tt_assets', error, data?.id)
      if (data && tipo === 'thumbnail' && !video.thumbnailPath) salvar({ thumbnailPath: path })
    }
    setEnviando(false)
    recarregar()
  }

  async function adicionarLink(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !/^https?:\/\//.test(link.trim())) { toast.error('Cole um link começando com https://'); return }
    const { error } = await supabase.from('tt_assets').insert({ video_id: video.id, tipo: 'referencia', nome: link.trim().slice(0, 120), url_externa: link.trim(), enviado_por: socio })
    dbLog('INSERT', 'tt_assets (link)', error)
    setLink(''); recarregar()
  }

  async function remover(a: Asset) {
    if (!supabase) return
    if (!(await confirmar({ titulo: `Remover ${a.nome}?`, mensagem: 'O arquivo é apagado do armazenamento.', rotuloConfirmar: 'Remover' }))) return
    if (a.storagePath) await supabase.storage.from(BUCKET_MIDIA).remove([a.storagePath])
    const { error } = await supabase.from('tt_assets').delete().eq('id', a.id)
    dbLog('DELETE', 'tt_assets', error, a.id)
    if (a.storagePath && a.storagePath === video.thumbnailPath) salvar({ thumbnailPath: null })
    recarregar()
  }

  return (
    <div className="dash-secao">
      <label className="tt-upload" data-enviando={enviando || undefined}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); enviar(e.dataTransfer.files) }}>
        <FileUp size={18} />
        <span>{enviando ? 'Enviando…' : 'Arraste vídeos, thumbnails ou referências — ou clique'}</span>
        <span className="caption">Armazenamento privado · até 200 MB por arquivo</span>
        <input type="file" multiple accept="video/*,image/*,application/pdf" hidden onChange={(e) => enviar(e.target.files)} />
      </label>
      <form onSubmit={adicionarLink} className="toolbar">
        <Link2 size={13} className="caption" />
        <input className="input-purion" style={{ flex: 1, height: 32 }} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link de referência (TikTok, Drive…)" />
        <button className="btn btn-secondary btn-sm" disabled={!link.trim()}>Adicionar</button>
      </form>
      <div className="tt-galeria">
        {assets.map((a) => {
          const url = a.urlExterna ?? urls[a.id]
          return (
            <figure key={a.id} className="tt-asset">
              <div className="tt-asset-midia">
                {url && a.mime?.startsWith('image/') ? <img src={url} alt={a.nome} />
                  : url && a.mime?.startsWith('video/') ? <video src={url} controls preload="metadata" />
                  : <ExternalLink size={20} />}
              </div>
              <figcaption>
                <span className="badge badge-neutral">{a.tipo}</span>
                <a href={url ?? '#'} target="_blank" rel="noreferrer" className="tt-asset-nome" title={a.nome}>{a.nome}</a>
                {a.mime?.startsWith('image/') && a.storagePath !== video.thumbnailPath &&
                  <button className="link-limpar" onClick={() => salvar({ thumbnailPath: a.storagePath })}>usar como capa</button>}
                <button className="icon-btn" aria-label="Remover" onClick={() => remover(a)}><Trash2 size={12} /></button>
              </figcaption>
            </figure>
          )
        })}
      </div>
      {assets.length === 0 && <p className="caption">Nenhum arquivo ainda.</p>}
    </div>
  )
}

function AbaPublicacao({ video, variantes }: { video: Video; variantes: Variante[] }) {
  const publicacoes = useTikTokStore((s) => s.publicacoes).filter((p) => p.videoId === video.id)
  const metricas = useTikTokStore((s) => s.metricas)
  const totais = useTotais().get(video.id)
  const toast = useToast()
  const [nova, setNova] = useState({ url: '', conta: '', cupom: '', data: hojeISO(), varianteId: '' })
  const [lancando, setLancando] = useState<string | null>(null)
  const [m, setM] = useState({ data: hojeISO(), views: '', likes: '', comentarios: '', compartilhamentos: '', salvos: '', conclusao: '', seguidores: '' })

  async function publicar(e: React.FormEvent) {
    e.preventDefault()
    const r = await criarPublicacao({ videoId: video.id, url: nova.url, conta: nova.conta, cupom: nova.cupom, varianteId: nova.varianteId || null, publicadoEm: `${nova.data}T12:00:00` , utmContent: video.codigo.toLowerCase() })
    if (!r.ok) { toast.error('Erro ao registrar publicação', r.erro); return }
    if (!['publicado', 'analisado'].includes(video.status)) await atualizarVideos([video.id], { status: 'publicado' })
    setNova({ url: '', conta: '', cupom: '', data: hojeISO(), varianteId: '' })
    toast.success('Publicação registrada', 'Lance as métricas quando tiver números')
  }

  async function salvarMetrica(e: React.FormEvent, publicacaoId: string) {
    e.preventDefault()
    const num = (s: string) => (s === '' ? undefined : Number(s.replace(/\./g, '').replace(',', '.')))
    const views = num(m.views)
    if (views == null || Number.isNaN(views) || views < 0) { toast.error('Informe as views'); return }
    const conclusao = num(m.conclusao)
    if (conclusao != null && (conclusao < 0 || conclusao > 100)) { toast.error('Conclusão deve estar entre 0 e 100%'); return }
    const r = await lancarMetrica({
      publicacaoId, dataReferencia: m.data, views, likes: num(m.likes), comentarios: num(m.comentarios),
      compartilhamentos: num(m.compartilhamentos), salvos: num(m.salvos), conclusaoPct: conclusao ?? null, seguidoresGanhos: num(m.seguidores) ?? null,
    })
    if (!r.ok) toast.error('Erro ao lançar métricas', r.erro)
    else { toast.success('Métricas salvas', 'Mesma data de novo = atualiza, não duplica'); setLancando(null) }
  }

  return (
    <div className="dash-secao">
      {totais && totais.views > 0 && (
        <div className="tt-numeros">
          <div><span className="kpi-label">Views</span><strong className="tnum">{fmtNum(totais.views)}</strong></div>
          <div><span className="kpi-label">Conclusão</span><strong className="tnum">{fmtPct(totais.conclusaoPct)}</strong></div>
          <div><span className="kpi-label">Engajamento</span><strong className="tnum">{fmtPct(totais.views ? ((totais.likes + totais.comentarios + totais.compartilhamentos + totais.salvos) / totais.views) * 100 : null)}</strong></div>
          <div><span className="kpi-label">Vendas</span><strong className="tnum">{totais.vendas}</strong></div>
        </div>
      )}
      <ul className="ficha-linha">
        {publicacoes.map((p) => {
          const hist = metricas.filter((x) => x.publicacaoId === p.id).sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia))
          return (
            <li key={p.id}>
              <div className="ficha-evento" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="toolbar">
                  <span className="badge badge-neutral">{p.tipo}</span>
                  <span className="caption">{fmtData(p.publicadoEm)}{p.conta ? ` · ${p.conta}` : ''}{p.cupom ? ` · cupom ${p.cupom}` : ''}</span>
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="link-limpar"><ExternalLink size={12} /> abrir</a>}
                  <span className="toolbar-espaco" />
                  <button className="btn btn-secondary btn-sm" onClick={() => setLancando(lancando === p.id ? null : p.id)}>Lançar métricas</button>
                  <button className="icon-btn" aria-label="Excluir publicação" onClick={async () => {
                    if (await confirmar({ titulo: 'Excluir publicação?', mensagem: 'As métricas dela também saem.', rotuloConfirmar: 'Excluir' })) await excluirPublicacao(p.id)
                  }}><Trash2 size={12} /></button>
                </div>
                {lancando === p.id && (
                  <form className="tt-grade tt-metricas-form" onSubmit={(e) => salvarMetrica(e, p.id)}>
                    <Campo label="Data"><input type="date" className="input-purion" value={m.data} max={hojeISO()} onChange={(e) => setM({ ...m, data: e.target.value })} /></Campo>
                    {([['views', 'Views*'], ['likes', 'Curtidas'], ['comentarios', 'Comentários'], ['compartilhamentos', 'Compart.'], ['salvos', 'Salvos'], ['conclusao', 'Conclusão %'], ['seguidores', 'Seguidores +']] as const).map(([c, l]) => (
                      <Campo key={c} label={l}><input inputMode="decimal" className="input-purion" value={m[c]} onChange={(e) => setM({ ...m, [c]: e.target.value })} /></Campo>
                    ))}
                    <button className="btn btn-accent btn-sm" style={{ alignSelf: 'end' }}>Salvar</button>
                  </form>
                )}
                {hist.length > 0 && (
                  <table className="tabela-compacta" style={{ marginTop: 6, fontSize: 12 }}>
                    <thead><tr><th>Data</th><th>Views</th><th>Conclusão</th><th>Curtidas</th><th>Origem</th></tr></thead>
                    <tbody>{hist.slice(0, 6).map((x) => <tr key={x.id}><td className="tnum">{fmtData(x.dataReferencia)}</td><td className="tnum">{fmtNum(x.views)}</td><td className="tnum">{fmtPct(x.conclusaoPct)}</td><td className="tnum">{fmtNum(x.likes)}</td><td>{x.origem}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <form onSubmit={publicar} className="card-purion" style={{ padding: 14, display: 'grid', gap: 10 }}>
        <p className="t-label">Registrar publicação</p>
        <div className="tt-grade">
          <Campo label="URL do TikTok" largura="1 / -1"><input className="input-purion" value={nova.url} onChange={(e) => setNova({ ...nova, url: e.target.value })} placeholder="https://www.tiktok.com/@conta/video/…" /></Campo>
          <Campo label="Data"><input type="date" className="input-purion" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} /></Campo>
          <Campo label="Conta"><input className="input-purion" value={nova.conta} onChange={(e) => setNova({ ...nova, conta: e.target.value })} placeholder="@purionbrasil" /></Campo>
          <Campo label="Cupom do vídeo"><input className="input-purion" value={nova.cupom} onChange={(e) => setNova({ ...nova, cupom: e.target.value })} placeholder="Para atribuir vendas" /></Campo>
          {variantes.length > 0 && (
            <Campo label="Versão">
              <select className="select-purion" value={nova.varianteId} onChange={(e) => setNova({ ...nova, varianteId: e.target.value })}>
                <option value="">Principal</option>{variantes.map((v) => <option key={v.id} value={v.id}>{v.rotulo} — {v.descricao}</option>)}
              </select>
            </Campo>
          )}
        </div>
        <p className="caption">UTM do link na bio para este vídeo: <code className="tnum">utm_source=tiktok&utm_content={video.codigo.toLowerCase()}</code></p>
        <button className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }}>Registrar publicação</button>
      </form>
    </div>
  )
}

function AbaVendas({ video }: { video: Video }) {
  const vendas = usePurionStore((s) => s.vendas)
  const atribuicoes = useTikTokStore((s) => s.atribuicoes)
  const publicacoes = useTikTokStore((s) => s.publicacoes).filter((p) => p.videoId === video.id)
  const colaboracoes = useTikTokStore((s) => s.colaboracoes)
  const socio = useSocioAtual()
  const toast = useToast()
  const [busca, setBusca] = useState('')

  const atribuidasAqui = atribuicoes.filter((a) => a.videoId === video.id)
  const jaAtribuidas = useMemo(() => new Set(atribuicoes.map((a) => a.vendaId)), [atribuicoes])
  const vendaPorId = new Map(vendas.map((v) => [v.id, v]))
  const valor = (v: (typeof vendas)[number]) => v.valorTotal ?? v.valorLiquido

  const cupons = new Set([
    ...publicacoes.map((p) => p.cupom?.toUpperCase()).filter(Boolean) as string[],
    ...colaboracoes.filter((c) => c.id === video.colaboracaoId && c.cupom).map((c) => c.cupom!.toUpperCase()),
  ])
  const porCupom = vendas.filter((v) => v.cupom && cupons.has(v.cupom.toUpperCase()) && v.statusPagamento === 'pago' && !jaAtribuidas.has(v.id))

  const candidatas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (q.length < 2) return []
    return vendas.filter((v) => !jaAtribuidas.has(v.id) && `${v.clienteNome} ${v.cupom ?? ''} ${v.pedidoAppmax ?? ''}`.toLowerCase().includes(q)).slice(0, 8)
  }, [busca, vendas, jaAtribuidas])

  const atribuir = async (ids: string[], metodo: 'cupom' | 'manual') => {
    const r = await atribuirVendas(ids.map((id) => {
      const v = vendaPorId.get(id)!
      return { vendaId: id, videoId: video.id, publicacaoId: publicacoes[0]?.id ?? null, campanhaId: video.campanhaId, creatorId: video.creatorId,
        metodo, valor: valor(v), confianca: metodo === 'cupom' ? 'alta' : 'baixa' } as const
    }), socio)
    if (!r.ok) toast.error('Erro ao atribuir', r.erro); else toast.success(`${r.data} venda(s) atribuída(s)`, 'Cada venda só pode ter uma atribuição')
    setBusca('')
  }

  const total = atribuidasAqui.reduce((s, a) => s + a.valor, 0)
  return (
    <div className="dash-secao">
      <div className="tt-numeros">
        <div><span className="kpi-label">Vendas atribuídas</span><strong className="tnum">{atribuidasAqui.length}</strong></div>
        <div><span className="kpi-label">Receita</span><strong className="tnum">{fmtMoeda(total)}</strong></div>
        <div><span className="kpi-label">Custo do vídeo</span><strong className="tnum">{fmtMoeda(video.custoProducao)}</strong></div>
      </div>
      {porCupom.length > 0 && (
        <div className="nota-regras toolbar">
          <span>{porCupom.length} venda(s) paga(s) com o cupom {[...cupons].join(', ')} ainda sem atribuição.</span>
          <button className="btn btn-accent btn-sm" onClick={() => atribuir(porCupom.map((v) => v.id), 'cupom')}>Atribuir por cupom</button>
        </div>
      )}
      <ul className="ficha-linha">
        {atribuidasAqui.map((a) => {
          const v = vendaPorId.get(a.vendaId)
          return (
            <li key={a.id}><div className="ficha-evento">
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13 }}>{v?.clienteNome ?? 'Venda'} · <span className="tnum">{fmtMoeda(a.valor)}</span></p>
                <p className="caption">{v ? fmtData(v.dataVenda) : ''} · {a.metodo} · confiança {a.confianca}</p>
              </div>
              <button className="icon-btn" aria-label="Remover atribuição" onClick={() => removerAtribuicao(a.id)}><X size={12} /></button>
            </div></li>
          )
        })}
      </ul>
      <div>
        <label className="busca" style={{ width: '100%' }}><Plus size={13} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Atribuir venda existente: buscar cliente, cupom ou pedido" /></label>
        {candidatas.map((v) => (
          <button key={v.id} className="opcao-linha" onClick={() => atribuir([v.id], 'manual')}>
            <span>{v.clienteNome}</span><span className="caption tnum">{fmtData(v.dataVenda)} · {fmtMoeda(valor(v))}{v.cupom ? ` · ${v.cupom}` : ''}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AbaHistorico({ historico }: { historico: HistoricoItem[] }) {
  if (!historico.length) return <p className="caption">Sem histórico ainda.</p>
  return (
    <ul className="ficha-linha">
      {historico.map((h) => (
        <li key={h.id}><div className="ficha-evento">
          <span className="ficha-icone">{h.comentario === 'aprovado' ? <ShieldCheck size={12} /> : <Check size={12} />}</span>
          <div>
            <p style={{ fontSize: 13 }}>
              {h.deStatus ? <>{STATUS_INFO[h.deStatus as StatusVideo]?.label ?? h.deStatus} → </> : 'Criado em '}
              <strong>{STATUS_INFO[h.paraStatus as StatusVideo]?.label ?? h.paraStatus}</strong>
              {h.comentario === 'aprovado' && ' · aprovado'}
            </p>
            <p className="caption">{nomePessoa(h.autor)} · {new Date(h.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div></li>
      ))}
    </ul>
  )
}


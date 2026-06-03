'use client'

import { useState, useMemo, useCallback } from 'react'
import { useMobile } from '@/hooks/useMobile'
import dynamic from 'next/dynamic'
import {
  Plus, X, ChevronRight, ExternalLink, Copy, Check,
  AtSign, Users, Star, MessageSquare, Trash2,
} from 'lucide-react'
import { useMarketing } from '@/hooks/useMarketing'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  usePurionStore,
  type Creator,
  type CampanhaCreators,
  type StatusCreator,
  type PerfilUsuario,
  type SKUProduto,
  type TipoAcordoCreator,
} from '@/store'
import type { RoiPlataformaData, NichoData } from './CreatorsGraficos'

const GraficoRoiPlataforma = dynamic(
  () => import('./CreatorsGraficos').then((m) => ({ default: m.GraficoRoiPlataforma })),
  { ssr: false, loading: () => <div className="h-[220px] bg-[var(--bg-surface-2)] rounded-lg animate-pulse" /> }
)
const GraficoNicho = dynamic(
  () => import('./CreatorsGraficos').then((m) => ({ default: m.GraficoNicho })),
  { ssr: false, loading: () => <div className="h-[220px] bg-[var(--bg-surface-2)] rounded-lg animate-pulse" /> }
)

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const DATA_REF = new Date('2024-02-12T12:00:00Z')

type TabId = 'overview' | 'pipeline' | 'campanhas' | 'analise'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'pipeline',   label: 'Pipeline' },
  { id: 'campanhas',  label: 'Campanhas' },
  { id: 'analise',    label: 'Análise' },
]

const PIPELINE_COLS: { status: StatusCreator[]; label: string; cor: string }[] = [
  { status: ['contatado'],           label: 'Identificado',      cor: '#6B6B6B' },
  { status: ['negociando'],          label: 'Abordado',          cor: '#3B82F6' },
  { status: ['kit_enviado'],         label: 'Kit Enviado',       cor: '#C9A84C' },
  { status: ['postado', 'pago'],     label: 'Publicou',          cor: '#10B981' },
  { status: ['parceiro_recorrente'], label: 'Parceiro',          cor: '#8B5CF6' },
  { status: ['descartado', 'inativo'], label: 'Descartado',      cor: '#EF4444' },
]

const PIPELINE_NEXT: Partial<Record<StatusCreator, StatusCreator>> = {
  contatado:   'negociando',
  negociando:  'kit_enviado',
  kit_enviado: 'postado',
  postado:     'parceiro_recorrente',
  pago:        'parceiro_recorrente',
}

const SCORE_COLOR: Record<string, string> = {
  A: 'badge-success',
  B: 'badge-info',
  C: 'badge-warning',
  D: 'badge-danger',
}

const STATUS_BADGE: Record<StatusCreator, string> = {
  contatado:           'badge-neutral',
  negociando:          'badge-info',
  kit_enviado:         'badge-gold',
  postado:             'badge-success',
  pago:                'badge-success',
  parceiro_recorrente: 'badge',
  descartado:          'badge-danger',
  inativo:             'badge-neutral',
}

const STATUS_LABEL: Record<StatusCreator, string> = {
  contatado:           'Identificado',
  negociando:          'Abordado',
  kit_enviado:         'Kit Enviado',
  postado:             'Publicou',
  pago:                'Pago',
  parceiro_recorrente: 'Parceiro',
  descartado:          'Descartado',
  inativo:             'Inativo',
}

const PLAT_COLOR: Record<string, string> = {
  instagram: 'text-pink-400 bg-pink-400/10',
  tiktok:    'text-sky-400 bg-sky-400/10',
  youtube:   'text-red-400 bg-red-400/10',
}

const CAMP_STATUS_BADGE: Record<CampanhaCreators['status'], string> = {
  planejamento: 'badge-neutral',
  ativa:        'badge-success',
  encerrada:    'badge-neutral',
  pausada:      'badge-warning',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fmtR = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function fmtSeg(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function calcularScore(c: Creator): 'A' | 'B' | 'C' | 'D' {
  if (c.status === 'kit_enviado' && c.postagens.length === 0) return 'D'
  if (c.postagens.length === 0) return 'C'
  const receitaTotal = c.postagens.reduce((s, p) => s + p.receitaGerada, 0)
  const roi = c.cacheCombinado > 0 ? receitaTotal / c.cacheCombinado : 0
  const recente = c.postagens.some((p) => {
    const dias = (DATA_REF.getTime() - new Date(p.data + (p.data.includes('T') ? '' : 'T12:00:00Z')).getTime()) / 86400000
    return dias <= 15
  })
  if (roi > 3 && recente) return 'A'
  if (roi >= 1.5) return 'B'
  return 'C'
}

function calcularROI(c: Creator): number {
  if (c.cacheCombinado <= 0) return 0
  return c.postagens.reduce((s, p) => s + p.receitaGerada, 0) / c.cacheCombinado
}

function calcularTemperatura(c: Creator): 'quente' | 'morno' | 'frio' {
  if (!c.ultimoContato) return 'frio'
  const dias = (DATA_REF.getTime() - new Date(c.ultimoContato).getTime()) / 86400000
  if (dias <= 3) return 'quente'
  if (dias <= 7) return 'morno'
  return 'frio'
}

function gerarCodigo(nome: string, existentes: string[]): string {
  const prefix = nome.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  let num = 1
  while (existentes.includes(`PURION-${prefix}-${String(num).padStart(3, '0')}`)) num++
  return `PURION-${prefix}-${String(num).padStart(3, '0')}`
}

function diasDesdeContato(c: Creator): number | null {
  if (!c.ultimoContato) return null
  return Math.round((DATA_REF.getTime() - new Date(c.ultimoContato).getTime()) / 86400000)
}

// ─────────────────────────────────────────────
// MODAL NOVO CREATOR
// ─────────────────────────────────────────────

function ModalCreator({ onSalvar, onFechar }: {
  onSalvar: (c: Creator) => void
  onFechar: () => void
}) {
  const { creators } = usePurionStore()
  const [f, setF] = useState({
    nome: '', instagram: '', tiktok: '', youtube: '',
    seguidores: '', nicho: '', cidade: '', email: '', whatsapp: '',
    status: 'contatado' as StatusCreator,
    cache: '', tipoAcordo: 'permuta' as TipoAcordoCreator,
    responsavel: 'joao' as PerfilUsuario,
    engajamento: '', notas: '',
  })

  const submit = () => {
    if (!f.nome || !f.instagram) return
    const existentes = creators.map((c) => c.codigoDesconto ?? '')
    const codigo = gerarCodigo(f.nome, existentes)
    const creator: Creator = {
      id: `cre-${Date.now()}`,
      nome: f.nome,
      instagram: f.instagram,
      tiktok: f.tiktok || undefined,
      youtube: f.youtube || undefined,
      email: f.email || undefined,
      whatsapp: f.whatsapp || undefined,
      cidade: f.cidade || undefined,
      seguidores: parseInt(f.seguidores) || 0,
      nichoPrincipal: f.nicho,
      status: f.status,
      cacheCombinado: parseFloat(f.cache) || 0,
      tipoAcordo: f.tipoAcordo,
      codigoDesconto: codigo,
      engajamentoMedio: parseFloat(f.engajamento) || undefined,
      produtosEnviados: [],
      postagens: [],
      roi: 0,
      createdAt: DATA_REF.toISOString(),
      responsavel: f.responsavel,
      notas: f.notas,
    }
    onSalvar(creator)
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Novo Creator</h3>
        </div>
        <div className="p-7 grid grid-cols-2 gap-3">
          <div className="col-span-2 field-gap">
            <label className="label-purion">Nome *</label>
            <input className="input-purion" placeholder="ex: Lucas Automania" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Instagram *</label>
            <input className="input-purion" placeholder="@usuario" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">TikTok</label>
            <input className="input-purion" placeholder="@usuario" value={f.tiktok} onChange={(e) => setF({ ...f, tiktok: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">YouTube</label>
            <input className="input-purion" placeholder="@canal" value={f.youtube} onChange={(e) => setF({ ...f, youtube: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Seguidores</label>
            <input type="number" className="input-purion" placeholder="0" value={f.seguidores} onChange={(e) => setF({ ...f, seguidores: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Nicho</label>
            <input className="input-purion" placeholder="ex: Automotivo" value={f.nicho} onChange={(e) => setF({ ...f, nicho: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Cidade</label>
            <input className="input-purion" placeholder="Brasília" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">E-mail</label>
            <input type="email" className="input-purion" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">WhatsApp</label>
            <input className="input-purion" placeholder="(61) 99999-0000" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Cachê (R$)</label>
            <input type="number" className="input-purion" placeholder="0" value={f.cache} onChange={(e) => setF({ ...f, cache: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Tipo de acordo</label>
            <select className="select-purion" value={f.tipoAcordo} onChange={(e) => setF({ ...f, tipoAcordo: e.target.value as TipoAcordoCreator })}>
              <option value="permuta">Permuta</option>
              <option value="pago">Pago</option>
              <option value="afiliado">Afiliado</option>
            </select>
          </div>
          <div className="field-gap">
            <label className="label-purion">Status</label>
            <select className="select-purion" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as StatusCreator })}>
              <option value="contatado">Identificado</option>
              <option value="negociando">Abordado</option>
              <option value="kit_enviado">Kit Enviado</option>
              <option value="postado">Publicou</option>
              <option value="pago">Pago</option>
              <option value="parceiro_recorrente">Parceiro</option>
            </select>
          </div>
          <div className="field-gap">
            <label className="label-purion">Engajamento médio %</label>
            <input type="number" className="input-purion" placeholder="3.5" value={f.engajamento} onChange={(e) => setF({ ...f, engajamento: e.target.value })} />
          </div>
          <div className="field-gap">
            <label className="label-purion">Responsável</label>
            <select className="select-purion" value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value as PerfilUsuario })}>
              <option value="joao">João</option>
              <option value="matheus">Matheus</option>
              <option value="gabriel">Gabriel</option>
            </select>
          </div>
          <div className="col-span-2 field-gap">
            <label className="label-purion">Notas</label>
            <textarea rows={2} className="textarea-purion" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={submit} className="btn btn-primary btn-sm">Adicionar</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL NOVA CAMPANHA
// ─────────────────────────────────────────────

function ModalCampanha({ onSalvar, onFechar }: {
  onSalvar: (c: CampanhaCreators) => void
  onFechar: () => void
}) {
  const { creators } = usePurionStore()
  const [f, setF] = useState({
    nome: '', produto: 'noir' as SKUProduto,
    dataInicio: '2024-02-12', dataFim: '2024-03-12',
    orcamento: '', metaPublicacoes: '', metaAlcance: '', metaVendas: '',
    creatorsIds: [] as string[],
  })

  const toggleCreator = (id: string) =>
    setF((p) => ({
      ...p,
      creatorsIds: p.creatorsIds.includes(id)
        ? p.creatorsIds.filter((x) => x !== id)
        : [...p.creatorsIds, id],
    }))

  const submit = () => {
    if (!f.nome) return
    const campanha: CampanhaCreators = {
      id: `camp-${Date.now()}`,
      nome: f.nome,
      produto: f.produto,
      dataInicio: f.dataInicio,
      dataFim: f.dataFim,
      orcamentoTotal: parseFloat(f.orcamento) || 0,
      creatorsIds: f.creatorsIds,
      metaPublicacoes: parseInt(f.metaPublicacoes) || 0,
      metaAlcance: parseInt(f.metaAlcance) || 0,
      metaVendas: parseInt(f.metaVendas) || 0,
      publicacoesRealizadas: 0,
      alcanceReal: 0,
      vendasPorCodigo: 0,
      roiFinal: 0,
      status: 'planejamento',
      createdAt: DATA_REF.toISOString(),
    }
    onSalvar(campanha)
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nova Campanha</h3>
        </div>
        <div className="p-7 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 field-gap">
              <label className="label-purion">Nome da campanha *</label>
              <input className="input-purion" placeholder="ex: Lançamento NOIR Verão" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            </div>
            <div className="field-gap">
              <label className="label-purion">Produto</label>
              <select className="select-purion" value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value as SKUProduto })}>
                <option value="noir">NOIR</option>
                <option value="urban">URBAN</option>
                <option value="coastal">COASTAL</option>
              </select>
            </div>
            <div className="field-gap">
              <label className="label-purion">Orçamento total (R$)</label>
              <input type="number" className="input-purion" placeholder="0" value={f.orcamento} onChange={(e) => setF({ ...f, orcamento: e.target.value })} />
            </div>
            <div className="field-gap">
              <label className="label-purion">Data início</label>
              <input type="date" className="input-purion" value={f.dataInicio} onChange={(e) => setF({ ...f, dataInicio: e.target.value })} />
            </div>
            <div className="field-gap">
              <label className="label-purion">Data fim</label>
              <input type="date" className="input-purion" value={f.dataFim} onChange={(e) => setF({ ...f, dataFim: e.target.value })} />
            </div>
            <div className="field-gap">
              <label className="label-purion">Meta publicações</label>
              <input type="number" className="input-purion" placeholder="10" value={f.metaPublicacoes} onChange={(e) => setF({ ...f, metaPublicacoes: e.target.value })} />
            </div>
            <div className="field-gap">
              <label className="label-purion">Alcance alvo</label>
              <input type="number" className="input-purion" placeholder="100000" value={f.metaAlcance} onChange={(e) => setF({ ...f, metaAlcance: e.target.value })} />
            </div>
            <div className="col-span-2 field-gap">
              <label className="label-purion">Meta vendas por código</label>
              <input type="number" className="input-purion" placeholder="50" value={f.metaVendas} onChange={(e) => setF({ ...f, metaVendas: e.target.value })} />
            </div>
          </div>

          {creators.length > 0 && (
            <div className="field-gap">
              <label className="label-purion mb-2">Creators vinculados</label>
              <div className="flex flex-wrap gap-2">
                {creators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCreator(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      f.creatorsIds.includes(c.id)
                        ? 'bg-[rgba(201,168,76,0.15)] border-[#C9A84C]/40 text-[#C9A84C]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={submit} className="btn btn-primary btn-sm">Criar campanha</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DRAWER PERFIL
// ─────────────────────────────────────────────

function DrawerPerfil({ creatorId, onClose, onDeletar }: { creatorId: string; onClose: () => void; onDeletar: (c: Creator) => void }) {
  const { creators, atualizarCreator } = usePurionStore()
  const creator = creators.find((c) => c.id === creatorId)
  const [notas, setNotas] = useState(creator?.notas ?? '')
  const [editingNotas, setEditingNotas] = useState(false)
  const [showAddPost, setShowAddPost] = useState(false)
  const [copied, setCopied] = useState(false)
  const [postForm, setPostForm] = useState({
    plataforma: 'instagram' as 'instagram' | 'tiktok' | 'youtube',
    data: '2024-02-12', url: '', alcance: '', views: '', likes: '', comentarios: '',
    vendasGeradas: '', receitaGerada: '',
  })

  if (!creator) return null

  const receitaAtribuida = creator.postagens.reduce((s, p) => s + p.receitaGerada, 0)
  const roi = calcularROI(creator)
  const score = calcularScore(creator)

  const copiarCodigo = () => {
    if (creator.codigoDesconto) {
      navigator.clipboard.writeText(creator.codigoDesconto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const salvarNotas = () => {
    atualizarCreator(creator.id, { notas })
    setEditingNotas(false)
  }

  const adicionarPostagem = () => {
    const nova = {
      plataforma: postForm.plataforma,
      data: postForm.data,
      url: postForm.url || undefined,
      alcance: parseInt(postForm.alcance) || 0,
      engajamento: 0,
      views: parseInt(postForm.views) || undefined,
      likes: parseInt(postForm.likes) || undefined,
      comentarios: parseInt(postForm.comentarios) || undefined,
      vendasGeradas: parseInt(postForm.vendasGeradas) || 0,
      receitaGerada: parseFloat(postForm.receitaGerada) || 0,
      codigoCupom: creator.codigoDesconto,
    }
    atualizarCreator(creator.id, { postagens: [...creator.postagens, nova] })
    setShowAddPost(false)
    setPostForm({ plataforma: 'instagram', data: '2024-02-12', url: '', alcance: '', views: '', likes: '', comentarios: '', vendasGeradas: '', receitaGerada: '' })
  }

  const plataformasPrincipais = [
    creator.instagram && 'instagram',
    creator.tiktok && 'tiktok',
    creator.youtube && 'youtube',
  ].filter(Boolean) as string[]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-[480px] z-50 flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="section-title">{creator.nome}</h2>
              <span className={`badge ${SCORE_COLOR[score]}`}>Score {score}</span>
              <span className={`badge ${STATUS_BADGE[creator.status]}`}>{STATUS_LABEL[creator.status]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {plataformasPrincipais.map((p) => (
                <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR[p]}`}>{p}</span>
              ))}
              {creator.cidade && <span className="caption">{creator.cidade}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <button
              onClick={() => onDeletar(creator)}
              className="p-1.5 rounded-lg hover:bg-[rgba(232,82,56,0.1)] text-[#6B6B6B] hover:text-[#E85238] transition-colors"
              title="Excluir creator"
            ><Trash2 size={13} /></button>
            <button onClick={onClose} className="icon-btn"><X size={14} /></button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3 p-6 border-b border-[var(--border)]">
            {[
              { label: 'Seguidores',      value: fmtSeg(creator.seguidores) },
              { label: 'Engaj. médio',    value: creator.engajamentoMedio ? `${creator.engajamentoMedio}%` : '—' },
              { label: 'Views médias',    value: creator.viewsMedias ? fmtSeg(creator.viewsMedias) : '—' },
              { label: 'ROI',             value: roi > 0 ? `${roi.toFixed(1)}×` : '—' },
              { label: 'Receita atribuída', value: fmtR(receitaAtribuida) },
              { label: 'Publicações',     value: String(creator.postagens.length) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[var(--bg-surface-2)] rounded-lg p-3">
                <p className="kpi-label">{label}</p>
                <p className="text-[15px] font-semibold text-[var(--text-primary)] mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Acordo + código */}
          <div className="p-6 border-b border-[var(--border)]">
            <p className="kpi-label mb-3">Acordo & Código</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="caption">Tipo: </span>
                <span className="text-[var(--text-primary)] capitalize">{creator.tipoAcordo ?? '—'}</span>
              </div>
              <div>
                <span className="caption">Cachê: </span>
                <span className="text-[var(--text-primary)]">{creator.cacheCombinado > 0 ? fmtR(creator.cacheCombinado) : 'Permuta'}</span>
              </div>
            </div>
            {creator.codigoDesconto && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-[rgba(201,168,76,0.08)] border border-[#C9A84C]/20 rounded-lg">
                <span className="font-mono text-[13px] font-semibold text-[#C9A84C] flex-1">{creator.codigoDesconto}</span>
                <button onClick={copiarCodigo} className="icon-btn" title="Copiar código">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="p-6 border-b border-[var(--border)]">
            <p className="kpi-label mb-3">Contato</p>
            <div className="flex flex-col gap-1.5 text-sm">
              {creator.instagram && (
                <div className="flex items-center gap-2">
                  <AtSign size={13} className="text-pink-400 shrink-0" />
                  <span className="text-[var(--text-primary)]">{creator.instagram}</span>
                </div>
              )}
              {creator.email && (
                <div className="flex items-center gap-2">
                  <span className="caption">Email:</span>
                  <span className="text-[var(--text-primary)]">{creator.email}</span>
                </div>
              )}
              {creator.whatsapp && (
                <div className="flex items-center gap-2">
                  <span className="caption">WhatsApp:</span>
                  <span className="text-[var(--text-primary)]">{creator.whatsapp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Publicações */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <p className="kpi-label">Publicações ({creator.postagens.length})</p>
              <button onClick={() => setShowAddPost((v) => !v)} className="btn btn-secondary btn-sm">
                <Plus size={11} /> Registrar
              </button>
            </div>

            {showAddPost && (
              <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-4 mb-3 grid grid-cols-2 gap-2">
                <div className="field-gap">
                  <label className="label-purion">Plataforma</label>
                  <select className="select-purion" value={postForm.plataforma} onChange={(e) => setPostForm({ ...postForm, plataforma: e.target.value as 'instagram' | 'tiktok' | 'youtube' })}>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="field-gap">
                  <label className="label-purion">Data</label>
                  <input type="date" className="input-purion" value={postForm.data} onChange={(e) => setPostForm({ ...postForm, data: e.target.value })} />
                </div>
                <div className="col-span-2 field-gap">
                  <label className="label-purion">URL do post</label>
                  <input className="input-purion" placeholder="https://..." value={postForm.url} onChange={(e) => setPostForm({ ...postForm, url: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Alcance</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.alcance} onChange={(e) => setPostForm({ ...postForm, alcance: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Views</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.views} onChange={(e) => setPostForm({ ...postForm, views: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Likes</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.likes} onChange={(e) => setPostForm({ ...postForm, likes: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Comentários</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.comentarios} onChange={(e) => setPostForm({ ...postForm, comentarios: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Vendas por código</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.vendasGeradas} onChange={(e) => setPostForm({ ...postForm, vendasGeradas: e.target.value })} />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Receita gerada (R$)</label>
                  <input type="number" className="input-purion" placeholder="0" value={postForm.receitaGerada} onChange={(e) => setPostForm({ ...postForm, receitaGerada: e.target.value })} />
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-1">
                  <button onClick={() => setShowAddPost(false)} className="btn btn-secondary btn-sm">Cancelar</button>
                  <button onClick={adicionarPostagem} className="btn btn-primary btn-sm">Salvar</button>
                </div>
              </div>
            )}

            {creator.postagens.length === 0 ? (
              <p className="caption text-center py-4">Sem publicações registradas</p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...creator.postagens].sort((a, b) => b.data.localeCompare(a.data)).map((p, i) => (
                  <div key={i} className="bg-[var(--bg-surface-2)] rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR[p.plataforma]}`}>{p.plataforma}</span>
                      <span className="caption">{new Date(p.data + (p.data.includes('T') ? '' : 'T12:00:00Z')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span><span className="caption">Alcance </span><span className="text-[var(--text-primary)] font-medium">{fmtSeg(p.alcance)}</span></span>
                      {p.views && <span><span className="caption">Views </span><span className="text-[var(--text-primary)] font-medium">{fmtSeg(p.views)}</span></span>}
                      <span><span className="caption">Vendas </span><span className="text-[var(--text-primary)] font-medium">{p.vendasGeradas}</span></span>
                      <span><span className="text-emerald-400 font-medium">{fmtR(p.receitaGerada)}</span></span>
                    </div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#C9A84C] mt-1 hover:underline">
                        <ExternalLink size={10} /> Ver post
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="kpi-label">Notas internas</p>
              {!editingNotas
                ? <button onClick={() => setEditingNotas(true)} className="btn btn-secondary btn-sm">Editar</button>
                : <button onClick={salvarNotas} className="btn btn-primary btn-sm">Salvar</button>
              }
            </div>
            {editingNotas
              ? <textarea rows={4} className="textarea-purion" value={notas} onChange={(e) => setNotas(e.target.value)} />
              : <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{creator.notas || <span className="caption">Sem notas.</span>}</p>
            }
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// ABA OVERVIEW
// ─────────────────────────────────────────────

function AbaOverview({ onSelectCreator }: { onSelectCreator: (id: string) => void }) {
  const { creators } = usePurionStore()
  const isMobile = useMobile()
  const [sort, setSort] = useState<'score' | 'roi' | 'seguidores'>('score')

  const hoje = DATA_REF
  const mesAtual = hoje.toISOString().slice(0, 7)

  const kpis = useMemo(() => {
    const ativos = creators.filter((c) =>
      c.postagens.some((p) => {
        const d = new Date(p.data + (p.data.includes('T') ? '' : 'T12:00:00Z'))
        const diff = (hoje.getTime() - d.getTime()) / 86400000
        return diff <= 30
      })
    )
    const alcanceTotal = creators.reduce((s, c) => s + c.seguidores, 0)
    const postsMes = creators.reduce((s, c) =>
      s + c.postagens.filter((p) => p.data.startsWith(mesAtual)).length, 0
    )
    const totalInvestido = creators.reduce((s, c) => s + c.cacheCombinado, 0)
    const totalReceita = creators.reduce((s, c) => s + c.postagens.reduce((ss, p) => ss + p.receitaGerada, 0), 0)
    const roiMedio = totalInvestido > 0 ? totalReceita / totalInvestido : 0
    const custoPorAlcance = alcanceTotal > 0 ? (totalInvestido / (alcanceTotal / 1000)) : 0
    return { total: creators.length, ativos: ativos.length, alcanceTotal, postsMes, roiMedio, custoPorAlcance }
  }, [creators, hoje, mesAtual])

  const creatorsOrdenados = useMemo(() => {
    return [...creators].sort((a, b) => {
      if (sort === 'score') {
        const order = { A: 0, B: 1, C: 2, D: 3 }
        return order[calcularScore(a)] - order[calcularScore(b)]
      }
      if (sort === 'roi') return calcularROI(b) - calcularROI(a)
      return b.seguidores - a.seguidores
    })
  }, [creators, sort])

  const ultimaPost = (c: Creator) => {
    const datas = c.postagens.map((p) => p.data).sort().reverse()
    if (!datas.length) return '—'
    const d = datas[0]
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00Z')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
  }

  const KPI_ITEMS = [
    { label: 'Total na base',         value: String(kpis.total) },
    { label: 'Ativos (30 dias)',       value: String(kpis.ativos) },
    { label: 'Alcance total',          value: fmtSeg(kpis.alcanceTotal) },
    { label: 'Posts no mês',           value: String(kpis.postsMes) },
    { label: 'ROI médio',              value: kpis.roiMedio > 0 ? `${kpis.roiMedio.toFixed(1)}×` : '—' },
    { label: 'Custo / 1k seguidores',  value: kpis.custoPorAlcance > 0 ? fmtR(kpis.custoPorAlcance) : '—' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_ITEMS.map(({ label, value }) => (
          <div key={label} className="kpi-card">
            <p className="kpi-label">{label}</p>
            <p className="kpi-value mt-2">{value}</p>
          </div>
        ))}
      </div>

      {/* Creators list — table on desktop, cards on mobile */}
      <div className="card-purion overflow-hidden">
        <div className="card-header">
          <p className="section-title">Creators</p>
          <div className="flex items-center gap-2">
            <span className="caption">Ordenar:</span>
            {(['score', 'roi', 'seguidores'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`btn btn-sm ${sort === s ? 'btn-primary' : 'btn-secondary'}`}
              >
                {s === 'seguidores' ? 'Alcance' : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isMobile ? (
          <div className="divide-y divide-[var(--border)]">
            {creatorsOrdenados.length === 0 && (
              <div className="empty-state py-12">
                <Users size={28} className="mx-auto mb-3 opacity-30" />
                <p>Nenhum creator cadastrado</p>
              </div>
            )}
            {creatorsOrdenados.map((c) => {
              const score = calcularScore(c)
              const roi = calcularROI(c)
              const plats = [c.instagram && 'instagram', c.tiktok && 'tiktok', c.youtube && 'youtube'].filter(Boolean) as string[]
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => onSelectCreator(c.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{c.nome}</p>
                      <span className={`badge text-[9px] ${SCORE_COLOR[score]}`}>{score}</span>
                      <span className={`badge text-[9px] ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {plats.map((p) => <span key={p} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR[p]}`}>{p.slice(0, 2).toUpperCase()}</span>)}
                      <span className="caption text-[10px]">{fmtSeg(c.seguidores)} · {c.nichoPrincipal}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-emerald-400">{roi > 0 ? `${roi.toFixed(1)}×` : '—'}</p>
                    <p className="caption text-[10px]">{ultimaPost(c)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <table className="table-purion">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Plataforma</th>
                <th>Seguidores</th>
                <th>Nicho</th>
                <th>Score</th>
                <th>Status</th>
                <th>Última pub.</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {creatorsOrdenados.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12"><div className="empty-state"><Users size={28} className="mx-auto mb-3 opacity-30" /><p>Nenhum creator cadastrado</p></div></td></tr>
              )}
              {creatorsOrdenados.map((c) => {
                const score = calcularScore(c)
                const roi = calcularROI(c)
                const plats = [c.instagram && 'instagram', c.tiktok && 'tiktok', c.youtube && 'youtube'].filter(Boolean) as string[]
                return (
                  <tr key={c.id} className="cursor-pointer" onClick={() => onSelectCreator(c.id)}>
                    <td className="font-medium">{c.nome}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {plats.map((p) => <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR[p]}`}>{p.slice(0, 2).toUpperCase()}</span>)}
                      </div>
                    </td>
                    <td>{fmtSeg(c.seguidores)}</td>
                    <td className="caption">{c.nichoPrincipal}</td>
                    <td><span className={`badge ${SCORE_COLOR[score]}`}>{score}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span></td>
                    <td className="caption">{ultimaPost(c)}</td>
                    <td className="td-mono">{roi > 0 ? `${roi.toFixed(1)}×` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ABA PIPELINE
// ─────────────────────────────────────────────

function AbaPipeline() {
  const { creators, atualizarCreator } = usePurionStore()
  const [contatoCreatorId, setContatoCreatorId] = useState<string | null>(null)
  const [notaContato, setNotaContato] = useState('')

  const registrarContato = () => {
    if (!contatoCreatorId) return
    const c = creators.find((x) => x.id === contatoCreatorId)!
    const novaNotas = notaContato ? `[${DATA_REF.toLocaleDateString('pt-BR')}] ${notaContato}\n${c.notas}` : c.notas
    atualizarCreator(contatoCreatorId, {
      ultimoContato: DATA_REF.toISOString(),
      notas: novaNotas,
    })
    setContatoCreatorId(null)
    setNotaContato('')
  }

  const moverProximaFase = useCallback((creator: Creator) => {
    const next = PIPELINE_NEXT[creator.status]
    if (next) atualizarCreator(creator.id, { status: next })
  }, [atualizarCreator])

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {PIPELINE_COLS.map((col) => {
            const cards = creators.filter((c) => col.status.includes(c.status))
            return (
              <div key={col.label} style={{ width: 220 }} className="flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.cor }} />
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">{col.label}</span>
                  </div>
                  <span className="text-[11px] caption">{cards.length}</span>
                </div>

                {/* Cards */}
                {cards.map((c) => {
                  const temp = calcularTemperatura(c)
                  const dias = diasDesdeContato(c)
                  const score = calcularScore(c)
                  const tempColor = temp === 'quente' ? '#10B981' : temp === 'morno' ? '#F59E0B' : '#EF4444'
                  const hasNext = !!PIPELINE_NEXT[c.status]
                  return (
                    <div key={c.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2 hover:border-[#C9A84C]/40 transition-colors">
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight">{c.nome}</p>
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: tempColor }} title={`Temperatura: ${temp}`} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.instagram && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR.instagram}`}>IG</span>}
                        {c.tiktok && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${PLAT_COLOR.tiktok}`}>TT</span>}
                        <span className="caption text-[10px]">{fmtSeg(c.seguidores)}</span>
                        <span className={`badge text-[9px] py-0 ${SCORE_COLOR[score]}`}>{score}</span>
                      </div>
                      {dias !== null && (
                        <p className="caption text-[10px]">
                          Último contato: <span style={{ color: tempColor }}>{dias === 0 ? 'hoje' : `${dias}d atrás`}</span>
                        </p>
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => { setContatoCreatorId(c.id); setNotaContato('') }}
                          className="flex-1 text-[10px] py-1 px-2 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors"
                        >
                          <MessageSquare size={10} className="inline mr-1" />
                          Contato
                        </button>
                        {hasNext && (
                          <button
                            onClick={() => moverProximaFase(c)}
                            className="flex-1 text-[10px] py-1 px-2 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors"
                          >
                            Avançar <ChevronRight size={10} className="inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
                    <p className="caption text-[11px]">Vazio</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mini modal registrar contato */}
      {contatoCreatorId && (
        <div className="modal-backdrop" onClick={() => setContatoCreatorId(null)}>
          <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Contato</h3>
            </div>
            <div className="p-7 field-gap">
              <label className="label-purion">Nota (opcional)</label>
              <textarea
                rows={3}
                className="textarea-purion"
                placeholder="Ex: Enviou DM, aguardando resposta..."
                value={notaContato}
                onChange={(e) => setNotaContato(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setContatoCreatorId(null)} className="btn btn-secondary btn-sm">Cancelar</button>
              <button onClick={registrarContato} className="btn btn-primary btn-sm">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ABA CAMPANHAS
// ─────────────────────────────────────────────

function AbaCampanhas() {
  const { campanhasCreators, adicionarCampanhaCreators, atualizarCampanhaCreators, creators } = usePurionStore()
  const [showModal, setShowModal] = useState(false)

  const getCreatorNome = (id: string) => creators.find((c) => c.id === id)?.nome ?? id

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Campanhas de Creators</h2>
          <p className="caption mt-0.5">{campanhasCreators.length} campanhas criadas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          <Plus size={13} /> Nova campanha
        </button>
      </div>

      {campanhasCreators.length === 0 ? (
        <div className="empty-state py-16">
          <Star size={28} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma campanha criada</p>
          <p className="caption mt-1">Crie uma campanha para vincular creators e rastrear resultados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...campanhasCreators].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((camp) => {
            const pctPubs = camp.metaPublicacoes > 0 ? Math.min(100, (camp.publicacoesRealizadas / camp.metaPublicacoes) * 100) : 0
            const pctAlcance = camp.metaAlcance > 0 ? Math.min(100, (camp.alcanceReal / camp.metaAlcance) * 100) : 0
            return (
              <div key={camp.id} className="card-purion">
                <div className="card-header">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="section-title">{camp.nome}</p>
                    <span className={`badge ${CAMP_STATUS_BADGE[camp.status]}`}>{camp.status}</span>
                    <span className="badge badge-gold">{camp.produto.toUpperCase()}</span>
                  </div>
                  {/* Status change */}
                  <select
                    value={camp.status}
                    onChange={(e) => atualizarCampanhaCreators(camp.id, { status: e.target.value as CampanhaCreators['status'] })}
                    className="text-xs bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 outline-none text-[var(--text-secondary)] focus:border-[#C9A84C]"
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="ativa">Ativa</option>
                    <option value="pausada">Pausada</option>
                    <option value="encerrada">Encerrada</option>
                  </select>
                </div>

                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="caption">Período</p>
                    <p className="text-[13px] text-[var(--text-primary)] mt-0.5">
                      {new Date(camp.dataInicio + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })} –{' '}
                      {new Date(camp.dataFim + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                    </p>
                  </div>
                  <div>
                    <p className="caption">Orçamento</p>
                    <p className="text-[13px] font-medium text-[#C9A84C] mt-0.5">{fmtR(camp.orcamentoTotal)}</p>
                  </div>
                  <div>
                    <p className="caption">Publicações</p>
                    <p className="text-[13px] text-[var(--text-primary)] mt-0.5">{camp.publicacoesRealizadas} / {camp.metaPublicacoes}</p>
                    <div className="progress-bar mt-1"><div className="progress-fill" style={{ width: `${pctPubs}%` }} /></div>
                  </div>
                  <div>
                    <p className="caption">Alcance</p>
                    <p className="text-[13px] text-[var(--text-primary)] mt-0.5">{fmtSeg(camp.alcanceReal)} / {fmtSeg(camp.metaAlcance)}</p>
                    <div className="progress-bar mt-1"><div className="progress-fill" style={{ width: `${pctAlcance}%` }} /></div>
                  </div>
                </div>

                {camp.creatorsIds.length > 0 && (
                  <div className="px-5 pb-5">
                    <p className="caption mb-2">Creators vinculados</p>
                    <div className="flex flex-wrap gap-2">
                      {camp.creatorsIds.map((id) => (
                        <span key={id} className="badge badge-neutral">{getCreatorNome(id)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {camp.roiFinal > 0 && (
                  <div className="px-5 pb-5">
                    <p className="caption">ROI final: <span className="text-emerald-400 font-semibold">{camp.roiFinal.toFixed(1)}×</span></p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalCampanha
          onSalvar={(c) => { adicionarCampanhaCreators(c); setShowModal(false) }}
          onFechar={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ABA ANÁLISE
// ─────────────────────────────────────────────

function AbaAnalise() {
  const { creators, campanhasCreators } = usePurionStore()

  const { roiData, nichoData, topROI, topAlcance, insight } = useMemo(() => {
    // ROI por plataforma
    const plats: Record<string, { receita: number; investido: number }> = {
      Instagram: { receita: 0, investido: 0 },
      TikTok:    { receita: 0, investido: 0 },
      YouTube:   { receita: 0, investido: 0 },
    }
    creators.forEach((c) => {
      c.postagens.forEach((p) => {
        const key = p.plataforma === 'instagram' ? 'Instagram' : p.plataforma === 'tiktok' ? 'TikTok' : 'YouTube'
        plats[key].receita += p.receitaGerada
      })
      const frac = c.postagens.length > 0 ? 1 / c.postagens.length : 0
      c.postagens.forEach((p) => {
        const key = p.plataforma === 'instagram' ? 'Instagram' : p.plataforma === 'tiktok' ? 'TikTok' : 'YouTube'
        plats[key].investido += c.cacheCombinado * frac
      })
    })
    const roiData: RoiPlataformaData[] = Object.entries(plats)
      .filter(([, v]) => v.investido > 0)
      .map(([plataforma, v]) => ({ plataforma, roi: v.receita / v.investido, receita: v.receita }))

    // Nicho distribution
    const nichoMap: Record<string, number> = {}
    creators.forEach((c) => { if (c.nichoPrincipal) nichoMap[c.nichoPrincipal] = (nichoMap[c.nichoPrincipal] ?? 0) + 1 })
    const nichoData: NichoData[] = Object.entries(nichoMap).map(([nicho, total]) => ({ nicho, total })).sort((a, b) => b.total - a.total)

    // Top 5 ROI
    const topROI = [...creators]
      .map((c) => ({ nome: c.nome, roi: calcularROI(c) }))
      .filter((x) => x.roi > 0)
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5)

    // Top 5 alcance
    const topAlcance = [...creators]
      .sort((a, b) => b.seguidores - a.seguidores)
      .slice(0, 5)
      .map((c) => ({ nome: c.nome, seguidores: c.seguidores }))

    // Insight automático
    const topNicho = nichoData[0]
    const nichoROI: Record<string, number[]> = {}
    creators.forEach((c) => {
      if (!c.nichoPrincipal) return
      if (!nichoROI[c.nichoPrincipal]) nichoROI[c.nichoPrincipal] = []
      nichoROI[c.nichoPrincipal].push(calcularROI(c))
    })
    const avgNichoROI = Object.entries(nichoROI)
      .map(([n, rois]) => ({ n, avg: rois.reduce((s, v) => s + v, 0) / rois.length }))
      .sort((a, b) => b.avg - a.avg)

    const igData = plats.Instagram
    const ttData = plats.TikTok
    const igROI = igData.investido > 0 ? igData.receita / igData.investido : 0
    const ttROI = ttData.investido > 0 ? ttData.receita / ttData.investido : 0
    const diffPct = igROI > 0 && ttROI > 0 ? Math.round(Math.abs(ttROI - igROI) / igROI * 100) : null

    const insights: string[] = []
    if (avgNichoROI.length > 0) {
      insights.push(`O nicho "${avgNichoROI[0].n}" lidera com ROI médio de ${avgNichoROI[0].avg.toFixed(1)}×.`)
    }
    if (diffPct !== null) {
      const melhor = ttROI > igROI ? 'TikTok' : 'Instagram'
      const pior   = ttROI > igROI ? 'Instagram' : 'TikTok'
      insights.push(`${melhor} tem ROI ${diffPct}% maior que ${pior} com os dados atuais.`)
    }
    if (topNicho) {
      insights.push(`${topNicho.nicho} representa ${Math.round((topNicho.total / creators.length) * 100)}% da base de creators.`)
    }
    const insight = insights.join(' ') || 'Adicione creators e publicações para gerar insights automáticos.'

    return { roiData, nichoData, topROI, topAlcance, insight }
  }, [creators])

  return (
    <div className="flex flex-col gap-8">
      {/* Insight automático */}
      <div className="card-purion px-5 py-4 border-l-2 border-[#C9A84C]">
        <p className="kpi-label mb-1">Insight automático</p>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{insight}</p>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-purion">
          <div className="card-header"><p className="section-title">ROI por Plataforma</p></div>
          <div className="p-5">
            {roiData.length > 0 ? <GraficoRoiPlataforma data={roiData} /> : <p className="caption text-center py-8">Sem dados suficientes</p>}
          </div>
        </div>
        <div className="card-purion">
          <div className="card-header"><p className="section-title">Creators por Nicho</p></div>
          <div className="p-5">
            {nichoData.length > 0 ? <GraficoNicho data={nichoData} /> : <p className="caption text-center py-8">Sem dados suficientes</p>}
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-purion">
          <div className="card-header"><p className="section-title">Top 5 por ROI</p></div>
          <div className="p-5 flex flex-col gap-2">
            {topROI.length === 0 ? <p className="caption text-center py-4">Sem dados</p> : topROI.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-[var(--text-primary)]">{c.nome}</span>
                <span className="text-sm font-semibold text-emerald-400">{c.roi.toFixed(1)}×</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-purion">
          <div className="card-header"><p className="section-title">Top 5 por Alcance</p></div>
          <div className="p-5 flex flex-col gap-2">
            {topAlcance.length === 0 ? <p className="caption text-center py-4">Sem dados</p> : topAlcance.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-[var(--text-primary)]">{c.nome}</span>
                <span className="text-sm font-semibold text-[#C9A84C]">{fmtSeg(c.seguidores)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de campanhas */}
      {campanhasCreators.length > 0 && (
        <div className="card-purion overflow-hidden">
          <div className="card-header"><p className="section-title">Custo vs Resultado por Campanha</p></div>
          <table className="table-purion">
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Produto</th>
                <th>Orçamento</th>
                <th>Publicações</th>
                <th>Alcance</th>
                <th>Vendas</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {campanhasCreators.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.nome}</td>
                  <td><span className="badge badge-gold">{c.produto.toUpperCase()}</span></td>
                  <td className="td-mono">{fmtR(c.orcamentoTotal)}</td>
                  <td>{c.publicacoesRealizadas} / {c.metaPublicacoes}</td>
                  <td>{fmtSeg(c.alcanceReal)}</td>
                  <td>{c.vendasPorCodigo}</td>
                  <td className="td-mono">{c.roiFinal > 0 ? `${c.roiFinal.toFixed(1)}×` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function CreatorsDashboard() {
  const { adicionarCreator, deletarCreator } = useMarketing()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [drawerCreatorId, setDrawerCreatorId] = useState<string | null>(null)
  const [showModalCreator, setShowModalCreator] = useState(false)
  const [deletandoCreator, setDeletandoCreator] = useState<Creator | null>(null)

  return (
    <div className="page-content section-gap">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Hub de Creators</h1>
          <p className="caption mt-1">Influencer marketing — prospecção, campanhas e análise de ROI</p>
        </div>
        <button
          onClick={() => setShowModalCreator(true)}
          className="btn btn-primary"
        >
          <Plus size={14} /> Novo creator
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-nav mobile-tabs-scroll">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`tab-item ${activeTab === id ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview'  && <AbaOverview onSelectCreator={(id) => setDrawerCreatorId(id)} />}
      {activeTab === 'pipeline'  && <AbaPipeline />}
      {activeTab === 'campanhas' && <AbaCampanhas />}
      {activeTab === 'analise'   && <AbaAnalise />}

      {/* Drawer */}
      {drawerCreatorId && (
        <DrawerPerfil
          creatorId={drawerCreatorId}
          onClose={() => setDrawerCreatorId(null)}
          onDeletar={(c) => { setDeletandoCreator(c); setDrawerCreatorId(null) }}
        />
      )}

      {/* Modal novo creator */}
      {showModalCreator && (
        <ModalCreator
          onSalvar={(c) => { adicionarCreator(c); setShowModalCreator(false) }}
          onFechar={() => setShowModalCreator(false)}
        />
      )}

      <ConfirmModal
        open={!!deletandoCreator}
        title="Excluir Creator"
        message={`Deseja excluir "${deletandoCreator?.nome}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => { if (deletandoCreator) { deletarCreator(deletandoCreator.id); setDeletandoCreator(null) } }}
        onCancel={() => setDeletandoCreator(null)}
      />
    </div>
  )
}

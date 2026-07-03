'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Target, Plus, X, Check, ChevronDown, Flame,
  Megaphone, Users2, Building2, Package, ShoppingBag, Zap,
  Pencil, Trash2,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { MetaDiaria, MetaChecklistItem, TipoMeta, EscopoMeta, CategoriaMeta, PerfilUsuario } from '@/store'
import { useMetas } from '@/hooks/useMetas'
import { formatarDataBR } from '@/lib/calculos'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const SOCIOS: PerfilUsuario[] = ['joao', 'gabriel', 'matheus']

const LABEL_SOCIO: Record<PerfilUsuario, string> = {
  joao: 'João', gabriel: 'Gabriel', matheus: 'Matheus',
}

const COR_SOCIO: Record<PerfilUsuario, string> = {
  joao: '#3B82F6', gabriel: '#22C55E', matheus: '#C9A84C',
}

const LABEL_CATEGORIA: Record<CategoriaMeta, string> = {
  ads: 'Ads', creators: 'Creators', b2b: 'B2B',
  producao: 'Produção', vendas: 'Vendas', geral: 'Geral',
}

const ICONE_CATEGORIA: Record<CategoriaMeta, React.ElementType> = {
  ads: Zap, creators: Users2, b2b: Building2,
  producao: Package, vendas: ShoppingBag, geral: Target,
}

const COR_CATEGORIA: Record<CategoriaMeta, string> = {
  ads: '#8B5CF6', creators: '#EC4899', b2b: '#3B82F6',
  producao: '#F59E0B', vendas: '#C9A84C', geral: '#6B6B6B',
}

const BADGE_CATEGORIA: Record<CategoriaMeta, string> = {
  ads:      'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]',
  creators: 'bg-[rgba(236,72,153,0.15)] text-[#EC4899]',
  b2b:      'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]',
  producao: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]',
  vendas:   'bg-[rgba(201,168,76,0.15)] text-[#C9A84C]',
  geral:    'bg-[rgba(107,107,107,0.12)] text-[#6B6B6B]',
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function hoje(): string { return new Date().toISOString().slice(0, 10) }

function pct(valorAtual: number, valorAlvo: number | null): number {
  if (!valorAlvo || valorAlvo <= 0) return 0
  return Math.min((valorAtual / valorAlvo) * 100, 100)
}

function pctChecklist(meta: MetaDiaria, itens: MetaChecklistItem[]): number {
  const mine = itens.filter((i) => i.metaId === meta.id)
  if (!mine.length) return meta.concluida ? 100 : 0
  return (mine.filter((i) => i.feito).length / mine.length) * 100
}

function progressoMeta(meta: MetaDiaria, itens: MetaChecklistItem[]): number {
  if (meta.tipo === 'checklist') return pctChecklist(meta, itens)
  return pct(meta.valorAtual, meta.valorAlvo)
}

function diasSemMetas(data: string): number {
  return Math.round((Date.now() - new Date(data).getTime()) / 86_400_000)
}

// ─────────────────────────────────────────────
// BARRA DE PROGRESSO
// ─────────────────────────────────────────────

function BarraProgresso({ value, cor = '#C9A84C', concluida }: { value: number; cor?: string; concluida: boolean }) {
  const c = concluida ? '#4CAF7A' : cor
  return (
    <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: c }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// CARD DE META
// ─────────────────────────────────────────────

function CardMeta({
  meta, itens, onEditar, onDeletar, onIncrement, onSetValor, onMarcarItem, onConcluir,
}: {
  meta: MetaDiaria
  itens: MetaChecklistItem[]
  onEditar: (m: MetaDiaria) => void
  onDeletar: (id: string) => void
  onIncrement: (id: string) => void
  onSetValor: (id: string, v: number) => void
  onMarcarItem: (id: string, feito: boolean) => void
  onConcluir: (id: string, c: boolean) => void
}) {
  const [inputValor, setInputValor] = useState('')
  const [editandoValor, setEditandoValor] = useState(false)
  const mineItens = itens.filter((i) => i.metaId === meta.id).sort((a, b) => a.ordem - b.ordem)
  const progresso = progressoMeta(meta, itens)
  const CatIcon = ICONE_CATEGORIA[meta.categoria]

  function handleSetValor() {
    const v = parseFloat(inputValor.replace(',', '.'))
    if (!isNaN(v) && v >= 0) { onSetValor(meta.id, v) }
    setEditandoValor(false)
    setInputValor('')
  }

  return (
    <div
      className="card-purion p-3.5 flex flex-col gap-2.5 transition-all"
      style={{ borderLeft: `3px solid ${meta.concluida ? '#4CAF7A' : COR_CATEGORIA[meta.categoria]}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <CatIcon size={13} style={{ color: COR_CATEGORIA[meta.categoria], marginTop: 2 }} className="shrink-0" />
          <div className="min-w-0">
            <p className={`text-[13px] font-semibold leading-tight ${meta.concluida ? 'line-through opacity-60' : 'text-[var(--text-primary)]'}`}>
              {meta.titulo}
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${BADGE_CATEGORIA[meta.categoria]}`}>
              {LABEL_CATEGORIA[meta.categoria]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {meta.concluida ? (
            <button onClick={() => onConcluir(meta.id, false)} title="Desmarcar" className="icon-btn">
              <Check size={11} style={{ color: '#4CAF7A' }} />
            </button>
          ) : (
            <button onClick={() => onConcluir(meta.id, true)} title="Marcar como concluída" className="icon-btn">
              <Check size={11} />
            </button>
          )}
          <button onClick={() => onEditar(meta)} className="icon-btn"><Pencil size={11} /></button>
          <button onClick={() => onDeletar(meta.id)} className="icon-btn"><Trash2 size={11} /></button>
        </div>
      </div>

      {/* Progresso */}
      <div>
        <BarraProgresso value={progresso} cor={COR_CATEGORIA[meta.categoria]} concluida={meta.concluida} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[var(--text-secondary)]">
            {meta.tipo === 'checklist'
              ? `${mineItens.filter((i) => i.feito).length}/${mineItens.length} itens`
              : `${meta.valorAtual}${meta.valorAlvo != null ? `/${meta.valorAlvo}` : ''} ${meta.unidade ?? ''}`
            }
          </span>
          <span className="text-[10px] font-semibold" style={{ color: meta.concluida ? '#4CAF7A' : 'var(--text-secondary)' }}>
            {progresso.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Ações — numérica */}
      {meta.tipo === 'numerica' && !meta.concluida && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onIncrement(meta.id)}
            className="btn btn-secondary btn-sm flex-1 font-bold"
            style={{ fontSize: 13 }}
          >
            +1
          </button>
          {editandoValor ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number" min="0" step="0.1"
                value={inputValor}
                onChange={(e) => setInputValor(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSetValor() }}
                autoFocus
                className="input-purion flex-1 text-[12px] py-1 px-2"
                style={{ minWidth: 0 }}
                placeholder={meta.unidade ?? '0'}
              />
              <button onClick={handleSetValor} className="icon-btn"><Check size={12} style={{ color: '#4CAF7A' }} /></button>
              <button onClick={() => setEditandoValor(false)} className="icon-btn"><X size={11} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoValor(true)}
              className="btn btn-secondary btn-sm text-[11px] px-2"
            >
              Definir
            </button>
          )}
        </div>
      )}

      {/* Itens — checklist */}
      {meta.tipo === 'checklist' && (
        <div className="space-y-1.5">
          {mineItens.map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.feito}
                onChange={(e) => onMarcarItem(item.id, e.target.checked)}
                className="w-3.5 h-3.5 accent-[#C9A84C]"
              />
              <span
                className={`text-[12px] leading-tight transition-colors ${
                  item.feito ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {item.texto}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COLUNA DE SÓCIO
// ─────────────────────────────────────────────

function ColunasSocio({
  socio, metas, itens, streak, onEditar, onDeletar,
  onIncrement, onSetValor, onMarcarItem, onConcluir,
  onNovaMeta,
}: {
  socio: PerfilUsuario
  metas: MetaDiaria[]
  itens: MetaChecklistItem[]
  streak: number
  onEditar: (m: MetaDiaria) => void
  onDeletar: (id: string) => void
  onIncrement: (id: string) => void
  onSetValor: (id: string, v: number) => void
  onMarcarItem: (id: string, feito: boolean) => void
  onConcluir: (id: string, c: boolean) => void
  onNovaMeta: (socio: PerfilUsuario) => void
}) {
  const total     = metas.length
  const concluidas = metas.filter((m) => m.concluida).length
  const pctDia    = total > 0 ? Math.round((concluidas / total) * 100) : 0
  const cor       = COR_SOCIO[socio]

  return (
    <div className="flex flex-col gap-3">
      {/* Header da coluna */}
      <div
        className="rounded-xl p-3 border"
        style={{ borderColor: `${cor}30`, background: `${cor}08` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px]"
              style={{ background: `${cor}20`, color: cor }}
            >
              {LABEL_SOCIO[socio][0]}
            </div>
            <span className="font-bold text-[var(--text-primary)] text-sm">{LABEL_SOCIO[socio]}</span>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: '#FF6B35' }}>
                <Flame size={11} />{streak}
              </span>
            )}
          </div>
          <button
            onClick={() => onNovaMeta(socio)}
            className="icon-btn"
            title="Nova meta"
            style={{ color: cor }}
          >
            <Plus size={14} />
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-secondary)]">{concluidas}/{total} metas</span>
            <span className="text-[11px] font-bold" style={{ color: pctDia === 100 ? '#4CAF7A' : cor }}>
              {pctDia}%
            </span>
          </div>
          <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pctDia}%`, background: pctDia === 100 ? '#4CAF7A' : cor }}
            />
          </div>
        </div>
      </div>

      {/* Metas */}
      <div className="flex flex-col gap-2">
        {metas.length === 0 ? (
          <div className="text-center py-6 text-[var(--text-secondary)] text-xs">
            Nenhuma meta hoje.<br />
            <button onClick={() => onNovaMeta(socio)} className="text-[#C9A84C] hover:underline mt-1">
              + Adicionar
            </button>
          </div>
        ) : (
          metas.map((m) => (
            <CardMeta
              key={m.id} meta={m} itens={itens}
              onEditar={onEditar} onDeletar={onDeletar}
              onIncrement={onIncrement} onSetValor={onSetValor}
              onMarcarItem={onMarcarItem} onConcluir={onConcluir}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HEATMAP (últimos 30 dias)
// ─────────────────────────────────────────────

function Heatmap({ metas, socio }: { metas: MetaDiaria[]; socio: PerfilUsuario | 'time' | 'geral' }) {
  const hoje30 = useMemo(() => {
    const dias: string[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      dias.push(d.toISOString().slice(0, 10))
    }
    return dias
  }, [])

  const mapa = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    hoje30.forEach((d) => {
      const metasDia = metas.filter((m) => {
        if (m.data !== d) return false
        if (socio === 'geral') return true
        if (socio === 'time') return m.escopo === 'time'
        return m.responsavel === socio
      })
      if (!metasDia.length) { map[d] = -1; return }
      const conc = metasDia.filter((m) => m.concluida).length
      map[d] = (conc / metasDia.length) * 100
    })
    return map
  }, [metas, hoje30, socio])

  function corCelula(v: number): string {
    if (v < 0) return 'var(--border)'
    if (v === 0) return 'rgba(232,82,56,0.18)'
    if (v < 50) return 'rgba(201,168,76,0.25)'
    if (v < 100) return 'rgba(201,168,76,0.55)'
    return '#4CAF7A'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {hoje30.map((d) => {
        const v = mapa[d] ?? -1
        const label = formatarDataBR(d)
        return (
          <div
            key={d}
            title={v < 0 ? `${label}: sem metas` : `${label}: ${v.toFixed(0)}%`}
            className="rounded-sm cursor-default"
            style={{ width: 12, height: 12, background: corCelula(v) }}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL CRIAR / EDITAR META
// ─────────────────────────────────────────────

function ModalMeta({
  metaInicial,
  socioPreset,
  onSalvar,
  onFechar,
}: {
  metaInicial: MetaDiaria | null
  socioPreset: PerfilUsuario | null
  onSalvar: (dados: {
    titulo: string; tipo: TipoMeta; escopo: EscopoMeta
    responsavel: PerfilUsuario | null; categoria: CategoriaMeta
    valorAlvo: number | null; unidade: string | null
    recorrente: boolean; data: string; itensChecklist?: string[]
  }) => void
  onFechar: () => void
}) {
  const [titulo, setTitulo]           = useState(metaInicial?.titulo ?? '')
  const [tipo, setTipo]               = useState<TipoMeta>(metaInicial?.tipo ?? 'numerica')
  const [escopo, setEscopo]           = useState<EscopoMeta>(metaInicial?.escopo ?? (socioPreset ? 'individual' : 'time'))
  const [responsavel, setResponsavel] = useState<PerfilUsuario | null>(
    metaInicial?.responsavel ?? socioPreset ?? 'matheus'
  )
  const [categoria, setCategoria]     = useState<CategoriaMeta>(metaInicial?.categoria ?? 'geral')
  const [valorAlvo, setValorAlvo]     = useState(metaInicial?.valorAlvo?.toString() ?? '')
  const [unidade, setUnidade]         = useState(metaInicial?.unidade ?? '')
  const [recorrente, setRecorrente]   = useState(metaInicial?.recorrente ?? true)
  const [data, setData]               = useState(metaInicial?.data ?? hoje())
  const [novoItem, setNovoItem]       = useState('')
  const [itensChecklist, setItensChecklist] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const t = novoItem.trim()
    if (t) { setItensChecklist((p) => [...p, t]); setNovoItem('') }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    onSalvar({
      titulo: titulo.trim(),
      tipo, escopo,
      responsavel: escopo === 'time' ? null : responsavel,
      categoria,
      valorAlvo: tipo === 'numerica' && valorAlvo ? parseFloat(valorAlvo) : null,
      unidade: tipo === 'numerica' ? unidade.trim() || null : null,
      recorrente, data,
      ...(tipo === 'checklist' && { itensChecklist }),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-black text-[var(--text-primary)] text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {metaInicial ? 'Editar Meta' : 'Nova Meta Diária'}
          </h3>
          <button onClick={onFechar} className="icon-btn"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Título */}
          <div>
            <label className="label-purion">Título</label>
            <input
              ref={inputRef} autoFocus value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input-purion" maxLength={80}
              placeholder="Ex: 5 DMs para creators"
            />
          </div>

          {/* Tipo + Escopo */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label-purion">Tipo</label>
              <div className="relative">
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMeta)} className="input-purion appearance-none pr-8">
                  <option value="numerica">Numérica</option>
                  <option value="checklist">Checklist</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4A4A4A]" />
              </div>
            </div>
            <div className="flex-1">
              <label className="label-purion">Escopo</label>
              <div className="relative">
                <select value={escopo} onChange={(e) => setEscopo(e.target.value as EscopoMeta)} className="input-purion appearance-none pr-8">
                  <option value="individual">Individual</option>
                  <option value="time">Time</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4A4A4A]" />
              </div>
            </div>
          </div>

          {/* Responsável */}
          {escopo === 'individual' && (
            <div>
              <label className="label-purion">Responsável</label>
              <div className="relative">
                <select value={responsavel ?? 'matheus'} onChange={(e) => setResponsavel(e.target.value as PerfilUsuario)} className="input-purion appearance-none pr-8">
                  {SOCIOS.map((s) => <option key={s} value={s}>{LABEL_SOCIO[s]}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4A4A4A]" />
              </div>
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="label-purion">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LABEL_CATEGORIA) as CategoriaMeta[]).map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setCategoria(c)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                    categoria === c
                      ? BADGE_CATEGORIA[c] + ' ring-1 ring-current'
                      : 'bg-[var(--bg-surface-2)] text-[#6B6B6B] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {LABEL_CATEGORIA[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Numérica */}
          {tipo === 'numerica' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label-purion">Alvo</label>
                <input
                  type="number" min="0" step="0.1" value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                  className="input-purion" placeholder="5"
                />
              </div>
              <div className="flex-1">
                <label className="label-purion">Unidade</label>
                <input
                  value={unidade} onChange={(e) => setUnidade(e.target.value)}
                  className="input-purion" placeholder="DMs, visitas, R$..."
                />
              </div>
            </div>
          )}

          {/* Checklist */}
          {tipo === 'checklist' && (
            <div>
              <label className="label-purion">Itens do checklist</label>
              <div className="space-y-1.5 mb-2">
                {itensChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-primary)] flex-1">· {item}</span>
                    <button
                      type="button"
                      onClick={() => setItensChecklist((p) => p.filter((_, j) => j !== i))}
                      className="icon-btn"
                    ><X size={10} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                  className="input-purion flex-1 text-[12px]"
                  placeholder="Adicionar item..."
                />
                <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">+</button>
              </div>
            </div>
          )}

          {/* Data + Recorrente */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label-purion">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-purion" />
            </div>
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox" checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="w-4 h-4 accent-[#C9A84C]"
              />
              <span className="text-[12px] text-[var(--text-secondary)]">Repetir diariamente</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-1">
            {metaInicial ? 'Salvar alterações' : 'Criar meta'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────

export function MetasDashboard() {
  const { metasDiarias, metaChecklistItens } = usePurionStore()
  const { criarMeta, atualizarProgresso, incrementarProgresso, marcarItem, concluirMeta, deletarMeta } = useMetas()

  const [modalAberto, setModalAberto]   = useState(false)
  const [editandoMeta, setEditandoMeta] = useState<MetaDiaria | null>(null)
  const [socioPreset, setSocioPreset]   = useState<PerfilUsuario | null>(null)

  const hj = hoje()

  const metasHoje = useMemo(
    () => metasDiarias.filter((m) => m.data === hj),
    [metasDiarias, hj]
  )

  const metasTime = useMemo(
    () => metasHoje.filter((m) => m.escopo === 'time'),
    [metasHoje]
  )

  const metasPorSocio = useMemo(
    () => Object.fromEntries(
      SOCIOS.map((s) => [s, metasHoje.filter((m) => m.escopo === 'individual' && m.responsavel === s)])
    ) as Record<PerfilUsuario, MetaDiaria[]>,
    [metasHoje]
  )

  // % geral do time hoje
  const pctTime = useMemo(() => {
    if (!metasHoje.length) return 0
    return Math.round((metasHoje.filter((m) => m.concluida).length / metasHoje.length) * 100)
  }, [metasHoje])

  // Streak — dias seguidos com >= 80% concluídas (time inteiro)
  const streakTime = useMemo(() => {
    let streak = 0
    for (let i = 1; i <= 30; i++) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
      const dia = metasDiarias.filter((m) => m.data === d)
      if (!dia.length) break
      const pctDia = (dia.filter((m) => m.concluida).length / dia.length) * 100
      if (pctDia >= 80) streak++
      else break
    }
    return streak
  }, [metasDiarias])

  // Streak por sócio
  const streakSocio = useMemo(() => {
    return Object.fromEntries(
      SOCIOS.map((socio) => {
        let streak = 0
        for (let i = 1; i <= 30; i++) {
          const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
          const dia = metasDiarias.filter((m) => m.data === d && m.responsavel === socio)
          if (!dia.length) break
          const pctDia = (dia.filter((m) => m.concluida).length / dia.length) * 100
          if (pctDia >= 80) streak++
          else break
        }
        return [socio, streak]
      })
    ) as Record<PerfilUsuario, number>
  }, [metasDiarias])

  function abrirNovaMeta(socio: PerfilUsuario | null) {
    setEditandoMeta(null)
    setSocioPreset(socio)
    setModalAberto(true)
  }

  async function handleSalvar(dados: Parameters<typeof criarMeta>[0]) {
    if (editandoMeta) {
      // Edição: só atualiza campos básicos via DB direto
      const sb = (await import('@/lib/supabase')).supabase
      if (sb) {
        await sb.from('metas_diarias').update({
          titulo:      dados.titulo,
          tipo:        dados.tipo,
          escopo:      dados.escopo,
          responsavel: dados.responsavel,
          categoria:   dados.categoria,
          valor_alvo:  dados.valorAlvo,
          unidade:     dados.unidade,
          recorrente:  dados.recorrente,
          updated_at:  new Date().toISOString(),
        }).eq('id', editandoMeta.id)
      }
      const { atualizarMetaDiaria } = usePurionStore.getState()
      atualizarMetaDiaria(editandoMeta.id, {
        titulo: dados.titulo, tipo: dados.tipo, escopo: dados.escopo,
        responsavel: dados.responsavel, categoria: dados.categoria,
        valorAlvo: dados.valorAlvo, unidade: dados.unidade,
        recorrente: dados.recorrente,
      })
    } else {
      await criarMeta(dados)
    }
    setModalAberto(false)
    setEditandoMeta(null)
    setSocioPreset(null)
  }

  const dataFormatada = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }, [])

  return (
    <div className="page-content section-gap">
      {/* ── CABEÇALHO ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Metas Diárias</h1>
          <p className="caption mt-1">{dataFormatada}</p>
        </div>
        <button
          onClick={() => abrirNovaMeta(null)}
          className="btn btn-primary"
        >
          <Plus size={14} /> Nova Meta
        </button>
      </div>

      {/* ── RESUMO DO DIA ── */}
      <div className="card-purion p-4 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mb-1">Conclusão do time hoje</p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-black"
              style={{ fontFamily: 'Montserrat, sans-serif', color: pctTime === 100 ? '#4CAF7A' : '#C9A84C' }}
            >
              {pctTime}%
            </span>
            <span className="caption">{metasHoje.filter((m) => m.concluida).length}/{metasHoje.length} metas</span>
          </div>
          <div className="w-48 h-2 bg-[var(--border)] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pctTime}%`, background: pctTime === 100 ? '#4CAF7A' : '#C9A84C' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {streakTime > 0 && (
            <div className="text-center">
              <p className="text-[11px] text-[#6B6B6B] mb-1">Streak do time</p>
              <div className="flex items-center gap-1" style={{ color: '#FF6B35' }}>
                <Flame size={18} />
                <span className="text-xl font-black" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {streakTime}
                </span>
              </div>
              <p className="text-[10px] text-[#4A4A4A]">dia{streakTime > 1 ? 's' : ''} seguido{streakTime > 1 ? 's' : ''}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-[#6B6B6B] mb-1">Heatmap (30 dias)</p>
            <Heatmap metas={metasDiarias} socio="geral" />
          </div>
        </div>
      </div>

      {/* ── METAS DO TIME ── */}
      {metasTime.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Megaphone size={14} style={{ color: '#C9A84C' }} />
              Metas do Time
            </h2>
            <button onClick={() => abrirNovaMeta(null)} className="icon-btn" title="Nova meta do time">
              <Plus size={13} />
            </button>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {metasTime.map((m) => (
              <CardMeta
                key={m.id} meta={m} itens={metaChecklistItens}
                onEditar={(meta) => { setEditandoMeta(meta); setModalAberto(true) }}
                onDeletar={deletarMeta}
                onIncrement={incrementarProgresso}
                onSetValor={atualizarProgresso}
                onMarcarItem={marcarItem}
                onConcluir={concluirMeta}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── METAS INDIVIDUAIS ── */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Users2 size={14} style={{ color: '#C9A84C' }} />
          Metas Individuais
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {SOCIOS.map((socio) => (
            <ColunasSocio
              key={socio}
              socio={socio}
              metas={metasPorSocio[socio]}
              itens={metaChecklistItens}
              streak={streakSocio[socio]}
              onEditar={(meta) => { setEditandoMeta(meta); setModalAberto(true) }}
              onDeletar={deletarMeta}
              onIncrement={incrementarProgresso}
              onSetValor={atualizarProgresso}
              onMarcarItem={marcarItem}
              onConcluir={concluirMeta}
              onNovaMeta={abrirNovaMeta}
            />
          ))}
        </div>
      </div>

      {/* ── HISTÓRICO / HEATMAP POR SÓCIO ── */}
      {metasDiarias.length > 0 && (
        <div className="card-purion card-section">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Histórico — 30 dias</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {SOCIOS.map((socio) => (
              <div key={socio}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: COR_SOCIO[socio] }}>
                  {LABEL_SOCIO[socio]}
                </p>
                <Heatmap metas={metasDiarias} socio={socio} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-[10px] text-[#4A4A4A]">Legenda:</span>
            {[
              { cor: '#4CAF7A', label: '100%' },
              { cor: 'rgba(201,168,76,0.55)', label: '50–99%' },
              { cor: 'rgba(201,168,76,0.25)', label: '1–49%' },
              { cor: 'rgba(232,82,56,0.18)', label: '0%' },
              { cor: 'var(--border)', label: 'Sem metas' },
            ].map(({ cor, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: cor }} />
                <span className="text-[10px] text-[#4A4A4A]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {modalAberto && (
        <ModalMeta
          metaInicial={editandoMeta}
          socioPreset={socioPreset}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setEditandoMeta(null); setSocioPreset(null) }}
        />
      )}
    </div>
  )
}

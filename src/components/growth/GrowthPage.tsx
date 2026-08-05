'use client'

import { useState, useMemo } from 'react'
import {
  FlaskConical, Plus, X, ChevronRight, Star, Target, TrendingUp,
  Users, DollarSign, RefreshCw, Award, Lightbulb, BarChart3,
  ArrowRight, Pencil, Trash2, BookOpen,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import { useGrowth } from '@/hooks/useGrowth'
import type { GrowthExperimento, EtapaAARRR, StatusExperimento, NovoExperimento } from '@/hooks/useGrowth'

// ─── Constantes ────────────────────────────────────────────────────

const ETAPA_AARRR: Record<EtapaAARRR, { label: string; cor: string; icon: React.ComponentType<{size?: number}> }> = {
  aquisicao:     { label: 'Aquisição',     cor: '#5B8FE8', icon: Users      },
  ativacao:      { label: 'Ativação',      cor: '#C9A84C', icon: Lightbulb  },
  retencao:      { label: 'Retenção',      cor: '#4CAF7A', icon: RefreshCw  },
  receita:       { label: 'Receita',       cor: '#E8A838', icon: DollarSign },
  recomendacao:  { label: 'Recomendação',  cor: '#A855F7', icon: Star       },
}

const STATUS_CONFIG: Record<StatusExperimento, { label: string; cor: string; ordem: number }> = {
  backlog:  { label: 'Backlog',   cor: '#6B6B6B', ordem: 0 },
  rodando:  { label: 'Rodando',   cor: '#5B8FE8', ordem: 1 },
  escalar:  { label: 'Escalar',   cor: '#4CAF7A', ordem: 2 },
  iterar:   { label: 'Iterar',    cor: '#E8A838', ordem: 3 },
  matar:    { label: 'Matar',     cor: '#E85238', ordem: 4 },
}

const ETAPAS_AARRR_ORDEM: EtapaAARRR[] = ['aquisicao', 'ativacao', 'retencao', 'receita', 'recomendacao']

const COLUNAS_KANBAN: StatusExperimento[] = ['backlog', 'rodando', 'escalar', 'iterar', 'matar']

const SCORE_COR = (s: number) => s >= 7 ? '#4CAF7A' : s >= 5 ? '#E8A838' : '#E85238'

function ScoreBadge({ score }: { score: number }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
      background: `${SCORE_COR(score)}20`, color: SCORE_COR(score),
    }}>
      {score.toFixed(1)}
    </span>
  )
}

function EtapaBadge({ etapa }: { etapa: EtapaAARRR }) {
  const e = ETAPA_AARRR[etapa]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      background: `${e.cor}18`, color: e.cor, letterSpacing: '0.02em',
    }}>
      {e.label}
    </span>
  )
}

// ─── Formulário de Experimento ──────────────────────────────────────

interface FormExp {
  nome: string
  etapa: EtapaAARRR
  hipotese: string
  impacto: number
  confianca: number
  facilidade: number
  status: StatusExperimento
  metricaAlvo: string
  prazo: string
  responsavel: string
  aprendizado: string
}

const FORM_VAZIO: FormExp = {
  nome: '', etapa: 'aquisicao', hipotese: '', impacto: 5, confianca: 5, facilidade: 5,
  status: 'backlog', metricaAlvo: '', prazo: '', responsavel: '', aprendizado: '',
}

function ModalExperimento({
  editando, onFechar, onSalvar,
}: {
  editando: GrowthExperimento | null
  onFechar: () => void
  onSalvar: (dados: Partial<NovoExperimento>) => void
}) {
  const [form, setForm] = useState<FormExp>(
    editando
      ? {
          nome: editando.nome, etapa: editando.etapa, hipotese: editando.hipotese,
          impacto: editando.impacto, confianca: editando.confianca, facilidade: editando.facilidade,
          status: editando.status, metricaAlvo: editando.metricaAlvo,
          prazo: editando.prazo ?? '', responsavel: editando.responsavel ?? '',
          aprendizado: editando.aprendizado ?? '',
        }
      : FORM_VAZIO
  )

  const score = parseFloat(((form.impacto + form.confianca + form.facilidade) / 3).toFixed(1))
  const precisaAprendizado = ['escalar', 'iterar', 'matar'].includes(form.status)

  function set(campo: keyof FormExp, val: string | number) {
    setForm((f) => ({ ...f, [campo]: val }))
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    if (precisaAprendizado && !form.aprendizado.trim()) return
    onSalvar({
      nome: form.nome.trim(), etapa: form.etapa, hipotese: form.hipotese.trim(),
      impacto: form.impacto, confianca: form.confianca, facilidade: form.facilidade,
      status: form.status, metricaAlvo: form.metricaAlvo.trim(),
      prazo: form.prazo || null, responsavel: form.responsavel || null,
      aprendizado: form.aprendizado.trim() || null,
    })
  }

  function SliderICF({ campo, label }: { campo: 'impacto' | 'confianca' | 'facilidade'; label: string }) {
    const val = form[campo] as number
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: SCORE_COR(val) }}>{val}</span>
        </div>
        <input type="range" min={1} max={10} value={val}
          onChange={(e) => set(campo, Number(e.target.value))}
          style={{ width: '100%', accentColor: SCORE_COR(val) }}
        />
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            {editando ? 'Editar Experimento' : 'Novo Experimento ICE'}
          </h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Nome *</label>
            <input className="input-purion w-full" value={form.nome}
              onChange={(e) => set('nome', e.target.value)} required placeholder="Ex: Adicionar prova social na LP" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Etapa AARRR</label>
              <select className="select-purion w-full" value={form.etapa}
                onChange={(e) => set('etapa', e.target.value as EtapaAARRR)}>
                {ETAPAS_AARRR_ORDEM.map((e) => (
                  <option key={e} value={e}>{ETAPA_AARRR[e].label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Status</label>
              <select className="select-purion w-full" value={form.status}
                onChange={(e) => set('status', e.target.value as StatusExperimento)}>
                {COLUNAS_KANBAN.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="kpi-label mb-1 block">Hipótese</label>
            <textarea className="input-purion w-full" rows={2} value={form.hipotese}
              onChange={(e) => set('hipotese', e.target.value)}
              placeholder="Se [mudança], então [métrica] melhora porque [motivo]" />
          </div>
          <div>
            <label className="kpi-label mb-2 block">Score ICE — média: <ScoreBadge score={score} /></label>
            <div className="flex flex-col gap-2">
              <SliderICF campo="impacto"   label="Impacto (1–10)" />
              <SliderICF campo="confianca" label="Confiança (1–10)" />
              <SliderICF campo="facilidade" label="Facilidade (1–10)" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Métrica-alvo</label>
              <input className="input-purion w-full" value={form.metricaAlvo}
                onChange={(e) => set('metricaAlvo', e.target.value)} placeholder="Ex: taxa de conversão LP" />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Prazo</label>
              <input type="date" className="input-purion w-full" value={form.prazo}
                onChange={(e) => set('prazo', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="kpi-label mb-1 block">Responsável</label>
            <input className="input-purion w-full" value={form.responsavel}
              onChange={(e) => set('responsavel', e.target.value)} placeholder="Matheus, João…" />
          </div>
          {precisaAprendizado && (
            <div style={{ padding: '12px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)' }}>
              <label className="kpi-label mb-1 block" style={{ color: '#C9A84C' }}>
                Aprendizado (obrigatório para concluir) *
              </label>
              <textarea className="input-purion w-full" rows={3} value={form.aprendizado}
                onChange={(e) => set('aprendizado', e.target.value)} required
                placeholder="O que aprendemos? A hipótese foi validada? Qual o próximo passo?" />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">
              {editando ? 'Salvar' : 'Criar Experimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Card do Kanban ──────────────────────────────────────────────────

function CardExp({
  exp, onEditar, onDeletar, onMover,
}: {
  exp: GrowthExperimento
  onEditar: () => void
  onDeletar: () => void
  onMover: (status: StatusExperimento) => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const proximo = COLUNAS_KANBAN[COLUNAS_KANBAN.indexOf(exp.status) + 1] as StatusExperimento | undefined

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('expId', exp.id)}
      className="card-purion"
      style={{ padding: '12px 14px', cursor: 'grab', position: 'relative' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{exp.nome}</p>
        <ScoreBadge score={exp.score} />
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <EtapaBadge etapa={exp.etapa} />
        {exp.metricaAlvo && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>· {exp.metricaAlvo}</span>
        )}
      </div>
      {exp.hipotese && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
          {exp.hipotese.slice(0, 100)}{exp.hipotese.length > 100 ? '…' : ''}
        </p>
      )}
      {exp.aprendizado && (
        <div style={{ fontSize: 11, padding: '6px 8px', background: 'rgba(201,168,76,0.08)', borderRadius: 6, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: '#C9A84C' }}>💡 </span>
          {exp.aprendizado.slice(0, 80)}{exp.aprendizado.length > 80 ? '…' : ''}
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        {proximo ? (
          <button onClick={() => onMover(proximo)} className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}>
            <ArrowRight size={10} /> {STATUS_CONFIG[proximo].label}
          </button>
        ) : <span />}
        <div className="flex gap-1">
          <button onClick={onEditar} className="icon-btn"><Pencil size={11} /></button>
          <button onClick={onDeletar} className="icon-btn"><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Aba: Kanban ─────────────────────────────────────────────────────

function TabKanban({
  experimentos, onEditar, onDeletar, onMover, onNovo,
}: {
  experimentos: GrowthExperimento[]
  onEditar: (e: GrowthExperimento) => void
  onDeletar: (id: string) => void
  onMover: (id: string, status: StatusExperimento) => void
  onNovo: () => void
}) {
  function handleDrop(e: React.DragEvent, status: StatusExperimento) {
    const id = e.dataTransfer.getData('expId')
    if (id) onMover(id, status)
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 800 }}>
        {COLUNAS_KANBAN.map((col) => {
          const cfg = STATUS_CONFIG[col]
          const itens = experimentos.filter((e) => e.status === col).sort((a, b) => b.score - a.score)
          return (
            <div
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col)}
              style={{ flex: 1, minWidth: 200 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: cfg.cor, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{itens.length}</span>
                </div>
                {col === 'backlog' && (
                  <button onClick={onNovo} className="icon-btn" title="Novo experimento"><Plus size={13} /></button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {itens.map((exp) => (
                  <CardExp
                    key={exp.id}
                    exp={exp}
                    onEditar={() => onEditar(exp)}
                    onDeletar={() => onDeletar(exp.id)}
                    onMover={(s) => onMover(exp.id, s)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Aba: Funil AARRR ───────────────────────────────────────────────

function TabFunilAARRR({ experimentos }: { experimentos: GrowthExperimento[] }) {
  const { vendas, doacoesUGC } = usePurionStore()

  const metricas = useMemo(() => {
    const agora = Date.now()
    const mes = new Date()
    const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`

    const vendasMes = vendas.filter((v) =>
      v.dataVenda.startsWith(mesStr) && (v.valorTotal ?? v.valorLiquido) > 0
    )
    const faturamentoMes = vendasMes
      .filter((v) => v.statusPagamento === 'pago')
      .reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)

    // Retenção: clientes que compraram 2+ vezes
    const comprasPorCliente = new Map<string, number>()
    vendas.forEach((v) => {
      if ((v.valorTotal ?? v.valorLiquido) > 0 && v.clienteNome) {
        comprasPorCliente.set(v.clienteNome, (comprasPorCliente.get(v.clienteNome) ?? 0) + 1)
      }
    })
    const recompras = Array.from(comprasPorCliente.values()).filter((n) => n >= 2).length
    const totalClientes = comprasPorCliente.size
    const taxaRetencao = totalClientes > 0 ? Math.round((recompras / totalClientes) * 100) : 0

    // UGC como proxy de recomendação
    const ugcEntregues = doacoesUGC.filter((d) => d.entregueConteudo).length

    return {
      aquisicao: vendasMes.length,
      faturamentoMes,
      taxaRetencao,
      ugcEntregues,
    }
  }, [vendas, doacoesUGC])

  const etapas: Array<{
    id: EtapaAARRR
    northStar?: boolean
    metrica: string
    valor: string | number
    desc: string
    expAtivos: number
  }> = [
    {
      id: 'aquisicao',
      metrica: 'Novos pedidos este mês',
      valor: metricas.aquisicao,
      desc: 'Quantidade de novos compradores chegando',
      expAtivos: experimentos.filter((e) => e.etapa === 'aquisicao' && e.status === 'rodando').length,
    },
    {
      id: 'ativacao',
      metrica: 'Taxa de aprovação Appmax',
      valor: '—',
      desc: 'Pedido feito e pago com sucesso',
      expAtivos: experimentos.filter((e) => e.etapa === 'ativacao' && e.status === 'rodando').length,
    },
    {
      id: 'retencao',
      northStar: true,
      metrica: `${metricas.taxaRetencao}% de recompra`,
      valor: metricas.taxaRetencao,
      desc: 'Clientes ativos que recompram — North Star da Purion',
      expAtivos: experimentos.filter((e) => e.etapa === 'retencao' && e.status === 'rodando').length,
    },
    {
      id: 'receita',
      metrica: 'Faturamento mensal',
      valor: `R$ ${metricas.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      desc: 'Receita paga confirmada no mês',
      expAtivos: experimentos.filter((e) => e.etapa === 'receita' && e.status === 'rodando').length,
    },
    {
      id: 'recomendacao',
      metrica: `${metricas.ugcEntregues} conteúdos UGC`,
      valor: metricas.ugcEntregues,
      desc: 'Criadores que entregaram conteúdo — motor de indicação orgânica',
      expAtivos: experimentos.filter((e) => e.etapa === 'recomendacao' && e.status === 'rodando').length,
    },
  ]

  const maxBarWidth = 100

  return (
    <div className="flex flex-col gap-4">
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C', marginBottom: 4 }}>
          ⭐ North Star: clientes/parceiros ativos que recompram
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Foco em retenção &gt; pico de vendas. Um cliente que recompra vale 3× mais do que um novo cliente.
          Recompra alta = produto funciona. Recompra baixa = problema de produto ou entrega.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {etapas.map((etapa, i) => {
          const cfg = ETAPA_AARRR[etapa.id]
          const EtapaIcon = cfg.icon
          const largura = maxBarWidth - i * 12
          return (
            <div key={etapa.id} style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 10, overflow: 'hidden', border: `1px solid ${etapa.northStar ? '#C9A84C' : 'var(--border)'}`,
                background: etapa.northStar ? 'rgba(201,168,76,0.05)' : 'var(--bg-surface-2)',
                marginLeft: `${i * 12}px`, marginRight: `${i * 12}px`,
                padding: '14px 16px',
              }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${cfg.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <EtapaIcon size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.cor }}>{cfg.label}</span>
                        {etapa.northStar && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#C9A84C', color: '#000', borderRadius: 999, padding: '1px 6px' }}>
                            NORTH STAR
                          </span>
                        )}
                        {etapa.expAtivos > 0 && (
                          <span style={{ fontSize: 10, color: '#5B8FE8' }}>
                            {etapa.expAtivos} exp. rodando
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{etapa.desc}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: cfg.cor }}>{etapa.valor}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{etapa.metrica}</p>
                  </div>
                </div>
              </div>
              {i < etapas.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0', position: 'relative', zIndex: 1 }}>
                  <ChevronRight size={14} style={{ transform: 'rotate(90deg)', color: 'var(--text-secondary)', opacity: 0.4 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚠️ Métricas de Vaidade vs. Métricas Reais</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
          <div>
            <p style={{ fontWeight: 600, color: '#E85238', marginBottom: 4 }}>❌ Vaidade (enganam)</p>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Seguidores no Instagram</li>
              <li>Pico de vendas isolado</li>
              <li>Visualizações de reels</li>
              <li>Taxa de abertura de e-mail</li>
            </ul>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#4CAF7A', marginBottom: 4 }}>✅ Reais (movem o negócio)</p>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Taxa de recompra (%)</li>
              <li>LTV / ticket médio crescente</li>
              <li>NPS / avaliações orgânicas</li>
              <li>Custo de aquisição (CAC)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Aba: Aprendizados ───────────────────────────────────────────────

function TabAprendizados({ experimentos }: { experimentos: GrowthExperimento[] }) {
  const comAprendizado = useMemo(
    () => experimentos.filter((e) => e.aprendizado).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [experimentos]
  )

  if (comAprendizado.length === 0) {
    return (
      <div className="empty-state">
        <BookOpen size={40} className="empty-state-icon" />
        <p className="empty-state-title">Banco de Aprendizados vazio</p>
        <p className="empty-state-subtitle">Quando um experimento for concluído (Escalar/Iterar/Matar), o aprendizado aparece aqui.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {comAprendizado.length} aprendizado{comAprendizado.length !== 1 ? 's' : ''} documentados — falha documentada é ativo.
      </p>
      {comAprendizado.map((exp) => {
        const cfg = STATUS_CONFIG[exp.status]
        const aarrr = ETAPA_AARRR[exp.etapa]
        return (
          <div key={exp.id} className="card-purion" style={{ padding: '14px 16px' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{exp.nome}</span>
                  <EtapaBadge etapa={exp.etapa} />
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${cfg.cor}18`, color: cfg.cor }}>
                    {cfg.label}
                  </span>
                </div>
                {exp.metricaAlvo && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Métrica: {exp.metricaAlvo}</p>
                )}
              </div>
              <ScoreBadge score={exp.score} />
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 4 }}>💡 Aprendizado</p>
              <p style={{ fontSize: 12, lineHeight: 1.5 }}>{exp.aprendizado}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────

type TabId = 'kanban' | 'aarrr' | 'aprendizados'

export function GrowthPage() {
  const { experimentos, carregando, criarExperimento, atualizarExperimento, deletarExperimento, moverStatus } = useGrowth()
  const [aba, setAba] = useState<TabId>('kanban')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<GrowthExperimento | null>(null)

  const kpis = useMemo(() => ({
    total: experimentos.length,
    rodando: experimentos.filter((e) => e.status === 'rodando').length,
    escalando: experimentos.filter((e) => e.status === 'escalar').length,
    scoreTop: experimentos.filter((e) => e.status === 'backlog').sort((a, b) => b.score - a.score)[0],
  }), [experimentos])

  async function handleSalvar(dados: Partial<NovoExperimento>) {
    if (editando) await atualizarExperimento(editando.id, dados)
    else await criarExperimento(dados as NovoExperimento)
    setModalAberto(false)
    setEditando(null)
  }

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'kanban',       label: 'Backlog ICE' },
    { id: 'aarrr',        label: 'Funil AARRR' },
    { id: 'aprendizados', label: 'Aprendizados' },
  ]

  return (
    <div className="page-content section-gap">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="page-title">Growth</h1>
          <p className="caption mt-1">Experimentação ICE · Funil AARRR · Banco de Aprendizados</p>
        </div>
        <button onClick={() => { setEditando(null); setModalAberto(true) }} className="btn btn-primary btn-sm">
          <Plus size={12} /> Novo Experimento
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Total ICE</span>
            <FlaskConical size={14} className="text-[var(--text-secondary)] opacity-60" />
          </div>
          <span className="kpi-value">{kpis.total}</span>
          <span className="caption">experimentos</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Rodando agora</span>
            <TrendingUp size={14} style={{ color: '#5B8FE8', opacity: 0.7 }} />
          </div>
          <span className="kpi-value" style={{ color: '#5B8FE8' }}>{kpis.rodando}</span>
          <span className="caption">em execução</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Para escalar</span>
            <Award size={14} style={{ color: '#4CAF7A', opacity: 0.7 }} />
          </div>
          <span className="kpi-value" style={{ color: '#4CAF7A' }}>{kpis.escalando}</span>
          <span className="caption">validados</span>
        </div>
        {kpis.scoreTop && (
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Próximo da fila</span>
              <Target size={14} style={{ color: '#C9A84C', opacity: 0.7 }} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{kpis.scoreTop.nome}</p>
            <div className="flex items-center gap-1 mt-1">
              <ScoreBadge score={kpis.scoreTop.score} />
              <EtapaBadge etapa={kpis.scoreTop.etapa} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={aba === t.id
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
              : { color: 'var(--text-secondary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="empty-state"><p className="empty-state-title">Carregando…</p></div>
      ) : aba === 'kanban' ? (
        <TabKanban
          experimentos={experimentos}
          onEditar={(e) => { setEditando(e); setModalAberto(true) }}
          onDeletar={deletarExperimento}
          onMover={moverStatus}
          onNovo={() => { setEditando(null); setModalAberto(true) }}
        />
      ) : aba === 'aarrr' ? (
        <TabFunilAARRR experimentos={experimentos} />
      ) : (
        <TabAprendizados experimentos={experimentos} />
      )}

      {modalAberto && (
        <ModalExperimento
          editando={editando}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
          onSalvar={handleSalvar}
        />
      )}
    </div>
  )
}

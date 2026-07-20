'use client'

import { useState } from 'react'
import { usePurionStore } from '@/store'
import { useDoacoesUGC } from '@/hooks/useDoacoesUGC'
import type { NovaDoacaoUGC } from '@/hooks/useDoacoesUGC'
import type { StatusEnvioUGC } from '@/store'
import { Package, Plus, Truck, CheckCircle2, Clock, X, CheckSquare, Square } from 'lucide-react'

const STATUS_LABELS: Record<StatusEnvioUGC, string> = {
  aguardando: 'Aguardando',
  postado: 'Postado',
  entregue: 'Entregue',
}

const STATUS_COLORS: Record<StatusEnvioUGC, string> = {
  aguardando: '#C9A84C',
  postado: '#5B8FE8',
  entregue: '#22C55E',
}

const STATUS_ICONS: Record<StatusEnvioUGC, React.ReactNode> = {
  aguardando: <Clock size={11} />,
  postado: <Truck size={11} />,
  entregue: <CheckCircle2 size={11} />,
}

function StatusBadge({ status }: { status: StatusEnvioUGC }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99,
      background: `${STATUS_COLORS[status]}18`,
      color: STATUS_COLORS[status],
      fontSize: 11, fontWeight: 600,
    }}>
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  )
}

const FILTROS: { id: StatusEnvioUGC | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'postado', label: 'Postado' },
  { id: 'entregue', label: 'Entregue' },
]

const CONTRAPARTIDAS = ['Reels', 'Stories', 'TikTok', 'Review', 'Foto', 'Permuta simples', 'Outro']

export function DoacoesUGCPage() {
  const { doacoesUGC, creators } = usePurionStore()
  const { criarDoacao, atualizarDoacao, mudarStatusEnvio, marcarConteudoEntregue, deletarDoacao } = useDoacoesUGC()

  const [filtro, setFiltro] = useState<StatusEnvioUGC | 'todos'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [rastreioModalId, setRastreioModalId] = useState<string | null>(null)
  const [rastreio, setRastreio] = useState('')

  const [form, setForm] = useState<NovaDoacaoUGC>({
    quantidade: 1, creatorId: null, contrapartida: '', custoTotal: null, observacoes: null,
  })

  const lista = filtro === 'todos' ? doacoesUGC : doacoesUGC.filter((d) => d.statusEnvio === filtro)

  // KPIs
  const totalEnviados = doacoesUGC.reduce((s, d) => s + d.quantidade, 0)
  const totalConteudos = doacoesUGC.filter((d) => d.entregueConteudo).length
  const totalCusto = doacoesUGC.reduce((s, d) => s + (d.custoTotal ?? d.quantidade * 23.99), 0)
  const totalAguardando = doacoesUGC.filter((d) => d.statusEnvio === 'aguardando').length

  function abrirCriar() {
    setEditandoId(null)
    setForm({ quantidade: 1, creatorId: null, contrapartida: '', custoTotal: null, observacoes: null })
    setModalOpen(true)
  }

  function abrirEditar(id: string) {
    const d = doacoesUGC.find((x) => x.id === id)
    if (!d) return
    setEditandoId(id)
    setForm({
      quantidade: d.quantidade, creatorId: d.creatorId,
      contrapartida: d.contrapartida ?? '', custoTotal: d.custoTotal, observacoes: d.observacoes,
    })
    setModalOpen(true)
  }

  async function salvar() {
    if (editandoId) {
      await atualizarDoacao(editandoId, form)
    } else {
      await criarDoacao(form)
    }
    setModalOpen(false)
  }

  async function postar(id: string) {
    await mudarStatusEnvio(id, 'postado', rastreio || undefined)
    setRastreioModalId(null)
    setRastreio('')
  }

  return (
    <div className="page-content section-gap">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Doações UGC</h1>
          <p className="caption mt-1">Produtos enviados para creators em troca de conteúdo</p>
        </div>
        <button className="btn btn-primary" onClick={abrirCriar} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} />
          Nova Doação
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="kpi-card" style={{ minWidth: 140 }}>
          <span className="caption">Total enviado</span>
          <span style={{ fontSize: 28, fontWeight: 700 }}>{totalEnviados}</span>
          <span className="caption">frascos</span>
        </div>
        <div className="kpi-card" style={{ minWidth: 140 }}>
          <span className="caption">Aguardando</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#C9A84C' }}>{totalAguardando}</span>
          <span className="caption">doações</span>
        </div>
        <div className="kpi-card" style={{ minWidth: 140 }}>
          <span className="caption">Conteúdos entregues</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#22C55E' }}>{totalConteudos}</span>
          <span className="caption">de {doacoesUGC.length}</span>
        </div>
        <div className="kpi-card" style={{ minWidth: 140 }}>
          <span className="caption">Custo total</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>R$ {totalCusto.toFixed(2)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
            style={filtro === f.id
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
              : { color: 'var(--text-secondary)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Nenhuma doação {filtro !== 'todos' ? `com status "${STATUS_LABELS[filtro as StatusEnvioUGC]}"` : 'registrada'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map((d) => {
            const creator = creators.find((c) => c.id === d.creatorId)
            return (
              <div key={d.id} className="card-purion" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {creator ? creator.nome : 'Creator não vinculado'}
                      </span>
                      <StatusBadge status={d.statusEnvio} />
                    </div>
                    <div className="caption">
                      {d.quantidade} frasco(s) · {d.contrapartida ?? 'sem contrapartida'}
                      {d.custoTotal != null && ` · R$ ${d.custoTotal.toFixed(2)}`}
                    </div>
                    {d.codigoRastreio && (
                      <div className="caption" style={{ marginTop: 2 }}>
                        Rastreio: {d.codigoRastreio}
                      </div>
                    )}
                    {d.observacoes && (
                      <div className="caption" style={{ marginTop: 2, fontStyle: 'italic' }}>{d.observacoes}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Conteúdo entregue toggle */}
                    <button
                      onClick={() => marcarConteudoEntregue(d.id, !d.entregueConteudo)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 6, fontSize: 12,
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: d.entregueConteudo ? 'rgba(34,197,94,0.1)' : 'transparent',
                        color: d.entregueConteudo ? '#22C55E' : 'var(--text-secondary)',
                      }}
                    >
                      {d.entregueConteudo ? <CheckSquare size={13} /> : <Square size={13} />}
                      Conteúdo
                    </button>

                    {d.statusEnvio === 'aguardando' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => { setRastreioModalId(d.id); setRastreio('') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                      >
                        <Truck size={13} />
                        Postar
                      </button>
                    )}
                    {d.statusEnvio === 'postado' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => mudarStatusEnvio(d.id, 'entregue')}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                      >
                        <CheckCircle2 size={13} />
                        Entregue
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      onClick={() => abrirEditar(d.id)}
                      style={{ fontSize: 12 }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { if (confirm('Excluir doação?')) deletarDoacao(d.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal rastreio ao postar */}
      {rastreioModalId && (
        <div className="modal-backdrop" onClick={() => setRastreioModalId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Marcar como Postado</h2>
              <button onClick={() => setRastreioModalId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <label className="label-purion">Código de rastreio (opcional)</label>
            <input
              className="input-purion mt-1 mb-4"
              placeholder="BR123456789BR"
              value={rastreio}
              onChange={(e) => setRastreio(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setRastreioModalId(null)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={() => postar(rastreioModalId)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editandoId ? 'Editar Doação' : 'Nova Doação UGC'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label-purion">Creator</label>
                <select
                  className="input-purion mt-1"
                  value={form.creatorId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, creatorId: e.target.value || null }))}
                >
                  <option value="">Sem creator vinculado</option>
                  {creators.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="label-purion">Quantidade</label>
                <input
                  className="input-purion mt-1"
                  type="number" min={1}
                  value={form.quantidade}
                  onChange={(e) => setForm((p) => ({ ...p, quantidade: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="label-purion">Contrapartida</label>
                <select
                  className="input-purion mt-1"
                  value={form.contrapartida ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, contrapartida: e.target.value || null }))}
                >
                  <option value="">Selecione</option>
                  {CONTRAPARTIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label-purion">Custo total (R$)</label>
                <input
                  className="input-purion mt-1"
                  type="number" step="0.01" min={0}
                  placeholder={String((form.quantidade * 23.99).toFixed(2))}
                  value={form.custoTotal ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, custoTotal: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>

              <div>
                <label className="label-purion">Observações</label>
                <textarea
                  className="input-purion mt-1"
                  rows={2}
                  value={form.observacoes ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value || null }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={salvar}>{editandoId ? 'Salvar' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

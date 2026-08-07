'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Milestone, Trash2 } from 'lucide-react'
import { useEstrategiaDecisoes, type NovaDecisao } from '@/hooks/useEstrategia'
import { SecaoNotas } from './SecaoNotas'

const CATEGORIAS: Array<{ id: string; label: string; cor: string }> = [
  { id: 'preco', label: 'Preço', cor: '#C9A84C' },
  { id: 'produto', label: 'Produto', cor: '#5B8FE8' },
  { id: 'marca', label: 'Marca', cor: '#A855F7' },
  { id: 'operacao', label: 'Operação', cor: '#4CAF7A' },
  { id: 'growth', label: 'Growth', cor: '#E8A838' },
  { id: 'geral', label: 'Geral', cor: '#B8B8B8' },
]

function corCategoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id)?.cor ?? '#B8B8B8'
}
function labelCategoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id)?.label ?? id
}

function fmtData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const FORM_VAZIO: NovaDecisao = {
  data: new Date().toISOString().slice(0, 10),
  titulo: '', justificativa: '', categoria: 'geral',
}

function ModalDecisao({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (d: NovaDecisao) => void }) {
  const [form, setForm] = useState<NovaDecisao>(FORM_VAZIO)

  function set<K extends keyof NovaDecisao>(campo: K, val: NovaDecisao[K]) {
    setForm((f) => ({ ...f, [campo]: val }))
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    onSalvar({ ...form, titulo: form.titulo.trim(), justificativa: form.justificativa.trim() })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Registrar Decisão</h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Data</label>
              <input type="date" className="input-purion w-full" value={form.data} onChange={(e) => set('data', e.target.value)} required />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Categoria</label>
              <select className="select-purion w-full" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="kpi-label mb-1 block">Título *</label>
            <input className="input-purion w-full" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex: Preço oficial fixado em R$109,90" required />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Justificativa</label>
            <textarea className="input-purion w-full" rows={3} value={form.justificativa} onChange={(e) => set('justificativa', e.target.value)} placeholder="Por que essa decisão foi tomada?" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TabDecisoes() {
  const { decisoes, carregando, criarDecisao, deletarDecisao } = useEstrategiaDecisoes()
  const [modalAberto, setModalAberto] = useState(false)
  const [filtro, setFiltro] = useState<string>('todas')

  const filtradas = useMemo(
    () => filtro === 'todas' ? decisoes : decisoes.filter((d) => d.categoria === filtro),
    [decisoes, filtro]
  )

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando decisões…</p></div>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
          <button
            onClick={() => setFiltro('todas')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={filtro === 'todas' ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={filtro === c.id ? { background: `${c.cor}22`, color: c.cor } : { color: 'var(--text-secondary)' }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModalAberto(true)} className="btn btn-primary btn-sm">
          <Plus size={12} /> Registrar Decisão
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div className="empty-state">
          <Milestone size={36} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma decisão registrada</p>
          <p className="empty-state-subtitle">Preço R$109,90, fragrância única, North Star… registre os marcos que definem a estratégia.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
          <div className="flex flex-col gap-4">
            {filtradas.map((d) => (
              <div key={d.id} style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: 999,
                  background: corCategoria(d.categoria), border: '2px solid var(--bg-app)',
                }} />
                <div className="card-purion" style={{ padding: '12px 16px' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtData(d.data)}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                          background: `${corCategoria(d.categoria)}18`, color: corCategoria(d.categoria),
                        }}>
                          {labelCategoria(d.categoria)}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{d.titulo}</p>
                      {d.justificativa && (
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{d.justificativa}</p>
                      )}
                    </div>
                    <button onClick={() => deletarDecisao(d.id)} className="icon-btn"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalDecisao
          onFechar={() => setModalAberto(false)}
          onSalvar={async (d) => { await criarDecisao(d); setModalAberto(false) }}
        />
      )}

      <SecaoNotas secao="decisoes" />
    </div>
  )
}

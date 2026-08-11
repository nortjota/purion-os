'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Plus, Pencil, Trash2, X, PackageSearch } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { ItemEstoque } from '@/store'
import { useProducao } from '@/hooks/useProducao'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatarDataBR } from '@/lib/calculos'
import { INSUMO_TIPO_LABEL, capacidadeFrascos, capacidadeRestanteGeral, formatarMoeda } from './producaoHelpers'

const TIPOS: ItemEstoque['tipo'][] = ['essencia', 'alcool', 'frasco', 'tampa', 'rotulo', 'caixa', 'embalagem', 'outro']

function ModalInsumo({ item, onSalvar, onFechar }: {
  item?: ItemEstoque
  onSalvar: (dados: Omit<ItemEstoque, 'id'>) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    nome: item?.nome ?? '',
    tipo: item?.tipo ?? 'outro' as ItemEstoque['tipo'],
    fornecedor: item?.fornecedor ?? '',
    quantidadeAtual: String(item?.quantidadeAtual ?? ''),
    unidade: item?.unidade ?? 'un',
    quantidadeMinima: String(item?.quantidadeMinima ?? ''),
    custoUnitario: String(item?.custoUnitario ?? ''),
    rendimentoPorFrasco: String(item?.rendimentoPorFrasco ?? 1),
    notas: item?.notas ?? '',
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    onSalvar({
      nome: form.nome.trim(),
      tipo: form.tipo,
      fornecedor: form.fornecedor.trim(),
      quantidadeAtual: parseFloat(form.quantidadeAtual) || 0,
      unidade: form.unidade.trim() || 'un',
      quantidadeMinima: parseFloat(form.quantidadeMinima) || 0,
      custoUnitario: parseFloat(form.custoUnitario) || 0,
      rendimentoPorFrasco: parseFloat(form.rendimentoPorFrasco) || 1,
      ultimaEntrada: item?.ultimaEntrada ?? new Date().toISOString().slice(0, 10),
      notas: form.notas,
    })
    onFechar()
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{item ? 'Editar Insumo' : 'Novo Insumo'}</h3>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="label-purion">Nome*</label>
            <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} className="input-purion" placeholder="Ex: Plástico bolha" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-purion">Tipo</label>
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value as ItemEstoque['tipo'])} className="select-purion">
                {TIPOS.map((t) => <option key={t} value={t}>{INSUMO_TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-purion">Unidade</label>
              <input type="text" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} className="input-purion" placeholder="un, ml, kg..." />
            </div>
          </div>
          <div>
            <label className="label-purion">Fornecedor</label>
            <input type="text" value={form.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} className="input-purion" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-purion">Quantidade atual</label>
              <input type="number" step="0.01" value={form.quantidadeAtual} onChange={(e) => set('quantidadeAtual', e.target.value)} className="input-purion" />
            </div>
            <div>
              <label className="label-purion">Mínimo (alerta)</label>
              <input type="number" step="0.01" value={form.quantidadeMinima} onChange={(e) => set('quantidadeMinima', e.target.value)} className="input-purion" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-purion">Custo unitário (R$)</label>
              <input type="number" step="0.01" value={form.custoUnitario} onChange={(e) => set('custoUnitario', e.target.value)} className="input-purion" />
            </div>
            <div>
              <label className="label-purion">Consumo por frasco</label>
              <input type="number" step="0.01" value={form.rendimentoPorFrasco} onChange={(e) => set('rendimentoPorFrasco', e.target.value)} className="input-purion" />
            </div>
          </div>
          <p className="caption">Quantas unidades deste insumo são gastas para produzir 1 frasco.</p>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProducaoInsumosView() {
  const { estoque } = usePurionStore()
  const { adicionarInsumo, atualizarInsumo, deletarInsumo } = useProducao()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ItemEstoque | undefined>(undefined)
  const [deletando, setDeletando] = useState<ItemEstoque | null>(null)

  const { capacidade, gargalo } = useMemo(() => capacidadeRestanteGeral(estoque), [estoque])
  const emAlerta = useMemo(() => estoque.filter((i) => i.quantidadeAtual < i.quantidadeMinima), [estoque])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Capacidade restante */}
      {estoque.length > 0 && (
        <div className="card-purion" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
            <PackageSearch size={20} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Capacidade restante com os insumos atuais</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#C9A84C' }}>{capacidade} frascos</p>
            {gargalo && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Gargalo: {gargalo.nome} ({gargalo.quantidadeAtual} {gargalo.unidade})</p>}
          </div>
        </div>
      )}

      {emAlerta.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 16px', color: '#EF4444',
        }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13 }}>
            {emAlerta.map((i) => i.nome).join(', ')} — abaixo do mínimo, repor
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, fontWeight: 600 }}>Insumos ({estoque.length})</p>
        <button onClick={() => { setEditando(undefined); setModalAberto(true) }} className="btn btn-primary btn-sm">
          <Plus size={12} /> Novo insumo
        </button>
      </div>

      {estoque.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum insumo cadastrado</p>
          <p className="empty-state-subtitle">Cadastre essência, frascos, tampas, rótulos, caixas...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {estoque.map((item) => {
            const alerta = item.quantidadeAtual < item.quantidadeMinima
            const cap = capacidadeFrascos(item)
            return (
              <div key={item.id} className="card-purion" style={{ padding: '14px 16px', borderColor: alerta ? 'rgba(239,68,68,0.4)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {INSUMO_TIPO_LABEL[item.tipo]}
                    </span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.nome}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => { setEditando(item); setModalAberto(true) }} className="icon-btn"><Pencil size={11} /></button>
                    <button onClick={() => setDeletando(item)} className="icon-btn"><Trash2 size={11} /></button>
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: alerta ? '#EF4444' : 'var(--text-primary)' }}>
                  {item.quantidadeAtual} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{item.unidade}</span>
                </p>
                {alerta && (
                  <p style={{ fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <AlertTriangle size={10} /> Cobre só {cap} frascos — repor
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Rende ~{cap} frascos</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Mín: {item.quantidadeMinima} {item.unidade}</p>
                {item.fornecedor && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.fornecedor}</p>}
                <p style={{ fontSize: 10, color: '#8A8A8A', marginTop: 4 }}>
                  {formatarMoeda(item.custoUnitario)}/{item.unidade} · atualizado {item.ultimaEntrada ? formatarDataBR(item.ultimaEntrada) : '—'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalInsumo
          item={editando}
          onSalvar={(dados) => editando ? atualizarInsumo(editando.id, dados) : adicionarInsumo(dados)}
          onFechar={() => setModalAberto(false)}
        />
      )}

      <ConfirmModal
        open={!!deletando}
        title="Excluir Insumo"
        message={`Deseja excluir "${deletando?.nome}"?`}
        onConfirm={() => { if (deletando) { deletarInsumo(deletando.id); setDeletando(null) } }}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}

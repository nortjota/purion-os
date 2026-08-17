'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Plus, Pencil, Trash2, X, PackageSearch, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  useInsumos, useBomReceita, capacidadeProducao, formatarMoedaBR,
  CATEGORIA_LABEL, CATEGORIA_OPCOES,
  type Insumo, type CategoriaInsumo,
} from '@/hooks/useInsumosBOM'

function ModalInsumo({ item, onSalvar, onFechar }: {
  item?: Insumo
  onSalvar: (dados: {
    nome: string; categoria: CategoriaInsumo; unidade: string
    quantidadeAtual: number; quantidadeMinima: number; custoUnitario: number
    fornecedor: string | null; notas: string | null
  }) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    nome: item?.nome ?? '',
    categoria: item?.categoria ?? 'liquido' as CategoriaInsumo,
    unidade: item?.unidade ?? (item?.categoria === 'liquido' ? 'ml' : 'un'),
    quantidadeAtual: String(item?.quantidadeAtual ?? ''),
    quantidadeMinima: String(item?.quantidadeMinima ?? ''),
    custoUnitario: String(item?.custoUnitario ?? ''),
    fornecedor: item?.fornecedor ?? '',
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
      categoria: form.categoria,
      unidade: form.unidade.trim() || 'un',
      quantidadeAtual: parseFloat(form.quantidadeAtual) || 0,
      quantidadeMinima: parseFloat(form.quantidadeMinima) || 0,
      custoUnitario: parseFloat(form.custoUnitario) || 0,
      fornecedor: form.fornecedor.trim() || null,
      notas: form.notas.trim() || null,
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
            <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} className="input-purion" placeholder="Ex: Essência PURION" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-purion">Categoria</label>
              <select value={form.categoria} onChange={(e) => set('categoria', e.target.value as CategoriaInsumo)} className="select-purion">
                {CATEGORIA_OPCOES.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-purion">Unidade</label>
              <input type="text" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} className="input-purion" placeholder="ml, un..." />
            </div>
          </div>
          <div>
            <label className="label-purion">Fornecedor</label>
            <input type="text" value={form.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} className="input-purion" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-purion">Quantidade atual{item ? ' (não editar aqui)' : ''}</label>
              <input type="number" step="0.01" disabled={!!item} value={form.quantidadeAtual} onChange={(e) => set('quantidadeAtual', e.target.value)} className="input-purion" />
            </div>
            <div>
              <label className="label-purion">Mínimo (alerta)</label>
              <input type="number" step="0.01" value={form.quantidadeMinima} onChange={(e) => set('quantidadeMinima', e.target.value)} className="input-purion" />
            </div>
          </div>
          <div>
            <label className="label-purion">Custo unitário (R$)</label>
            <input type="number" step="0.01" value={form.custoUnitario} onChange={(e) => set('custoUnitario', e.target.value)} className="input-purion" />
          </div>
          {item && (
            <p className="caption">Para mudar a quantidade, use &ldquo;Registrar compra&rdquo; ou &ldquo;Ajuste manual&rdquo; — assim fica registrado no histórico.</p>
          )}
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalMovimentacao({ item, modo, onConfirmar, onFechar }: {
  item: Insumo
  modo: 'compra' | 'ajuste'
  onConfirmar: (valor: number, custoNovo?: number) => void
  onFechar: () => void
}) {
  const [quantidade, setQuantidade] = useState('')
  const [custoNovo, setCustoNovo] = useState(String(item.custoUnitario))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = parseFloat(quantidade)
    if (Number.isNaN(v)) return
    onConfirmar(v, modo === 'compra' ? (parseFloat(custoNovo) || item.custoUnitario) : undefined)
    onFechar()
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{modo === 'compra' ? 'Registrar compra' : 'Ajuste manual'}</h3>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <p className="caption">{item.nome} — saldo atual: {item.quantidadeAtual} {item.unidade}</p>
          <div>
            <label className="label-purion">{modo === 'compra' ? `Quantidade comprada (${item.unidade})` : `Nova contagem (${item.unidade})`}</label>
            <input type="number" step="0.01" autoFocus value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="input-purion" placeholder={modo === 'compra' ? 'ex: 500' : `ex: ${item.quantidadeAtual}`} />
            {modo === 'ajuste' && <p className="caption mt-1">Informe a quantidade real após contagem física (correção de perda/sobra).</p>}
          </div>
          {modo === 'compra' && (
            <div>
              <label className="label-purion">Custo unitário desta compra (R$) — opcional</label>
              <input type="number" step="0.01" value={custoNovo} onChange={(e) => setCustoNovo(e.target.value)} className="input-purion" />
            </div>
          )}
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProducaoInsumosView() {
  const { insumos, carregando, emAlerta, criarInsumo, atualizarInsumo, deletarInsumo, registrarCompra, ajustarManual } = useInsumos()
  const { itens: receita } = useBomReceita()

  const [modalCadastro, setModalCadastro] = useState<{ item?: Insumo } | null>(null)
  const [modalMov, setModalMov] = useState<{ item: Insumo; modo: 'compra' | 'ajuste' } | null>(null)
  const [deletando, setDeletando] = useState<Insumo | null>(null)

  const { capacidade, gargalo } = useMemo(() => capacidadeProducao(receita, insumos), [receita, insumos])

  const porCategoria = useMemo(() => {
    return CATEGORIA_OPCOES.map((cat) => ({
      categoria: cat,
      itens: insumos.filter((i) => i.categoria === cat),
    })).filter((g) => g.itens.length > 0)
  }, [insumos])

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando insumos…</p></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Capacidade restante — a receita (BOM) já cruzada com os saldos */}
      {receita.length > 0 && (
        <div className="card-purion" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
            <PackageSearch size={20} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Capacidade de produção com os insumos atuais</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#C9A84C' }}>{capacidade} frascos</p>
            {gargalo && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Limitado por: {gargalo.nome} ({gargalo.quantidadeAtual} {gargalo.unidade})</p>}
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
        <p style={{ fontSize: 13, fontWeight: 600 }}>Insumos ({insumos.length})</p>
        <button onClick={() => setModalCadastro({})} className="btn btn-primary btn-sm">
          <Plus size={12} /> Novo insumo
        </button>
      </div>

      {insumos.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum insumo cadastrado</p>
          <p className="empty-state-subtitle">Cadastre líquidos da formulação, embalagem do produto, embalagem de envio e etiquetas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {porCategoria.map((grupo) => (
            <div key={grupo.categoria}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                {CATEGORIA_LABEL[grupo.categoria]}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                {grupo.itens.map((item) => {
                  const alerta = item.quantidadeAtual <= item.quantidadeMinima
                  return (
                    <div key={item.id} className="card-purion" style={{ padding: '14px 16px', borderColor: alerta ? 'rgba(239,68,68,0.4)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.nome}</p>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => setModalCadastro({ item })} className="icon-btn" title="Editar cadastro"><Pencil size={11} /></button>
                          <button onClick={() => setDeletando(item)} className="icon-btn" title="Excluir"><Trash2 size={11} /></button>
                        </div>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: alerta ? '#EF4444' : 'var(--text-primary)' }}>
                        {item.quantidadeAtual} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{item.unidade}</span>
                      </p>
                      {alerta && (
                        <p style={{ fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <AlertTriangle size={10} /> Abaixo do mínimo — repor
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Mín: {item.quantidadeMinima} {item.unidade}</p>
                      {item.fornecedor && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.fornecedor}</p>}
                      <p style={{ fontSize: 10, color: '#8A8A8A', marginTop: 4, marginBottom: 10 }}>
                        {formatarMoedaBR(item.custoUnitario)}/{item.unidade}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setModalMov({ item, modo: 'compra' })} className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }}>
                          <ShoppingCart size={11} /> Compra
                        </button>
                        <button onClick={() => setModalMov({ item, modo: 'ajuste' })} className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }}>
                          <SlidersHorizontal size={11} /> Ajuste
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalCadastro && (
        <ModalInsumo
          item={modalCadastro.item}
          onSalvar={(dados) => modalCadastro.item ? atualizarInsumo(modalCadastro.item.id, dados) : criarInsumo(dados)}
          onFechar={() => setModalCadastro(null)}
        />
      )}

      {modalMov && (
        <ModalMovimentacao
          item={modalMov.item}
          modo={modalMov.modo}
          onConfirmar={(valor, custoNovo) => {
            if (modalMov.modo === 'compra') registrarCompra(modalMov.item.id, valor, custoNovo)
            else ajustarManual(modalMov.item.id, valor)
          }}
          onFechar={() => setModalMov(null)}
        />
      )}

      <ConfirmModal
        open={!!deletando}
        title="Excluir Insumo"
        message={`Deseja excluir "${deletando?.nome}"? Se ele estiver na receita, remova da receita antes.`}
        onConfirm={() => { if (deletando) { deletarInsumo(deletando.id); setDeletando(null) } }}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}

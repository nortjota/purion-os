'use client'

import { useMemo, useState } from 'react'
import { FlaskConical, Trash2, Plus, X } from 'lucide-react'
import { InlineEdit } from '@/components/ui/InlineEdit'
import {
  useInsumos, useBomReceita, custoReceitaPorUnidade, formatarMoedaBR, CATEGORIA_LABEL,
} from '@/hooks/useInsumosBOM'

export function ProducaoReceitaView() {
  const { insumos, carregando: carregandoInsumos } = useInsumos()
  const { itens: receita, carregando: carregandoReceita, definirQuantidade, removerDaReceita } = useBomReceita()
  const [modalAdicionar, setModalAdicionar] = useState(false)

  const linhasReceita = useMemo(() => {
    return receita
      .map((r) => ({ receita: r, insumo: insumos.find((i) => i.id === r.insumoId) }))
      .filter((l) => l.insumo)
      .sort((a, b) => (a.insumo!.categoria).localeCompare(b.insumo!.categoria))
  }, [receita, insumos])

  const insumosForaDaReceita = useMemo(
    () => insumos.filter((i) => !receita.some((r) => r.insumoId === i.id)),
    [insumos, receita]
  )

  const custoTotal = useMemo(() => custoReceitaPorUnidade(receita, insumos), [receita, insumos])

  if (carregandoInsumos || carregandoReceita) {
    return <div className="empty-state"><p className="empty-state-title">Carregando receita…</p></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card-purion" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
          <FlaskConical size={20} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Custo de 1 frasco PURION (calculado da receita)</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#C9A84C' }}>{formatarMoedaBR(custoTotal)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p style={{ fontSize: 13, fontWeight: 600 }}>Composição de 1 frasco ({linhasReceita.length} insumos)</p>
        <button onClick={() => setModalAdicionar(true)} className="btn btn-primary btn-sm" disabled={insumosForaDaReceita.length === 0}>
          <Plus size={12} /> Adicionar insumo
        </button>
      </div>

      {linhasReceita.length === 0 ? (
        <div className="empty-state">
          <FlaskConical size={32} className="empty-state-icon" />
          <p className="empty-state-title">Receita ainda vazia</p>
          <p className="empty-state-subtitle">Adicione os insumos que compõem 1 frasco: essência, base, frasco, tampa, rótulo…</p>
        </div>
      ) : (
        <div className="card-purion" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 40px', gap: 8,
            padding: '8px 16px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--bg-surface-2)',
          }}>
            <span>Insumo</span>
            <span>Qtd. por frasco</span>
            <span>Custo unit.</span>
            <span>Subtotal</span>
            <span />
          </div>
          {linhasReceita.map(({ receita: r, insumo }) => {
            const subtotal = r.quantidadePorUnidade * (insumo?.custoUnitario ?? 0)
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 40px', gap: 8, alignItems: 'center',
                padding: '10px 16px', borderTop: '1px solid var(--border)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insumo?.nome}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{CATEGORIA_LABEL[insumo!.categoria]}</p>
                </div>
                <span style={{ fontSize: 13 }}>
                  <InlineEdit
                    value={r.quantidadePorUnidade}
                    type="number"
                    onSave={(v) => definirQuantidade(r.insumoId, Math.max(0, Number(v) || 0))}
                  /> {insumo?.unidade}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatarMoedaBR(insumo?.custoUnitario ?? 0)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>{formatarMoedaBR(subtotal)}</span>
                <button onClick={() => removerDaReceita(r.insumoId)} className="icon-btn" style={{ color: '#E85238' }} title="Remover da receita">
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 40px', gap: 8,
            padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface-2)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total / frasco</span>
            <span /><span />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C' }}>{formatarMoedaBR(custoTotal)}</span>
            <span />
          </div>
        </div>
      )}

      {modalAdicionar && (
        <div className="modal-backdrop" onClick={() => setModalAdicionar(false)}>
          <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adicionar insumo à receita</h3>
              <button onClick={() => setModalAdicionar(false)} className="icon-btn border-0"><X size={16} /></button>
            </div>
            <div className="px-6 py-5">
              {insumosForaDaReceita.length === 0 ? (
                <p className="caption">Todos os insumos cadastrados já estão na receita.</p>
              ) : (
                <div className="flex flex-col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {insumosForaDaReceita.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => { definirQuantidade(i.id, 0); setModalAdicionar(false) }}
                      className="flex items-center justify-between"
                      style={{ padding: '8px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 13 }}>{i.nome}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{CATEGORIA_LABEL[i.categoria]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

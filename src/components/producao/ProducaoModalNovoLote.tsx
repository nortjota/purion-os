'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Lote, PerfilUsuario } from '@/store'
import { TESTES_OBRIGATORIOS, SOCIOS } from './producaoHelpers'

interface Props {
  onCriar: (lote: Omit<Lote, 'id'>) => void
  onFechar: () => void
}

function gerarCodigo() {
  const ano = new Date().getFullYear()
  return `LOTE-${ano}-${String(Date.now()).slice(-4)}`
}

export function ProducaoModalNovoLote({ onCriar, onFechar }: Props) {
  const [form, setForm] = useState({
    produto: 'PURION GT 60ml',
    dataInicio: new Date().toISOString().slice(0, 10),
    quantidade: '',
    responsavel: 'gabriel' as PerfilUsuario,
  })
  const [erro, setErro] = useState('')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qtd = parseInt(form.quantidade, 10)
    if (!qtd || qtd <= 0) { setErro('Informe a quantidade a produzir.'); return }
    onCriar({
      codigo: gerarCodigo(),
      produto: form.produto.trim() || 'PURION GT 60ml',
      quantidadeProduzida: qtd,
      quantidadeAprovada: 0,
      status: 'planejado',
      dataInicio: form.dataInicio,
      dataConclusao: null,
      responsavel: form.responsavel,
      testes: TESTES_OBRIGATORIOS.map((t) => ({
        tipo: t.tipo as Lote['testes'][number]['tipo'],
        resultado: 'pendente' as const,
        data: form.dataInicio,
        observacoes: '',
      })),
      insumos: [],
      notas: '',
    })
    onFechar()
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Novo Lote de Produção</h3>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="label-purion">Produto</label>
            <input type="text" value={form.produto} onChange={(e) => set('produto', e.target.value)} className="input-purion" />
          </div>
          <div>
            <label className="label-purion">Data de início</label>
            <input type="date" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} className="input-purion" />
          </div>
          <div>
            <label className="label-purion">Quantidade a produzir (frascos)</label>
            <input type="number" min={1} placeholder="ex: 200" value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} className="input-purion" autoFocus />
          </div>
          <div>
            <label className="label-purion">Responsável</label>
            <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)} className="select-purion">
              {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          {erro && <p style={{ fontSize: 12, color: '#E85238' }}>{erro}</p>}
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Criar lote</button>
          </div>
        </form>
      </div>
    </div>
  )
}

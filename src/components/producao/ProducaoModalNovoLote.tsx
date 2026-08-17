'use client'

import { useMemo, useState } from 'react'
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { PerfilUsuario } from '@/store'
import { SOCIOS } from './producaoHelpers'
import {
  useInsumos, useBomReceita, calcularConsumo, formatarMoedaBR,
} from '@/hooks/useInsumosBOM'

interface Props {
  onConfirmar: (
    dadosLote: { codigo: string; produto: string; quantidade: number; dataInicio: string; responsavel: PerfilUsuario; notas?: string },
    consumo: ReturnType<typeof calcularConsumo>,
  ) => Promise<{ ok: boolean; loteId: string | null }>
  onFechar: () => void
}

function gerarCodigo() {
  const ano = new Date().getFullYear()
  return `LOTE-${ano}-${String(Date.now()).slice(-4)}`
}

export function ProducaoModalNovoLote({ onConfirmar, onFechar }: Props) {
  const { insumos } = useInsumos()
  const { itens: receita } = useBomReceita()

  const [form, setForm] = useState({
    produto: 'PURION GT 60ml',
    dataInicio: new Date().toISOString().slice(0, 10),
    quantidade: '',
    responsavel: 'gabriel' as PerfilUsuario,
  })
  const [forcar, setForcar] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ quantidade: number } | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const qtd = parseInt(form.quantidade, 10) || 0
  const consumo = useMemo(() => qtd > 0 ? calcularConsumo(qtd, receita, insumos) : [], [qtd, receita, insumos])
  const insuficientes = consumo.filter((c) => !c.suficiente)
  const custoTotal = consumo.reduce((s, c) => s + c.quantidadeNecessaria * c.custoUnitario, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!qtd || qtd <= 0) { setErro('Informe a quantidade a produzir.'); return }
    if (receita.length === 0) { setErro('Cadastre a receita (BOM) na aba "Receita do Produto" antes de produzir.'); return }
    if (insuficientes.length > 0 && !forcar) {
      setErro('Insumo insuficiente para essa quantidade. Marque "produzir mesmo assim" para forçar.')
      return
    }
    setErro('')
    setEnviando(true)
    const res = await onConfirmar({
      codigo: gerarCodigo(),
      produto: form.produto.trim() || 'PURION GT 60ml',
      quantidade: qtd,
      dataInicio: form.dataInicio,
      responsavel: form.responsavel,
    }, consumo)
    setEnviando(false)
    if (res.ok) setResultado({ quantidade: qtd })
  }

  if (resultado) {
    return (
      <div className="modal-backdrop" onClick={onFechar}>
        <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={36} style={{ color: '#22C55E' }} />
            <p style={{ fontSize: 15, fontWeight: 700 }}>{resultado.quantidade} frascos produzidos</p>
            <p className="caption">Insumos baixados pela receita e estoque de prontos atualizado automaticamente.</p>
            <button onClick={onFechar} className="btn btn-primary btn-sm mt-2">Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Produção</h3>
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
            <label className="label-purion">Quantos frascos produzir</label>
            <input type="number" min={1} placeholder="ex: 100" value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} className="input-purion" autoFocus />
          </div>
          <div>
            <label className="label-purion">Responsável</label>
            <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)} className="select-purion">
              {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          {qtd > 0 && receita.length > 0 && (
            <div className="card-purion" style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Prévia de consumo — {qtd} frascos
              </p>
              <div className="flex flex-col gap-1.5">
                {consumo.map((c) => (
                  <div key={c.insumoId} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: c.suficiente ? 'var(--text-secondary)' : '#E85238' }}>{c.nome}</span>
                    <span style={{ fontWeight: 700, color: c.suficiente ? 'var(--text-primary)' : '#E85238' }}>
                      {c.quantidadeNecessaria.toLocaleString('pt-BR')} {c.unidade}
                      {!c.suficiente && ` (tem ${c.quantidadeAtual.toLocaleString('pt-BR')})`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Custo estimado</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{formatarMoedaBR(custoTotal)}</span>
              </div>
            </div>
          )}

          {insuficientes.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span className="flex items-center gap-2" style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                <AlertTriangle size={13} /> Insumo insuficiente para {qtd} frascos
              </span>
              <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={forcar} onChange={(e) => setForcar(e.target.checked)} />
                Produzir mesmo assim (o insumo pode ficar negativo)
              </label>
            </div>
          )}

          {erro && <p style={{ fontSize: 12, color: '#E85238' }}>{erro}</p>}

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" disabled={enviando} className="btn btn-primary btn-sm">
              {enviando ? 'Registrando…' : 'Confirmar produção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

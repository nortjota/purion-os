'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { SlidersHorizontal } from 'lucide-react'
import { ProducaoPainelView } from './ProducaoPainelView'
import { usePurionStore } from '@/store'
import type { TipoMovimentacao } from '@/store'
import { formatarDataBR } from '@/lib/calculos'

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  entrada:     'Entrada (produção)',
  saida_venda: 'Saída — venda',
  saida_ugc:   'Saída — doação UGC',
  ajuste:      'Ajuste manual',
  perda:       'Perda',
}

const TIPO_COR: Record<TipoMovimentacao, string> = {
  entrada:     '#8FD14F',
  saida_venda: '#9CC3DB',
  saida_ugc:   '#A7A9A6',
  ajuste:      '#E6C374',
  perda:       '#E5544B',
}

function ModalAjuste({ atual, onSalvar, onFechar }: {
  atual: number
  onSalvar: (novoValor: number, motivo: string) => void
  onFechar: () => void
}) {
  const [valor, setValor] = useState(String(atual))
  const [motivo, setMotivo] = useState('')
  const novo = parseInt(valor, 10)
  const delta = isNaN(novo) ? 0 : novo - atual

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Ajustar Estoque de Prontos</h3>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div>
            <label className="label-purion">Saldo atual</label>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{atual} frascos</p>
          </div>
          <div>
            <label className="label-purion">Novo saldo</label>
            <input type="number" min={0} value={valor} onChange={(e) => setValor(e.target.value)} className="input-purion" autoFocus />
            {delta !== 0 && (
              <p style={{ fontSize: 11, marginTop: 4, color: delta > 0 ? 'var(--status-ok)' : 'var(--status-danger)' }}>
                {delta > 0 ? `+${delta}` : delta} frascos
              </p>
            )}
          </div>
          <div>
            <label className="label-purion">Motivo do ajuste*</label>
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: contagem física, avaria..." className="input-purion" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button
            onClick={() => { if (!isNaN(novo) && motivo.trim()) onSalvar(novo, motivo.trim()) }}
            disabled={isNaN(novo) || !motivo.trim() || delta === 0}
            className="btn btn-primary btn-sm"
          >
            Salvar ajuste
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  registrarMovimentacao: (tipo: TipoMovimentacao, quantidade: number, motivo: string, origemTipo?: string, origemId?: string) => Promise<void>
}

export function ProducaoEstoqueView({ registrarMovimentacao }: Props) {
  const { estoqueProduto, estoqueMovimentacoes } = usePurionStore()
  const [modalAberto, setModalAberto] = useState(false)

  const evolucao = useMemo(() => {
    return [...estoqueMovimentacoes]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ data: formatarDataBR(m.createdAt.slice(0, 10)), saldo: m.saldoApos }))
  }, [estoqueMovimentacoes])

  const movimentacoesOrdenadas = useMemo(
    () => [...estoqueMovimentacoes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [estoqueMovimentacoes]
  )

  async function handleAjuste(novoValor: number, motivo: string) {
    if (!estoqueProduto) return
    const delta = novoValor - estoqueProduto.quantidadeAtual
    if (delta > 0) {
      await registrarMovimentacao('ajuste', delta, motivo)
    } else if (delta < 0) {
      await registrarMovimentacao('perda', Math.abs(delta), motivo)
    }
    setModalAberto(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Evolução do estoque */}
      {evolucao.length > 1 && (
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p className="kpi-label mb-3">Evolução do estoque de prontos</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolucao}>
              <XAxis dataKey="data" tick={{ fill: '#B8B8B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1B1D1C', border: '1px solid rgba(245,245,240,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5' }} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#D4FC3C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <ProducaoPainelView />

      {/* Livro-razão */}
      <div>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <p className="kpi-label" style={{ flex: 1 }}>Livro-razão de movimentações</p>
          <button onClick={() => setModalAberto(true)} className="btn btn-secondary btn-sm" disabled={!estoqueProduto}>
            <SlidersHorizontal size={13} /> Ajustar estoque
          </button>
        </div>
        {movimentacoesOrdenadas.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">Nenhuma movimentação registrada</p>
          </div>
        ) : (
          <div className="card-purion overflow-hidden">
            <table className="table-purion">
              <thead>
                <tr><th>Data</th><th>Tipo</th><th>Quantidade</th><th>Saldo após</th><th>Motivo</th><th>Origem</th><th>Autor</th></tr>
              </thead>
              <tbody>
                {movimentacoesOrdenadas.slice(0, 100).map((m) => {
                  const positivo = m.tipo === 'entrada' || m.tipo === 'ajuste'
                  return (
                    <tr key={m.id}>
                      <td className="caption">{formatarDataBR(m.createdAt.slice(0, 10))}</td>
                      <td>
                        <span className="badge" style={{ background: `${TIPO_COR[m.tipo]}20`, color: TIPO_COR[m.tipo] }}>
                          {TIPO_LABEL[m.tipo]}
                        </span>
                      </td>
                      <td className="td-mono" style={{ color: positivo ? 'var(--status-ok)' : 'var(--status-danger)' }}>
                        {positivo ? '+' : '−'}{m.quantidade}
                      </td>
                      <td className="td-mono">{m.saldoApos}</td>
                      <td className="caption">{m.motivo ?? '—'}</td>
                      <td className="caption">{m.origemTipo ?? '—'}</td>
                      <td className="caption">{m.autor ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && estoqueProduto && (
        <ModalAjuste atual={estoqueProduto.quantidadeAtual} onSalvar={handleAjuste} onFechar={() => setModalAberto(false)} />
      )}
    </div>
  )
}

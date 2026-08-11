'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Package } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { TipoMovimentacao } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { formatarMoeda } from './producaoHelpers'

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  entrada:     'Entrada (produção)',
  saida_venda: 'Saída — venda',
  saida_ugc:   'Saída — doação UGC',
  ajuste:      'Ajuste manual',
  perda:       'Perda',
}

const TIPO_COR: Record<TipoMovimentacao, string> = {
  entrada:     '#4CAF7A',
  saida_venda: '#5B8FE8',
  saida_ugc:   '#A855F7',
  ajuste:      '#E8A838',
  perda:       '#E85238',
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
              <p style={{ fontSize: 11, marginTop: 4, color: delta > 0 ? '#4CAF7A' : '#E85238' }}>
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

  const alerta = estoqueProduto ? estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima : false

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
      {/* Saldo grande */}
      <div
        className="card-purion"
        style={{
          padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
          borderColor: alerta ? 'rgba(239,68,68,0.4)' : undefined,
          background: alerta ? 'rgba(239,68,68,0.04)' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: alerta ? 'rgba(239,68,68,0.12)' : 'rgba(76,175,122,0.12)',
            color: alerta ? '#EF4444' : '#4CAF7A',
          }}>
            <Package size={26} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Frascos prontos em estoque</p>
            <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, color: alerta ? '#EF4444' : 'var(--text-primary)' }}>
              {estoqueProduto?.quantidadeAtual ?? 0}
            </p>
            <p style={{ fontSize: 12, color: alerta ? '#EF4444' : 'var(--text-secondary)' }}>
              {alerta
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Abaixo do mínimo ({estoqueProduto?.quantidadeMinima})</span>
                : `Mínimo: ${estoqueProduto?.quantidadeMinima ?? 0} · OK`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {estoqueProduto && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Custo unitário</p>
              <p style={{ fontSize: 16, fontWeight: 700 }}>{formatarMoeda(estoqueProduto.custoUnitario)}</p>
            </div>
          )}
          <button onClick={() => setModalAberto(true)} className="btn btn-primary btn-sm">
            Ajustar estoque
          </button>
        </div>
      </div>

      {/* Evolução do estoque */}
      {evolucao.length > 1 && (
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Evolução do estoque</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolucao}>
              <XAxis dataKey="data" tick={{ fill: '#B8B8B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5' }} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#C9A84C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Livro-razão */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Livro-razão de movimentações</p>
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
                      <td className="td-mono" style={{ color: positivo ? '#4CAF7A' : '#E85238' }}>
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

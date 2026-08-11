'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Pencil, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import type { Venda, StatusPagamentoVenda } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_BADGE, STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE,
  CANAL_LABEL, CANAL_BADGE, proximoStatusEntrega, fmtR,
  type AgrupamentoVendas,
} from '@/lib/vendas-helpers'

interface Grupo { id: string; label: string; cor?: string; vendas: Venda[] }

const ENTREGA_ORDEM: Array<Venda['statusEntrega']> = ['aguardando', 'separando', 'postado', 'em_transito', 'entregue', 'devolvido']
const ENTREGA_COR: Record<Venda['statusEntrega'], string> = {
  aguardando: '#B8B8B8', separando: '#E8A838', postado: '#5B8FE8',
  em_transito: '#5B8FE8', entregue: '#4CAF7A', devolvido: '#E85238',
}

function agrupar(vendas: Venda[], groupBy: AgrupamentoVendas): Grupo[] {
  if (groupBy === 'none') return [{ id: 'all', label: 'Todos os pedidos', vendas }]
  if (groupBy === 'canal') {
    return (['b2c', 'b2b'] as const).map((c) => ({
      id: c, label: CANAL_LABEL[c], vendas: vendas.filter((v) => v.canal === c),
    })).filter((g) => g.vendas.length > 0)
  }
  if (groupBy === 'periodo') {
    const map = new Map<string, Venda[]>()
    vendas.forEach((v) => {
      const key = v.dataVenda.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([data, vs]) => ({ id: data, label: formatarDataBR(data), vendas: vs }))
  }
  // status_entrega
  return ENTREGA_ORDEM.map((s) => ({
    id: s, label: STATUS_ENTREGA_LABEL[s], cor: ENTREGA_COR[s],
    vendas: vendas.filter((v) => v.statusEntrega === s),
  })).filter((g) => g.vendas.length > 0)
}

interface Props {
  vendas: Venda[]
  groupBy?: AgrupamentoVendas
  showCanal?: boolean
  nomeAfiliado?: (id: string | null) => string | null
  onVerDetalhes: (v: Venda) => void
  onEditar: (v: Venda) => void
  onExcluir: (id: string) => void
  onAvancarEntrega: (id: string, proximo: NonNullable<ReturnType<typeof proximoStatusEntrega>>) => void
  onMudarStatusPagamento: (id: string, status: StatusPagamentoVenda) => void
}

export function VendasTabelaPedidos({
  vendas, groupBy = 'none', showCanal = true, nomeAfiliado,
  onVerDetalhes, onEditar, onExcluir, onAvancarEntrega, onMudarStatusPagamento,
}: Props) {
  const isMobile = useMobile()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const grupos = useMemo(() => agrupar(vendas, groupBy), [vendas, groupBy])
  const totalPedidos = vendas.length
  const totalFrascos = useMemo(() => vendas.reduce((s, v) => s + v.quantidade, 0), [vendas])
  const totalValor = useMemo(() => vendas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0), [vendas])

  if (vendas.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum pedido encontrado</p>
        <p className="empty-state-subtitle">Ajuste os filtros ou registre uma nova venda.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {grupos.map((grupo) => (
          <div key={grupo.id}>
            {groupBy !== 'none' && (
              <button
                onClick={() => setCollapsed((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '4px 0 8px', cursor: 'pointer' }}
              >
                {collapsed[grupo.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {grupo.cor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: grupo.cor }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{grupo.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{grupo.vendas.length}</span>
              </button>
            )}
            {!collapsed[grupo.id] && grupo.vendas.map((v) => {
              const proximo = proximoStatusEntrega(v.statusEntrega)
              return (
                <div key={v.id} className="mobile-card-item" style={{ marginBottom: 8 }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{v.clienteNome || 'Cliente'}</p>
                    <span className={`badge ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}>{STATUS_PAGAMENTO_LABEL[v.statusPagamento]}</span>
                  </div>
                  <p className="caption mb-1">
                    {showCanal && <span className="badge badge-neutral" style={{ marginRight: 6 }}>{CANAL_LABEL[v.canal]}</span>}
                    <span style={{ fontWeight: 700, color: '#5B8FE8' }}>{v.quantidade} frasco{v.quantidade !== 1 ? 's' : ''}</span>
                    {' · '}{formatarDataBR(v.dataVenda.slice(0, 10))}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtR(v.valorTotal ?? v.valorLiquido)}</span>
                    <span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span>
                  </div>
                  {nomeAfiliado?.(v.afiliadoCreatorId) && <p className="caption mb-2">Afiliado: {nomeAfiliado(v.afiliadoCreatorId)}</p>}
                  <div className="flex items-center gap-1.5">
                    {proximo && (
                      <button onClick={() => onAvancarEntrega(v.id, proximo)} className="btn btn-secondary btn-sm flex-1">
                        <ArrowRight size={11} /> {STATUS_ENTREGA_LABEL[proximo]}
                      </button>
                    )}
                    <button onClick={() => onVerDetalhes(v)} className="icon-btn"><Eye size={12} /></button>
                    <button onClick={() => onEditar(v)} className="icon-btn"><Pencil size={12} /></button>
                    <button onClick={() => onExcluir(v.id)} className="icon-btn"><Trash2 size={12} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div style={{ padding: '10px 4px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          <span className="caption"><strong>{totalPedidos}</strong> pedidos</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C' }}>{totalFrascos} frascos</span>
          <span className="caption">{fmtR(totalValor)} faturado</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card-purion overflow-hidden">
      <table className="table-purion">
        <thead>
          <tr>
            <th>Cliente</th>
            {showCanal && <th>Canal</th>}
            <th>Frascos</th>
            <th>Valor</th>
            <th>Pagamento</th>
            <th>Entrega</th>
            <th>Afiliado</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <FragmentGrupo
              key={grupo.id}
              grupo={grupo}
              groupBy={groupBy}
              showCanal={showCanal}
              collapsed={!!collapsed[grupo.id]}
              onToggle={() => setCollapsed((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
              nomeAfiliado={nomeAfiliado}
              onVerDetalhes={onVerDetalhes}
              onEditar={onEditar}
              onExcluir={onExcluir}
              onAvancarEntrega={onAvancarEntrega}
              onMudarStatusPagamento={onMudarStatusPagamento}
            />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', paddingTop: 8 }}>
              {totalPedidos} pedidos
            </td>
            {showCanal && <td />}
            <td style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C', paddingTop: 8 }}>
              {totalFrascos} frascos
            </td>
            <td style={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }}>
              {fmtR(totalValor)}
            </td>
            <td colSpan={showCanal ? 5 : 4} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function FragmentGrupo({
  grupo, groupBy, showCanal, collapsed, onToggle, nomeAfiliado,
  onVerDetalhes, onEditar, onExcluir, onAvancarEntrega, onMudarStatusPagamento,
}: {
  grupo: Grupo
  groupBy: AgrupamentoVendas
  showCanal: boolean
  collapsed: boolean
  onToggle: () => void
  nomeAfiliado?: (id: string | null) => string | null
  onVerDetalhes: (v: Venda) => void
  onEditar: (v: Venda) => void
  onExcluir: (id: string) => void
  onAvancarEntrega: (id: string, proximo: NonNullable<ReturnType<typeof proximoStatusEntrega>>) => void
  onMudarStatusPagamento: (id: string, status: StatusPagamentoVenda) => void
}) {
  const colSpan = showCanal ? 9 : 8
  return (
    <>
      {groupBy !== 'none' && (
        <tr>
          <td colSpan={colSpan} style={{ padding: 0 }}>
            <button
              onClick={onToggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                background: 'var(--bg-surface-2)', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--border)', textAlign: 'left',
              }}
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              {grupo.cor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: grupo.cor, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{grupo.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                background: grupo.cor ? `${grupo.cor}20` : 'var(--bg-surface)',
                color: grupo.cor ?? 'var(--text-secondary)',
                border: `1px solid ${grupo.cor ? `${grupo.cor}30` : 'var(--border)'}`,
              }}>
                {grupo.vendas.length}
              </span>
            </button>
          </td>
        </tr>
      )}
      {!collapsed && grupo.vendas.map((v) => {
        const proximo = proximoStatusEntrega(v.statusEntrega)
        return (
          <tr key={v.id}>
            <td>{v.clienteNome || '—'}</td>
            {showCanal && <td><span className={`badge ${CANAL_BADGE[v.canal]}`}>{CANAL_LABEL[v.canal]}</span></td>}
            <td className="caption" style={{ fontWeight: 600 }}>{v.quantidade}</td>
            <td className="td-mono">{fmtR(v.valorTotal ?? v.valorLiquido)}</td>
            <td>
              <select
                value={v.statusPagamento}
                onChange={(e) => onMudarStatusPagamento(v.id, e.target.value as StatusPagamentoVenda)}
                className={`text-[10px] font-bold rounded-full px-2 py-1 border-none outline-none cursor-pointer ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}
              >
                {Object.entries(STATUS_PAGAMENTO_LABEL).map(([sv, l]) => <option key={sv} value={sv}>{l}</option>)}
              </select>
            </td>
            <td><span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span></td>
            <td className="caption">{nomeAfiliado?.(v.afiliadoCreatorId) ?? '—'}</td>
            <td className="caption">{formatarDataBR(v.dataVenda.slice(0, 10))}</td>
            <td>
              <div className="flex items-center gap-1">
                {proximo && (
                  <button onClick={() => onAvancarEntrega(v.id, proximo)} title={`Avançar para ${STATUS_ENTREGA_LABEL[proximo]}`} className="icon-btn">
                    <ArrowRight size={12} />
                  </button>
                )}
                <button onClick={() => onVerDetalhes(v)} title="Ver detalhes" className="icon-btn"><Eye size={12} /></button>
                <button onClick={() => onEditar(v)} className="icon-btn"><Pencil size={12} /></button>
                <button onClick={() => onExcluir(v.id)} className="icon-btn"><Trash2 size={12} /></button>
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}

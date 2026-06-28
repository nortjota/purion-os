'use client'

import { useMemo } from 'react'
import { Truck, ArrowRight } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useVendas } from '@/hooks/useVendas'
import { formatarDataBR } from '@/lib/calculos'
import { STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE, proximoStatusEntrega, fmtR } from '@/lib/vendas-helpers'

export function VendasLogistica() {
  const { vendas } = usePurionStore()
  const { mudarStatusEntrega } = useVendas()

  const pendentes = useMemo(
    () => vendas
      .filter((v) => v.statusEntrega !== 'entregue' && v.statusEntrega !== 'devolvido')
      .sort((a, b) => a.dataVenda.localeCompare(b.dataVenda)),
    [vendas]
  )

  if (pendentes.length === 0) {
    return (
      <div className="empty-state">
        <Truck size={40} className="empty-state-icon" />
        <p className="empty-state-title">Nenhuma entrega pendente</p>
        <p className="empty-state-subtitle">Todas as vendas já foram entregues ou devolvidas.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="kpi-label">Entregas pendentes ({pendentes.length})</p>
      <div className="card-purion overflow-hidden">
        <table className="table-purion">
          <thead>
            <tr><th>Cliente</th><th>Canal</th><th>Valor</th><th>Transportadora</th><th>Rastreio</th><th>Status</th><th>Data</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {pendentes.map((v) => {
              const proximo = proximoStatusEntrega(v.statusEntrega)
              return (
                <tr key={v.id}>
                  <td>{v.clienteNome || '—'}</td>
                  <td><span className="badge badge-neutral">{v.canal.toUpperCase()}</span></td>
                  <td className="td-mono">{fmtR(v.valorTotal ?? v.valorLiquido)}</td>
                  <td className="caption">{v.transportadora || '—'}</td>
                  <td className="caption">{v.codigoRastreio || '—'}</td>
                  <td><span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>{STATUS_ENTREGA_LABEL[v.statusEntrega]}</span></td>
                  <td className="caption">{formatarDataBR(v.dataVenda.slice(0, 10))}</td>
                  <td>
                    {proximo && (
                      <button onClick={() => mudarStatusEntrega(v.id, proximo)} className="btn btn-secondary btn-sm">
                        <ArrowRight size={11} /> {STATUS_ENTREGA_LABEL[proximo]}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

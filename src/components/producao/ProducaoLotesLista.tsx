'use client'

import type { Lote, StatusLote } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import { ESTAGIOS_LOTE, estagioLoteConfig, calcularCustoLote, formatarMoeda, socioInfo } from './producaoHelpers'

interface Props {
  lotes: Lote[]
  onAbrirLote: (l: Lote) => void
  onMudarEstagio: (id: string, status: StatusLote) => void
}

export function ProducaoLotesLista({ lotes, onAbrirLote, onMudarEstagio }: Props) {
  const isMobile = useMobile()

  if (lotes.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum lote cadastrado</p>
        <p className="empty-state-subtitle">Crie um novo lote de produção.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lotes.map((lote) => {
          const estagio = estagioLoteConfig(lote.status)
          return (
            <button key={lote.id} onClick={() => onAbrirLote(lote)} className="mobile-card-item text-left w-full">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#C9A84C' }}>{lote.codigo}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lote.produto}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${estagio.cor}20`, color: estagio.cor }}>
                  {estagio.label}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {lote.quantidadeProduzida} un. · {formatarDataBR(lote.dataInicio)} · {formatarMoeda(calcularCustoLote(lote.quantidadeProduzida))}
              </p>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card-purion" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-purion" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Código</th><th>Produto</th><th>Data início</th><th>Qtd. produzida</th>
              <th>Qtd. envasada</th><th>Custo</th><th>Responsável</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => {
              const info = socioInfo(lote.responsavel)
              return (
                <tr key={lote.id} onClick={() => onAbrirLote(lote)} style={{ cursor: 'pointer' }} className="hover:bg-[rgba(201,168,76,0.03)]">
                  <td className="td-mono" style={{ color: '#C9A84C' }}>{lote.codigo}</td>
                  <td>{lote.produto}</td>
                  <td className="caption">{formatarDataBR(lote.dataInicio)}</td>
                  <td className="caption">{lote.quantidadeProduzida}</td>
                  <td className="caption">{lote.quantidadeAprovada || '—'}</td>
                  <td className="td-mono">{formatarMoeda(calcularCustoLote(lote.quantidadeProduzida))}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: `${info.cor}22`, color: info.cor }}>
                        {info.inicial}
                      </span>
                      <span className="caption">{info.nome}</span>
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lote.status}
                      onChange={(e) => onMudarEstagio(lote.id, e.target.value as StatusLote)}
                      style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      {ESTAGIOS_LOTE.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
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

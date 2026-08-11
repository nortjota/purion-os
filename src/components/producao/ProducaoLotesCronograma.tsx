'use client'

import { useMemo } from 'react'
import { format, differenceInCalendarDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lote } from '@/store'
import { estagioLoteConfig } from './producaoHelpers'

interface Props {
  lotes: Lote[]
  onAbrirLote: (l: Lote) => void
}

export function ProducaoLotesCronograma({ lotes, onAbrirLote }: Props) {
  const { inicio, fim, dias } = useMemo(() => {
    const hoje = startOfDay(new Date())
    const datas: Date[] = []
    lotes.forEach((l) => {
      if (l.dataInicio) datas.push(new Date(l.dataInicio))
      datas.push(l.dataConclusao ? new Date(l.dataConclusao) : hoje)
    })
    const min = datas.length ? new Date(Math.min(...datas.map((d) => d.getTime()))) : hoje
    const max = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : hoje
    const inicio = new Date(min); inicio.setDate(inicio.getDate() - 2)
    const fim = new Date(max); fim.setDate(fim.getDate() + 2)
    return { inicio, fim, dias: Math.max(1, differenceInCalendarDays(fim, inicio)) }
  }, [lotes])

  const lotesOrdenados = useMemo(
    () => [...lotes].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
    [lotes]
  )

  if (lotes.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum lote para exibir no cronograma</p>
      </div>
    )
  }

  return (
    <div className="card-purion" style={{ padding: '16px 20px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span>{format(inicio, "dd 'de' MMM", { locale: ptBR })}</span>
        <span>{format(fim, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 480 }}>
        {lotesOrdenados.map((lote) => {
          const estagio = estagioLoteConfig(lote.status)
          const dataFim = lote.dataConclusao ? new Date(lote.dataConclusao) : new Date()
          const offsetDias = Math.max(0, differenceInCalendarDays(new Date(lote.dataInicio), inicio))
          const duracaoDias = Math.max(1, differenceInCalendarDays(dataFim, new Date(lote.dataInicio)) + 1)
          const leftPct = (offsetDias / dias) * 100
          const widthPct = Math.min(100 - leftPct, (duracaoDias / dias) * 100)

          return (
            <div key={lote.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#C9A84C' }}>{lote.codigo}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lote.produto}</p>
              </div>
              <div style={{ position: 'relative', flex: 1, height: 22, background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                <button
                  onClick={() => onAbrirLote(lote)}
                  title={`${lote.codigo} — ${estagio.label}`}
                  style={{
                    position: 'absolute', top: 0, height: '100%', minWidth: 24,
                    left: `${leftPct}%`, width: `${widthPct}%`,
                    background: `${estagio.cor}30`, border: `1px solid ${estagio.cor}`,
                    borderRadius: 6, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 6px',
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: estagio.cor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lote.quantidadeProduzida} un.
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import type { EventoCalendario } from '@/store'
import {
  gerarGradeSemana, eventosNoDia, eventoPassado, corEvento, formatarHora,
  formatarDiaCurto, formatarDiaSemanaLabel, isToday,
} from './calendarioHelpers'

interface VisaoSemanaProps {
  dataReferencia: Date
  eventos: EventoCalendario[]
  onClickDia: (dia: Date) => void
  onClickEvento: (evento: EventoCalendario) => void
}

export function VisaoSemana({ dataReferencia, eventos, onClickDia, onClickEvento }: VisaoSemanaProps) {
  const dias = gerarGradeSemana(dataReferencia)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {dias.map((dia, i) => {
        const hoje = isToday(dia)
        const eventosDoDia = eventosNoDia(eventos, dia)
        return (
          <div
            key={i}
            style={{
              minHeight: 220, borderRadius: 10, padding: 8,
              background: hoje ? 'rgba(201,168,76,0.06)' : 'var(--bg-surface)',
              border: `1px solid ${hoje ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            <button onClick={() => onClickDia(dia)} style={{ textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>{formatarDiaSemanaLabel(dia)}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: hoje ? '#C9A84C' : 'var(--text-primary)' }}>
                {formatarDiaCurto(dia)}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {eventosDoDia.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onClickEvento(ev)}
                  style={{
                    fontSize: 11, padding: '4px 7px', borderRadius: 6, cursor: 'pointer',
                    background: `${corEvento(ev)}18`, borderLeft: `3px solid ${corEvento(ev)}`,
                    opacity: eventoPassado(ev) ? 0.5 : 1,
                    textDecoration: ev.concluido ? 'line-through' : undefined,
                  }}
                >
                  {!ev.diaInteiro && <span style={{ color: corEvento(ev), fontWeight: 700, marginRight: 4 }}>{formatarHora(ev.dataInicio)}</span>}
                  {ev.titulo}
                </div>
              ))}
              {eventosDoDia.length === 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

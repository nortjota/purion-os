'use client'

import type { EventoCalendario } from '@/store'
import {
  gerarGradeMes, eventosNoDia, eventoPassado, corEvento,
  formatarDiaCurto, isSameMonth, isToday,
} from './calendarioHelpers'

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

interface VisaoMesProps {
  mesReferencia: Date
  eventos: EventoCalendario[]
  onClickDia: (dia: Date) => void
  onClickEvento: (evento: EventoCalendario) => void
}

export function VisaoMes({ mesReferencia, eventos, onClickDia, onClickEvento }: VisaoMesProps) {
  const dias = gerarGradeMes(mesReferencia)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {dias.map((dia, i) => {
          const doMes = isSameMonth(dia, mesReferencia)
          const hoje = isToday(dia)
          const eventosDoDia = eventosNoDia(eventos, dia)
          const visiveis = eventosDoDia.slice(0, 3)
          const resto = eventosDoDia.length - visiveis.length

          return (
            <button
              key={i}
              onClick={() => onClickDia(dia)}
              style={{
                minHeight: 84, textAlign: 'left', borderRadius: 8, padding: '6px 6px',
                background: hoje ? 'rgba(201,168,76,0.06)' : 'var(--bg-surface)',
                border: `1px solid ${hoje ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                opacity: doMes ? 1 : 0.4,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3,
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: hoje ? 800 : 500,
                color: hoje ? '#C9A84C' : 'var(--text-primary)',
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hoje ? 'rgba(201,168,76,0.15)' : 'transparent',
              }}>
                {formatarDiaCurto(dia)}
              </span>
              <div className="flex flex-col gap-0.5">
                {visiveis.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onClickEvento(ev) }}
                    style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 4,
                      background: `${corEvento(ev)}22`, color: corEvento(ev),
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      opacity: eventoPassado(ev) ? 0.5 : 1,
                      fontWeight: ev.concluido ? 400 : 600,
                      textDecoration: ev.concluido ? 'line-through' : undefined,
                    }}
                  >
                    {ev.titulo}
                  </div>
                ))}
                {resto > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--text-secondary)', paddingLeft: 5 }}>+{resto} mais</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

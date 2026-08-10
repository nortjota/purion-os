'use client'

import { useMemo } from 'react'
import { CalendarX2 } from 'lucide-react'
import type { EventoCalendario } from '@/store'
import { corEvento, formatarDataCompleta, formatarHora, TIPO_EVENTO_LABEL } from './calendarioHelpers'

interface VisaoAgendaProps {
  eventos: EventoCalendario[]
  onClickEvento: (evento: EventoCalendario) => void
}

export function VisaoAgenda({ eventos, onClickEvento }: VisaoAgendaProps) {
  const proximos = useMemo(() => {
    const agora = Date.now()
    return eventos
      .filter((e) => new Date(e.dataInicio).getTime() >= agora - 86_400_000 && !e.concluido)
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
      .slice(0, 60)
  }, [eventos])

  const porDia = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>()
    proximos.forEach((e) => {
      const dia = e.dataInicio.slice(0, 10)
      if (!map.has(dia)) map.set(dia, [])
      map.get(dia)!.push(e)
    })
    return Array.from(map.entries())
  }, [proximos])

  if (porDia.length === 0) {
    return (
      <div className="empty-state">
        <CalendarX2 size={32} className="empty-state-icon" />
        <p className="empty-state-title">Nada por vir</p>
        <p className="empty-state-subtitle">Não há eventos futuros cadastrados.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {porDia.map(([dia, itens]) => (
        <div key={dia}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            {formatarDataCompleta(itens[0].dataInicio)}
          </p>
          <div className="flex flex-col gap-2">
            {itens.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onClickEvento(ev)}
                className="card-purion"
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${corEvento(ev)}` }}
              >
                <div style={{ minWidth: 46, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {ev.diaInteiro ? 'Dia todo' : formatarHora(ev.dataInicio)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{ev.titulo}</p>
                  <span style={{ fontSize: 10, color: corEvento(ev), fontWeight: 600 }}>{TIPO_EVENTO_LABEL[ev.tipo]}</span>
                  {ev.responsavel && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}> · {ev.responsavel}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

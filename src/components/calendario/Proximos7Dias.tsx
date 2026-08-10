'use client'

import { useMemo } from 'react'
import type { EventoCalendario } from '@/store'
import { corEvento, formatarDataCompleta, formatarHora, TIPO_EVENTO_LABEL } from './calendarioHelpers'

interface Proximos7DiasProps {
  eventos: EventoCalendario[]
  onClickEvento?: (evento: EventoCalendario) => void
  limite?: number
}

export function Proximos7Dias({ eventos, onClickEvento, limite }: Proximos7DiasProps) {
  const proximos = useMemo(() => {
    const agora = Date.now()
    const em7dias = agora + 7 * 86_400_000
    const lista = eventos
      .filter((e) => {
        const t = new Date(e.dataInicio).getTime()
        return t >= agora - 3_600_000 && t <= em7dias && !e.concluido
      })
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
    return limite ? lista.slice(0, limite) : lista
  }, [eventos, limite])

  if (proximos.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nada nos próximos 7 dias.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {proximos.map((ev) => (
        <div
          key={ev.id}
          onClick={() => onClickEvento?.(ev)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
            cursor: onClickEvento ? 'pointer' : 'default',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: corEvento(ev), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600 }}>{ev.titulo}</span>
            <span style={{ color: 'var(--text-secondary)' }}> · {TIPO_EVENTO_LABEL[ev.tipo]}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>
            {formatarDataCompleta(ev.dataInicio)}{!ev.diaInteiro && ` · ${formatarHora(ev.dataInicio)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

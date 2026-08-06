'use client'

import { useState } from 'react'
import { gerarHeatmap, corHeatmap, type DiaHeatmap } from './metasHelpers'
import type { MetaDiaria } from '@/store'

function tooltip(dia: DiaHeatmap): string {
  const data = new Date(`${dia.data}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  if (dia.total === 0) return `${data} — sem metas`
  return `${data} — ${dia.concluidas}/${dia.total} metas (${dia.pct}%)`
}

export function MetaHeatmap({ metasEscopo }: { metasEscopo: MetaDiaria[] }) {
  const [periodo, setPeriodo] = useState<30 | 90>(30)
  const dias = gerarHeatmap(metasEscopo, periodo)

  // Agrupa em semanas (colunas), cada coluna com 7 dias
  const semanas: DiaHeatmap[][] = []
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Últimos {periodo} dias</span>
        <div className="flex gap-1">
          {[30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p as 30 | 90)}
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={periodo === p
                ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
                : { color: 'var(--text-secondary)' }}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        {semanas.map((semana, si) => (
          <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {semana.map((dia) => (
              <div
                key={dia.data}
                title={tooltip(dia)}
                style={{
                  width: 11, height: 11, borderRadius: 3,
                  background: corHeatmap(dia.pct),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

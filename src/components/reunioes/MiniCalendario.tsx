'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReuniaoItem } from '@/store'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface MiniCalendarioProps {
  reunioes: ReuniaoItem[]
  diaSelecionado: string | null
  onSelecionarDia: (diaISO: string | null) => void
}

function chaveDoDia(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function MiniCalendario({ reunioes, diaSelecionado, onSelecionarDia }: MiniCalendarioProps) {
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  const reunioesPorDia = useMemo(() => {
    const map = new Map<string, ReuniaoItem[]>()
    reunioes.forEach((r) => {
      const chave = r.data.slice(0, 10)
      if (!map.has(chave)) map.set(chave, [])
      map.get(chave)!.push(r)
    })
    return map
  }, [reunioes])

  const dias = useMemo(() => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()

    const celulas: Array<{ data: Date | null }> = []
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push({ data: null })
    for (let dia = 1; dia <= totalDias; dia++) celulas.push({ data: new Date(ano, mes, dia) })
    return celulas
  }, [mesAtual])

  const hojeKey = chaveDoDia(new Date())

  return (
    <div className="card-purion p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="icon-btn border-0">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {MESES_PT[mesAtual.getMonth()]} {mesAtual.getFullYear()}
        </span>
        <button onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="icon-btn border-0">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="text-center caption" style={{ fontSize: 10 }}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map(({ data }, idx) => {
          if (!data) return <div key={idx} />
          const chave = chaveDoDia(data)
          const reunioesNoDia = reunioesPorDia.get(chave) ?? []
          const ehHoje = chave === hojeKey
          const selecionado = chave === diaSelecionado

          return (
            <button
              key={idx}
              onClick={() => onSelecionarDia(selecionado ? null : chave)}
              className="relative flex flex-col items-center justify-center rounded-lg transition-colors"
              style={{
                height: 32,
                background: selecionado ? 'rgba(201,168,76,0.18)' : ehHoje ? 'rgba(201,168,76,0.08)' : 'transparent',
                border: ehHoje ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
              }}
            >
              <span className="text-[11px]" style={{ color: selecionado || ehHoje ? '#C9A84C' : 'var(--text-primary)' }}>
                {data.getDate()}
              </span>
              {reunioesNoDia.length > 0 && (
                <span
                  className="absolute bottom-0.5 rounded-full"
                  style={{ width: 4, height: 4, background: '#C9A84C' }}
                  title={`${reunioesNoDia.length} reunião(ões)`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

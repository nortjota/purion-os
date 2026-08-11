'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameMonth, isToday, format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Venda } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { fmtR } from '@/lib/vendas-helpers'

interface Props {
  vendas: Venda[]
  onAbrirVenda: (v: Venda) => void
}

const DIA_LABELS_FULL  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_LABELS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function VendasCalendarioView({ vendas, onAbrirVenda }: Props) {
  const isMobile = useMobile()
  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()))
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesRef), { locale: ptBR })
    const fim    = endOfWeek(endOfMonth(mesRef), { locale: ptBR })
    return eachDayOfInterval({ start: inicio, end: fim })
  }, [mesRef])

  const vendasPorDia = useMemo(() => {
    const mapa: Record<string, Venda[]> = {}
    vendas.forEach((v) => {
      const key = v.dataVenda.slice(0, 10)
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(v)
    })
    return mapa
  }, [vendas])

  const maiorVolumeDia = useMemo(
    () => Math.max(1, ...Object.values(vendasPorDia).map((vs) => vs.reduce((s, v) => s + v.quantidade, 0))),
    [vendasPorDia]
  )

  const diaLabels = isMobile ? DIA_LABELS_SHORT : DIA_LABELS_FULL
  const vendasDiaSelecionado = diaSelecionado ? (vendasPorDia[diaSelecionado] ?? []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isMobile ? '10px 14px' : '12px 20px',
        flexShrink: 0, borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => setMesRef((d) => subMonths(d, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
          <ChevronLeft size={isMobile ? 22 : 18} />
        </button>
        <button onClick={() => setMesRef((d) => addMonths(d, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
          <ChevronRight size={isMobile ? 22 : 18} />
        </button>
        <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textTransform: 'capitalize' }}>
          {format(mesRef, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setMesRef(startOfMonth(new Date()))} style={{ height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Hoje
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {diaLabels.map((d, i) => (
            <div key={i} style={{ padding: '6px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {dias.map((dia) => {
            const key = format(dia, 'yyyy-MM-dd')
            const vendasDia = vendasPorDia[key] ?? []
            const frascos = vendasDia.reduce((s, v) => s + v.quantidade, 0)
            const ehHoje = isToday(dia)
            const outroMes = !isSameMonth(dia, mesRef)
            const intensidade = frascos / maiorVolumeDia

            return (
              <div
                key={key}
                onClick={() => vendasDia.length > 0 && setDiaSelecionado(diaSelecionado === key ? null : key)}
                style={{
                  minHeight: isMobile ? 64 : 92,
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  padding: isMobile ? '3px 4px' : '6px 8px',
                  background: diaSelecionado === key ? 'rgba(201,168,76,0.1)' : outroMes ? 'rgba(0,0,0,0.05)' : 'transparent',
                  cursor: vendasDia.length > 0 ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: '50%',
                  fontSize: 12, fontWeight: ehHoje ? 700 : 400,
                  background: ehHoje ? '#C9A84C' : 'transparent',
                  color: ehHoje ? '#0D0D0D' : outroMes ? 'rgba(184,184,184,0.3)' : 'var(--text-primary)',
                  marginBottom: 4,
                }}>
                  {format(dia, 'd')}
                </div>
                {vendasDia.length > 0 && (
                  <div
                    style={{
                      borderRadius: 6, padding: '3px 6px',
                      background: `rgba(201,168,76,${0.08 + intensidade * 0.3})`,
                      border: '1px solid rgba(201,168,76,0.25)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>{vendasDia.length} pedido{vendasDia.length !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{frascos} frasco{frascos !== 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {diaSelecionado && vendasDiaSelecionado.length > 0 && (
        <div style={{
          padding: isMobile ? '10px 14px' : '12px 20px', flexShrink: 0,
          borderTop: '1px solid var(--border)', background: 'var(--bg-surface)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'capitalize' }}>
            {format(new Date(diaSelecionado + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })} — {vendasDiaSelecionado.length} pedido{vendasDiaSelecionado.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vendasDiaSelecionado.map((v) => (
              <button
                key={v.id}
                onClick={() => onAbrirVenda(v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{v.clienteNome || 'Cliente'} · {v.quantidade}fr</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C' }}>{fmtR(v.valorTotal ?? v.valorLiquido)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

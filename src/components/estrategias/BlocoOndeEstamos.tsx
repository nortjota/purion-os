'use client'

import { useMemo } from 'react'
import { Star, DollarSign, Package, Users, Scale } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useEstrategiaRoadmap, useMetricasCRM } from '@/hooks/useEstrategia'
import { calcularKPIsMes } from '@/lib/calculos'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { EstrategiaFase, StatusFase } from '@/hooks/useEstrategia'

// Referência do plano de negócio — mesma "conta do milhão" usada na visão detalhada.
const PONTO_EQUILIBRIO_MES = 28

const STATUS_COR: Record<StatusFase, string> = {
  concluida: '#22C55E',
  atual: '#C9A84C',
  futura: '#8A8A8A',
}

function BarraFases({ fases }: { fases: EstrategiaFase[] }) {
  const ordenadas = [...fases].sort((a, b) => a.ordem - b.ordem)
  if (ordenadas.length === 0) return null
  return (
    <div className="flex items-center gap-1.5" style={{ marginTop: 14 }}>
      {ordenadas.map((f) => (
        <div key={f.id} style={{ flex: 1 }} title={`${f.nome} — ${f.percentualConclusao}%`}>
          <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: f.status === 'concluida' ? '100%' : f.status === 'atual' ? `${f.percentualConclusao}%` : '0%',
              background: STATUS_COR[f.status],
            }} />
          </div>
          <p style={{
            fontSize: 10, marginTop: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: f.status === 'atual' ? '#C9A84C' : 'var(--text-secondary)', fontWeight: f.status === 'atual' ? 700 : 400,
          }}>
            {f.nome}
          </p>
        </div>
      ))}
    </div>
  )
}

function CardNumero({ icon: Icon, label, valor, cor }: { icon: React.ElementType; label: string; valor: string; cor: string }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <span className="kpi-label">{label}</span>
        <Icon size={14} style={{ color: cor, opacity: 0.7 }} />
      </div>
      <span className="kpi-value" style={{ color: cor, fontSize: 22 }}>{valor}</span>
    </div>
  )
}

export function BlocoOndeEstamos() {
  const { fases, carregando } = useEstrategiaRoadmap()
  const { receitas, despesas, campanhasAds, estoqueMovimentacoes } = usePurionStore()
  const metricas = useMetricasCRM()

  const faseAtual = useMemo(() => fases.find((f) => f.status === 'atual') ?? null, [fases])

  const mesAtual = new Date().toISOString().slice(0, 7)
  const kpisMes = useMemo(
    () => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual),
    [receitas, despesas, campanhasAds, mesAtual]
  )

  const frascosVendidosMes = useMemo(
    () => estoqueMovimentacoes
      .filter((m) => m.tipo === 'saida_venda' && m.createdAt.startsWith(mesAtual))
      .reduce((s, m) => s + m.quantidade, 0),
    [estoqueMovimentacoes, mesAtual]
  )

  if (carregando) return <div className="empty-state"><p className="empty-state-title">Carregando…</p></div>

  return (
    <section className="flex flex-col gap-4">
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Onde estamos</p>

      {/* Fase atual + barra das 4 fases */}
      <div className="card-purion" style={{ padding: '18px 20px' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fase atual
            </span>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C', marginTop: 2 }}>
              {faseAtual ? faseAtual.nome.toUpperCase() : 'Sem fase definida'}
              {faseAtual?.marcoPrincipal && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}> — {faseAtual.marcoPrincipal}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2" style={{
            padding: '8px 16px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))',
            border: '1px solid rgba(201,168,76,0.3)',
          }}>
            <Star size={16} style={{ color: '#C9A84C' }} fill="#C9A84C" />
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>North Star</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {formatNumber(metricas.leadsClientesAtivos)} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>parceiros ativos que recompram</span>
              </p>
            </div>
          </div>
        </div>
        <BarraFases fases={fases} />
      </div>

      {/* Números-chave */}
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <CardNumero icon={DollarSign} label="Faturamento/mês" valor={formatCurrency(kpisMes.faturamento)} cor="#22C55E" />
        <CardNumero icon={Package} label="Frascos vendidos" valor={formatNumber(frascosVendidosMes)} cor="#5B8FE8" />
        <CardNumero icon={Users} label="Clientes B2B" valor={formatNumber(metricas.leadsClientesAtivos)} cor="#A855F7" />
        <CardNumero icon={Scale} label="Ponto de equilíbrio" valor={`${PONTO_EQUILIBRIO_MES}/mês`} cor="#C9A84C" />
      </div>
    </section>
  )
}

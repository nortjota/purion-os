'use client'

import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { WidgetShell } from './WidgetShell'

interface Props {
  label: string
  valor: string
  icon?: React.ElementType
  subvalor?: string
  variacao?: number | null   // percentual — positivo = alta, negativo = queda
  variacaoLabel?: string     // ex: "vs mês anterior"
  alerta?: boolean           // realça em vermelho (ex: estoque baixo)
  destaque?: boolean         // realça em dourado (métrica principal)
  href?: string
  isLoading?: boolean
}

export function WidgetContador({
  label, valor, icon: Icon, subvalor, variacao, variacaoLabel, alerta, destaque, href, isLoading,
}: Props) {
  const cor = alerta ? '#EF4444' : destaque ? '#C9A84C' : 'var(--text-primary)'

  return (
    <WidgetShell title={label} icon={Icon} isLoading={isLoading} height={72} href={href}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05, color: cor, fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.01em' }}
        >
          {valor}
        </span>
        {(variacao !== undefined && variacao !== null) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {variacao >= 0
              ? <TrendingUp size={12} style={{ color: '#22C55E' }} />
              : <TrendingDown size={12} style={{ color: '#EF4444' }} />}
            <span style={{ fontSize: 11, fontWeight: 600, color: variacao >= 0 ? '#22C55E' : '#EF4444' }}>
              {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
            </span>
            {variacaoLabel && <span className="caption">{variacaoLabel}</span>}
          </div>
        ) : subvalor ? (
          <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {alerta && <AlertTriangle size={11} style={{ color: '#EF4444' }} />}
            {subvalor}
          </span>
        ) : null}
      </div>
    </WidgetShell>
  )
}

'use client'

export interface MetricaFaixa {
  label: string
  valor: React.ReactNode
  /** detalhe curto abaixo do valor */
  sub?: string
  tom?: 'ok' | 'warning' | 'danger'
  /** explicação da conta (tooltip) */
  dica?: string
  /** torna a métrica um atalho de filtro */
  onClick?: () => void
  /** filtro correspondente está aplicado */
  ativo?: boolean
}

const COR_TOM = { ok: 'var(--status-ok)', warning: 'var(--status-warning)', danger: 'var(--status-danger)' } as const

/**
 * Faixa de métricas: os números do recorte atual em UMA linha densa,
 * no lugar de uma grade de cartões. Usada no topo das listas (Vendas, CRM…).
 */
export function MetricStrip({ metricas, rotulo }: { metricas: MetricaFaixa[]; rotulo?: string }) {
  return (
    <div className="metric-strip" role="group" aria-label={rotulo ?? 'Resumo'}>
      {metricas.map((m) => {
        const conteudo = (
          <>
            <span className="metric-strip-rotulo">{m.label}</span>
            <span className="metric-strip-valor tnum" style={{ color: m.tom ? COR_TOM[m.tom] : undefined }}>{m.valor}</span>
            {m.sub && <span className="metric-strip-sub">{m.sub}</span>}
          </>
        )
        return m.onClick ? (
          <button key={m.label} type="button" className="metric-strip-item metric-strip-botao" title={m.dica} onClick={m.onClick} aria-pressed={!!m.ativo} data-ativo={m.ativo || undefined}>
            {conteudo}
          </button>
        ) : (
          <div key={m.label} className="metric-strip-item" title={m.dica}>{conteudo}</div>
        )
      })}
    </div>
  )
}

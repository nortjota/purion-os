'use client'

import Link from 'next/link'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { AnimatedNumber } from '@/components/motion'

export type TomAcao = 'danger' | 'warning' | 'info' | 'neutral'

export interface ItemAcao {
  id: string
  /** quantidade em destaque; omita para alertas sem número */
  valor?: number
  titulo: string
  detalhe?: string
  tom: TomAcao
  href: string
}

const COR: Record<TomAcao, string> = {
  danger: 'var(--status-danger)',
  warning: 'var(--status-warning)',
  info: 'var(--status-info)',
  neutral: 'var(--text-secondary)',
}
const ORDEM: Record<TomAcao, number> = { danger: 0, warning: 1, info: 2, neutral: 3 }

/**
 * "Precisa de você": tudo que está pendente ou fora do limite, em uma faixa só,
 * ordenado por gravidade e com um clique até o módulo que resolve.
 */
export function FilaDeAcao({ itens, rodape }: { itens: ItemAcao[]; rodape?: React.ReactNode }) {
  const ordenados = [...itens].sort((a, b) => ORDEM[a.tom] - ORDEM[b.tom])
  const criticos = itens.filter((i) => i.tom === 'danger').length

  return (
    <section className="card-purion" style={{ padding: '14px 16px 12px' }} aria-label="Precisa de você">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: itens.length ? 10 : 0 }}>
        <span className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          {itens.length > 0 && <span className="pulse" aria-hidden style={{ background: criticos ? COR.danger : COR.warning }} />}
          Precisa de você
        </span>
        {itens.length > 0 ? (
          <span className="caption tnum">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}{criticos > 0 ? ` · ${criticos} crítico${criticos > 1 ? 's' : ''}` : ''}
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--status-ok)' }}>
            <CheckCircle2 size={14} /> Nada pendente — tudo em dia.
          </span>
        )}
      </div>

      {itens.length > 0 && (
        <div className="fila-grid">
          {ordenados.map((item) => (
            <Link key={item.id} href={item.href} className="fila-item" title={item.detalhe ? `${item.titulo} — ${item.detalhe}` : item.titulo} style={{ ['--tom' as string]: COR[item.tom] }}>
              <span className="fila-item-valor tnum">
                {item.valor != null ? <AnimatedNumber value={item.valor} /> : '!'}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="fila-item-titulo">{item.titulo}</span>
                {item.detalhe && <span className="fila-item-detalhe">{item.detalhe}</span>}
              </span>
              <ArrowUpRight size={14} className="fila-item-seta" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      {rodape}
    </section>
  )
}

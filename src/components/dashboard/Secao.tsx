'use client'

import { ChevronDown } from 'lucide-react'

interface Props {
  titulo: string
  /** texto curto ao lado do título (ex.: período) */
  sub?: React.ReactNode
  /** controles à direita (ex.: seletor de período) */
  acao?: React.ReactNode
  recolhida?: boolean
  onAlternar?: () => void
  children: React.ReactNode
}

/** Bloco da tela inicial: título em rótulo mono, ação à direita e conteúdo recolhível. */
export function Secao({ titulo, sub, acao, recolhida = false, onAlternar, children }: Props) {
  return (
    <section className="dash-secao">
      <div className="dash-secao-cabecalho">
        <button
          type="button" onClick={onAlternar} disabled={!onAlternar}
          aria-expanded={!recolhida} className="dash-secao-titulo"
          title={recolhida ? 'Expandir seção' : 'Recolher seção'}
        >
          <ChevronDown size={13} style={{ transform: recolhida ? 'rotate(-90deg)' : 'none', transition: 'transform 200ms var(--ease-expo)' }} />
          <span>{titulo}</span>
          {sub && <span className="dash-secao-sub">{sub}</span>}
        </button>
        {!recolhida && acao}
      </div>
      {!recolhida && children}
    </section>
  )
}

export { Segmentado } from '@/components/ui/Segmentado'

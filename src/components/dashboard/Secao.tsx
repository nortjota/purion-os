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

/** Controle segmentado (período etc.) — o item ativo é o único uso do acento no bloco. */
export function Segmentado<T extends string | number>({ opcoes, valor, onChange, rotulo }: {
  opcoes: ReadonlyArray<{ id: T; label: string }>
  valor: T
  onChange: (v: T) => void
  rotulo?: string
}) {
  return (
    <div className="segmented" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={String(o.id)} type="button" data-ativo={o.id === valor || undefined} aria-pressed={o.id === valor} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

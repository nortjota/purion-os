'use client'

/** Controle segmentado (período, canal, visão…). O item ativo é neutro (off-white), não acento. */
export function Segmentado<T extends string | number>({ opcoes, valor, onChange, rotulo, className = '' }: {
  opcoes: ReadonlyArray<{ id: T; label: string; icon?: React.ComponentType<{ size?: number }>; contagem?: number }>
  valor: T
  onChange: (v: T) => void
  rotulo?: string
  className?: string
}) {
  return (
    <div className={`segmented ${className}`} role="group" aria-label={rotulo}>
      {opcoes.map((o) => {
        const Icon = o.icon
        return (
          <button key={String(o.id)} type="button" data-ativo={o.id === valor || undefined} aria-pressed={o.id === valor} onClick={() => onChange(o.id)}>
            {Icon && <Icon size={13} />}
            {o.label}
            {o.contagem != null && <span className="segmented-contagem tnum">{o.contagem}</span>}
          </button>
        )
      })}
    </div>
  )
}

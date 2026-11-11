/**
 * Placeholder de carregamento com shimmer (classe .skeleton de globals.css).
 * `rows` linhas de texto; `card` = blocos de card. Texto acessível mantido para leitores de tela.
 */
export function Skeleton({ rows = 3, card = false, label = 'Carregando…', style }: {
  rows?: number
  card?: boolean
  label?: string
  style?: React.CSSProperties
}) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', padding: card ? 0 : '8px 0', ...style }}>
      <span className="sr-only">{label}</span>
      {card ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 14, width: `${[92, 76, 84, 64, 88][i % 5]}%` }} />
        ))
      )}
    </div>
  )
}

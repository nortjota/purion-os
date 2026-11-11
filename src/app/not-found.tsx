import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0B0B0B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'var(--font-body, sans-serif)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.15em', marginBottom: '4px' }}>
          PURION
        </div>
        <div style={{ fontSize: '11px', color: '#B8B8B8', letterSpacing: '0.2em', marginBottom: '32px' }}>OS</div>

        <div style={{ fontSize: '72px', fontWeight: 700, color: '#242726', lineHeight: 1, marginBottom: '16px' }}>
          404
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F0', marginBottom: '8px' }}>
          Página não encontrada
        </h1>
        <p style={{ fontSize: '13px', color: '#B8B8B8', marginBottom: '28px', lineHeight: 1.6 }}>
          A página que você tentou acessar não existe ou foi movida.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block', padding: '10px 28px',
            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Ir para o início
        </Link>
      </div>
    </div>
  )
}

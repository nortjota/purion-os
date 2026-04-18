'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log apenas o digest (seguro — não expõe stack trace no browser)
    console.error('[PURION OS]', error.digest ?? 'unknown')
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0D0D0D',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'var(--font-sans, sans-serif)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '28px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.15em', marginBottom: '4px' }}>
          PURION
        </div>
        <div style={{ fontSize: '11px', color: '#6B6B6B', letterSpacing: '0.2em', marginBottom: '32px' }}>OS</div>

        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#FAFAF8', marginBottom: '8px' }}>
          Algo deu errado
        </h1>
        <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '28px', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>

        <button
          onClick={reset}
          style={{
            padding: '10px 28px', backgroundColor: '#C9A84C', color: '#0D0D0D',
            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>

        <p style={{ marginTop: '16px' }}>
          <a href="/" style={{ fontSize: '12px', color: '#6B6B6B', textDecoration: 'none' }}>
            ← Voltar para o início
          </a>
        </p>
      </div>
    </div>
  )
}

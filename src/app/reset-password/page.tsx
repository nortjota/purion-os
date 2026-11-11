'use client'

import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!isSupabaseConfigured()) {
      setSent(true)
      setLoading(false)
      return
    }

    try {
      if (!supabase) { setError('Erro ao enviar e-mail. Tente novamente.'); setLoading(false); return }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/invite/reset`,
      })
      if (resetError) { setError(resetError.message); setLoading(false); return }
      setSent(true)
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '42px', backgroundColor: '#0B0B0B',
    border: '1px solid #2A2C2B', borderRadius: '8px', padding: '0 12px',
    fontSize: '14px', color: '#F5F5F0', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1B1D1C', border: '1px solid #242726', borderRadius: '16px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.15em' }}>PURION</div>
          <div style={{ fontSize: '12px', color: '#B8B8B8', letterSpacing: '0.2em', marginTop: '2px' }}>OS</div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #D4FC3C, transparent)', margin: '12px auto 0' }} />
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
            <p style={{ fontSize: '14px', color: '#F5F5F0', fontWeight: 500, marginBottom: '8px' }}>E-mail enviado</p>
            <p style={{ fontSize: '12px', color: '#B8B8B8', marginBottom: '24px' }}>
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <a href="/login" style={{ fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none' }}>
              ← Voltar para o login
            </a>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: '#B8B8B8', textAlign: 'center', marginBottom: '28px' }}>
              Informe seu e-mail para receber o link de redefinição
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>E-mail</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" required style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--brand-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,252,60,0.15)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #2A2C2B'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              {error && <p style={{ fontSize: '12px', color: 'var(--status-danger)', textAlign: 'center', margin: 0 }}>{error}</p>}
              <button
                type="submit" disabled={loading}
                style={{ width: '100%', height: '42px', backgroundColor: loading ? '#A9CA30' : 'var(--brand-accent)', color: '#0B0B0B', border: 'none', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
              >
                {loading ? 'Enviando…' : 'Enviar link de redefinição'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              <a href="/login" style={{ fontSize: '12px', color: '#B8B8B8', textDecoration: 'none' }}>← Voltar para o login</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

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
      const sb = createClient()
      const { error: resetError } = await sb.auth.resetPasswordForEmail(email, {
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
    width: '100%', height: '42px', backgroundColor: '#0D0D0D',
    border: '1px solid #252525', borderRadius: '8px', padding: '0 12px',
    fontSize: '14px', color: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.15em' }}>PURION</div>
          <div style={{ fontSize: '12px', color: '#B8B8B8', letterSpacing: '0.2em', marginTop: '2px' }}>OS</div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '12px auto 0' }} />
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
            <p style={{ fontSize: '14px', color: '#FAFAF8', fontWeight: 500, marginBottom: '8px' }}>E-mail enviado</p>
            <p style={{ fontSize: '12px', color: '#B8B8B8', marginBottom: '24px' }}>
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <a href="/login" style={{ fontSize: '12px', color: '#C9A84C', textDecoration: 'none' }}>
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
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #C9A84C'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #252525'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              {error && <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', margin: 0 }}>{error}</p>}
              <button
                type="submit" disabled={loading}
                style={{ width: '100%', height: '42px', backgroundColor: loading ? '#8B7435' : '#C9A84C', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
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

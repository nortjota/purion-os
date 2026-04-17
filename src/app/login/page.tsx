'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!isSupabaseConfigured()) {
      const redirect = searchParams.get('redirect') ?? '/'
      router.push(redirect)
      return
    }

    try {
      const sb = createClient()
      const { error: authError } = await sb.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('E-mail ou senha incorretos.')
        setLoading(false)
        return
      }
      const redirect = searchParams.get('redirect') ?? '/'
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '42px', backgroundColor: '#0D0D0D',
    border: '1px solid #252525', borderRadius: '8px', padding: '0 12px',
    fontSize: '14px', color: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
          E-mail
        </label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com" required style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid #C9A84C'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)' }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid #252525'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Senha
          </label>
          <a href="/reset-password" style={{ fontSize: '11px', color: '#C9A84C', textDecoration: 'none', opacity: 0.8 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            Esqueci minha senha
          </a>
        </div>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" required style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid #C9A84C'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)' }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid #252525'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {error && <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', margin: 0 }}>{error}</p>}

      <button
        type="submit" disabled={loading}
        style={{
          width: '100%', height: '42px',
          backgroundColor: loading ? '#8B7435' : '#C9A84C',
          color: '#0D0D0D', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            Entrando…
          </>
        ) : 'Entrar'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '40px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.15em', lineHeight: 1 }}>PURION</div>
          <div style={{ fontSize: '12px', fontWeight: 400, color: '#6B6B6B', letterSpacing: '0.2em', marginTop: '2px' }}>OS</div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '12px auto 0' }} />
        </div>

        <p style={{ fontSize: '13px', color: '#6B6B6B', textAlign: 'center', marginBottom: '28px' }}>
          Entre na sua conta para continuar
        </p>

        <Suspense fallback={<div style={{ height: '200px' }} />}>
          <LoginForm />
        </Suspense>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#3A3A3A' }}>
          PURION OS · Acesso apenas por convite
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

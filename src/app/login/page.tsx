'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

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
      if (!supabase) { setError('Erro ao conectar. Tente novamente.'); setLoading(false); return }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
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

  const inputBase: React.CSSProperties = {
    width: '100%', height: 42,
    backgroundColor: '#0B0B0B',
    border: '1px solid #2A2C2B',
    borderRadius: 8, padding: '0 12px',
    fontSize: 14, color: '#F5F5F0',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
    fontFamily: 'inherit',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          E-mail
        </label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com" required style={inputBase}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,252,60,0.15)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2C2B'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Senha
          </label>
          <a
            href="/reset-password"
            style={{ fontSize: 11, color: 'var(--text-primary)', textDecoration: 'none', opacity: 0.75, transition: 'opacity 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
          >
            Esqueci minha senha
          </a>
        </div>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" required style={inputBase}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,252,60,0.15)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2C2B'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--status-danger)', textAlign: 'center', margin: 0, padding: '8px 12px', background: 'rgba(229,84,75,0.06)', borderRadius: 6, border: '1px solid rgba(229,84,75,0.15)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', height: 44,
          backgroundColor: loading ? '#A9CA30' : 'var(--brand-accent)',
          color: '#0B0B0B', border: 'none', borderRadius: 999,
          fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background-color 150ms',
          fontFamily: 'inherit',
        }}
      >
        {loading ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#0B0B0B" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            Aguarde...
          </>
        ) : 'Acessar conta'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B0B0B',
      backgroundImage: [
        'radial-gradient(circle at 20% 50%, rgba(245,245,240,0.03) 0%, transparent 50%)',
        'radial-gradient(circle at 80% 20%, rgba(245,245,240,0.03) 0%, transparent 50%)',
      ].join(', '),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 420,
          backgroundColor: '#0B0B0B',
          border: '1px solid #242726',
          borderRadius: 20,
          padding: 40,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.15em', lineHeight: 1, display: 'inline' }}>
            PURION
          </div>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#B8B8B8', letterSpacing: '0.2em', marginLeft: 6 }}>
            OS
          </span>
          <div style={{ width: 32, height: 1, background: 'var(--primary)', margin: '16px auto 0', opacity: 0.7 }} />
        </div>

        <p style={{ fontSize: 14, color: '#B8B8B8', textAlign: 'center', marginBottom: 24, marginTop: 0 }}>
          Acesse sua conta
        </p>

        <Suspense fallback={<div style={{ height: 200 }} />}>
          <LoginForm />
        </Suspense>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#888888', marginBottom: 0 }}>
          Acesso apenas por convite
        </p>
      </motion.div>

      <p style={{ marginTop: 20, fontSize: 11, color: '#888888' }}>
        © 2025 PURION OS
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

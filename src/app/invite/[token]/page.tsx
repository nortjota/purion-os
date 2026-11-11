'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function InvitePage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [validSession, setValid]  = useState(false)

  useEffect(() => {
    // Supabase embeds the recovery/invite token in the URL hash — exchange it for a session
    if (!supabase) { setValid(true); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValid(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    setError(null)
    setLoading(true)

    if (!isSupabaseConfigured() || !supabase) {
      router.push('/')
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); setLoading(false); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Erro ao definir senha. Tente novamente.')
      setLoading(false)
    }
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

        <p style={{ fontSize: '14px', color: '#F5F5F0', fontWeight: 500, textAlign: 'center', marginBottom: '6px' }}>
          Bem-vindo ao PURION OS
        </p>
        <p style={{ fontSize: '13px', color: '#B8B8B8', textAlign: 'center', marginBottom: '28px' }}>
          Defina sua senha para ativar o acesso
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(['password', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                {field === 'password' ? 'Nova senha' : 'Confirmar senha'}
              </label>
              <input
                type="password"
                value={field === 'password' ? password : confirm}
                onChange={(e) => field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--brand-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,252,60,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid #2A2C2B'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          ))}

          {error && <p style={{ fontSize: '12px', color: 'var(--status-danger)', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', height: '42px', backgroundColor: loading ? '#A9CA30' : 'var(--brand-accent)', color: '#0B0B0B', border: 'none', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
          >
            {loading ? 'Ativando acesso…' : 'Ativar minha conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

export default function InvitePage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [validSession, setValid]  = useState(false)

  useEffect(() => {
    // Supabase embeds the recovery/invite token in the URL hash — exchange it for a session
    if (!isSupabaseConfigured()) { setValid(true); return }
    const sb = createClient()
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setValid(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    setError(null)
    setLoading(true)

    if (!isSupabaseConfigured()) {
      router.push('/')
      return
    }

    try {
      const sb = createClient()
      const { error: updateError } = await sb.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); setLoading(false); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Erro ao definir senha. Tente novamente.')
      setLoading(false)
    }
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
          <div style={{ fontSize: '12px', color: '#6B6B6B', letterSpacing: '0.2em', marginTop: '2px' }}>OS</div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '12px auto 0' }} />
        </div>

        <p style={{ fontSize: '14px', color: '#FAFAF8', fontWeight: 500, textAlign: 'center', marginBottom: '6px' }}>
          Bem-vindo ao PURION OS
        </p>
        <p style={{ fontSize: '13px', color: '#6B6B6B', textAlign: 'center', marginBottom: '28px' }}>
          Defina sua senha para ativar o acesso
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(['password', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
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
                onFocus={(e) => { e.currentTarget.style.border = '1px solid #C9A84C'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid #252525'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          ))}

          {error && <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', height: '42px', backgroundColor: loading ? '#8B7435' : '#C9A84C', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
          >
            {loading ? 'Ativando acesso…' : 'Ativar minha conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

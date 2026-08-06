'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nomeEmpresa: '',
    nomeAdmin:   '',
    email:       '',
    password:    '',
    confirm:     '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeEmpresa: form.nomeEmpresa,
          nomeAdmin:   form.nomeAdmin,
          email:       form.email,
          password:    form.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta.')
        setLoading(false)
        return
      }

      // Faz login automático após criar a conta
      if (isSupabaseConfigured()) {
        const sb = createClient()
        await sb.auth.signInWithPassword({ email: form.email, password: form.password })
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '42px', backgroundColor: '#0D0D0D',
    border: '1px solid #252525', borderRadius: '8px', padding: '0 12px',
    fontSize: '14px', color: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #C9A84C'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'
  }
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #252525'
    e.currentTarget.style.boxShadow = 'none'
  }

  const fields: Array<{ field: keyof typeof form; label: string; placeholder: string; type?: string }> = [
    { field: 'nomeEmpresa', label: 'Nome da empresa',  placeholder: 'Minha Marca DTC' },
    { field: 'nomeAdmin',   label: 'Seu nome',         placeholder: 'João Silva' },
    { field: 'email',       label: 'E-mail',           placeholder: 'joao@empresa.com', type: 'email' },
    { field: 'password',    label: 'Senha',            placeholder: '••••••••',         type: 'password' },
    { field: 'confirm',     label: 'Confirmar senha',  placeholder: '••••••••',         type: 'password' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '40px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.15em', lineHeight: 1 }}>PURION</div>
          <div style={{ fontSize: '12px', color: '#B8B8B8', letterSpacing: '0.2em', marginTop: '2px' }}>OS</div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '12px auto 0' }} />
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#FAFAF8', marginBottom: '4px', textAlign: 'center' }}>
          Criar sua conta
        </h2>
        <p style={{ fontSize: '13px', color: '#B8B8B8', textAlign: 'center', marginBottom: '24px' }}>
          Seu sistema estará pronto em segundos
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.map(({ field, label, placeholder, type = 'text' }) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                {label}
              </label>
              <input
                type={type}
                value={form[field]}
                onChange={set(field)}
                placeholder={placeholder}
                required
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </div>
          ))}

          {error && (
            <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '44px',
              backgroundColor: loading ? '#8B7435' : '#C9A84C',
              color: '#0D0D0D', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Criando sua conta…
              </>
            ) : 'Começar agora — grátis'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#A0A0A0' }}>
          Já tem uma conta?{' '}
          <a href="/login" style={{ color: '#C9A84C', textDecoration: 'none' }}>Entrar</a>
        </p>

        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#2E2E2E' }}>
          Ao criar sua conta você concorda com os termos de uso.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

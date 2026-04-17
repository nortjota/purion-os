'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0D0D0D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#141414',
          border: '1px solid #1E1E1E',
          borderRadius: '16px',
          padding: '40px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#C9A84C',
              letterSpacing: '0.15em',
              lineHeight: 1,
            }}
          >
            PURION
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#6B6B6B',
              letterSpacing: '0.2em',
              marginTop: '2px',
            }}
          >
            OS
          </div>
          {/* Golden line */}
          <div
            style={{
              width: '40px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
              margin: '12px auto 0',
            }}
          />
        </div>

        <p
          style={{
            fontSize: '13px',
            color: '#6B6B6B',
            textAlign: 'center',
            marginBottom: '28px',
            letterSpacing: '-0.01em',
          }}
        >
          Entre na sua conta para continuar
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: '#6B6B6B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #252525',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '14px',
                color: '#FAFAF8',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid #C9A84C'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid #252525'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: '#6B6B6B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: '#0D0D0D',
                border: '1px solid #252525',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '14px',
                color: '#FAFAF8',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid #C9A84C'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid #252525'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#C9A84C',
              color: '#0D0D0D',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'background-color 150ms, transform 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#B8943E'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C9A84C'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Entrar
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '11px',
            color: '#4A4A4A',
          }}
        >
          PURION OS · Acesso restrito
        </p>
      </div>
    </div>
  )
}

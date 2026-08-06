'use client'

import { useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Tudo em um só lugar',
    desc: 'CRM, financeiro, produção, creators e tráfego integrados. Zero planilha, zero fragmentação.',
  },
  {
    icon: '🔒',
    title: 'Isolamento total de dados',
    desc: 'Cada empresa tem seus dados 100% isolados com Row Level Security no Supabase. Multi-tenant enterprise-grade.',
  },
  {
    icon: '📊',
    title: 'Inteligência em tempo real',
    desc: 'DRE, fluxo de caixa, ROI de creators e ROAS de tráfego num único dashboard executivo.',
  },
]

export default function LandingPage() {
  const [form, setForm]     = useState({ nome: '', empresa: '', email: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSupabaseConfigured()) {
        const sb = createClient()
        await sb.from('leads_saas').insert([{
          nome: form.nome,
          empresa: form.empresa,
          email: form.email,
          whatsapp: form.whatsapp,
          criado_em: new Date().toISOString(),
        }])
      }
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '42px', backgroundColor: '#0D0D0D',
    border: '1px solid #252525', borderRadius: '8px', padding: '0 12px',
    fontSize: '14px', color: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border = '1px solid #C9A84C'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border = '1px solid #252525'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', color: '#FAFAF8', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #141414' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.15em' }}>PURION</span>
          <span style={{ fontSize: '10px', color: '#B8B8B8', letterSpacing: '0.1em' }}>OS</span>
        </div>
        <a
          href="/login"
          style={{ fontSize: '13px', color: '#C9A84C', textDecoration: 'none', padding: '8px 20px', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px' }}
        >
          Entrar
        </a>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '96px 24px 64px' }}>
        <div style={{ display: 'inline-block', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '100px', padding: '4px 14px', marginBottom: '24px' }}>
          SaaS para marcas DTC
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '20px', maxWidth: '700px', margin: '0 auto 20px' }}>
          O sistema operacional<br />
          <span style={{ color: '#C9A84C' }}>para marcas DTC</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#8B8B8B', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Gerencie CRM, financeiro, produção, creators e tráfego pago num único painel. Feito para quem escala.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/signup"
            style={{ display: 'inline-block', backgroundColor: '#C9A84C', color: '#0D0D0D', padding: '14px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.02em' }}
          >
            Começar agora — grátis
          </a>
          <a
            href="#demo"
            style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#C9A84C', padding: '14px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            Solicitar demonstração
          </a>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {BENEFITS.map((b) => (
          <div key={b.title} style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '28px 24px' }}>
            <div style={{ fontSize: '28px', marginBottom: '14px' }}>{b.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#FAFAF8' }}>{b.title}</h3>
            <p style={{ fontSize: '13px', color: '#B8B8B8', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
          </div>
        ))}
      </section>

      {/* Form */}
      <section id="demo" style={{ maxWidth: '480px', margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '40px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Recebemos sua solicitação!</h3>
              <p style={{ fontSize: '13px', color: '#B8B8B8' }}>Nossa equipe entrará em contato em até 24h para agendar a demonstração.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Solicitar demonstração</h2>
              <p style={{ fontSize: '13px', color: '#B8B8B8', marginBottom: '28px' }}>Preencha e nossa equipe entra em contato em 24h.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { field: 'nome',      label: 'Nome completo',    placeholder: 'João Silva' },
                  { field: 'empresa',   label: 'Empresa',          placeholder: 'Minha Marca DTC' },
                  { field: 'email',     label: 'E-mail',           placeholder: 'joao@empresa.com' },
                  { field: 'whatsapp',  label: 'WhatsApp',         placeholder: '(11) 99999-9999' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#B8B8B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      {label}
                    </label>
                    <input
                      type={field === 'email' ? 'email' : 'text'}
                      value={form[field as keyof typeof form]}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      required
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                ))}
                {error && <p style={{ fontSize: '12px', color: '#EF4444', margin: 0 }}>{error}</p>}
                <button
                  type="submit" disabled={loading}
                  style={{ width: '100%', height: '44px', backgroundColor: loading ? '#8B7435' : '#C9A84C', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
                >
                  {loading ? 'Enviando…' : 'Solicitar demonstração'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #141414', fontSize: '12px', color: '#8A8A8A' }}>
        © 2025 PURION OS · Todos os direitos reservados
      </footer>
    </div>
  )
}

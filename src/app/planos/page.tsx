'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Plano = {
  id: string
  nome: string
  preco: number
  descricao: string
  features: string[]
  destaque?: boolean
}

const PLANOS: Plano[] = [
  {
    id: 'starter',
    nome: 'Starter',
    preco: 297,
    descricao: 'Para marcas que estão começando a escalar.',
    features: ['Até 3 usuários', 'CRM + Financeiro + Produção', 'SAC básico', 'Relatórios essenciais', 'Suporte via e-mail'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 597,
    descricao: 'Para marcas em crescimento acelerado.',
    features: ['Até 10 usuários', 'Todos os módulos', 'SAC completo + WhatsApp', 'Onboarding guiado', 'Alertas automáticos', 'Suporte prioritário'],
    destaque: true,
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 1497,
    descricao: 'Para operações de alto volume.',
    features: ['Usuários ilimitados', 'Todos os módulos', 'Integrações customizadas', 'SLA garantido', 'Gerente de sucesso dedicado', 'White-label disponível'],
  },
]

function PlanosContent() {
  const params   = useSearchParams()
  const sucesso  = params.get('sucesso') === '1'
  const cancelado = params.get('cancelado') === '1'

  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  async function assinar(planoId: string) {
    setLoading(planoId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: planoId, email }),
      })
      const { url, error } = await res.json()
      if (error) { alert(error); return }
      if (url) window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const cardBase: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
  }

  return (
    <div className="page-content">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>PURION OS</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>Escolha seu plano</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>14 dias grátis · Cancele quando quiser · Preços em BRL/mês</p>
      </div>

      {sucesso && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 10, padding: '14px 20px', marginBottom: 24, color: '#10B981', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
          ✅ Assinatura ativada com sucesso! Bem-vindo ao PURION OS.
        </div>
      )}
      {cancelado && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: 10, padding: '14px 20px', marginBottom: 24, color: '#EF4444', fontSize: 14, textAlign: 'center' }}>
          Pagamento cancelado. Você pode tentar novamente quando quiser.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto' }}>
        {PLANOS.map(p => (
          <div key={p.id} style={{
            ...cardBase,
            border: p.destaque ? '2px solid #C9A84C' : '1px solid var(--border)',
            position: 'relative',
          }}>
            {p.destaque && (
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#C9A84C', color: '#0D0D0D', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                <Zap size={10} style={{ marginRight: 4 }} />
                Mais popular
              </div>
            )}
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{p.nome}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>R$ {p.preco}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/mês</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{p.descricao}</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {p.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                  <Check size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => assinar(p.id)}
              disabled={!!loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: p.destaque ? '#C9A84C' : 'var(--bg-surface-2)',
                color: p.destaque ? '#0D0D0D' : 'var(--text-primary)',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                opacity: loading && loading !== p.id ? 0.6 : 1,
              }}>
              {loading === p.id ? 'Redirecionando…' : 'Começar agora'}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 32 }}>
        Pagamento seguro via Stripe · Emitimos NF · Dúvidas? contato@puriongt.com.br
      </p>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  )
}

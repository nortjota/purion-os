'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

type Passo = {
  id: string
  titulo: string
  descricao: string
  href: string
  cta: string
}

const PASSOS: Passo[] = [
  { id: 'boas_vindas',   titulo: 'Bem-vindo ao PURION OS',            descricao: 'Você está no sistema operacional da PURION. Vamos configurar tudo para você.',           href: '/',                 cta: 'Ver dashboard'         },
  { id: 'perfil',        titulo: 'Complete seu perfil',               descricao: 'Adicione seu nome e cargo para personalizar sua experiência.',                            href: '/settings/usuarios', cta: 'Ir para Usuários'     },
  { id: 'metas',         titulo: 'Configure as metas da empresa',     descricao: 'Defina as metas de faturamento, ROAS e CPA para monitoramento automático.',              href: '/settings/metas',   cta: 'Ir para Metas'        },
  { id: 'lead',          titulo: 'Adicione seu primeiro lead B2B',    descricao: 'Cadastre uma empresa no CRM para começar a acompanhar o pipeline.',                      href: '/crm',              cta: 'Ir para CRM'          },
  { id: 'tarefa',        titulo: 'Crie sua primeira tarefa',          descricao: 'Organize o trabalho da equipe com tarefas e prazos.',                                    href: '/tarefas',          cta: 'Ir para Tarefas'      },
  { id: 'financeiro',    titulo: 'Registre uma movimentação',         descricao: 'Adicione uma receita ou despesa para começar a acompanhar o financeiro.',                href: '/financeiro',       cta: 'Ir para Financeiro'   },
  { id: 'afiliado',      titulo: 'Cadastre um creator ou afiliado',   descricao: 'Adicione influenciadores e afiliados para rastrear vendas e comissões.',                 href: '/afiliados',        cta: 'Ir para Afiliados'    },
  { id: 'command',       titulo: 'Explore o Command Center',         descricao: 'Use Ctrl+K para acessar ações rápidas em qualquer lugar do sistema.',                    href: '/',                 cta: 'Ver Command Center'   },
]

export function OnboardingChecklist() {
  const router = useRouter()
  const [passos, setPassos]         = useState<string[]>([])
  const [concluido, setConcluido]   = useState(false)
  const [collapsed, setCollapsed]   = useState(false)
  const [confetti, setConfetti]     = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(d => {
        setPassos(d.passos_concluidos ?? [])
        setConcluido(d.concluido ?? false)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const marcarPasso = useCallback(async (id: string) => {
    const novos = passos.includes(id) ? passos : [...passos, id]
    setPassos(novos)
    const todosFeitos = PASSOS.every(p => novos.includes(p.id))
    if (todosFeitos && !concluido) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3000)
    }
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passo: id }),
    })
  }, [passos, concluido])

  const dispensar = useCallback(async () => {
    setConcluido(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concluido: true }),
    })
  }, [])

  const handleIr = (passo: Passo) => {
    marcarPasso(passo.id)
    router.push(passo.href)
  }

  if (carregando || concluido) return null

  const concluidos = passos.length
  const total      = PASSOS.length
  const pct        = Math.round((concluidos / total) * 100)
  const todos      = concluidos === total

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderLeft: '3px solid #C9A84C', borderRadius: 12,
      margin: '0 0 24px', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <Sparkles size={16} style={{ color: '#C9A84C', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {todos ? '🎉 PURION OS configurado!' : 'Configure o PURION OS'}
              </p>
              <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600 }}>
                {concluidos}/{total}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: todos ? '#10B981' : '#C9A84C', borderRadius: 4, transition: 'width 400ms ease' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={dispensar}
            title="Dispensar"
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
          {PASSOS.map((p, i) => {
            const feito = passos.includes(p.id)
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 20px',
                background: feito ? 'rgba(16,185,129,0.03)' : 'transparent',
                borderBottom: i < PASSOS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: feito ? '2px solid #10B981' : '2px solid var(--border)',
                  background: feito ? '#10B981' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {feito && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                {/* Text */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: feito ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, textDecoration: feito ? 'line-through' : 'none' }}>
                    {p.titulo}
                  </p>
                  {!feito && (
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{p.descricao}</p>
                  )}
                </div>
                {/* CTA */}
                {!feito && (
                  <button
                    onClick={() => handleIr(p)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)', color: '#C9A84C', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {p.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confetti overlay */}
      {confetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, animation: 'confetti-pop 3s ease forwards' }}>🎉✨🎊</div>
          <style>{`
            @keyframes confetti-pop {
              0%   { opacity:0; transform:scale(0.5) translateY(40px); }
              20%  { opacity:1; transform:scale(1.2) translateY(0); }
              80%  { opacity:1; }
              100% { opacity:0; transform:scale(1) translateY(-60px); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Shield, User, Building2, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Perfil } from '@/lib/auth-types'

const PLANO_LABEL: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

const PLANO_LIMITE: Record<string, number> = {
  starter: 3,
  pro: 10,
  enterprise: 999,
}

export default function EmpresaDashboard() {
  const { user, perfil, tenant } = useAuth()
  const isAdmin = perfil?.role === 'admin'

  const [usuarios, setUsuarios]       = useState<Perfil[]>([])
  const [loadingUsers, setLoadingU]   = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCargo, setInviteCargo] = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteOk, setInviteOk]       = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [showInvite, setShowInvite]   = useState(false)

  useEffect(() => {
    if (!tenant || !isSupabaseConfigured()) return
    setLoadingU(true)
    const sb = createClient()
    sb.from('perfis').select('*').eq('tenant_id', tenant.id)
      .then(({ data }) => {
        setUsuarios((data as Perfil[]) ?? [])
        setLoadingU(false)
      })
  }, [tenant])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviting(true)

    if (!isSupabaseConfigured() || !tenant) {
      setInviteOk(true)
      setInviting(false)
      return
    }

    try {
      // NOTE: inviteUserByEmail requires the service role key (server-side only).
      // Wire this to /api/invite route with SUPABASE_SERVICE_ROLE_KEY.
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, cargo: inviteCargo, tenant_id: tenant.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setInviteError(body.error ?? 'Erro ao convidar.')
      } else {
        setInviteOk(true)
        setInviteEmail('')
        setInviteCargo('')
        setShowInvite(false)
      }
    } catch {
      setInviteError('Erro ao enviar convite.')
    }
    setInviting(false)
  }

  async function revogarAcesso(userId: string) {
    if (!isSupabaseConfigured()) return
    if (!confirm('Revogar o acesso deste usuário?')) return
    const sb = createClient()
    await sb.from('perfis').delete().eq('id', userId)
    setUsuarios((prev) => prev.filter((u) => u.id !== userId))
  }

  const limite = PLANO_LIMITE[tenant?.plano ?? 'starter'] ?? 3

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Empresa</h1>
        <p className="caption mt-1">Configurações do tenant, usuários e plano</p>
      </div>

      {/* Tenant info */}
      <section className="grid grid-cols-3 gap-3">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={14} className="text-[#C9A84C]" />
            <p className="kpi-label">Empresa</p>
          </div>
          <p className="kpi-value text-[18px]">{tenant?.nome ?? '—'}</p>
          <p className="caption mt-0.5">Slug: {tenant?.slug ?? '—'}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-[#C9A84C]" />
            <p className="kpi-label">Plano atual</p>
          </div>
          <p className="kpi-value text-[18px]">{PLANO_LABEL[tenant?.plano ?? 'starter']}</p>
          <p className="caption mt-0.5">{usuarios.length}/{limite === 999 ? '∞' : limite} usuários</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-[#C9A84C]" />
            <p className="kpi-label">Seu perfil</p>
          </div>
          <p className="kpi-value text-[18px]">{perfil?.nome ?? user?.email ?? '—'}</p>
          <p className="caption mt-0.5">{perfil?.cargo ?? ''} · {perfil?.role === 'admin' ? 'Admin' : 'Membro'}</p>
        </div>
      </section>

      {/* Usuários */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label">Usuários com acesso</p>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm flex items-center gap-2"
              onClick={() => { setShowInvite(true); setInviteOk(false); setInviteError(null) }}
            >
              <UserPlus size={13} /> Convidar
            </button>
          )}
        </div>

        {inviteOk && (
          <div className="mb-3 p-3 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 text-[12px] text-[#10B981]">
            Convite enviado com sucesso!
          </div>
        )}

        {showInvite && isAdmin && (
          <div className="card-purion mb-4">
            <p className="kpi-label mb-3">Novo convite</p>
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="field-gap">
                  <label className="label-purion">E-mail</label>
                  <input
                    type="email"
                    className="input-purion"
                    placeholder="colaborador@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field-gap">
                  <label className="label-purion">Cargo</label>
                  <input
                    type="text"
                    className="input-purion"
                    placeholder="ex: Comercial"
                    value={inviteCargo}
                    onChange={(e) => setInviteCargo(e.target.value)}
                  />
                </div>
              </div>
              {inviteError && <p className="text-[12px] text-[#EF4444]">{inviteError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={inviting} className="btn btn-primary btn-sm">
                  {inviting ? 'Enviando…' : 'Enviar convite por e-mail'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowInvite(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card-purion overflow-hidden">
          {loadingUsers ? (
            <div className="empty-state"><p className="caption">Carregando…</p></div>
          ) : usuarios.length === 0 && !isSupabaseConfigured() ? (
            <div className="empty-state">
              <p className="text-[13px] text-[var(--text-primary)] font-medium">Supabase não configurado</p>
              <p className="caption mt-1">Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para gerenciar usuários.</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="empty-state"><p className="caption">Nenhum usuário encontrado</p></div>
          ) : (
            <table className="table-purion w-full">
              <thead>
                <tr>
                  <th className="text-left">Usuário</th>
                  <th className="text-left">Cargo</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Status</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#C9A84C] text-[#0D0D0D] flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {u.nome?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium leading-tight">{u.nome}</p>
                          <p className="caption">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="caption">{u.cargo ?? '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-default'} flex items-center gap-1 w-fit`}>
                        {u.role === 'admin' ? <Shield size={9} /> : <User size={9} />}
                        {u.role === 'admin' ? 'Admin' : 'Membro'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success">Ativo</span>
                    </td>
                    {isAdmin && (
                      <td>
                        {u.id !== user?.id && (
                          <button
                            className="icon-btn text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)]"
                            title="Revogar acesso"
                            onClick={() => revogarAcesso(u.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Upgrade */}
      {tenant?.plano === 'starter' && (
        <section>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#C9A84C]/20 bg-[rgba(201,168,76,0.04)]">
            <Zap size={16} className="text-[#C9A84C] mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Upgrade para Pro</p>
              <p className="caption mt-0.5">Tenha até 10 usuários, integrações avançadas e suporte prioritário.</p>
            </div>
            <button className="btn btn-primary btn-sm ml-auto shrink-0">Ver planos</button>
          </div>
        </section>
      )}
    </div>
  )
}

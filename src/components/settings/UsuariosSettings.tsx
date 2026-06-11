'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/auth-types'
import { Pencil, UserX, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'

interface DemoUser {
  id: string
  nome: string
  email: string
  cargo: string
  role: 'master' | 'admin' | 'membro'
  ativo: boolean
  ultima_atividade: string | null
}

const DEMO_USERS: DemoUser[] = [
  { id: '1', nome: 'Matheus', email: 'matheus@purion.com', cargo: 'CEO', role: 'admin', ativo: true, ultima_atividade: new Date().toISOString() },
  { id: '2', nome: 'João', email: 'joao@purion.com', cargo: 'Marketing', role: 'membro', ativo: true, ultima_atividade: null },
  { id: '3', nome: 'Gabriel', email: 'gabriel@purion.com', cargo: 'Produção', role: 'membro', ativo: true, ultima_atividade: null },
]

interface EditModal {
  open: boolean
  user: DemoUser | null
}

export function UsuariosSettings() {
  const { perfil } = useAuth()
  const { success, error } = useToast()
  const isAdmin = perfil?.role === 'admin'

  const [users, setUsers] = useState<DemoUser[]>(DEMO_USERS)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editModal, setEditModal] = useState<EditModal>({ open: false, user: null })

  const [invEmail, setInvEmail] = useState('')
  const [invNome, setInvNome] = useState('')
  const [invCargo, setInvCargo] = useState('')
  const [invRole, setInvRole] = useState<'admin' | 'membro'>('membro')
  const [invLoading, setInvLoading] = useState(false)

  const [editNome, setEditNome] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'membro'>('membro')
  const [editDisponibilidade, setEditDisponibilidade] = useState('')

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const load = async () => {
      const { data } = await sb.from('perfis').select('*')
      if (data && data.length > 0) {
        setUsers(data.map((p: Perfil) => ({
          id: p.id,
          nome: p.nome,
          email: p.email,
          cargo: p.cargo ?? '',
          role: p.role,
          ativo: true,
          ultima_atividade: p.criado_em,
        })))
      }
    }
    load()
  }, [])

  const openEdit = (u: DemoUser) => {
    setEditNome(u.nome)
    setEditCargo(u.cargo)
    setEditRole(u.role === 'master' ? 'admin' : u.role)
    setEditDisponibilidade('')
    setEditModal({ open: true, user: u })
  }

  const saveEdit = () => {
    if (!editModal.user) return
    setUsers(prev => prev.map(u => u.id === editModal.user!.id
      ? { ...u, nome: editNome, cargo: editCargo, role: editRole }
      : u))
    setEditModal({ open: false, user: null })
    success('Usuário atualizado')
  }

  const handleInvite = async () => {
    if (!invEmail.trim() || !invNome.trim()) return
    setInvLoading(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invEmail, nome: invNome, cargo: invCargo, role: invRole }),
      })
      if (res.ok) {
        success('Convite enviado com sucesso')
        setInvEmail(''); setInvNome(''); setInvCargo(''); setInviteOpen(false)
      } else {
        error('Erro ao enviar convite')
      }
    } catch {
      error('Erro ao enviar convite')
    } finally {
      setInvLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Usuários</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Gerencie os membros da equipe.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setInviteOpen(v => !v)}>
            <UserPlus size={15} /> Convidar
            {inviteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Invite Panel */}
      {inviteOpen && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Convidar membro</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">E-mail</label>
              <input className="input-purion w-full" type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Nome</label>
              <input className="input-purion w-full" value={invNome} onChange={e => setInvNome(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Cargo</label>
              <input className="input-purion w-full" value={invCargo} onChange={e => setInvCargo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Role</label>
              <select className="input-purion w-full" value={invRole} onChange={e => setInvRole(e.target.value as 'admin' | 'membro')}>
                <option value="membro">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleInvite} disabled={invLoading}>
            {invLoading ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Avatar', 'Nome', 'E-mail', 'Cargo', 'Role', 'Status', 'Última atividade', 'Ações'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[#8A8A8A] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] font-bold text-xs">
                    {u.nome.charAt(0)}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{u.nome}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{u.cargo}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                  {u.ultima_atividade ? new Date(u.ultima_atividade).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x)); success('Status atualizado') }}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] hover:text-red-400"
                    >
                      <UserX size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal.open && editModal.user && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditModal({ open: false, user: null })}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Editar usuário</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8A8A] block mb-1">Nome</label>
                <input className="input-purion w-full" value={editNome} onChange={e => setEditNome(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] block mb-1">Cargo</label>
                <input className="input-purion w-full" value={editCargo} onChange={e => setEditCargo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] block mb-1">Role</label>
                <select className="input-purion w-full" value={editRole} onChange={e => setEditRole(e.target.value as 'admin' | 'membro')}>
                  <option value="membro">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A] block mb-1">Disponibilidade</label>
                <input className="input-purion w-full" value={editDisponibilidade} onChange={e => setEditDisponibilidade(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary flex-1" onClick={saveEdit}>Salvar</button>
              <button className="btn btn-secondary flex-1" onClick={() => setEditModal({ open: false, user: null })}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

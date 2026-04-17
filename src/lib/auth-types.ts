export interface Perfil {
  id: string
  tenant_id: string
  nome: string
  email: string
  cargo?: string
  role: 'admin' | 'membro'
  disponibilidade?: string
  criado_em: string
}

export interface Tenant {
  id: string
  nome: string
  slug: string
  plano: 'starter' | 'pro' | 'enterprise'
  ativo: boolean
  criado_em: string
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null
  perfil: Perfil | null
  tenant: Tenant | null
  loading: boolean
  signOut: () => Promise<void>
}

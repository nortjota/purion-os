'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Perfil, Tenant, AuthState } from '@/lib/auth-types'

const defaultState: AuthState = {
  user: null,
  perfil: null,
  tenant: null,
  loading: false,
  signOut: async () => {},
}

export const AuthContext = createContext<AuthState>(defaultState)

export function useAuthContext() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured())

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadPerfil = async (userId: string) => {
      const { data } = await sb
        .from('perfis')
        .select('*, tenants(*)')
        .eq('id', userId)
        .single()

      if (data) {
        const { tenants: tenantData, ...perfilData } = data
        setPerfil(perfilData as Perfil)
        setTenant(tenantData as Tenant)
      }
      setLoading(false)
    }

    // Fetch current session
    sb.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadPerfil(user.id)
      else setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (nextUser) {
        setLoading(true)
        loadPerfil(nextUser.id)
      } else {
        setPerfil(null)
        setTenant(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    // middleware will redirect to /login
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, perfil, tenant, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

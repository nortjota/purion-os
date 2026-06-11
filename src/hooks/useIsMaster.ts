'use client'

import { useAuthContext } from '@/components/providers/AuthProvider'

export function useIsMaster() {
  const { perfil, loading } = useAuthContext()
  return { isMaster: perfil?.role === 'master', loading }
}

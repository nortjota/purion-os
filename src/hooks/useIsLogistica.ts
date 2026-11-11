'use client'

import { useAuthContext } from '@/components/providers/AuthProvider'

/**
 * Perfil de apoio "Logística · Goiânia" (operador terceirizado).
 * Acesso restrito: só vê a Fila de Despacho e lança rastreio.
 * Mesmo padrão do useIsMaster — o papel vem de perfis.role.
 */
export function useIsLogistica() {
  const { perfil, loading } = useAuthContext()
  return { isLogistica: perfil?.role === 'logistica', loading }
}

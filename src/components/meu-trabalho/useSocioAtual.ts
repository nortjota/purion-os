'use client'

import { usePurionStore } from '@/store'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { SOCIOS_ATIVOS, isSocioAtivo, type SocioAtivo } from '@/lib/socios'

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Qual sócio está usando o sistema: pelo nome do perfil logado (ex.: "Matheus Silva" → matheus);
 * se não casar, usa o sócio escolhido no seletor do app (perfilAtivo).
 */
export function useSocioAtual(): SocioAtivo {
  const { perfil } = useAuthContext()
  const { perfilAtivo } = usePurionStore()
  if (perfil?.nome) {
    const nome = normalizar(perfil.nome)
    const achado = SOCIOS_ATIVOS.find((s) => nome.startsWith(normalizar(s.nome)))
    if (achado) return achado.id as SocioAtivo
  }
  return isSocioAtivo(perfilAtivo) ? perfilAtivo : 'matheus'
}

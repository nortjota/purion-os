/**
 * PURION OS — Fonte única de verdade da estrutura da empresa.
 *
 * Desde nov/2026 a PURION tem APENAS 2 SÓCIOS ATIVOS (matheus, joao).
 * A logística foi terceirizada (operador em Goiânia), com perfil de apoio restrito.
 *
 * 'gabriel' continua existindo no tipo PerfilUsuario apenas para manter o histórico
 * (tarefas, despesas, lotes antigos). Ele está ARQUIVADO: não aparece em seletores,
 * filtros, placares nem colunas de metas. Para reativar, mude `arquivado` para false.
 */

import type { PerfilUsuario } from '@/store'

export interface InfoPerfil {
  id: PerfilUsuario | 'logistica'
  nome: string
  nomeCompleto: string
  cidade: string
  eixo: string
  cor: string
  inicial: string
  arquivado: boolean
}

export const COR_MATHEUS   = '#F5F5F0'
export const COR_JOAO      = '#4A90D9'
export const COR_LOGISTICA = '#2E9E5B'
export const COR_ARQUIVADO = '#8A8A8A'

export const PERFIS_INFO: Record<PerfilUsuario | 'logistica', InfoPerfil> = {
  matheus: {
    id: 'matheus', nome: 'Matheus', nomeCompleto: 'Matheus (Nortjota)',
    cidade: 'Brasília · DF', eixo: 'Comercial · B2B, caixa, pós-venda',
    cor: COR_MATHEUS, inicial: 'M', arquivado: false,
  },
  joao: {
    id: 'joao', nome: 'João', nomeCompleto: 'João',
    cidade: 'Itajaí · SC', eixo: 'Aquisição · conteúdo, creators, tráfego',
    cor: COR_JOAO, inicial: 'J', arquivado: false,
  },
  logistica: {
    id: 'logistica', nome: 'Logística', nomeCompleto: 'Logística · Goiânia',
    cidade: 'Goiânia · GO', eixo: 'Despacho terceirizado',
    cor: COR_LOGISTICA, inicial: 'L', arquivado: false,
  },
  gabriel: {
    id: 'gabriel', nome: 'Gabriel', nomeCompleto: 'Gabriel (arquivado)',
    cidade: 'São Paulo · SP', eixo: 'Ex-sócio · histórico',
    cor: COR_ARQUIVADO, inicial: 'G', arquivado: true,
  },
}

/** Sócios ativos — use SEMPRE esta lista em seletores, filtros, placares e colunas. */
export const SOCIOS_ATIVOS_IDS = ['matheus', 'joao'] as const satisfies readonly PerfilUsuario[]
export type SocioAtivo = typeof SOCIOS_ATIVOS_IDS[number]

export const SOCIOS_ATIVOS: InfoPerfil[] = SOCIOS_ATIVOS_IDS.map((id) => PERFIS_INFO[id])

export function isSocioAtivo(id: string | null | undefined): id is SocioAtivo {
  return !!id && (SOCIOS_ATIVOS_IDS as readonly string[]).includes(id)
}

/** Nome para exibição — funciona também para perfis arquivados (histórico). */
export function nomePerfil(id: string | null | undefined): string {
  if (!id) return '—'
  return PERFIS_INFO[id as PerfilUsuario]?.nome ?? id
}

export function corPerfil(id: string | null | undefined): string {
  if (!id) return COR_ARQUIVADO
  return PERFIS_INFO[id as PerfilUsuario]?.cor ?? COR_ARQUIVADO
}

export function inicialPerfil(id: string | null | undefined): string {
  if (!id) return '?'
  return PERFIS_INFO[id as PerfilUsuario]?.inicial ?? id.charAt(0).toUpperCase()
}

// ─────────────────────────────────────────────
// Perfil de apoio: LOGÍSTICA (acesso restrito)
// ─────────────────────────────────────────────

/** Rota inicial do perfil logística. */
export const ROTA_LOGISTICA = '/despacho'

/** Únicas rotas que o perfil logística pode acessar. */
export const ROTAS_PERMITIDAS_LOGISTICA = [ROTA_LOGISTICA]

export function rotaPermitidaLogistica(pathname: string): boolean {
  return ROTAS_PERMITIDAS_LOGISTICA.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

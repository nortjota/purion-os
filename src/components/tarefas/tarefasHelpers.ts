import {
  CheckSquare, AlertTriangle, Zap, Flag,
} from 'lucide-react'
import type { PerfilUsuario, PrioridadeTarefa, StatusTarefa } from '@/store'
import { SOCIOS_ATIVOS } from '@/lib/socios'

export const HOJE = new Date().toISOString().slice(0, 10)

export type ColunaTarefa = 'pendente' | 'em_andamento' | 'bloqueada' | 'concluida'

export const COLUNAS: Array<{
  id: ColunaTarefa
  label: string
  cor: string
  icon: React.ElementType
}> = [
  { id: 'pendente',     label: 'Pendente',     cor: '#B8B8B8', icon: CheckSquare  },
  { id: 'em_andamento', label: 'Em Andamento', cor: '#9CC3DB', icon: Zap          },
  { id: 'bloqueada',    label: 'Bloqueada',    cor: '#E6C374', icon: AlertTriangle},
  { id: 'concluida',    label: 'Concluída',    cor: '#8FD14F', icon: CheckSquare  },
]

export const STATUS_LABEL: Record<StatusTarefa, string> = {
  pendente:     'Pendente',
  em_andamento: 'Em Andamento',
  bloqueada:    'Bloqueada',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
}

export const PRIORIDADE_CONFIG: Record<PrioridadeTarefa, { label: string; cor: string; bg: string }> = {
  baixa:   { label: 'Baixa',   cor: '#9A9A94', bg: 'rgba(154,154,148,0.15)' },
  media:   { label: 'Média',   cor: '#9CC3DB', bg: 'rgba(156,195,219,0.12)' },
  alta:    { label: 'Alta',    cor: '#E6C374', bg: 'rgba(230,195,116,0.15)' },
  urgente: { label: 'Urgente', cor: '#E5544B', bg: 'rgba(229,84,75,0.15)'  },
}

export const PRIORIDADE_ICON = Flag

/** Apenas sócios ativos (matheus, joao). Gabriel está arquivado — veja src/lib/socios.ts. */
export const SOCIOS: Array<{ id: PerfilUsuario; nome: string; cor: string; inicial: string; dominio: string }> = SOCIOS_ATIVOS.map((s) => ({
  id: s.id as PerfilUsuario, nome: s.nome, cor: s.cor, inicial: s.inicial, dominio: s.eixo,
}))

export const MODULOS = ['crm', 'marketing', 'producao', 'financeiro', 'geral'] as const

export type GroupBy = 'none' | 'modulo' | 'status' | 'responsavel' | 'prioridade'

export const RECORRENCIA_LABEL: Record<string, string> = {
  nenhuma: 'Não repete',
  diaria:  'Diariamente',
  semanal: 'Semanalmente',
  mensal:  'Mensalmente',
}

export function socioInfo(id: PerfilUsuario) {
  return SOCIOS.find((s) => s.id === id) ?? SOCIOS[0]
}

export function isVencida(dueDate: string | null, status?: StatusTarefa): boolean {
  if (!dueDate) return false
  if (status === 'concluida' || status === 'cancelada') return false
  return dueDate < HOJE
}

export interface PrazoVisual {
  cor: string
  bg: string
  label: string
}

/** Cor do prazo: verde se distante, amarelo se ≤2 dias, vermelho se vencido. */
export function prazoVisual(dueDate: string | null, status?: StatusTarefa): PrazoVisual | null {
  if (!dueDate) return null
  if (status === 'concluida' || status === 'cancelada') {
    return { cor: '#B8B8B8', bg: 'rgba(107,107,107,0.12)', label: '' }
  }
  const diffDias = Math.round((new Date(dueDate + 'T00:00:00').getTime() - new Date(HOJE + 'T00:00:00').getTime()) / 86_400_000)
  if (diffDias < 0) {
    return { cor: '#E5544B', bg: 'rgba(229,84,75,0.14)', label: `Atrasada ${Math.abs(diffDias)}d` }
  }
  if (diffDias <= 2) {
    return { cor: '#E6C374', bg: 'rgba(230,195,116,0.14)', label: '' }
  }
  return { cor: '#8FD14F', bg: 'rgba(143,209,79,0.12)', label: '' }
}

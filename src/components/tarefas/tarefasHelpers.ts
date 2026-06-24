import {
  CheckSquare, AlertTriangle, Zap, Flag,
} from 'lucide-react'
import type { PerfilUsuario, PrioridadeTarefa, StatusTarefa } from '@/store'

export const HOJE = new Date().toISOString().slice(0, 10)

export type ColunaTarefa = 'pendente' | 'em_andamento' | 'bloqueada' | 'concluida'

export const COLUNAS: Array<{
  id: ColunaTarefa
  label: string
  cor: string
  icon: React.ElementType
}> = [
  { id: 'pendente',     label: 'Pendente',     cor: '#6B6B6B', icon: CheckSquare  },
  { id: 'em_andamento', label: 'Em Andamento', cor: '#5B8FE8', icon: Zap          },
  { id: 'bloqueada',    label: 'Bloqueada',    cor: '#E8A838', icon: AlertTriangle},
  { id: 'concluida',    label: 'Concluída',    cor: '#4CAF7A', icon: CheckSquare  },
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
  media:   { label: 'Média',   cor: '#5B8FE8', bg: 'rgba(91,143,232,0.12)' },
  alta:    { label: 'Alta',    cor: '#E8A838', bg: 'rgba(232,168,56,0.15)' },
  urgente: { label: 'Urgente', cor: '#E85238', bg: 'rgba(232,82,56,0.15)'  },
}

export const PRIORIDADE_ICON = Flag

export const SOCIOS: Array<{ id: PerfilUsuario; nome: string; cor: string; inicial: string; dominio: string }> = [
  { id: 'matheus', nome: 'Matheus', cor: '#C9A84C', inicial: 'M', dominio: 'Estratégia & B2B' },
  { id: 'joao',    nome: 'João',    cor: '#5B8FE8', inicial: 'J', dominio: 'Marketing & Growth' },
  { id: 'gabriel', nome: 'Gabriel', cor: '#4CAF7A', inicial: 'G', dominio: 'Produção & Qualidade' },
]

export const MODULOS = ['crm', 'marketing', 'producao', 'financeiro', 'geral'] as const

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
    return { cor: '#6B6B6B', bg: 'rgba(107,107,107,0.12)', label: '' }
  }
  const diffDias = Math.round((new Date(dueDate + 'T00:00:00').getTime() - new Date(HOJE + 'T00:00:00').getTime()) / 86_400_000)
  if (diffDias < 0) {
    return { cor: '#E85238', bg: 'rgba(232,82,56,0.14)', label: `Atrasada ${Math.abs(diffDias)}d` }
  }
  if (diffDias <= 2) {
    return { cor: '#E8A838', bg: 'rgba(232,168,56,0.14)', label: '' }
  }
  return { cor: '#4CAF7A', bg: 'rgba(76,175,122,0.12)', label: '' }
}

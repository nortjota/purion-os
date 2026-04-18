import { cn } from '@/lib/utils'

type StatusVariant =
  | 'ativo' | 'aprovado'
  | 'pendente' | 'em_andamento'
  | 'bloqueado' | 'critico'
  | 'inativo' | 'perdido'
  | 'info' | 'novo'

const VARIANT_MAP: Record<StatusVariant, string> = {
  ativo:        'badge-success',
  aprovado:     'badge-success',
  pendente:     'badge-warning',
  em_andamento: 'badge-warning',
  bloqueado:    'badge-danger',
  critico:      'badge-danger',
  inativo:      'badge-neutral',
  perdido:      'badge-neutral',
  info:         'badge-info',
  novo:         'badge-info',
}

const LABEL_MAP: Record<StatusVariant, string> = {
  ativo:        'Ativo',
  aprovado:     'Aprovado',
  pendente:     'Pendente',
  em_andamento: 'Em andamento',
  bloqueado:    'Bloqueado',
  critico:      'Crítico',
  inativo:      'Inativo',
  perdido:      'Perdido',
  info:         'Info',
  novo:         'Novo',
}

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn('badge', VARIANT_MAP[status], className)}
      style={{ borderRadius: 4 }}
    >
      {label ?? LABEL_MAP[status]}
    </span>
  )
}

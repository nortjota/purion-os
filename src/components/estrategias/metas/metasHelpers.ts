import type { StatusObjetivo, FonteAuto, PrioridadeObjetivo, EstrategiaObjetivo } from '@/hooks/useEstrategia'

export const PRIORIDADE_LABEL: Record<PrioridadeObjetivo, string> = {
  P1: 'P1 — Prioridade máxima',
  P2: 'P2 — Importante',
  P3: 'P3 — Desejável',
}

export const PRIORIDADE_LABEL_CURTO: Record<PrioridadeObjetivo, string> = {
  P1: 'P1', P2: 'P2', P3: 'P3',
}

export const PRIORIDADE_COR: Record<PrioridadeObjetivo, string> = {
  P1: '#C9A84C', // dourado
  P2: '#5B8FE8', // azul
  P3: '#8A8A8A', // cinza
}

export const PRIORIDADE_OPCOES: PrioridadeObjetivo[] = ['P1', 'P2', 'P3']

/** Ordena por prioridade (P1 primeiro) e, dentro da mesma prioridade, por peso decrescente. */
export function ordenarPorPrioridadeEPeso(objetivos: EstrategiaObjetivo[]): EstrategiaObjetivo[] {
  const ordem: Record<PrioridadeObjetivo, number> = { P1: 0, P2: 1, P3: 2 }
  return [...objetivos].sort((a, b) => {
    const diffPrioridade = ordem[a.prioridade] - ordem[b.prioridade]
    if (diffPrioridade !== 0) return diffPrioridade
    return b.peso - a.peso
  })
}

/** Máximo de metas recomendado por sócio (regra do G4 — foco, não dispersão). */
export const MAX_METAS_RECOMENDADO_POR_SOCIO = 5

/** Soma dos pesos das metas — o G4 exige que feche em 100% por pessoa. */
export function somaPesos(objetivos: EstrategiaObjetivo[]): number {
  return objetivos.reduce((s, o) => s + (o.peso || 0), 0)
}

export const STATUS_OBJETIVO_LABEL: Record<StatusObjetivo, string> = {
  em_dia:    'Em dia',
  em_risco:  'Em risco',
  em_atraso: 'Em atraso',
  concluido: 'Concluído',
  pausado:   'Pausado',
}

export const STATUS_OBJETIVO_COR: Record<StatusObjetivo, string> = {
  em_dia:    '#4CAF7A', // verde
  em_risco:  '#E8A838', // amarelo
  em_atraso: '#E85238', // vermelho
  concluido: '#5B8FE8', // azul
  pausado:   '#B8B8B8', // cinza
}

export const STATUS_OBJETIVO_OPCOES: StatusObjetivo[] = ['em_dia', 'em_risco', 'em_atraso', 'concluido', 'pausado']

export const FONTE_AUTO_OPCOES: Array<{ id: FonteAuto; label: string }> = [
  { id: 'vendas_total',    label: 'Vendas aprovadas (R$)' },
  { id: 'leads_clientes',  label: 'Clientes ativos (B2B)' },
  { id: 'creators_ativos', label: 'Creators ativos' },
  { id: 'receita_total',   label: 'Receita total (financeiro)' },
  { id: 'estoque_atual',   label: 'Estoque atual (frascos)' },
]

export function formatarDataAlvo(data: string | null): string {
  if (!data) return 'Sem prazo'
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Compara progresso vs. tempo decorrido — indicador visual de ritmo, independente do status salvo. */
export function calcularRitmo(progresso: number, createdAt: string, dataAlvo: string | null): 'adiantado' | 'no_ritmo' | 'atrasado' | null {
  if (!dataAlvo || progresso >= 100) return null
  const inicio = new Date(createdAt).getTime()
  const alvo   = new Date(`${dataAlvo}T23:59:59`).getTime()
  const agora  = Date.now()
  if (alvo <= inicio) return 'atrasado'
  const tempoDecorridoPct = Math.max(0, Math.min(100, ((agora - inicio) / (alvo - inicio)) * 100))
  const diferenca = progresso - tempoDecorridoPct
  if (diferenca >= -5) return diferenca >= 10 ? 'adiantado' : 'no_ritmo'
  return 'atrasado'
}

export const RITMO_LABEL: Record<'adiantado' | 'no_ritmo' | 'atrasado', string> = {
  adiantado: 'Adiantado',
  no_ritmo:  'No ritmo certo',
  atrasado:  'Precisa acelerar',
}

import type { StatusObjetivo, FonteAuto } from '@/hooks/useEstrategia'

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

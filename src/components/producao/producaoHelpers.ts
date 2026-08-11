import type { StatusLote, ItemEstoque } from '@/store'
import { SOCIOS, socioInfo } from '@/components/tarefas/tarefasHelpers'

export { SOCIOS, socioInfo }

// ─────────────────────────────────────────────
// PIPELINE DO LOTE
// ─────────────────────────────────────────────

export interface EstagioLoteConfig {
  id: StatusLote
  label: string
  cor: string
}

export const ESTAGIOS_LOTE: EstagioLoteConfig[] = [
  { id: 'planejado',           label: 'Planejado',         cor: '#B8B8B8' },
  { id: 'em_producao',         label: 'Em Produção',       cor: '#5B8FE8' },
  { id: 'controle_qualidade',  label: 'Controle de Qualidade', cor: '#E8A838' },
  { id: 'concluido',           label: 'Concluído',         cor: '#4CAF7A' },
  { id: 'reprovado',           label: 'Reprovado',         cor: '#E85238' },
]

const LEGADO_PARA_NOVO: Partial<Record<StatusLote, StatusLote>> = {
  aprovado: 'concluido',
  estoque:  'concluido',
}

export function normalizarStatusLote(status: StatusLote): StatusLote {
  return LEGADO_PARA_NOVO[status] ?? status
}

export function estagioLoteConfig(status: StatusLote): EstagioLoteConfig {
  const norm = normalizarStatusLote(status)
  return ESTAGIOS_LOTE.find((e) => e.id === norm) ?? ESTAGIOS_LOTE[0]
}

// ─────────────────────────────────────────────
// CONTROLE DE QUALIDADE
// ─────────────────────────────────────────────

export const TESTES_OBRIGATORIOS = [
  { tipo: 'duracao',              label: 'Teste de Duração' },
  { tipo: 'mancha',               label: 'Teste de Mancha' },
  { tipo: 'estabilidade_termica', label: 'Estabilidade Térmica' },
  { tipo: 'valvula',              label: 'Teste de Válvula' },
  { tipo: 'teste_cego',           label: 'Teste Cego' },
] as const

// ─────────────────────────────────────────────
// CUSTO
// ─────────────────────────────────────────────

/** Custo unitário de produção por frasco (R$) — consistente com o módulo de Vendas. */
export const CUSTO_UNITARIO_FRASCO = 28

export function calcularCustoLote(quantidadeProduzida: number): number {
  return quantidadeProduzida * CUSTO_UNITARIO_FRASCO
}

// ─────────────────────────────────────────────
// INSUMOS
// ─────────────────────────────────────────────

export const INSUMO_TIPO_LABEL: Record<ItemEstoque['tipo'], string> = {
  essencia:  'Essência',
  alcool:    'Álcool',
  embalagem: 'Embalagem',
  frasco:    'Frasco vazio',
  tampa:     'Tampa/Válvula',
  rotulo:    'Rótulo',
  caixa:     'Caixa',
  outro:     'Outro',
}

/** Quantos frascos ainda dá para produzir com o estoque atual deste insumo. */
export function capacidadeFrascos(item: ItemEstoque): number {
  const rendimento = item.rendimentoPorFrasco && item.rendimentoPorFrasco > 0 ? item.rendimentoPorFrasco : 1
  return Math.floor(item.quantidadeAtual / rendimento)
}

/** Capacidade restante geral = o insumo mais limitante (gargalo). */
export function capacidadeRestanteGeral(insumos: ItemEstoque[]): { capacidade: number; gargalo: ItemEstoque | null } {
  const ativos = insumos.filter((i) => i.quantidadeAtual >= 0)
  if (ativos.length === 0) return { capacidade: 0, gargalo: null }
  let capacidade = Infinity
  let gargalo: ItemEstoque | null = null
  for (const item of ativos) {
    const cap = capacidadeFrascos(item)
    if (cap < capacidade) { capacidade = cap; gargalo = item }
  }
  return { capacidade: capacidade === Infinity ? 0 : capacidade, gargalo }
}

export function formatarMoeda(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

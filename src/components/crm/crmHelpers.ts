import type { StatusLead, TierLead, PerfilUsuario } from '@/store'
import { SOCIOS, socioInfo } from '@/components/tarefas/tarefasHelpers'

export { SOCIOS, socioInfo }

// ─────────────────────────────────────────────
// PIPELINE (Máquina de Vendas — Doc07)
// ─────────────────────────────────────────────

export interface EstagioConfig {
  id: StatusLead
  label: string
  cor: string
}

export const ESTAGIOS: EstagioConfig[] = [
  { id: 'prospecto',        label: 'Prospecto',        cor: '#B8B8B8' },
  { id: 'abordado',         label: 'Abordado',         cor: '#5B8FE8' },
  { id: 'reuniao_agendada', label: 'Reunião Agendada', cor: '#8B5CF6' },
  { id: 'oportunidade',     label: 'Oportunidade',     cor: '#E8A838' },
  { id: 'cliente',          label: 'Cliente',          cor: '#4CAF7A' },
  { id: 'recorrente',       label: 'Recorrente',       cor: '#C9A84C' },
  { id: 'perdido',          label: 'Perdido',          cor: '#E85238' },
]

/** Mapeia estágios legados (pré-migração) para os novos, para contagens/kanban consistentes. */
const LEGADO_PARA_NOVO: Partial<Record<StatusLead, StatusLead>> = {
  contato_feito:     'abordado',
  proposta_enviada:  'oportunidade',
  negociando:        'oportunidade',
  parceiro_ativo:    'cliente',
  inativo:           'perdido',
}

export function estagioNormalizado(status: StatusLead): StatusLead {
  return LEGADO_PARA_NOVO[status] ?? status
}

export function estagioConfig(status: StatusLead): EstagioConfig {
  const norm = estagioNormalizado(status)
  return ESTAGIOS.find((e) => e.id === norm) ?? ESTAGIOS[0]
}

export const ESTAGIOS_ATIVOS: StatusLead[] = ['prospecto', 'abordado', 'reuniao_agendada', 'oportunidade']
export const ESTAGIOS_GANHOS: StatusLead[] = ['cliente', 'recorrente']

// ─────────────────────────────────────────────
// TIER — A dourado, B prata, C bronze
// ─────────────────────────────────────────────

export const TIER_CONFIG: Record<TierLead, { label: string; cor: string; bg: string }> = {
  A: { label: 'Tier A', cor: '#C9A84C', bg: 'rgba(201,168,76,0.18)' },
  B: { label: 'Tier B', cor: '#C7CCD6', bg: 'rgba(199,204,214,0.16)' },
  C: { label: 'Tier C', cor: '#B08D57', bg: 'rgba(176,141,87,0.16)' },
}

// ─────────────────────────────────────────────
// OBJEÇÕES & RESPOSTAS — playbook de vendas
// ─────────────────────────────────────────────

export const OBJECOES: Array<{ objecao: string; resposta: string }> = [
  {
    objecao: '"Está caro"',
    resposta: 'Compare pelo custo por atendimento: cada borrifada custa centavos frente ao valor percebido que o aroma agrega à experiência do cliente final. É investimento em ambientação premium, não despesa.',
  },
  {
    objecao: '"Já tenho aromatizante"',
    resposta: 'Ótimo — isso mostra que você já entende o valor do aroma no ambiente. A diferença do PURION é a fixação prolongada e a exclusividade da fragrância, que nenhum aromatizante genérico oferece.',
  },
  {
    objecao: '"Prefiro consignação"',
    resposta: 'Entendo a cautela. Proponho um kit inicial pequeno para validar o giro em 15 dias, com acompanhamento próximo — sem risco de estoque parado.',
  },
  {
    objecao: '"Vou pensar"',
    resposta: 'Perfeito, sem pressa. Posso te enviar um resumo por WhatsApp com as condições e agendar um retorno em 3 dias para tirar dúvidas?',
  },
]

// ─────────────────────────────────────────────
// METAS MENSAIS (Doc07) — placar comercial
// ─────────────────────────────────────────────

export const METAS_MENSAIS = [
  { mes: 'Mês 1', ganhos: 4, receita: 3400 },
  { mes: 'Mês 2', ganhos: 5, receita: 6000 },
  { mes: 'Mês 3', ganhos: 6, receita: 12600 },
]

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

export function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function formatarMoeda(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR')}`
}

export type UrgenciaPasso = 'vencido' | 'hoje' | 'futuro'

export function urgenciaProximoPasso(dataISO: string | null | undefined): UrgenciaPasso | null {
  if (!dataISO) return null
  const hoje = new Date().toISOString().slice(0, 10)
  const data = dataISO.slice(0, 10)
  if (data < hoje) return 'vencido'
  if (data === hoje) return 'hoje'
  return 'futuro'
}

export const URGENCIA_COR: Record<UrgenciaPasso, string> = {
  vencido: '#E85238',
  hoje:    '#E8A838',
  futuro:  '#4CAF7A',
}

export const RESPONSAVEIS: PerfilUsuario[] = SOCIOS.map((s) => s.id)

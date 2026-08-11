import type { StatusPagamentoVenda, StatusEntregaVenda, CanalVenda, OrigemVenda, TipoCliente, Venda } from '@/store'

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamentoVenda, string> = {
  pendente: 'Pendente', pago: 'Pago', estornado: 'Estornado', cancelado: 'Cancelado',
}

export const STATUS_PAGAMENTO_BADGE: Record<StatusPagamentoVenda, string> = {
  pendente: 'badge-warning', pago: 'badge-success', estornado: 'badge-danger', cancelado: 'badge-neutral',
}

export const STATUS_ENTREGA_LABEL: Record<StatusEntregaVenda, string> = {
  aguardando: 'Aguardando', separando: 'Separando', postado: 'Postado',
  em_transito: 'Em trânsito', entregue: 'Entregue', devolvido: 'Devolvido',
}

export const STATUS_ENTREGA_BADGE: Record<StatusEntregaVenda, string> = {
  aguardando: 'badge-neutral', separando: 'badge-warning', postado: 'badge-info',
  em_transito: 'badge-info', entregue: 'badge-success', devolvido: 'badge-danger',
}

const FLUXO_ENTREGA: StatusEntregaVenda[] = ['aguardando', 'separando', 'postado', 'em_transito', 'entregue']

export function proximoStatusEntrega(atual: StatusEntregaVenda): StatusEntregaVenda | null {
  const idx = FLUXO_ENTREGA.indexOf(atual)
  if (idx === -1 || idx === FLUXO_ENTREGA.length - 1) return null
  return FLUXO_ENTREGA[idx + 1]
}

export const METODO_PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto', dinheiro: 'Dinheiro', transferencia: 'Transferência', desconhecido: '—',
}

export function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const CANAL_LABEL: Record<CanalVenda, string> = { b2c: 'B2C', b2b: 'B2B' }
export const CANAL_BADGE: Record<CanalVenda, string> = { b2c: 'badge-info', b2b: 'badge-neutral' }

// Preço oficial de referência e custo de produção — usados no cálculo de margem.
export const PRECO_OFICIAL_B2C = 109.90
export const PRECO_OFICIAL_B2B = 60
export const CUSTO_UNITARIO_PRODUTO = 28

/** Margem = valor da venda − (custo de produção × qtd) − taxa de pagamento. */
export function calcularMargem(v: Venda): number {
  const valor = v.valorTotal ?? v.valorLiquido
  const custo = CUSTO_UNITARIO_PRODUTO * (v.quantidade || 1)
  return valor - custo - (v.taxa || 0)
}

export const ORIGEM_VENDA_LABEL: Record<OrigemVenda, string> = {
  organico: 'Orgânico',
  meta_ads: 'Meta Ads',
  tiktok: 'TikTok',
  indicacao: 'Indicação',
  b2b_presencial: 'B2B Presencial',
  afiliado: 'Afiliado',
}

export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  novo: 'Novo',
  recompra: 'Recompra',
}

export type AgrupamentoVendas = 'status_entrega' | 'canal' | 'periodo' | 'none'

/** Chave de período (semana ISO simplificada por data) usada para agrupar vendas por período. */
export function chavePeriodo(dataVenda: string): string {
  return dataVenda.slice(0, 10)
}

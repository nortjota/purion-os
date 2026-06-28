import type { StatusPagamentoVenda, StatusEntregaVenda } from '@/store'

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

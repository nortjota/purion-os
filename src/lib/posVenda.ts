/**
 * PURION OS — Regras do Motor de Pós-venda (Playbook 360).
 * A geração das tarefas acontece no banco (trigger em vendas → gerar_followups_pos_venda).
 * Aqui ficam os rótulos e a SUPRESSÃO ao vivo, reaplicada sempre que a fila é carregada.
 */

import type { Venda } from '@/store'

export type TipoFollowUp =
  | 'boas_vindas' | 'pesquisa_satisfacao' | 'estudo_consumo_d30' | 'estudo_consumo_d45'
  | 'avaliacao_ugc' | 'reposicao'

export type StatusFollowUp = 'pendente' | 'feito' | 'suprimido'
export type CanalFollowUp = 'whatsapp' | 'email' | 'telefone'

export interface FollowUpTarefa {
  id: string
  pedidoId: string
  clienteNome: string
  clienteTelefone: string | null
  clienteEmail: string | null
  tipo: TipoFollowUp
  gatilho: string
  dataPrevista: string // YYYY-MM-DD
  janelaFim: string | null
  canal: CanalFollowUp
  status: StatusFollowUp
  motivoSupressao: string | null
  mensagemCodigo: string | null
  comercial: boolean
  lembretes: number
  responsavel: string
  concluidoEm: string | null
  createdAt: string
}

export const TIPO_FOLLOWUP: Record<TipoFollowUp, { label: string; cor: string }> = {
  boas_vindas:         { label: 'Boas-vindas / 1ª impressão', cor: '#D4FC3C' },
  pesquisa_satisfacao: { label: 'Pesquisa de satisfação',     cor: '#4A90D9' },
  estudo_consumo_d30:  { label: 'Estudo de consumo · D+30',   cor: '#A7A9A6' },
  estudo_consumo_d45:  { label: 'Estudo de consumo · D+45',   cor: '#A7A9A6' },
  avaliacao_ugc:       { label: 'Avaliação / UGC',            cor: '#4CC3A4' },
  reposicao:           { label: 'Reposição',                  cor: '#E6C374' },
}

/** Biblioteca de Mensagens (conteúdo completo na Central de Conhecimento). */
export const MENSAGENS: Record<string, { titulo: string; comercial: boolean }> = {
  M02: { titulo: 'Envio realizado',              comercial: false },
  M04: { titulo: 'Boas-vindas / 1ª impressão',   comercial: false },
  M05: { titulo: 'Pesquisa de satisfação',       comercial: false },
  M06: { titulo: 'Estudo de consumo',            comercial: false },
  M07: { titulo: 'Pedido de avaliação / UGC',    comercial: false },
  M08: { titulo: 'Reposição',                    comercial: true },
  M10: { titulo: 'Oferta comercial',             comercial: true },
}

/** M08 e M10 são comerciais: exigem opt-in de marketing. */
export function mensagemComercial(codigo: string | null | undefined): boolean {
  return !!codigo && (MENSAGENS[codigo]?.comercial ?? false)
}

export const CANAL_LABEL: Record<CanalFollowUp, string> = { whatsapp: 'WhatsApp', email: 'E-mail', telefone: 'Telefone' }

export interface TicketAberto {
  pedidoRef: string | null
  clienteEmail: string | null
  clienteWhatsapp: string | null
}

const so = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** Reclamação / troca / devolução em aberto para o pedido ou cliente (mesma regra do banco). */
export function temReclamacaoAberta(venda: Venda, tickets: TicketAberto[]): boolean {
  if (venda.statusEntrega === 'devolvido') return true
  const tel = so(venda.clienteTelefone)
  return tickets.some((t) =>
    t.pedidoRef === venda.id
    || (!!venda.pedidoAppmax && t.pedidoRef === venda.pedidoAppmax)
    || (!!venda.clienteEmail && !!t.clienteEmail && t.clienteEmail.toLowerCase() === venda.clienteEmail.toLowerCase())
    || (tel.length >= 8 && so(t.clienteWhatsapp).slice(-8) === tel.slice(-8)),
  )
}

/**
 * Regras de supressão do playbook — aplicadas SEMPRE (geração e fila).
 * Retorna o motivo, ou null se a tarefa segue válida.
 */
export function motivoSupressao(t: FollowUpTarefa, venda: Venda | undefined, tickets: TicketAberto[]): string | null {
  if (!venda) return null
  if (venda.statusEntrega === 'devolvido') return 'Pedido devolvido'

  const reclamacao = temReclamacaoAberta(venda, tickets)
  if (reclamacao && ['boas_vindas', 'pesquisa_satisfacao', 'avaliacao_ugc', 'reposicao'].includes(t.tipo)) {
    return 'Reclamação / troca / atraso em aberto'
  }

  const comercial = t.comercial || mensagemComercial(t.mensagemCodigo)
  if (comercial && !venda.optInMarketing) return 'Sem opt-in de marketing'
  if (comercial && t.canal === 'whatsapp' && venda.optOutWhatsappMarketing) return 'Opt-out de WhatsApp marketing'

  const insatisfeito = venda.satisfacao != null && venda.satisfacao <= 2
  if (insatisfeito && (t.tipo === 'avaliacao_ugc' || t.tipo === 'reposicao')) return 'Cliente insatisfeito'
  if (t.tipo === 'avaliacao_ugc' && (venda.satisfacao == null || venda.satisfacao < 4)) return 'Sem feedback positivo'

  if (t.tipo === 'pesquisa_satisfacao' && !venda.optInPesquisa) return 'Sem opt-in de pesquisa'
  if ((t.tipo === 'estudo_consumo_d30' || t.tipo === 'estudo_consumo_d45') && (!venda.participaEstudo || venda.compraPresente)) {
    return venda.compraPresente ? 'Compra de presente — não pesquisar consumo' : 'Não participa do estudo'
  }
  return null
}

/** Dias de lembrete após "sem resposta" — no máximo 1 lembrete, depois encerra. */
export const DIAS_LEMBRETE = 3
export const MAX_LEMBRETES = 1

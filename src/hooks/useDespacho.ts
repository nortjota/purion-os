'use client'

import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { frascosDaVenda } from '@/lib/escadaProdutos'

/** Horas a partir das quais um pedido pago sem despacho vira alerta. */
export const HORAS_ALERTA_DESPACHO = 48

export const TRANSPORTADORAS = ['Correios', 'Jadlog', 'Loggi', 'Total Express', 'Sequoia', 'J&T Express', 'Outra']

/** Pago e ainda não despachado (aguardando / separando). */
export function aguardandoDespacho(v: Venda): boolean {
  return v.statusPagamento === 'pago' && (v.statusEntrega === 'aguardando' || v.statusEntrega === 'separando')
}

/** Horas desde a venda (proxy da confirmação de pagamento — não existe coluna de data de pagamento). */
export function horasDesde(iso: string, agora = Date.now()): number {
  return Math.max(0, (agora - new Date(iso).getTime()) / 3_600_000)
}

export function despachoAtrasado(v: Venda, agora = Date.now()): boolean {
  return aguardandoDespacho(v) && horasDesde(v.dataVenda, agora) > HORAS_ALERTA_DESPACHO
}

export function despachadoHoje(v: Venda): boolean {
  if (!v.dataEnvio) return false
  const d = new Date(v.dataEnvio)
  const hoje = new Date()
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate()
}

/** Texto da mensagem M02 (envio realizado) — pronto para envio manual. */
export function mensagemM02(v: Venda): string {
  const primeiroNome = (v.clienteNome || '').trim().split(/\s+/)[0] || 'tudo bem'
  return [
    `Olá, ${primeiroNome}! Seu pedido PURION GT foi despachado.`,
    `Transportadora: ${v.transportadora ?? '—'}`,
    `Código de rastreio: ${v.codigoRastreio ?? '—'}`,
    'Qualquer dúvida, é só responder esta mensagem.',
  ].join('\n')
}

/** Link wa.me com a mensagem M02 (sem integração de envio automático no app). */
export function linkWhatsApp(telefone: string, texto: string): string | null {
  let digitos = (telefone || '').replace(/\D/g, '')
  if (!digitos) return null
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}

export function useDespacho() {
  const { success, error: toastError, toast } = useToast()
  const { perfil } = useAuth()
  const perfilAtivo = usePurionStore((s) => s.perfilAtivo)

  const operador = perfil?.role === 'logistica' ? 'logistica' : perfilAtivo
  const operadorNome = perfil?.nome ?? (operador === 'logistica' ? 'Logística · Goiânia' : operador)

  /**
   * Baixa de estoque idempotente: só 1 saída por venda (checa movimentação + flag estoque_baixado).
   * Frascos = quantidade × frascos por unidade do SKU (1 Kit 3 = 3 frascos; Discovery = 0, sem baixa).
   */
  async function baixarEstoque(sb: NonNullable<typeof supabase>, venda: Venda) {
    const qtd = frascosDaVenda(venda)
    if (qtd === 0) {
      if (!venda.estoqueBaixado) {
        const { error } = await sb.from('vendas').update({ estoque_baixado: true }).eq('id', venda.id)
        dbLog('UPDATE', 'vendas (sem frascos: amostra)', error, venda.id)
        usePurionStore.getState().atualizarVenda(venda.id, { estoqueBaixado: true })
      }
      return
    }
    const { data: jaTem, error: chkErr } = await sb.from('estoque_movimentacoes')
      .select('id').eq('origem_tipo', 'venda').eq('origem_id', venda.id).eq('tipo', 'saida_venda').limit(1)
    dbLog('SELECT', 'estoque_movimentacoes (checa saida_venda)', chkErr, venda.id)
    if (chkErr) return
    if ((jaTem?.length ?? 0) > 0) {
      if (!venda.estoqueBaixado) {
        const { error } = await sb.from('vendas').update({ estoque_baixado: true }).eq('id', venda.id)
        dbLog('UPDATE', 'vendas (estoque_baixado sync)', error, venda.id)
        usePurionStore.getState().atualizarVenda(venda.id, { estoqueBaixado: true })
      }
      return
    }

    const { data: estoque, error: estErr } = await sb.from('estoque_produto')
      .select('id, quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
    dbLog('SELECT', 'estoque_produto', estErr)
    if (!estoque) return

    const saldo = Math.max(0, Number(estoque.quantidade_atual) - qtd)
    const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
      tipo: 'saida_venda', quantidade: qtd,
      motivo: `Despacho venda ${venda.id}`, origem_tipo: 'venda', origem_id: venda.id,
      saldo_apos: saldo, autor: operador,
    })
    dbLog('INSERT', 'estoque_movimentacoes (saida_venda despacho)', movErr, venda.id)
    if (movErr) return // índice único protege contra baixa dupla em corrida

    const { error: upErr } = await sb.from('estoque_produto')
      .update({ quantidade_atual: saldo, updated_at: new Date().toISOString() })
      .eq('id', estoque.id)
    dbLog('UPDATE', 'estoque_produto (baixa despacho)', upErr, estoque.id)

    const { error: flagErr } = await sb.from('vendas').update({ estoque_baixado: true }).eq('id', venda.id)
    dbLog('UPDATE', 'vendas (estoque_baixado)', flagErr, venda.id)
    usePurionStore.getState().atualizarVenda(venda.id, { estoqueBaixado: true })
  }

  return {
    operador,
    operadorNome,

    /** Marca o pedido como despachado: rastreio + status postado + baixa de estoque + quem/quando. */
    despachar: async (vendaId: string, transportadora: string, codigoRastreio: string): Promise<boolean> => {
      const sb = supabase
      if (!sb) return false
      const venda = usePurionStore.getState().vendas.find((v) => v.id === vendaId)
      if (!venda) return false
      const agora = new Date().toISOString()

      // Só transiciona se ainda estiver aguardando/separando (evita despacho duplo entre 2 telas)
      const { data, error } = await sb.from('vendas').update({
        status_entrega: 'postado',
        transportadora,
        codigo_rastreio: codigoRastreio,
        data_envio: agora,
        despachado_por: operador,
        despachado_por_nome: operadorNome,
        updated_at: agora,
      }).eq('id', vendaId).in('status_entrega', ['aguardando', 'separando']).select('id')
      dbLog('UPDATE', 'vendas (despacho)', error, vendaId)
      if (error) { toastError('Erro ao marcar despacho', error.message); return false }
      if (!data || data.length === 0) {
        toast({ type: 'info', title: 'Pedido já despachado', description: venda.clienteNome })
        return false
      }

      usePurionStore.getState().atualizarVenda(vendaId, {
        statusEntrega: 'postado', transportadora, codigoRastreio, dataEnvio: agora,
        despachadoPor: operador, despachadoPorNome: operadorNome,
      })
      await baixarEstoque(sb, { ...venda, statusEntrega: 'postado' })
      success('Pedido despachado', `${venda.clienteNome} · ${transportadora} ${codigoRastreio}`)
      return true
    },

    /** Registra que a M02 (envio realizado) foi enviada ao cliente — envio manual via WhatsApp. */
    marcarM02Enviada: async (vendaId: string): Promise<void> => {
      const sb = supabase
      if (!sb) return
      const agora = new Date().toISOString()
      const { error } = await sb.from('vendas').update({ m02_enviada_em: agora, updated_at: agora }).eq('id', vendaId)
      dbLog('UPDATE', 'vendas (m02_enviada_em)', error, vendaId)
      if (error) { toastError('Erro ao registrar M02', error.message); return }
      usePurionStore.getState().atualizarVenda(vendaId, { m02EnviadaEm: agora })
      success('M02 registrada como enviada')
    },
  }
}

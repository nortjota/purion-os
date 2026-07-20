'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { DoacaoUGC, StatusEnvioUGC } from '@/store'

type Row = Record<string, unknown>

function toDoacao(r: Row): DoacaoUGC {
  return {
    id:                String(r.id),
    creatorId:         r.creator_id ? String(r.creator_id) : null,
    quantidade:        Number(r.quantidade ?? 1),
    dataEnvio:         String(r.data_envio ?? new Date().toISOString()),
    statusEnvio:       String(r.status_envio ?? 'aguardando') as StatusEnvioUGC,
    codigoRastreio:    r.codigo_rastreio ? String(r.codigo_rastreio) : null,
    custoTotal:        r.custo_total != null ? Number(r.custo_total) : null,
    contrapartida:     r.contrapartida ? String(r.contrapartida) : null,
    entregueConteudo:  Boolean(r.entregue_conteudo ?? false),
    estoqueBaixado:    Boolean(r.estoque_baixado ?? false),
    financeiroLancado: Boolean(r.financeiro_lancado ?? false),
    observacoes:       r.observacoes ? String(r.observacoes) : null,
    createdAt:         String(r.created_at ?? new Date().toISOString()),
  }
}

export type NovaDoacaoUGC = {
  creatorId?: string | null
  quantidade: number
  dataEnvio?: string
  statusEnvio?: StatusEnvioUGC
  codigoRastreio?: string | null
  custoTotal?: number | null
  contrapartida?: string | null
  entregueConteudo?: boolean
  observacoes?: string | null
}

export function useDoacoesUGC() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb.from('doacoes_ugc').select('*').is('deleted_at', null).order('created_at', { ascending: false })
      dbLog('SELECT', 'doacoes_ugc', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setDoacoesUGC(data.map(toDoacao))
    }

    load()

    const ch = sb.channel(`doacoes-ugc-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doacoes_ugc' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  async function baixarEstoqueUGC(doacao: DoacaoUGC) {
    const sb = supabase
    if (!sb) return
    if (doacao.estoqueBaixado) return

    const { data: estoque } = await sb.from('estoque_produto').select('id, quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (!estoque) return

    const saldo = Math.max(0, estoque.quantidade_atual - doacao.quantidade)
    const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
      tipo: 'saida_ugc', quantidade: doacao.quantidade,
      motivo: `Doação UGC ${doacao.id}`, origem_tipo: 'ugc', origem_id: doacao.id,
      saldo_apos: saldo, autor: 'matheus',
    })
    dbLog('INSERT', 'estoque_movimentacoes (saida_ugc)', movErr, doacao.id)
    if (movErr) return

    await sb.from('estoque_produto').update({ quantidade_atual: saldo, updated_at: new Date().toISOString() }).eq('id', estoque.id)

    const estado = usePurionStore.getState()
    if (estado.estoqueProduto) {
      estado.setEstoqueProduto({ ...estado.estoqueProduto, quantidadeAtual: saldo })
    }
  }

  async function gerarDespesaUGC(doacao: DoacaoUGC) {
    const sb = supabase
    if (!sb) return
    if (doacao.financeiroLancado) return
    const valor = doacao.custoTotal ?? (doacao.quantidade * 23.99)
    const { error } = await sb.from('financeiro').insert({
      tipo: 'despesa',
      categoria: 'ugc_creators',
      valor,
      data: new Date().toISOString().slice(0, 10),
      descricao: `Doação UGC — ${doacao.quantidade} frasco(s)`,
      regiao: 'DF',
      responsavel: 'matheus',
      pedido_id: doacao.id,
    })
    dbLog('INSERT', 'financeiro (ugc_despesa)', error, doacao.id)
  }

  return {
    criarDoacao: async (d: NovaDoacaoUGC) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('doacoes_ugc').insert({
        creator_id:      d.creatorId ?? null,
        quantidade:      d.quantidade,
        data_envio:      d.dataEnvio ?? new Date().toISOString(),
        status_envio:    d.statusEnvio ?? 'aguardando',
        codigo_rastreio: d.codigoRastreio ?? null,
        custo_total:     d.custoTotal ?? null,
        contrapartida:   d.contrapartida ?? null,
        entregue_conteudo: d.entregueConteudo ?? false,
        observacoes:     d.observacoes ?? null,
      }).select().single()
      dbLog('INSERT', 'doacoes_ugc', error, data?.id)
      if (error) { toastError('Erro ao registrar doação', error.message); return }
      if (!data) return
      const doacao = toDoacao(data)
      usePurionStore.getState().adicionarDoacaoUGC(doacao)
      success('Doação UGC registrada')
    },

    atualizarDoacao: async (id: string, dados: Partial<NovaDoacaoUGC>) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('doacoes_ugc').update({
        ...(dados.creatorId      !== undefined && { creator_id:       dados.creatorId }),
        ...(dados.quantidade     !== undefined && { quantidade:       dados.quantidade }),
        ...(dados.dataEnvio      !== undefined && { data_envio:       dados.dataEnvio }),
        ...(dados.codigoRastreio !== undefined && { codigo_rastreio:  dados.codigoRastreio }),
        ...(dados.custoTotal     !== undefined && { custo_total:      dados.custoTotal }),
        ...(dados.contrapartida  !== undefined && { contrapartida:    dados.contrapartida }),
        ...(dados.entregueConteudo !== undefined && { entregue_conteudo: dados.entregueConteudo }),
        ...(dados.observacoes    !== undefined && { observacoes:      dados.observacoes }),
      }).eq('id', id)
      dbLog('UPDATE', 'doacoes_ugc', error, id)
      if (error) { toastError('Erro ao atualizar doação', error.message); return }
      usePurionStore.getState().atualizarDoacaoUGC(id, dados as Partial<DoacaoUGC>)
      success('Doação atualizada')
    },

    mudarStatusEnvio: async (id: string, statusEnvio: StatusEnvioUGC, codigoRastreio?: string) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('doacoes_ugc').update({
        status_envio: statusEnvio,
        ...(codigoRastreio && { codigo_rastreio: codigoRastreio }),
      }).eq('id', id).select().single()
      dbLog('UPDATE', 'doacoes_ugc (status_envio)', error, id)
      if (error) { toastError('Erro ao atualizar status', error.message); return }
      const doacao = toDoacao(data)
      usePurionStore.getState().atualizarDoacaoUGC(id, { statusEnvio, ...(codigoRastreio && { codigoRastreio }) })
      success('Status atualizado')

      if (statusEnvio === 'postado') {
        await baixarEstoqueUGC(doacao)
        await sb.from('doacoes_ugc').update({ estoque_baixado: true }).eq('id', id)
        await gerarDespesaUGC(doacao)
        await sb.from('doacoes_ugc').update({ financeiro_lancado: true }).eq('id', id)
        usePurionStore.getState().atualizarDoacaoUGC(id, { estoqueBaixado: true, financeiroLancado: true })
      }
    },

    marcarConteudoEntregue: async (id: string, entregue: boolean) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('doacoes_ugc').update({ entregue_conteudo: entregue }).eq('id', id)
      dbLog('UPDATE', 'doacoes_ugc (entregue_conteudo)', error, id)
      if (error) { toastError('Erro ao atualizar', error.message); return }
      usePurionStore.getState().atualizarDoacaoUGC(id, { entregueConteudo: entregue })
      success(entregue ? 'Conteúdo marcado como entregue' : 'Conteúdo desmarcado')
    },

    deletarDoacao: async (id: string) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('doacoes_ugc').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      dbLog('DELETE', 'doacoes_ugc', error, id)
      if (error) { toastError('Erro ao excluir doação', error.message); return }
      usePurionStore.getState().removerDoacaoUGC(id)
      success('Doação excluída')
    },

    // Migra vendas com valor R$0 (doações registradas errado) para doacoes_ugc
    migrarVendasZeroParaUGC: async () => {
      const sb = supabase
      if (!sb) return

      const vendas = usePurionStore.getState().vendas
      const vendasZero = vendas.filter(
        (v) => (v.valorTotal ?? v.valorLiquido) === 0
      )
      if (vendasZero.length === 0) { success('Nenhuma venda R$0 encontrada'); return }

      let migradas = 0
      let erros = 0

      for (const v of vendasZero) {
        // Mapeia status_entrega → status_envio UGC
        const statusEnvio: StatusEnvioUGC =
          ['entregue'].includes(v.statusEntrega) ? 'entregue'
          : ['postado', 'em_transito'].includes(v.statusEntrega) ? 'postado'
          : 'aguardando'

        const { data, error } = await sb.from('doacoes_ugc').insert({
          creator_id:      v.afiliadoCreatorId ?? null,
          quantidade:      v.quantidade,
          data_envio:      v.dataEnvio ?? v.dataVenda,
          status_envio:    statusEnvio,
          codigo_rastreio: v.codigoRastreio ?? null,
          observacoes:     [v.observacoes, `Migrado de venda #${v.id.slice(0, 8)}`].filter(Boolean).join(' | '),
        }).select().single()
        dbLog('INSERT', 'doacoes_ugc (migracao)', error, v.id)

        if (error) { erros++; continue }

        // Soft-delete a venda original
        await sb.from('vendas').update({ deleted_at: new Date().toISOString() }).eq('id', v.id)
        usePurionStore.getState().removerVenda(v.id)
        if (data) usePurionStore.getState().adicionarDoacaoUGC(toDoacao(data as Row))
        migradas++
      }

      if (erros > 0) toastError(`${erros} erro(s) na migração`, 'Veja o console')
      else success(`${migradas} doação(ões) migrada(s) para UGC`)
    },
  }
}

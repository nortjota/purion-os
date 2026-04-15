'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type { Lote, PedidoExpedicao, PerfilUsuario, StatusLote, StatusPedidoExpedicao } from '@/store'

type Row = Record<string, unknown>

function toLote(r: Row): Lote {
  return {
    id:                  String(r.id),
    codigo:              String(r.codigo               ?? ''),
    produto:             String(r.produto              ?? ''),
    quantidadeProduzida: Number(r.quantidade_produzida ?? 0),
    quantidadeAprovada:  Number(r.quantidade_aprovada  ?? 0),
    status:              String(r.status               ?? 'em_producao') as StatusLote,
    dataInicio:          String(r.data_inicio          ?? ''),
    dataConclusao:       r.data_conclusao ? String(r.data_conclusao) : null,
    responsavel:         String(r.responsavel          ?? 'matheus') as PerfilUsuario,
    testes:              Array.isArray(r.testes)  ? (r.testes  as Lote['testes'])  : [],
    insumos:             Array.isArray(r.insumos) ? (r.insumos as Lote['insumos']) : [],
    notas:               String(r.notas ?? ''),
  }
}

function toPedido(r: Row): PedidoExpedicao {
  return {
    id:           String(r.id),
    numeroPedido: String(r.numero_pedido  ?? ''),
    destinatario: String(r.destinatario   ?? ''),
    dataPedido:   String(r.data_pedido    ?? new Date().toISOString()),
    prazoHoras:   Number(r.prazo_horas    ?? 48),
    status:       String(r.status         ?? 'aguardando') as StatusPedidoExpedicao,
    itens:        Array.isArray(r.itens) ? (r.itens as PedidoExpedicao['itens']) : [],
    observacoes:  String(r.observacoes    ?? ''),
  }
}

export function useProducao() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadLotes = async () => {
      const { data } = await sb.from('lotes_producao').select('*').order('data_inicio', { ascending: false })
      if (data) usePurionStore.getState().setLotes(data.map(toLote))
    }

    const loadPedidos = async () => {
      const { data } = await sb.from('expedicao').select('*').order('data_pedido', { ascending: false })
      if (data) usePurionStore.getState().setPedidosExpedicao(data.map(toPedido))
    }

    loadLotes()
    loadPedidos()

    const chL = sb.channel('lotes-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes_producao' }, loadLotes)
      .subscribe()

    const chP = sb.channel('expedicao-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expedicao' }, loadPedidos)
      .subscribe()

    return () => {
      sb.removeChannel(chL)
      sb.removeChannel(chP)
    }
  }, [])

  return {
    atualizarLote: async (id: string, dados: Partial<Lote>) => {
      const sb = supabase
      if (!sb) return
      await sb.from('lotes_producao').update({
        ...(dados.status             !== undefined && { status:              dados.status }),
        ...(dados.quantidadeAprovada !== undefined && { quantidade_aprovada: dados.quantidadeAprovada }),
        ...(dados.testes             !== undefined && { testes:              dados.testes }),
        ...(dados.dataConclusao      !== undefined && { data_conclusao:      dados.dataConclusao }),
        ...(dados.notas              !== undefined && { notas:               dados.notas }),
      }).eq('id', id)
      usePurionStore.getState().atualizarLote(id, dados)
    },

    atualizarPedido: async (id: string, dados: Partial<PedidoExpedicao>) => {
      const sb = supabase
      if (!sb) return
      await sb.from('expedicao').update({
        ...(dados.status      !== undefined && { status:      dados.status }),
        ...(dados.observacoes !== undefined && { observacoes: dados.observacoes }),
      }).eq('id', id)
      usePurionStore.getState().atualizarPedidoExpedicao(id, dados)
    },

    adicionarPedido: async (p: Omit<PedidoExpedicao, 'id'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('expedicao').insert({
        numero_pedido: p.numeroPedido,
        destinatario:  p.destinatario,
        data_pedido:   p.dataPedido,
        prazo_horas:   p.prazoHoras,
        status:        p.status,
        itens:         p.itens,
        observacoes:   p.observacoes,
      }).select().single()
      if (data) usePurionStore.getState().adicionarPedidoExpedicao({ ...p, id: String(data.id) })
    },
  }
}

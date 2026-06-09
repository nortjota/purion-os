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
      const { data } = await sb
        .from('lotes_producao')
        .select('*')
        .is('deleted_at', null)
        .order('data_inicio', { ascending: false })
      if (data) usePurionStore.getState().setLotes(data.map(toLote))
    }

    const loadPedidos = async () => {
      const { data } = await sb
        .from('expedicao')
        .select('*')
        .is('deleted_at', null)
        .order('data_pedido', { ascending: false })
      if (data) usePurionStore.getState().setPedidosExpedicao(data.map(toPedido))
    }

    loadLotes()
    loadPedidos()

    const chL = sb.channel(`lotes-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes_producao' }, loadLotes)
      .subscribe()

    const chP = sb.channel(`expedicao-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expedicao' }, loadPedidos)
      .subscribe()

    return () => {
      sb.removeChannel(chL)
      sb.removeChannel(chP)
    }
  }, [])

  return {
    adicionarLote: async (l: Omit<Lote, 'id'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('lotes_producao').insert({
        codigo:              l.codigo,
        produto:             l.produto,
        quantidade_produzida: l.quantidadeProduzida,
        quantidade_aprovada:  l.quantidadeAprovada,
        status:              l.status,
        data_inicio:         l.dataInicio,
        data_conclusao:      l.dataConclusao ?? null,
        responsavel:         l.responsavel,
        testes:              l.testes,
        insumos:             l.insumos,
        notas:               l.notas,
      }).select().single()
      if (data) usePurionStore.getState().adicionarLote({ ...l, id: String(data.id) })
    },

    atualizarLote: async (id: string, dados: Partial<Lote>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarLote(id, dados)
        return
      }
      await sb.from('lotes_producao').update({
        ...(dados.codigo              !== undefined && { codigo:              dados.codigo }),
        ...(dados.produto             !== undefined && { produto:             dados.produto }),
        ...(dados.quantidadeProduzida !== undefined && { quantidade_produzida: dados.quantidadeProduzida }),
        ...(dados.quantidadeAprovada  !== undefined && { quantidade_aprovada: dados.quantidadeAprovada }),
        ...(dados.status              !== undefined && { status:              dados.status }),
        ...(dados.dataInicio          !== undefined && { data_inicio:         dados.dataInicio }),
        ...(dados.dataConclusao       !== undefined && { data_conclusao:      dados.dataConclusao }),
        ...(dados.responsavel         !== undefined && { responsavel:         dados.responsavel }),
        ...(dados.testes              !== undefined && { testes:              dados.testes }),
        ...(dados.insumos             !== undefined && { insumos:             dados.insumos }),
        ...(dados.notas               !== undefined && { notas:               dados.notas }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      usePurionStore.getState().atualizarLote(id, dados)
    },

    deletarLote: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('lotes_producao').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      const store = usePurionStore.getState()
      store.setLotes(store.lotes.filter((l) => l.id !== id))
    },

    restaurarLote: async (lote: Lote) => {
      const sb = supabase
      if (sb) await sb.from('lotes_producao').update({ deleted_at: null }).eq('id', lote.id)
      usePurionStore.getState().adicionarLote(lote)
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

    atualizarPedido: async (id: string, dados: Partial<PedidoExpedicao>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarPedidoExpedicao(id, dados)
        return
      }
      await sb.from('expedicao').update({
        ...(dados.numeroPedido !== undefined && { numero_pedido: dados.numeroPedido }),
        ...(dados.destinatario !== undefined && { destinatario:  dados.destinatario }),
        ...(dados.dataPedido   !== undefined && { data_pedido:   dados.dataPedido }),
        ...(dados.prazoHoras   !== undefined && { prazo_horas:   dados.prazoHoras }),
        ...(dados.status       !== undefined && { status:        dados.status }),
        ...(dados.itens        !== undefined && { itens:         dados.itens }),
        ...(dados.observacoes  !== undefined && { observacoes:   dados.observacoes }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      usePurionStore.getState().atualizarPedidoExpedicao(id, dados)
    },

    deletarPedido: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('expedicao').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      const store = usePurionStore.getState()
      store.setPedidosExpedicao(store.pedidosExpedicao.filter((p) => p.id !== id))
    },

    restaurarPedido: async (pedido: PedidoExpedicao) => {
      const sb = supabase
      if (sb) await sb.from('expedicao').update({ deleted_at: null }).eq('id', pedido.id)
      usePurionStore.getState().adicionarPedidoExpedicao(pedido)
    },
  }
}

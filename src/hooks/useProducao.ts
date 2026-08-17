'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { normalizarStatusLote, TESTES_OBRIGATORIOS } from '@/components/producao/producaoHelpers'
import type { ItemConsumo } from '@/hooks/useInsumosBOM'
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
    custoProducao:       r.custo_producao != null ? Number(r.custo_producao) : undefined,
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
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadLotes = async () => {
      const { data, error } = await sb
        .from('lotes_producao')
        .select('*')
        .is('deleted_at', null)
        .order('data_inicio', { ascending: false })
      dbLog('SELECT', 'lotes_producao', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setLotes(data.map(toLote))
    }

    const loadPedidos = async () => {
      const { data, error } = await sb
        .from('pedidos_expedicao')
        .select('*')
        .is('deleted_at', null)
        .order('data_pedido', { ascending: false })
      dbLog('SELECT', 'pedidos_expedicao', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setPedidosExpedicao(data.map(toPedido))
    }

    loadLotes()
    loadPedidos()

    const chL = sb.channel(`lotes-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes_producao' }, loadLotes)
      .subscribe()

    const chP = sb.channel(`expedicao-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_expedicao' }, loadPedidos)
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
      const { data, error } = await sb.from('lotes_producao').insert({
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
      dbLog('INSERT', 'lotes_producao', error, data?.id)
      if (error) { toastError('Erro ao criar lote', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarLote({ ...l, id: String(data.id) })
        success('Lote criado')
      }
    },

    /**
     * Produção interligada — o coração do estoque rigoroso.
     * Cria o lote, baixa cada insumo da receita (N × BOM) e credita N frascos em estoque_produto,
     * tudo amarrado ao mesmo lote (origem_tipo='lote', origem_id) para permanecer idempotente
     * mesmo em caso de reenvio acidental do mesmo lote.
     */
    registrarProducaoComBOM: async (
      dadosLote: {
        codigo: string; produto: string; quantidade: number
        dataInicio: string; responsavel: PerfilUsuario; notas?: string
      },
      consumo: ItemConsumo[],
    ): Promise<{ ok: boolean; loteId: string | null }> => {
      const sb = supabase
      if (!sb) return { ok: false, loteId: null }

      const custoProducao = consumo.reduce((s, c) => s + c.quantidadeNecessaria * c.custoUnitario, 0)

      const { data: loteData, error: loteErr } = await sb.from('lotes_producao').insert({
        codigo:               dadosLote.codigo,
        produto:              dadosLote.produto,
        quantidade_produzida: dadosLote.quantidade,
        quantidade_aprovada:  dadosLote.quantidade,
        status:               'planejado',
        data_inicio:          dadosLote.dataInicio,
        data_conclusao:       null,
        responsavel:          dadosLote.responsavel,
        testes: TESTES_OBRIGATORIOS.map((t) => ({
          tipo: t.tipo, resultado: 'pendente' as const, data: dadosLote.dataInicio, observacoes: '',
        })),
        insumos: consumo.map((c) => ({
          insumoId: c.insumoId, nome: c.nome, quantidadeUsada: c.quantidadeNecessaria, unidade: c.unidade,
        })),
        custo_producao: custoProducao,
        notas: dadosLote.notas ?? '',
      }).select().single()
      dbLog('INSERT', 'lotes_producao (BOM)', loteErr, loteData?.id)
      if (loteErr || !loteData) { toastError('Erro ao registrar produção', loteErr?.message ?? ''); return { ok: false, loteId: null } }
      const loteId = String(loteData.id)

      // Idempotência: se por algum motivo esta produção já baixou insumos, não baixa de novo.
      const { data: jaBaixado } = await sb.from('insumo_movimentacoes').select('id').eq('origem_tipo', 'lote').eq('origem_id', loteId).limit(1).maybeSingle()
      if (!jaBaixado) {
        for (const item of consumo) {
          const novoSaldo = item.quantidadeAtual - item.quantidadeNecessaria
          const { error: movErr } = await sb.from('insumo_movimentacoes').insert({
            insumo_id: item.insumoId, tipo: 'producao', quantidade: -item.quantidadeNecessaria,
            saldo_apos: novoSaldo, motivo: `Produção lote ${dadosLote.codigo}`,
            origem_tipo: 'lote', origem_id: loteId, autor: dadosLote.responsavel,
          })
          dbLog('INSERT', 'insumo_movimentacoes', movErr, `${item.nome} -${item.quantidadeNecessaria}`)
          if (!movErr) {
            const { error: updErr } = await sb.from('insumos').update({ quantidade_atual: novoSaldo, updated_at: new Date().toISOString() }).eq('id', item.insumoId)
            dbLog('UPDATE', 'insumos (baixa producao)', updErr, item.insumoId)
          }
        }
      }

      // Idempotência: entrada de frascos prontos amarrada ao mesmo lote.
      const { data: entradaExistente } = await sb.from('estoque_movimentacoes').select('id').eq('origem_tipo', 'lote').eq('origem_id', loteId).eq('tipo', 'entrada').maybeSingle()
      if (!entradaExistente) {
        const { data: estoque } = await sb.from('estoque_produto').select('id, quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (estoque) {
          const saldo = estoque.quantidade_atual + dadosLote.quantidade
          const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
            tipo: 'entrada', quantidade: dadosLote.quantidade,
            motivo: `Lote produzido ${dadosLote.codigo}`, origem_tipo: 'lote', origem_id: loteId,
            saldo_apos: saldo, autor: dadosLote.responsavel,
          })
          dbLog('INSERT', 'estoque_movimentacoes (producao_bom)', movErr, loteId)
          if (!movErr) {
            await sb.from('estoque_produto').update({ quantidade_atual: saldo, updated_at: new Date().toISOString() }).eq('id', estoque.id)
            const ep = usePurionStore.getState().estoqueProduto
            if (ep) usePurionStore.getState().setEstoqueProduto({ ...ep, quantidadeAtual: saldo })
          }
        }
      }

      usePurionStore.getState().adicionarLote({
        id: loteId, codigo: dadosLote.codigo, produto: dadosLote.produto,
        quantidadeProduzida: dadosLote.quantidade, quantidadeAprovada: dadosLote.quantidade,
        status: 'planejado', dataInicio: dadosLote.dataInicio, dataConclusao: null,
        responsavel: dadosLote.responsavel,
        testes: TESTES_OBRIGATORIOS.map((t) => ({ tipo: t.tipo as Lote['testes'][number]['tipo'], resultado: 'pendente' as const, data: dadosLote.dataInicio, observacoes: '' })),
        insumos: consumo.map((c) => ({ insumoId: c.insumoId, nome: c.nome, quantidadeUsada: c.quantidadeNecessaria, unidade: c.unidade })),
        notas: dadosLote.notas ?? '',
        custoProducao,
      })
      success(`${dadosLote.quantidade} frascos produzidos`, 'Insumos baixados e estoque de prontos atualizado')
      return { ok: true, loteId }
    },

    atualizarLote: async (id: string, dados: Partial<Lote>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarLote(id, dados)
        return
      }
      const { error } = await sb.from('lotes_producao').update({
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
      dbLog('UPDATE', 'lotes_producao', error, id)
      if (error) { toastError('Erro ao salvar lote', error.message); return }
      usePurionStore.getState().atualizarLote(id, dados)

      // Entrada automática de estoque de prontos quando o lote é concluído/envasado
      if (dados.status !== undefined && normalizarStatusLote(dados.status) === 'concluido') {
        const lote = usePurionStore.getState().lotes.find((l) => l.id === id)
        const qty = dados.quantidadeAprovada ?? lote?.quantidadeAprovada ?? 0
        if (qty > 0) {
          // Idempotência: não duplica a entrada se este lote já gerou uma movimentação
          const { data: existente } = await sb
            .from('estoque_movimentacoes')
            .select('id')
            .eq('origem_tipo', 'lote').eq('origem_id', id).eq('tipo', 'entrada')
            .maybeSingle()
          if (!existente) {
            const { data: estoque } = await sb.from('estoque_produto').select('id, quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
            if (estoque) {
              const saldo = estoque.quantidade_atual + qty
              const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
                tipo: 'entrada', quantidade: qty,
                motivo: `Lote concluído ${lote?.codigo ?? id}`, origem_tipo: 'lote', origem_id: id,
                saldo_apos: saldo, autor: dados.responsavel ?? lote?.responsavel ?? 'matheus',
              })
              dbLog('INSERT', 'estoque_movimentacoes (entrada_lote)', movErr, id)
              if (!movErr) {
                await sb.from('estoque_produto').update({ quantidade_atual: saldo, updated_at: new Date().toISOString() }).eq('id', estoque.id)
                const ep = usePurionStore.getState().estoqueProduto
                if (ep) usePurionStore.getState().setEstoqueProduto({ ...ep, quantidadeAtual: saldo })
                success(`Estoque atualizado: +${qty} frascos`)
              }
            }
          }
        }
      }
    },

    deletarLote: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('lotes_producao').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'lotes_producao', error, id)
        if (error) { toastError('Erro ao excluir lote', error.message); return }
      }
      const store = usePurionStore.getState()
      store.setLotes(store.lotes.filter((l) => l.id !== id))
      success('Lote excluído', 'Você pode restaurar na Lixeira')
    },

    restaurarLote: async (lote: Lote) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('lotes_producao').update({ deleted_at: null }).eq('id', lote.id)
        dbLog('UPDATE', 'lotes_producao', error, lote.id)
        if (error) { toastError('Erro ao restaurar lote', error.message); return }
      }
      usePurionStore.getState().adicionarLote(lote)
      success('Lote restaurado')
    },

    adicionarPedido: async (p: Omit<PedidoExpedicao, 'id'>) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('pedidos_expedicao').insert({
        referencia:    p.numeroPedido,
        numero_pedido: p.numeroPedido,
        destinatario:  p.destinatario,
        data_pedido:   p.dataPedido,
        prazo_horas:   p.prazoHoras,
        status:        p.status,
        itens:         p.itens,
        observacoes:   p.observacoes,
      }).select().single()
      dbLog('INSERT', 'pedidos_expedicao', error, data?.id)
      if (error) { toastError('Erro ao criar pedido', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarPedidoExpedicao({ ...p, id: String(data.id) })
        success('Pedido criado')
      }
    },

    atualizarPedido: async (id: string, dados: Partial<PedidoExpedicao>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarPedidoExpedicao(id, dados)
        return
      }
      const { error } = await sb.from('pedidos_expedicao').update({
        ...(dados.numeroPedido !== undefined && { numero_pedido: dados.numeroPedido, referencia: dados.numeroPedido }),
        ...(dados.destinatario !== undefined && { destinatario:  dados.destinatario }),
        ...(dados.dataPedido   !== undefined && { data_pedido:   dados.dataPedido }),
        ...(dados.prazoHoras   !== undefined && { prazo_horas:   dados.prazoHoras }),
        ...(dados.status       !== undefined && { status:        dados.status }),
        ...(dados.itens        !== undefined && { itens:         dados.itens }),
        ...(dados.observacoes  !== undefined && { observacoes:   dados.observacoes }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'pedidos_expedicao', error, id)
      if (error) { toastError('Erro ao salvar pedido', error.message); return }
      usePurionStore.getState().atualizarPedidoExpedicao(id, dados)
    },

    deletarPedido: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('pedidos_expedicao').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'pedidos_expedicao', error, id)
        if (error) { toastError('Erro ao excluir pedido', error.message); return }
      }
      const store = usePurionStore.getState()
      store.setPedidosExpedicao(store.pedidosExpedicao.filter((p) => p.id !== id))
      success('Pedido excluído', 'Você pode restaurar na Lixeira')
    },

    restaurarPedido: async (pedido: PedidoExpedicao) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('expedicao').update({ deleted_at: null }).eq('id', pedido.id)
        dbLog('UPDATE', 'expedicao', error, pedido.id)
        if (error) { toastError('Erro ao restaurar pedido', error.message); return }
      }
      usePurionStore.getState().adicionarPedidoExpedicao(pedido)
      success('Pedido restaurado')
    },

  }
}

'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { TipoMovimentacao } from '@/store'

type Row = Record<string, unknown>

export function useEstoque() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadEstoque = async () => {
      const { data, error } = await sb.from('estoque_produto').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle()
      dbLog('SELECT', 'estoque_produto', error)
      if (data) usePurionStore.getState().setEstoqueProduto({
        id:               String(data.id),
        produto:          String(data.produto ?? 'PURION GT 60ml'),
        quantidadeAtual:  Number(data.quantidade_atual ?? 0),
        quantidadeMinima: Number(data.quantidade_minima ?? 20),
        custoUnitario:    Number(data.custo_unitario ?? 23.99),
        updatedAt:        String(data.updated_at ?? new Date().toISOString()),
      })
    }

    const loadMovimentacoes = async () => {
      const { data, error } = await sb.from('estoque_movimentacoes').select('*').order('created_at', { ascending: false }).limit(200)
      dbLog('SELECT', 'estoque_movimentacoes', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setEstoqueMovimentacoes(
        data.map((r: Row) => ({
          id:         String(r.id),
          tipo:       String(r.tipo) as TipoMovimentacao,
          quantidade: Number(r.quantidade),
          motivo:     r.motivo ? String(r.motivo) : null,
          origemTipo: r.origem_tipo ? String(r.origem_tipo) : null,
          origemId:   r.origem_id ? String(r.origem_id) : null,
          saldoApos:  Number(r.saldo_apos),
          autor:      r.autor ? String(r.autor) : null,
          createdAt:  String(r.created_at ?? new Date().toISOString()),
          tenantId:   String(r.tenant_id ?? ''),
        }))
      )
    }

    loadEstoque()
    loadMovimentacoes()

    const ch = sb.channel(`estoque-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produto' }, loadEstoque)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_movimentacoes' }, loadMovimentacoes)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    registrarMovimentacao: async (
      tipo: TipoMovimentacao,
      quantidade: number,
      motivo: string,
      origemTipo?: string,
      origemId?: string,
    ) => {
      const sb = supabase
      if (!sb) return
      const estoque = usePurionStore.getState().estoqueProduto
      if (!estoque) { toastError('Estoque não carregado', ''); return }

      const delta = tipo === 'entrada' || tipo === 'ajuste' ? quantidade : -quantidade
      const saldo = Math.max(0, estoque.quantidadeAtual + delta)

      const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
        tipo, quantidade, motivo,
        origem_tipo: origemTipo ?? null,
        origem_id: origemId ?? null,
        saldo_apos: saldo,
        autor: 'matheus',
      })
      dbLog('INSERT', 'estoque_movimentacoes', movErr, tipo)
      if (movErr) { toastError('Erro ao registrar movimentação', movErr.message); return }

      const { error: estoqueErr } = await sb.from('estoque_produto').update({
        quantidade_atual: saldo,
        updated_at: new Date().toISOString(),
      }).eq('id', estoque.id)
      dbLog('UPDATE', 'estoque_produto', estoqueErr, `saldo=${saldo}`)
      if (estoqueErr) { toastError('Erro ao atualizar estoque', estoqueErr.message); return }

      usePurionStore.getState().setEstoqueProduto({ ...estoque, quantidadeAtual: saldo })
      success('Movimentação registrada')
    },
  }
}

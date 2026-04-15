'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type { Receita, Despesa } from '@/store'

type Row = Record<string, unknown>

function toReceita(r: Row): Receita {
  return {
    id:          String(r.id),
    descricao:   String(r.descricao   ?? ''),
    valor:       Number(r.valor),
    categoria:   String(r.categoria)  as Receita['categoria'],
    data:        String(r.data),
    regiao:      String(r.regiao      ?? 'DF')       as Receita['regiao'],
    responsavel: String(r.responsavel ?? 'matheus')  as Receita['responsavel'],
    ...(r.pedido_id ? { pedidoId: String(r.pedido_id) } : {}),
  }
}

function toDespesa(r: Row): Despesa {
  return {
    id:          String(r.id),
    descricao:   String(r.descricao   ?? ''),
    valor:       Number(r.valor),
    categoria:   String(r.categoria)  as Despesa['categoria'],
    data:        String(r.data),
    regiao:      String(r.regiao      ?? 'DF')       as Despesa['regiao'],
    responsavel: String(r.responsavel ?? 'matheus')  as Despesa['responsavel'],
    ...(r.fornecedor  ? { fornecedor:  String(r.fornecedor)  } : {}),
    ...(r.nota_fiscal ? { notaFiscal:  String(r.nota_fiscal) } : {}),
  }
}

export function useFinanceiro() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data } = await sb.from('financeiro').select('*').order('data', { ascending: false })
      if (!data) return
      const { setReceitas, setDespesas } = usePurionStore.getState()
      setReceitas(data.filter((r) => r.tipo === 'receita').map(toReceita))
      setDespesas(data.filter((r) => r.tipo === 'despesa').map(toDespesa))
    }

    load()

    const ch = sb.channel('financeiro-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarReceita: async (r: Omit<Receita, 'id'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('financeiro').insert({
        tipo: 'receita', categoria: r.categoria, valor: r.valor,
        data: r.data, descricao: r.descricao, regiao: r.regiao,
        responsavel: r.responsavel, pedido_id: r.pedidoId ?? null,
      }).select().single()
      if (data) usePurionStore.getState().adicionarReceita({ ...r, id: String(data.id) })
    },

    adicionarDespesa: async (d: Omit<Despesa, 'id'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('financeiro').insert({
        tipo: 'despesa', categoria: d.categoria, valor: d.valor,
        data: d.data, descricao: d.descricao, regiao: d.regiao,
        responsavel: d.responsavel,
        fornecedor: d.fornecedor ?? null, nota_fiscal: d.notaFiscal ?? null,
      }).select().single()
      if (data) usePurionStore.getState().adicionarDespesa({ ...d, id: String(data.id) })
    },
  }
}

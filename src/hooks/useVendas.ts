'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { Venda, StatusVendaAppmax, CanalVenda } from '@/store'

type Row = Record<string, unknown>

function toVenda(r: Row): Venda {
  return {
    id:               String(r.id),
    pedidoAppmax:     String(r.pedido_appmax ?? ''),
    clienteNome:      String(r.cliente_nome ?? ''),
    clienteEmail:     String(r.cliente_email ?? ''),
    clienteTelefone:  String(r.cliente_telefone ?? ''),
    valorBruto:       Number(r.valor_bruto ?? 0),
    valorLiquido:     Number(r.valor_liquido ?? 0),
    taxa:             Number(r.taxa ?? 0),
    status:           String(r.status ?? 'pendente') as StatusVendaAppmax,
    metodoPagamento:  String(r.metodo_pagamento ?? 'desconhecido'),
    parcelas:         Number(r.parcelas ?? 1),
    canal:            String(r.canal ?? 'b2c') as CanalVenda,
    afiliadoCodigo:   r.afiliado_codigo ? String(r.afiliado_codigo) : null,
    produto:          String(r.produto ?? ''),
    quantidade:       Number(r.quantidade ?? 1),
    dataVenda:        String(r.data_venda ?? r.created_at ?? new Date().toISOString()),
    createdAt:        String(r.created_at ?? new Date().toISOString()),
  }
}

export function useVendas() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('vendas')
        .select('*')
        .is('deleted_at', null)
        .order('data_venda', { ascending: false })
      dbLog('SELECT', 'vendas', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setVendas(data.map(toVenda))
    }

    load()

    const ch = sb.channel(`vendas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])
}

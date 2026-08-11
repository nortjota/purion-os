'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'

export type AfiliadoStatus  = 'ativo' | 'pausado' | 'pendente' | 'bloqueado'
export type TipoComissao    = 'percentual' | 'fixo'
export type StatusVenda     = 'pendente' | 'confirmada' | 'cancelada' | 'devolvida'
export type StatusComissao  = 'pendente' | 'aprovada' | 'paga' | 'cancelada'
export type StatusPagamento = 'pendente' | 'processando' | 'pago' | 'cancelado'

export interface Afiliado {
  id: string
  tenant_id?: string
  nome: string
  email: string
  whatsapp?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  seguidores_total: number
  nicho?: string
  codigo: string
  link_afiliado?: string
  tipo_comissao: TipoComissao
  valor_comissao: number
  desconto_cliente: number
  tipo_desconto: TipoComissao
  status: AfiliadoStatus
  pix_chave?: string
  pix_tipo?: string
  banco_nome?: string
  banco_agencia?: string
  banco_conta?: string
  data_inicio?: string
  data_fim?: string
  notas?: string
  criado_em: string
  atualizado_em?: string
}

export interface AfiliadoVenda {
  id: string
  afiliado_id: string
  tenant_id?: string
  pedido_id: string
  pedido_ref?: string
  cliente_nome?: string
  cliente_email?: string
  valor_bruto: number
  desconto_aplicado: number
  valor_liquido: number
  comissao_percentual?: number
  comissao_valor: number
  produtos?: { nome: string; sku?: string; quantidade: number; valor: number }[]
  status_venda: StatusVenda
  status_comissao: StatusComissao
  clique_id?: string
  origem?: string
  data_venda: string
  data_aprovacao?: string
  data_pagamento?: string
  notas?: string
}

export interface AfiliadoClique {
  id: string
  afiliado_id: string
  user_agent?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  converteu: boolean
  criado_em: string
}

export interface AfiliadoPagamento {
  id: string
  afiliado_id: string
  vendas_ids?: string[]
  valor_total: number
  metodo?: 'pix' | 'transferencia' | 'outro'
  chave_pix?: string
  comprovante_url?: string
  status: StatusPagamento
  periodo_inicio: string
  periodo_fim: string
  data_pagamento?: string
  notas?: string
  criado_em?: string
}

type NovoAfiliado = Omit<Afiliado, 'id' | 'link_afiliado' | 'criado_em' | 'atualizado_em'>

export function useAfiliados() {
  const [afiliados,  setAfiliados]  = useState<Afiliado[]>([])
  const [vendas,     setVendas]     = useState<AfiliadoVenda[]>([])
  const [cliques,    setCliques]    = useState<Pick<AfiliadoClique, 'afiliado_id' | 'converteu'>[]>([])
  const [pagamentos, setPagamentos] = useState<AfiliadoPagamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    if (!supabase) { setCarregando(false); return }
    setCarregando(true)
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('afiliados').select('*').is('deleted_at', null).order('criado_em', { ascending: false }),
      supabase.from('afiliado_vendas').select('*').neq('status_venda', 'cancelada').order('data_venda', { ascending: false }),
      supabase.from('afiliado_cliques').select('afiliado_id, converteu').gte('criado_em', new Date(Date.now() - 90 * 86400000).toISOString()),
      supabase.from('afiliado_pagamentos').select('*').order('criado_em', { ascending: false }),
    ])
    dbLog('SELECT', 'afiliados', r1.error, `${r1.data?.length ?? 0} rows`)
    dbLog('SELECT', 'afiliado_vendas', r2.error, `${r2.data?.length ?? 0} rows`)
    dbLog('SELECT', 'afiliado_cliques', r3.error, `${r3.data?.length ?? 0} rows`)
    dbLog('SELECT', 'afiliado_pagamentos', r4.error, `${r4.data?.length ?? 0} rows`)
    setAfiliados((r1.data as Afiliado[]) ?? [])
    setVendas((r2.data as AfiliadoVenda[]) ?? [])
    setCliques(r3.data ?? [])
    setPagamentos((r4.data as AfiliadoPagamento[]) ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const criarAfiliado = useCallback(async (dados: NovoAfiliado): Promise<Afiliado | null> => {
    if (!supabase) return null
    // tenant_id nunca é enviado pelo cliente — o DEFAULT public.meu_tenant_id() no banco cuida disso.
    const { tenant_id: _tenantId, ...payload } = dados
    const { data, error } = await supabase.from('afiliados').insert(payload).select().single()
    dbLog('INSERT', 'afiliados', error, data?.id)
    if (error || !data) return null
    const novo = data as Afiliado
    setAfiliados(prev => [novo, ...prev])
    return novo
  }, [])

  const atualizarAfiliado = useCallback(async (id: string, dados: Partial<Afiliado>) => {
    if (!supabase) return
    const { error } = await supabase.from('afiliados').update(dados).eq('id', id)
    dbLog('UPDATE', 'afiliados', error, id)
    if (!error) setAfiliados(prev => prev.map(a => a.id === id ? { ...a, ...dados } : a))
  }, [])

  const deletarAfiliado = useCallback(async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('afiliados').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    dbLog('DELETE', 'afiliados', error, id)
    setAfiliados(prev => prev.filter(a => a.id !== id))
  }, [])

  const pausarAfiliado = useCallback(async (id: string, pausado: boolean) => {
    await atualizarAfiliado(id, { status: pausado ? 'pausado' : 'ativo' })
  }, [atualizarAfiliado])

  const aprovarComissao = useCallback(async (vendaId: string) => {
    if (!supabase) return
    const { error } = await supabase.from('afiliado_vendas')
      .update({ status_comissao: 'aprovada', data_aprovacao: new Date().toISOString() })
      .eq('id', vendaId)
    dbLog('UPDATE', 'afiliado_vendas', error, vendaId)
    if (!error) setVendas(prev => prev.map(v => v.id === vendaId ? { ...v, status_comissao: 'aprovada' as StatusComissao } : v))
  }, [])

  const registrarPagamento = useCallback(async (
    dados: Omit<AfiliadoPagamento, 'id' | 'criado_em'>,
    vendasIds: string[],
  ): Promise<boolean> => {
    if (!supabase) return false
    const { error: pgError } = await supabase.from('afiliado_pagamentos').insert(dados)
    dbLog('INSERT', 'afiliado_pagamentos', pgError)
    if (pgError) return false
    const { error: vdError } = await supabase.from('afiliado_vendas')
      .update({ status_comissao: 'paga', data_pagamento: new Date().toISOString() })
      .in('id', vendasIds)
    dbLog('UPDATE', 'afiliado_vendas', vdError, vendasIds)
    if (!vdError) setVendas(prev => prev.map(v => vendasIds.includes(v.id) ? { ...v, status_comissao: 'paga' as StatusComissao } : v))
    return !vdError
  }, [])

  return {
    afiliados, vendas, cliques, pagamentos, carregando,
    carregar,
    criarAfiliado, atualizarAfiliado, deletarAfiliado, pausarAfiliado,
    aprovarComissao, registrarPagamento,
  }
}

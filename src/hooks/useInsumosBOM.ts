'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export type CategoriaInsumo = 'liquido' | 'embalagem_produto' | 'embalagem_envio' | 'etiqueta'

export const CATEGORIA_LABEL: Record<CategoriaInsumo, string> = {
  liquido:            'Líquidos (formulação)',
  embalagem_produto:  'Embalagem do produto',
  embalagem_envio:    'Embalagem de envio',
  etiqueta:           'Etiquetas',
}

export const CATEGORIA_OPCOES: CategoriaInsumo[] = ['liquido', 'embalagem_produto', 'embalagem_envio', 'etiqueta']

export interface Insumo {
  id: string
  nome: string
  categoria: CategoriaInsumo
  unidade: string
  quantidadeAtual: number
  quantidadeMinima: number
  custoUnitario: number
  fornecedor: string | null
  notas: string | null
  updatedAt: string
}

export type TipoMovimentacaoInsumo = 'compra' | 'producao' | 'ajuste'

export interface InsumoMovimentacao {
  id: string
  insumoId: string
  tipo: TipoMovimentacaoInsumo
  quantidade: number // delta assinado: positivo = entrou, negativo = saiu
  saldoApos: number
  motivo: string | null
  origemTipo: string | null
  origemId: string | null
  autor: string | null
  createdAt: string
}

export interface BomReceitaItem {
  id: string
  insumoId: string
  quantidadePorUnidade: number
}

type Row = Record<string, unknown>

function toInsumo(r: Row): Insumo {
  return {
    id:               String(r.id),
    nome:             String(r.nome ?? ''),
    categoria:        String(r.categoria ?? 'liquido') as CategoriaInsumo,
    unidade:          String(r.unidade ?? 'un'),
    quantidadeAtual:  Number(r.quantidade_atual ?? 0),
    quantidadeMinima: Number(r.quantidade_minima ?? 0),
    custoUnitario:    Number(r.custo_unitario ?? 0),
    fornecedor:       r.fornecedor ? String(r.fornecedor) : null,
    notas:            r.notas ? String(r.notas) : null,
    updatedAt:        String(r.updated_at ?? new Date().toISOString()),
  }
}

function toMovimentacao(r: Row): InsumoMovimentacao {
  return {
    id:         String(r.id),
    insumoId:   String(r.insumo_id),
    tipo:       String(r.tipo) as TipoMovimentacaoInsumo,
    quantidade: Number(r.quantidade),
    saldoApos:  Number(r.saldo_apos),
    motivo:     r.motivo ? String(r.motivo) : null,
    origemTipo: r.origem_tipo ? String(r.origem_tipo) : null,
    origemId:   r.origem_id ? String(r.origem_id) : null,
    autor:      r.autor ? String(r.autor) : null,
    createdAt:  String(r.created_at ?? new Date().toISOString()),
  }
}

function toBomItem(r: Row): BomReceitaItem {
  return {
    id:                    String(r.id),
    insumoId:              String(r.insumo_id),
    quantidadePorUnidade:  Number(r.quantidade_por_unidade ?? 0),
  }
}

// ─────────────────────────────────────────────
// Hook: insumos (catálogo + livro-razão)
// ─────────────────────────────────────────────

export function useInsumos() {
  const { success, error: toastError } = useToast()
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<InsumoMovimentacao[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const [insRes, movRes] = await Promise.all([
      sb.from('insumos').select('*').is('deleted_at', null).order('categoria', { ascending: true }).order('nome', { ascending: true }),
      sb.from('insumo_movimentacoes').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    dbLog('SELECT', 'insumos', insRes.error, `${insRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'insumo_movimentacoes', movRes.error, `${movRes.data?.length ?? 0} rows`)
    if (insRes.data) setInsumos(insRes.data.map(toInsumo))
    if (movRes.data) setMovimentacoes(movRes.data.map(toMovimentacao))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`insumos-bom-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumo_movimentacoes' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function criarInsumo(dados: {
    nome: string; categoria: CategoriaInsumo; unidade: string
    quantidadeAtual: number; quantidadeMinima: number; custoUnitario: number
    fornecedor?: string | null; notas?: string | null
  }): Promise<Insumo | null> {
    const sb = supabase
    if (!sb) return null
    const { data, error } = await sb.from('insumos').insert({
      nome:              dados.nome,
      categoria:         dados.categoria,
      unidade:           dados.unidade,
      quantidade_atual:  dados.quantidadeAtual,
      quantidade_minima: dados.quantidadeMinima,
      custo_unitario:    dados.custoUnitario,
      fornecedor:        dados.fornecedor ?? null,
      notas:             dados.notas ?? null,
    }).select().single()
    dbLog('INSERT', 'insumos', error, data?.id)
    if (error) { toastError('Erro ao cadastrar insumo', error.message); return null }
    success('Insumo cadastrado')
    return data ? toInsumo(data as Row) : null
  }

  async function atualizarInsumo(id: string, dados: Partial<{
    nome: string; categoria: CategoriaInsumo; unidade: string
    quantidadeMinima: number; custoUnitario: number; fornecedor: string | null; notas: string | null
  }>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('insumos').update({
      ...(dados.nome             !== undefined && { nome: dados.nome }),
      ...(dados.categoria        !== undefined && { categoria: dados.categoria }),
      ...(dados.unidade          !== undefined && { unidade: dados.unidade }),
      ...(dados.quantidadeMinima !== undefined && { quantidade_minima: dados.quantidadeMinima }),
      ...(dados.custoUnitario    !== undefined && { custo_unitario: dados.custoUnitario }),
      ...(dados.fornecedor       !== undefined && { fornecedor: dados.fornecedor }),
      ...(dados.notas            !== undefined && { notas: dados.notas }),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    dbLog('UPDATE', 'insumos', error, id)
    if (error) { toastError('Erro ao salvar insumo', error.message); return }
    success('Insumo atualizado')
  }

  async function deletarInsumo(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('insumos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    dbLog('DELETE', 'insumos', error, id)
    if (error) { toastError('Erro ao excluir insumo', error.message); return }
    success('Insumo excluído')
  }

  /** Movimentação genérica de insumo — usada por compra e ajuste manual. quantidadeDelta é assinado. */
  async function registrarMovimentacao(dados: {
    insumoId: string
    tipo: TipoMovimentacaoInsumo
    quantidadeDelta: number
    motivo?: string | null
    origemTipo?: string | null
    origemId?: string | null
    autor?: string | null
    /** se informado, também atualiza o custo unitário do insumo (ex: nova compra com preço diferente) */
    novoCustoUnitario?: number
  }) {
    const sb = supabase
    if (!sb) return
    const insumo = insumos.find((i) => i.id === dados.insumoId)
    if (!insumo) { toastError('Insumo não encontrado', ''); return }
    const saldo = insumo.quantidadeAtual + dados.quantidadeDelta

    const { error: movErr } = await sb.from('insumo_movimentacoes').insert({
      insumo_id:   dados.insumoId,
      tipo:        dados.tipo,
      quantidade:  dados.quantidadeDelta,
      saldo_apos:  saldo,
      motivo:      dados.motivo ?? null,
      origem_tipo: dados.origemTipo ?? null,
      origem_id:   dados.origemId ?? null,
      autor:       dados.autor ?? null,
    })
    dbLog('INSERT', 'insumo_movimentacoes', movErr, `${dados.insumoId}/${dados.tipo}`)
    if (movErr) { toastError('Erro ao registrar movimentação', movErr.message); return }

    const { error: updErr } = await sb.from('insumos').update({
      quantidade_atual: saldo,
      ...(dados.novoCustoUnitario !== undefined && { custo_unitario: dados.novoCustoUnitario }),
      updated_at: new Date().toISOString(),
    }).eq('id', dados.insumoId)
    dbLog('UPDATE', 'insumos (movimentacao)', updErr, dados.insumoId)
    if (updErr) { toastError('Erro ao atualizar saldo do insumo', updErr.message); return }
    success('Movimentação registrada')
  }

  async function registrarCompra(insumoId: string, quantidade: number, custoUnitarioNovo?: number) {
    await registrarMovimentacao({
      insumoId, tipo: 'compra', quantidadeDelta: Math.abs(quantidade),
      motivo: 'Compra de insumo', novoCustoUnitario: custoUnitarioNovo,
    })
  }

  async function ajustarManual(insumoId: string, novaQuantidade: number, motivo?: string) {
    const insumo = insumos.find((i) => i.id === insumoId)
    if (!insumo) return
    const delta = novaQuantidade - insumo.quantidadeAtual
    if (delta === 0) return
    await registrarMovimentacao({ insumoId, tipo: 'ajuste', quantidadeDelta: delta, motivo: motivo ?? 'Ajuste manual (contagem/perda)' })
  }

  const emAlerta = useMemo(() => insumos.filter((i) => i.quantidadeAtual <= i.quantidadeMinima), [insumos])
  const valorTotalInsumos = useMemo(() => insumos.reduce((s, i) => s + i.quantidadeAtual * i.custoUnitario, 0), [insumos])

  return {
    insumos, movimentacoes, carregando, emAlerta, valorTotalInsumos,
    criarInsumo, atualizarInsumo, deletarInsumo, registrarMovimentacao, registrarCompra, ajustarManual,
  }
}

// ─────────────────────────────────────────────
// Hook: receita (BOM) de 1 frasco
// ─────────────────────────────────────────────

export function useBomReceita() {
  const { success, error: toastError } = useToast()
  const [itens, setItens] = useState<BomReceitaItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('bom_receita').select('*')
    dbLog('SELECT', 'bom_receita', error, `${data?.length ?? 0} rows`)
    if (data) setItens(data.map(toBomItem))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`bom-receita-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bom_receita' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function definirQuantidade(insumoId: string, quantidadePorUnidade: number) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('bom_receita').upsert({
      insumo_id: insumoId,
      quantidade_por_unidade: quantidadePorUnidade,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'insumo_id' }).select().single()
    dbLog('UPSERT', 'bom_receita', error, insumoId)
    if (error) { toastError('Erro ao salvar receita', error.message); return }
    if (data) {
      const item = toBomItem(data as Row)
      setItens((prev) => [...prev.filter((i) => i.insumoId !== insumoId), item])
    }
    success('Receita atualizada')
  }

  async function removerDaReceita(insumoId: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('bom_receita').delete().eq('insumo_id', insumoId)
    dbLog('DELETE', 'bom_receita', error, insumoId)
    if (error) { toastError('Erro ao remover da receita', error.message); return }
    setItens((prev) => prev.filter((i) => i.insumoId !== insumoId))
    success('Removido da receita')
  }

  function quantidadeParaInsumo(insumoId: string): number {
    return itens.find((i) => i.insumoId === insumoId)?.quantidadePorUnidade ?? 0
  }

  return { itens, carregando, definirQuantidade, removerDaReceita, quantidadeParaInsumo }
}

// ─────────────────────────────────────────────
// Cálculos derivados — custo, capacidade e prévia de consumo
// ─────────────────────────────────────────────

export interface ItemConsumo {
  insumoId: string
  nome: string
  unidade: string
  quantidadePorUnidade: number
  quantidadeNecessaria: number
  quantidadeAtual: number
  custoUnitario: number
  suficiente: boolean
}

/** Prévia de consumo para produzir `n` frascos, cruzando a receita com o saldo atual de cada insumo. */
export function calcularConsumo(n: number, receita: BomReceitaItem[], insumos: Insumo[]): ItemConsumo[] {
  return receita
    .filter((r) => r.quantidadePorUnidade > 0)
    .map((r) => {
      const insumo = insumos.find((i) => i.id === r.insumoId)
      const quantidadeNecessaria = r.quantidadePorUnidade * n
      return {
        insumoId: r.insumoId,
        nome: insumo?.nome ?? '—',
        unidade: insumo?.unidade ?? 'un',
        quantidadePorUnidade: r.quantidadePorUnidade,
        quantidadeNecessaria,
        quantidadeAtual: insumo?.quantidadeAtual ?? 0,
        custoUnitario: insumo?.custoUnitario ?? 0,
        suficiente: (insumo?.quantidadeAtual ?? 0) >= quantidadeNecessaria,
      }
    })
}

/** Custo de 1 frasco = soma(quantidade_por_unidade × custo_unitario) de cada insumo da receita. */
export function custoReceitaPorUnidade(receita: BomReceitaItem[], insumos: Insumo[]): number {
  return receita.reduce((soma, r) => {
    const insumo = insumos.find((i) => i.id === r.insumoId)
    return soma + r.quantidadePorUnidade * (insumo?.custoUnitario ?? 0)
  }, 0)
}

/** Quantos frascos ainda dá pra produzir com o estoque atual — o menor entre saldo/receita de cada insumo. */
export function capacidadeProducao(receita: BomReceitaItem[], insumos: Insumo[]): { capacidade: number; gargalo: Insumo | null } {
  const relevantes = receita.filter((r) => r.quantidadePorUnidade > 0)
  if (relevantes.length === 0) return { capacidade: 0, gargalo: null }
  let capacidade = Infinity
  let gargalo: Insumo | null = null
  for (const r of relevantes) {
    const insumo = insumos.find((i) => i.id === r.insumoId)
    if (!insumo) continue
    const cap = Math.floor(insumo.quantidadeAtual / r.quantidadePorUnidade)
    if (cap < capacidade) { capacidade = cap; gargalo = insumo }
  }
  return { capacidade: capacidade === Infinity ? 0 : Math.max(0, capacidade), gargalo }
}

export function formatarMoedaBR(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

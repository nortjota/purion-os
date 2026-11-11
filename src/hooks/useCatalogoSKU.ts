'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import { ESCADA_PADRAO, type SkuCatalogo, type TipoSKU } from '@/lib/escadaProdutos'

type Row = Record<string, unknown>

const CODIGOS = ESCADA_PADRAO.map((s) => s.codigo)
const num = (v: unknown) => (v == null || v === '' ? null : Number(v))

function toSku(r: Row): SkuCatalogo {
  const padrao = ESCADA_PADRAO.find((s) => s.codigo === r.codigo)
  return {
    id:            String(r.id),
    codigo:        String(r.codigo),
    nome:          String(r.nome ?? padrao?.nome ?? r.codigo),
    tipo:          String(r.tipo ?? padrao?.tipo ?? 'frasco') as TipoSKU,
    preco:         num(r.preco),
    qtdFrascos:    Number(r.qtd_frascos ?? padrao?.qtdFrascos ?? 1),
    custoProducao: num(r.custo_producao),
    economia:      num(r.economia),
    descricao:     String(r.descricao ?? ''),
    precoAValidar: Boolean(r.preco_a_validar ?? false),
    ativo:         r.ativo == null ? true : Boolean(r.ativo),
    ordem:         Number(r.ordem ?? padrao?.ordem ?? 99),
  }
}

interface CatalogoState {
  skus: SkuCatalogo[]
  origem: 'padrao' | 'banco'
  carregado: boolean
  set: (p: Partial<CatalogoState>) => void
}

/** Store dedicado do catálogo (compartilhado por modais, painel e detalhe da venda). */
const useCatalogoStore = create<CatalogoState>((set) => ({
  skus: ESCADA_PADRAO,
  origem: 'padrao',
  carregado: false,
  set: (p) => set(p),
}))

let assinantes = 0
let canal: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

async function carregar() {
  const sb = supabase
  if (!sb) return
  const { data, error } = await sb.from('produtos_sku').select('*').in('codigo', CODIGOS)
  dbLog('SELECT', 'produtos_sku (escada)', error, `${data?.length ?? 0} rows`)
  if (error || !data || data.length === 0) {
    // migration ainda não rodou: usa a escada padrão (somente leitura)
    useCatalogoStore.getState().set({ skus: ESCADA_PADRAO, origem: 'padrao', carregado: true })
    return
  }
  const skus = data.map(toSku).sort((a, b) => a.ordem - b.ordem)
  useCatalogoStore.getState().set({ skus, origem: 'banco', carregado: true })
}

export function useCatalogoSKU() {
  const { success, error: toastError } = useToast()
  const skus = useCatalogoStore((s) => s.skus)
  const origem = useCatalogoStore((s) => s.origem)
  const carregado = useCatalogoStore((s) => s.carregado)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    assinantes++
    if (assinantes === 1) {
      void Promise.resolve().then(carregar)
      canal = sb.channel(`produtos-sku-sync-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos_sku' }, () => { void carregar() })
        .subscribe()
    }
    return () => {
      assinantes--
      if (assinantes === 0 && canal) { sb.removeChannel(canal); canal = null }
    }
  }, [])

  return {
    skus,
    ativos: skus.filter((s) => s.ativo),
    origem,
    carregado,
    porCodigo: (codigo: string | null | undefined) => skus.find((s) => s.codigo === codigo),

    atualizarSku: async (id: string | null, dados: { preco?: number | null; ativo?: boolean }) => {
      const sb = supabase
      if (!sb || !id) { toastError('Catálogo ainda não está no banco', 'Rode a migration da escada de produtos.'); return }
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (dados.preco !== undefined) { payload.preco = dados.preco; payload.preco_a_validar = dados.preco == null }
      if (dados.ativo !== undefined) payload.ativo = dados.ativo
      const { error } = await sb.from('produtos_sku').update(payload).eq('id', id)
      dbLog('UPDATE', 'produtos_sku', error, id)
      if (error) { toastError('Erro ao salvar SKU', error.message); return }
      const atual = useCatalogoStore.getState().skus
      useCatalogoStore.getState().set({
        skus: atual.map((s) => (s.id === id
          ? { ...s, ...(dados.preco !== undefined && { preco: dados.preco, precoAValidar: dados.preco == null }), ...(dados.ativo !== undefined && { ativo: dados.ativo }) }
          : s)),
      })
      success('SKU atualizado')
    },
  }
}

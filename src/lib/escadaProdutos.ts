/**
 * PURION OS — Escada de produtos (SKUs).
 * UMA ÚNICA fragrância: Kit 2/Kit 3 = mais frascos dela; Discovery = amostra (2–3 ml) dela.
 * Estes valores são o padrão; o catálogo real vem de produtos_sku (editável na tela Produtos).
 */

import { CUSTO_PRODUCAO_FRASCO, PRECO_B2C_OFICIAL, CUSTOS_VARIAVEIS_FRASCO } from './precificacao'
import type { Venda } from '@/store'

export type TipoSKU = 'frasco' | 'kit' | 'discovery'
export type CodigoSKU = 'frasco_60ml' | 'kit_2' | 'kit_3' | 'discovery'

export interface SkuCatalogo {
  id: string | null          // null = padrão local (migration ainda não rodou)
  codigo: CodigoSKU | string
  nome: string
  tipo: TipoSKU
  preco: number | null       // null = a validar
  qtdFrascos: number         // frascos de estoque consumidos por unidade vendida
  custoProducao: number | null
  economia: number | null
  descricao: string
  precoAValidar: boolean
  ativo: boolean
  ordem: number
}

export const ESCADA_PADRAO: SkuCatalogo[] = [
  { id: null, codigo: 'frasco_60ml', nome: '1 Frasco 60ml', tipo: 'frasco', preco: 97.9, qtdFrascos: 1, custoProducao: 30, economia: 0,
    descricao: 'PURION GT 60ml — a fragrância única da marca.', precoAValidar: false, ativo: true, ordem: 1 },
  { id: null, codigo: 'kit_2', nome: 'Kit 2 (2 frascos)', tipo: 'kit', preco: 179.9, qtdFrascos: 2, custoProducao: 60, economia: 15.9,
    descricao: '2 frascos PURION GT 60ml.', precoAValidar: false, ativo: true, ordem: 2 },
  { id: null, codigo: 'kit_3', nome: 'Kit 3 (3 frascos)', tipo: 'kit', preco: 259.9, qtdFrascos: 3, custoProducao: 90, economia: 33.8,
    descricao: '3 frascos PURION GT 60ml.', precoAValidar: false, ativo: true, ordem: 3 },
  { id: null, codigo: 'discovery', nome: 'Discovery Set (amostra 2–3ml)', tipo: 'discovery', preco: null, qtdFrascos: 0, custoProducao: null, economia: null,
    descricao: 'Amostra (2–3ml) da fragrância única, com crédito convertível no frasco full size. Preço a validar.', precoAValidar: true, ativo: true, ordem: 4 },
]

export const TIPO_SKU_LABEL: Record<TipoSKU, string> = { frasco: 'Frasco', kit: 'Kit', discovery: 'Discovery' }

/** Margem do SKU = (preço − custo de produção) ÷ preço. */
export function margemSku(s: Pick<SkuCatalogo, 'preco' | 'custoProducao'>): number | null {
  if (s.preco == null || s.preco <= 0 || s.custoProducao == null) return null
  return (s.preco - s.custoProducao) / s.preco
}

/** Economia do kit vs. comprar frascos avulsos ao preço B2C. */
export function economiaKit(s: Pick<SkuCatalogo, 'preco' | 'qtdFrascos' | 'tipo'>, precoB2C = PRECO_B2C_OFICIAL): number | null {
  if (s.tipo !== 'kit' || s.preco == null) return null
  return Math.round((s.qtdFrascos * precoB2C - s.preco) * 100) / 100
}

/** Frascos de estoque consumidos pela venda = quantidade × frascos por unidade (legado sem SKU = 1). */
export function frascosDaVenda(v: Pick<Venda, 'quantidade' | 'frascosPorUnidade'>): number {
  const porUnidade = v.frascosPorUnidade ?? 1
  return Math.max(0, (v.quantidade || 1) * porUnidade)
}

/** SKU da venda (legado sem sku_codigo = frasco avulso). */
export function codigoSkuDaVenda(v: Pick<Venda, 'skuCodigo' | 'frascosPorUnidade'>): string {
  if (v.skuCodigo) return v.skuCodigo
  return 'frasco_60ml'
}

/**
 * Contribuição da venda = valor − custo de produção do SKU × qtd − custos variáveis proporcionais.
 * Custos variáveis (R$ 28 por frasco a R$ 97,90: embalagem, taxas, impostos, frete, perdas)
 * são aplicados proporcionalmente ao valor: (custosVariaveis ÷ precoB2C) × valor da venda.
 * Assim 1 frasco a R$ 97,90 → 97,90 − 30 − 28 = R$ 39,90.
 * Retorna null quando o custo do SKU está "a validar" (Discovery).
 */
export function contribuicaoVenda(
  v: Venda,
  sku: Pick<SkuCatalogo, 'custoProducao' | 'qtdFrascos'> | undefined,
  cfg: { custoProdutoUnitario: number; precoB2C: number; custosVariaveis?: number },
): { valor: number; custoProducao: number; custosVariaveis: number; contribuicao: number } | null {
  const valor = v.valorTotal ?? v.valorLiquido
  const qtd = v.quantidade || 1
  let custoUnidade: number | null
  if (sku) custoUnidade = sku.custoProducao
  else custoUnidade = (v.frascosPorUnidade ?? 1) * cfg.custoProdutoUnitario
  if (custoUnidade == null) return null
  const custoProducao = custoUnidade * qtd
  const cv = cfg.custosVariaveis ?? CUSTOS_VARIAVEIS_FRASCO
  const custosVariaveis = cfg.precoB2C > 0 ? (cv / cfg.precoB2C) * valor : 0
  return { valor, custoProducao, custosVariaveis, contribuicao: valor - custoProducao - custosVariaveis }
}

export { CUSTO_PRODUCAO_FRASCO }

/**
 * PURION OS — Precificação oficial (fonte da verdade).
 * Decisão de preço: B2C R$ 97,90 · custo de produção R$ 30,00.
 * Substitui o antigo R$ 109,90 / R$ 28,00 em todo o sistema.
 *
 * A PURION tem UMA ÚNICA fragrância. Kits = mais frascos da mesma fragrância;
 * Discovery = amostra (2–3 ml) dessa mesma fragrância.
 */

export const CUSTO_PRODUCAO_FRASCO = 30
export const PRECO_B2C_OFICIAL = 97.9
export const PRECO_B2B_OFICIAL = 64.9        // hipótese: preço ao parceiro
export const MARGEM_MINIMA_ALVO_PCT = 65     // piso aceitável — só alerta

/** Custos variáveis por frasco vendido no orgânico (somam R$ 28,00). */
export const CUSTOS_VARIAVEIS_DETALHE = [
  { item: 'Embalagem', valor: 6 },
  { item: 'Taxas de pagamento', valor: 5 },
  { item: 'Impostos', valor: 7 },
  { item: 'Frete', valor: 8 },
  { item: 'Perdas', valor: 2 },
] as const
export const CUSTOS_VARIAVEIS_FRASCO = CUSTOS_VARIAVEIS_DETALHE.reduce((s, c) => s + c.valor, 0) // 28

/** Markup = (preço − custo) ÷ custo × 100 */
export function calcMarkupPct(preco: number, custo: number): number {
  return custo > 0 ? ((preco - custo) / custo) * 100 : 0
}

/** Margem bruta = (preço − custo) ÷ preço × 100 */
export function calcMargemPct(preco: number, custo: number): number {
  return preco > 0 ? ((preco - custo) / preco) * 100 : 0
}

/** Contribuição orgânica/frasco = preço − custo − custos variáveis (97,90 − 30 − 28 = 39,90). */
export function calcContribuicaoOrganica(preco: number, custo: number, custosVariaveis: number): number {
  return preco - custo - custosVariaveis
}

/**
 * Chaves gravadas em `configuracoes` (tabela chave-valor) para a precificação.
 * `pct`: valor gravado em % (ex.: 65) e guardado no app como fração (0,65).
 */
export const CHAVES_PRECIFICACAO = {
  custo_unitario:        { campo: 'custoProdutoUnitario', pct: false },
  preco_b2c:             { campo: 'precoB2C',             pct: false },
  preco_b2b:             { campo: 'precoB2B',             pct: false },
  markup:                { campo: 'markupPct',            pct: false },
  margem_real:           { campo: 'margemRealPct',        pct: false },
  margem_minima_alvo:    { campo: 'margemMinimaAlvo',     pct: true  },
  contribuicao_organica: { campo: 'contribuicaoOrganica', pct: false },
  custos_variaveis:      { campo: 'custosVariaveis',      pct: false },
} as const

export type ChavePrecificacao = keyof typeof CHAVES_PRECIFICACAO

/** campo do app → chave no banco */
export const CAMPO_PARA_CHAVE: Record<string, ChavePrecificacao> = Object.fromEntries(
  Object.entries(CHAVES_PRECIFICACAO).map(([chave, { campo }]) => [campo, chave as ChavePrecificacao]),
)


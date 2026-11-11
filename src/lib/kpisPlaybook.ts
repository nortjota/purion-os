/**
 * PURION OS — KPIs oficiais do Playbook 360.
 * Funções puras sobre vendas + despesas. Cada KPI documenta a fórmula exata usada.
 *
 * Convenções:
 * - order_id = vendas.pedido_appmax (pedido da loja) ?? vendas.id (pedido manual)
 * - Pedido pago = status_pagamento = 'pago'
 * - Cliente = lead_id (B2B) ?? e-mail ?? telefone (8 últimos dígitos) ?? nome
 * - Período = últimos N dias até agora (data_venda)
 */

import type { Venda, Despesa, CanalVenda } from '@/store'

const DIA = 86_400_000

export function orderId(v: Venda): string {
  return v.pedidoAppmax || v.id
}

export function clienteKey(v: Venda): string {
  if (v.canal === 'b2b' && v.leadId) return `lead:${v.leadId}`
  if (v.clienteEmail) return `mail:${v.clienteEmail.trim().toLowerCase()}`
  const tel = (v.clienteTelefone || '').replace(/\D/g, '')
  if (tel.length >= 8) return `tel:${tel.slice(-8)}`
  return `nome:${(v.clienteNome || v.id).trim().toLowerCase()}`
}

export const pago = (v: Venda) => v.statusPagamento === 'pago'
export const reembolsado = (v: Venda) =>
  v.statusPagamento === 'estornado' || v.status === 'estornado' || v.status === 'reembolsado'

/** Itens pagos (bruto, antes de desconto) = valor unitário × quantidade; fallback: total + desconto. */
export function itensBrutos(v: Venda): number {
  if (v.valorUnitario != null) return v.valorUnitario * (v.quantidade || 1)
  return (v.valorTotal ?? v.valorLiquido) + (v.desconto || 0)
}

function noPeriodo(iso: string | null | undefined, inicio: number, fim: number): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= inicio && t <= fim
}

function mediana(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Compras pagas por cliente, ordenadas (1 entrada por order_id). */
function comprasPorCliente(vendas: Venda[]): Map<string, { data: number; canal: CanalVenda }[]> {
  const mapa = new Map<string, Map<string, { data: number; canal: CanalVenda }>>()
  for (const v of vendas) {
    if (!pago(v)) continue
    const k = clienteKey(v)
    if (!mapa.has(k)) mapa.set(k, new Map())
    const pedidos = mapa.get(k)!
    const oid = orderId(v)
    const t = new Date(v.dataVenda).getTime()
    if (!pedidos.has(oid) || pedidos.get(oid)!.data > t) pedidos.set(oid, { data: t, canal: v.canal })
  }
  const out = new Map<string, { data: number; canal: CanalVenda }[]>()
  mapa.forEach((pedidos, k) => out.set(k, [...pedidos.values()].sort((a, b) => a.data - b.data)))
  return out
}

export interface ContribuicaoCanal {
  canal: CanalVenda
  receitaLiquida: number
  cmv: number
  taxas: number
  custosVariaveis: number
  contribuicao: number
  margem: number | null
}

export interface KpisPlaybook {
  dias: number
  pedidosPagos: number
  receitaLiquida: number
  itensPagos: number
  descontos: number
  reembolsos: number
  contribuicao: ContribuicaoCanal[]
  investimentoAquisicao: number
  novosCompradores: number
  cac: number | null
  pedidosSite30d: number
  conversaoSite: number | null
  ticketMedio: number | null
  recompra60: { taxa: number | null; base: number; recompraram: number }
  recompra90: { taxa: number | null; base: number; recompraram: number }
  diasAte2aCompra: number | null
  satisfacao: { media: number | null; respostas: number }
  giroB2B30d: { unidades: number; parceiros: number; porParceiro: number | null }
  northStar: { total: number; b2c: number; b2b: number; anterior: number }
}

export function calcularKpisPlaybook(params: {
  vendas: Venda[]
  despesas: Despesa[]
  dias: number
  custoUnitario: number
  sessoesSite30d: number
  agora: number
}): KpisPlaybook {
  const { vendas: todas, despesas, dias, custoUnitario, sessoesSite30d, agora } = params
  const vendas = todas // useVendas já filtra deleted_at
  const inicio = agora - dias * DIA

  const doPeriodo = vendas.filter((v) => noPeriodo(v.dataVenda, inicio, agora))
  const pagas = doPeriodo.filter(pago)

  // 1. Pedidos pagos = order_id único com pagamento confirmado
  const pedidosPagos = new Set(pagas.map(orderId)).size

  // 2. Receita líquida = itens pagos − descontos − reembolsos
  const itensPagos = pagas.reduce((s, v) => s + itensBrutos(v), 0)
  const descontos = pagas.reduce((s, v) => s + (v.desconto || 0), 0)
  const reembolsos = doPeriodo.filter(reembolsado).reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
  const receitaLiquida = itensPagos - descontos - reembolsos

  // Custos variáveis do período (despesas lançadas)
  const despPeriodo = despesas.filter((d) => noPeriodo(`${d.data}T12:00:00`, inicio, agora))
  const somaCat = (...cats: string[]) => despPeriodo.filter((d) => cats.includes(d.categoria)).reduce((s, d) => s + d.valor, 0)
  const midia = somaCat('ads_meta', 'ads_google')
  const creators = somaCat('ugc_creators')
  const logistica = somaCat('logistica')

  // 3. Contribuição por canal = receita líquida − CMV − taxas de pagamento − custos variáveis do canal
  //    B2C: mídia paga + creators/UGC + logística rateada por unidades · B2B: logística rateada
  const unidadesTotal = pagas.reduce((s, v) => s + (v.quantidade || 1), 0)
  const contribuicao: ContribuicaoCanal[] = (['b2c', 'b2b'] as CanalVenda[]).map((canal) => {
    const doCanal = doPeriodo.filter((v) => v.canal === canal)
    const pagasCanal = doCanal.filter(pago)
    const rl = pagasCanal.reduce((s, v) => s + itensBrutos(v) - (v.desconto || 0), 0)
      - doCanal.filter(reembolsado).reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const unidades = pagasCanal.reduce((s, v) => s + (v.quantidade || 1), 0)
    const cmv = unidades * custoUnitario
    const taxas = pagasCanal.reduce((s, v) => s + (v.taxa || 0), 0)
    const logRateada = unidadesTotal > 0 ? logistica * (unidades / unidadesTotal) : 0
    const custosVariaveis = (canal === 'b2c' ? midia + creators : 0) + logRateada
    const contrib = rl - cmv - taxas - custosVariaveis
    return { canal, receitaLiquida: rl, cmv, taxas, custosVariaveis, contribuicao: contrib, margem: rl > 0 ? contrib / rl : null }
  })

  // 4. CAC novos compradores = (mídia paga + creators/UGC) ÷ clientes cuja 1ª compra paga caiu no período
  const historico = comprasPorCliente(vendas)
  let novosCompradores = 0
  historico.forEach((compras) => { if (compras[0] && compras[0].data >= inicio && compras[0].data <= agora) novosCompradores++ })
  const investimentoAquisicao = midia + creators
  const cac = novosCompradores > 0 ? investimentoAquisicao / novosCompradores : null

  // 5. Conversão do site (30d) = pedidos pagos B2C do site ÷ sessões do site (informadas)
  const inicio30 = agora - 30 * DIA
  const pedidosSite30d = new Set(
    vendas.filter((v) => pago(v) && v.canal === 'b2c' && v.origemVenda !== 'b2b_presencial' && noPeriodo(v.dataVenda, inicio30, agora)).map(orderId),
  ).size
  const conversaoSite = sessoesSite30d > 0 ? pedidosSite30d / sessoesSite30d : null

  // 6. Ticket médio = receita líquida ÷ pedidos pagos
  const ticketMedio = pedidosPagos > 0 ? receitaLiquida / pedidosPagos : null

  // 7. Taxa de recompra 60/90d = clientes (coorte madura: 1ª compra há ≥ N dias) que fizeram
  //    a 2ª compra paga em até N dias após a 1ª ÷ clientes da coorte
  function recompra(n: number) {
    let base = 0, recompraram = 0
    historico.forEach((compras) => {
      const primeira = compras[0]
      if (!primeira || agora - primeira.data < n * DIA) return
      base++
      if (compras[1] && compras[1].data - primeira.data <= n * DIA) recompraram++
    })
    return { taxa: base > 0 ? recompraram / base : null, base, recompraram }
  }

  // 8. Tempo até 2ª compra = mediana de dias entre a 1ª e a 2ª compra paga
  const intervalos: number[] = []
  historico.forEach((c) => { if (c.length >= 2) intervalos.push((c[1].data - c[0].data) / DIA) })
  const med = mediana(intervalos)

  // 9. Satisfação pós-entrega = média das notas (1-5) registradas no período
  const notas = vendas.filter((v) => v.satisfacao != null && noPeriodo(v.feedbackEm ?? v.dataEntregaRealizada ?? v.dataVenda, inicio, agora))
  const satisfacao = {
    media: notas.length > 0 ? notas.reduce((s, v) => s + (v.satisfacao ?? 0), 0) / notas.length : null,
    respostas: notas.length,
  }

  // 10. Giro B2B 30d = unidades B2B pagas em 30d ÷ parceiros B2B com pedido pago em 30d
  const b2b30 = vendas.filter((v) => pago(v) && v.canal === 'b2b' && noPeriodo(v.dataVenda, inicio30, agora))
  const unidadesB2B = b2b30.reduce((s, v) => s + (v.quantidade || 1), 0)
  const parceiros = new Set(b2b30.map(clienteKey)).size

  // North Star = clientes/parceiros ATIVOS que RECOMPRAM: ≥ 2 pedidos pagos e o último nos últimos 90 dias
  function northStarEm(ref: number) {
    let b2c = 0, b2b = 0
    historico.forEach((compras) => {
      const ate = compras.filter((c) => c.data <= ref)
      if (ate.length < 2) return
      const ultima = ate[ate.length - 1]
      if (ref - ultima.data > 90 * DIA) return
      if (ultima.canal === 'b2b') b2b++; else b2c++
    })
    return { b2c, b2b, total: b2c + b2b }
  }
  const ns = northStarEm(agora)
  const nsAnterior = northStarEm(agora - 30 * DIA)

  return {
    dias, pedidosPagos, receitaLiquida, itensPagos, descontos, reembolsos, contribuicao,
    investimentoAquisicao, novosCompradores, cac, pedidosSite30d, conversaoSite, ticketMedio,
    recompra60: recompra(60), recompra90: recompra(90), diasAte2aCompra: med, satisfacao,
    giroB2B30d: { unidades: unidadesB2B, parceiros, porParceiro: parceiros > 0 ? unidadesB2B / parceiros : null },
    northStar: { ...ns, anterior: nsAnterior.total },
  }
}

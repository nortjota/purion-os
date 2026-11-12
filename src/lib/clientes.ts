import type { Venda } from '@/store'
import { frascosDaVenda } from './escadaProdutos'

/**
 * CLIENTE ÚNICO — derivado das vendas, sem tabela nova.
 * Regra de identidade (decidida pelos sócios): mesmo CPF/CNPJ OU mesmo e-mail = mesmo cliente.
 * Uma venda que traz CPF e e-mail liga os dois; vendas encadeadas formam um só cliente
 * (ex.: venda A tem CPF X + e-mail Y; venda B só e-mail Y; venda C só CPF X → um cliente).
 * Venda sem CPF e sem e-mail fica sozinha (não dá para saber de quem é).
 */

export interface Cliente {
  id: string
  nome: string
  emails: string[]
  documentos: string[]
  telefones: string[]
  vendas: Venda[]          // da mais recente para a mais antiga
  pedidosPagos: number
  totalGasto: number
  ticketMedio: number
  frascos: number
  primeiraCompra: string | null
  ultimaCompra: string | null
  diasDesdeUltima: number | null
  canais: Array<'b2c' | 'b2b'>
  satisfacaoMedia: number | null
  semIdentificador: boolean
}

export type SegmentoCliente = 'recorrente' | 'uma_compra' | 'em_risco' | 'sem_compra_paga'

export const normalizarEmail = (e: string | null | undefined) => (e ?? '').trim().toLowerCase()
export const normalizarDocumento = (d: string | null | undefined) => (d ?? '').replace(/\D/g, '')

const valorVenda = (v: Venda) => v.valorTotal ?? v.valorLiquido
/** Sem recompra depois disso, o cliente entra em risco (ciclo de consumo do frasco ≈ 45–60 dias). */
export const DIAS_EM_RISCO = 60

function chavesDaVenda(v: Venda): string[] {
  const chaves: string[] = []
  const doc = normalizarDocumento(v.clienteDocumento)
  if (doc.length === 11 || doc.length === 14) chaves.push(`doc:${doc}`)
  const email = normalizarEmail(v.clienteEmail)
  if (email.includes('@')) chaves.push(`email:${email}`)
  return chaves
}

export function agruparClientes(vendas: Venda[], agora = Date.now()): Cliente[] {
  // union-find simples sobre os índices das vendas
  const pai = vendas.map((_, i) => i)
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])))
  const unir = (a: number, b: number) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) pai[rb] = ra }
  const dono = new Map<string, number>()
  vendas.forEach((v, i) => {
    for (const k of chavesDaVenda(v)) {
      const j = dono.get(k)
      if (j === undefined) dono.set(k, i); else unir(i, j)
    }
  })

  const grupos = new Map<number, Venda[]>()
  vendas.forEach((v, i) => {
    const r = raiz(i)
    if (!grupos.has(r)) grupos.set(r, [])
    grupos.get(r)!.push(v)
  })

  const clientes: Cliente[] = []
  for (const lista of grupos.values()) {
    const ordenadas = [...lista].sort((a, b) => b.dataVenda.localeCompare(a.dataVenda))
    const pagas = ordenadas.filter((v) => v.statusPagamento === 'pago' && valorVenda(v) > 0)
    const emails = [...new Set(ordenadas.map((v) => normalizarEmail(v.clienteEmail)).filter((e) => e.includes('@')))]
    const documentos = [...new Set(ordenadas.map((v) => normalizarDocumento(v.clienteDocumento)).filter((d) => d.length === 11 || d.length === 14))]
    const telefones = [...new Set(ordenadas.map((v) => (v.clienteTelefone ?? '').trim()).filter(Boolean))]
    const totalGasto = pagas.reduce((s, v) => s + valorVenda(v), 0)
    const ultima = pagas[0]?.dataVenda ?? null
    const notas = ordenadas.map((v) => v.satisfacao).filter((n): n is number => typeof n === 'number')
    const semIdentificador = emails.length === 0 && documentos.length === 0
    clientes.push({
      id: documentos[0] ? `doc:${documentos[0]}` : emails[0] ? `email:${emails[0]}` : `venda:${ordenadas[0].id}`,
      nome: ordenadas.find((v) => v.clienteNome?.trim())?.clienteNome.trim() || emails[0] || 'Cliente sem nome',
      emails, documentos, telefones,
      vendas: ordenadas,
      pedidosPagos: pagas.length,
      totalGasto,
      ticketMedio: pagas.length ? totalGasto / pagas.length : 0,
      frascos: pagas.reduce((s, v) => s + frascosDaVenda(v), 0),
      primeiraCompra: pagas.at(-1)?.dataVenda ?? null,
      ultimaCompra: ultima,
      diasDesdeUltima: ultima ? Math.floor((agora - new Date(ultima).getTime()) / 86_400_000) : null,
      canais: [...new Set(ordenadas.map((v) => v.canal))],
      satisfacaoMedia: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
      semIdentificador,
    })
  }
  return clientes.sort((a, b) => (b.ultimaCompra ?? '').localeCompare(a.ultimaCompra ?? ''))
}

export function segmentoDoCliente(c: Cliente): SegmentoCliente {
  if (c.pedidosPagos === 0) return 'sem_compra_paga'
  if (c.diasDesdeUltima != null && c.diasDesdeUltima > DIAS_EM_RISCO) return 'em_risco'
  return c.pedidosPagos >= 2 ? 'recorrente' : 'uma_compra'
}

export const SEGMENTO_INFO: Record<SegmentoCliente, { label: string; badge: string }> = {
  recorrente:      { label: 'Recorrente', badge: 'badge-success' },
  uma_compra:      { label: '1 compra', badge: 'badge-info' },
  em_risco:        { label: `Sem compra há +${DIAS_EM_RISCO}d`, badge: 'badge-warning' },
  sem_compra_paga: { label: 'Sem compra paga', badge: 'badge-neutral' },
}

/** CPF/CNPJ mascarado para exibição (dado pessoal: mostra só o final). */
export function mascararDocumento(doc: string): string {
  if (doc.length === 11) return `***.***.${doc.slice(6, 9)}-${doc.slice(9)}`
  if (doc.length === 14) return `**.***.***/${doc.slice(8, 12)}-${doc.slice(12)}`
  return doc
}

/** Encontra o cliente de uma venda (para links "ver ficha"). */
export function chaveClienteDaVenda(v: Venda): string {
  const doc = normalizarDocumento(v.clienteDocumento)
  if (doc.length === 11 || doc.length === 14) return `doc:${doc}`
  const email = normalizarEmail(v.clienteEmail)
  if (email.includes('@')) return `email:${email}`
  return `venda:${v.id}`
}

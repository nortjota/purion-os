import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Tenant único PURION — service_role não dispara o DEFAULT da coluna,
// então tenant_id é SEMPRE preenchido manualmente neste handler.
const PURION_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─────────────────────────────────────────────────────────────
// Mapeamento de eventos Appmax → status interno de vendas
// A Appmax envia o payload como { event: string, data: {...} }.
// Os nomes de evento abaixo seguem a convenção pública da Appmax
// (Order*); ajuste/expanda conforme o que aparecer em webhook_logs
// nos primeiros testes reais — ver INTEGRACAO_APPMAX.md.
// ─────────────────────────────────────────────────────────────

const EVENTO_PARA_STATUS: Record<string, string> = {
  OrderApproved:        'aprovado',
  OrderAuthorized:      'aprovado',
  OrderPaid:            'aprovado',
  OrderPaidByPix:       'aprovado',
  OrderPixPaid:         'aprovado',
  OrderIntegration:     'aprovado',
  OrderPending:         'pendente',
  OrderPixGenerated:    'pendente',
  OrderBoletoGenerated: 'pendente',
  OrderRefused:         'recusado',
  PaymentNotAuthorized: 'recusado',
  OrderRefunded:        'reembolsado',
  OrderRefund:          'reembolsado',
  ChargeRefunded:       'reembolsado',
  OrderChargedback:     'estornado',
  OrderCancelled:       'estornado',
}

type AppmaxData = Record<string, unknown>

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(',', '.')) || 0
  return 0
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function extrairMetodoPagamento(data: AppmaxData): string {
  const tipo = str(
    (data.payment as Record<string, unknown> | undefined)?.type
    ?? data.payment_type
    ?? data.payment_method
  ).toLowerCase()
  if (tipo.includes('pix')) return 'pix'
  if (tipo.includes('boleto')) return 'boleto'
  if (tipo.includes('card') || tipo.includes('cartao') || tipo.includes('cartão')) return 'cartao'
  return tipo || 'desconhecido'
}

function extrairCodigoAfiliado(data: AppmaxData): string | null {
  // Tenta campos de tracking/metadata diretos, depois UTM/ref embutido em texto livre
  const candidatos = [
    data.tracking, data.ref, data.afiliado_codigo, data.affiliate_code,
    (data as { utm?: Record<string, unknown> }).utm?.content,
    data.utm_content,
  ]
  for (const c of candidatos) {
    if (c && typeof c === 'string' && c.trim()) return c.trim().toUpperCase()
  }
  // Tenta extrair padrão PURION-XXX-NNN de campos de texto livre (nota/observação)
  const textoBusca = [data.note, data.customer_note, data.observation].filter(Boolean).join(' ')
  const match = textoBusca.match(/PURION-[A-Z0-9]+-[0-9]+/i)
  return match?.[0]?.toUpperCase() ?? null
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin()
  const rawBody = await req.text()

  // ── Validar origem (token secreto) ──────────────────────────
  const secret = process.env.APPMAX_WEBHOOK_SECRET
  const tokenRecebido =
    req.headers.get('x-appmax-webhook-secret')
    ?? req.headers.get('x-webhook-secret')
    ?? new URL(req.url).searchParams.get('token')
    ?? ''

  if (!secret) {
    console.error('[webhook/appmax] APPMAX_WEBHOOK_SECRET não configurada')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  }
  if (tokenRecebido !== secret) {
    return NextResponse.json({ error: 'Origem não autorizada' }, { status: 401 })
  }

  let payload: { event?: string; data?: AppmaxData } & AppmaxData
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // ── Log de auditoria — sempre, antes de qualquer processamento ──
  const { data: logRow } = await db
    .from('webhook_logs')
    .insert({ origem: 'appmax', payload, status_processamento: 'recebido', tenant_id: PURION_TENANT_ID })
    .select('id')
    .single()

  const evento = str(payload.event ?? payload.status ?? '')
  const data: AppmaxData = (payload.data ?? payload) as AppmaxData

  const pedidoAppmax = str(data.id ?? data.order_id ?? data.pedido_id ?? '')
  if (!pedidoAppmax) {
    if (logRow) await db.from('webhook_logs').update({ status_processamento: 'ignorado' }).eq('id', logRow.id)
    return NextResponse.json({ ok: true, msg: 'Pedido sem identificador — ignorado' })
  }

  const status = EVENTO_PARA_STATUS[evento] ?? 'pendente'

  const valorBruto = num(data.total ?? data.total_value ?? data.amount)
  const taxa = num(data.fee ?? data.tax_value ?? data.gateway_fee)
  const valorLiquido = num(data.net_value ?? data.total_liquido) || (valorBruto - taxa)

  const cliente = (data.customer as Record<string, unknown> | undefined) ?? {}
  const afiliadoCodigo = extrairCodigoAfiliado(data)

  const produtos = (data.products as Array<Record<string, unknown>> | undefined) ?? []
  const produtoNome = produtos[0]?.name ? str(produtos[0].name) : str(data.product_name ?? '')
  const quantidade = produtos.reduce((s, p) => s + (Number(p.quantity) || 0), 0) || Number(data.quantity) || 1

  const canal = str(data.channel ?? data.canal ?? 'b2c').toLowerCase() === 'b2b' ? 'b2b' : 'b2c'

  // ── Upsert idempotente em vendas (chave: pedido_appmax) ──────
  const { data: vendaExistente } = await db
    .from('vendas')
    .select('id, status')
    .eq('pedido_appmax', pedidoAppmax)
    .maybeSingle()

  const vendaPayload = {
    pedido_appmax:    pedidoAppmax,
    cliente_nome:     str(cliente.fullname ?? cliente.name ?? data.customer_name ?? ''),
    cliente_email:    str(cliente.email ?? data.customer_email ?? ''),
    cliente_telefone: str(cliente.telephone ?? cliente.phone ?? data.customer_phone ?? ''),
    valor_bruto:      valorBruto,
    valor_liquido:     valorLiquido,
    taxa,
    status,
    metodo_pagamento: extrairMetodoPagamento(data),
    parcelas:         Number((data.payment as Record<string, unknown> | undefined)?.installments ?? data.installments ?? 1) || 1,
    canal,
    afiliado_codigo:  afiliadoCodigo,
    produto:          produtoNome,
    quantidade,
    data_venda:       new Date().toISOString(),
    tenant_id:        PURION_TENANT_ID,
  }

  let vendaId: string | undefined
  if (vendaExistente) {
    const { data: upd } = await db.from('vendas').update(vendaPayload).eq('id', vendaExistente.id).select('id').single()
    vendaId = upd?.id
  } else {
    const { data: ins, error: insErr } = await db.from('vendas').insert(vendaPayload).select('id').single()
    if (insErr) {
      console.error('[webhook/appmax] erro ao inserir venda:', insErr.message)
      if (logRow) await db.from('webhook_logs').update({ status_processamento: 'erro' }).eq('id', logRow.id)
      return NextResponse.json({ ok: true, msg: 'Erro ao registrar venda (logado)' })
    }
    vendaId = ins?.id
  }

  // ── Quando aprovado E ainda não tinha sido aprovado antes: lança no financeiro ──
  const jaEstavaAprovado = vendaExistente?.status === 'aprovado'
  if (status === 'aprovado' && !jaEstavaAprovado) {
    const categoria = canal === 'b2b' ? 'venda_b2b' : 'venda_b2c'
    const nomeCliente = vendaPayload.cliente_nome || 'Cliente'
    await db.from('financeiro').insert({
      tipo:        'receita',
      categoria,
      valor:       valorLiquido,
      data:        new Date().toISOString().slice(0, 10),
      descricao:   `Venda Appmax — ${nomeCliente} (pedido ${pedidoAppmax})`,
      regiao:      'DF',
      responsavel: 'matheus',
      pedido_id:   pedidoAppmax,
      tenant_id:   PURION_TENANT_ID,
    })
  }

  if (logRow) {
    await db.from('webhook_logs').update({ status_processamento: 'processado' }).eq('id', logRow.id)
  }

  return NextResponse.json({ ok: true, vendaId, status })
}

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Desativa o body parser padrão para poder ler o raw body e validar a assinatura HMAC
export const runtime = 'nodejs'

type NuvemshopProduct = {
  name: string
  sku: string
  quantity: number
  price: string
}

type NuvemshopPayload = {
  id?: number | string
  number?: number | string
  total?: string
  discount?: string
  note?: string
  customer_note?: string
  extra_info?: string
  event?: string
  customer?: { name?: string; email?: string }
  products?: NuvemshopProduct[]
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  // ── Verificar assinatura HMAC (Nuvemshop pode usar dois headers diferentes)
  const signature = req.headers.get('x-linkedstore-hmac-sha256')
                 ?? req.headers.get('x-nuvemshop-hmac-sha256')
                 ?? ''

  const secret = process.env.NUVEMSHOP_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 503 })
  }

  const expectedSig = createHmac('sha256', secret).update(body).digest('base64')
  if (signature !== expectedSig) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  let payload: NuvemshopPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const evento = req.headers.get('x-nuvemshop-topic') ?? payload.event ?? ''
  const db     = supabaseAdmin()

  // ── PEDIDO PAGO ────────────────────────────────────────────────────────────
  if (evento === 'orders/paid') {
    const pedidoId  = payload.id?.toString()     ?? ''
    const pedidoRef = payload.number?.toString() ?? ''

    if (!pedidoId) return NextResponse.json({ ok: true, msg: 'ID de pedido ausente' })

    // Idempotência: ignorar se já processado
    const { data: existente } = await db
      .from('afiliado_vendas')
      .select('id')
      .eq('pedido_id', pedidoId)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ ok: true, msg: 'Pedido já processado' })
    }

    // Extrair código de afiliado da nota do pedido (formato PURION-XXXX)
    const textoBusca     = [payload.note, payload.customer_note, payload.extra_info].filter(Boolean).join(' ')
    const codigoMatch    = textoBusca.match(/PURION-[A-Z0-9]+/i)
    const codigoAfiliado = codigoMatch?.[0]?.toUpperCase() ?? null

    if (!codigoAfiliado) {
      return NextResponse.json({ ok: true, msg: 'Pedido sem código de afiliado' })
    }

    const { data: afiliado } = await db
      .from('afiliados')
      .select('id, tenant_id, tipo_comissao, valor_comissao')
      .eq('codigo', codigoAfiliado)
      .eq('status', 'ativo')
      .is('deleted_at', null)
      .single()

    if (!afiliado) {
      return NextResponse.json({ ok: true, msg: 'Afiliado não encontrado ou inativo' })
    }

    const valorBruto        = parseFloat(payload.total     ?? '0')
    const descontoAplicado  = parseFloat(payload.discount  ?? '0')
    const valorLiquido      = valorBruto - descontoAplicado

    const comissaoValor = afiliado.tipo_comissao === 'percentual'
      ? valorLiquido * (afiliado.valor_comissao / 100)
      : afiliado.valor_comissao

    const produtos = (payload.products ?? []).map((p) => ({
      nome:       p.name,
      sku:        p.sku,
      quantidade: p.quantity,
      valor:      parseFloat(p.price),
    }))

    const tenantId = afiliado.tenant_id ?? process.env.PURION_TENANT_ID

    const { error } = await db
      .from('afiliado_vendas')
      .insert({
        afiliado_id:          afiliado.id,
        tenant_id:            tenantId,
        pedido_id:            pedidoId,
        pedido_ref:           pedidoRef,
        cliente_nome:         payload.customer?.name  ?? null,
        cliente_email:        payload.customer?.email ?? null,
        valor_bruto:          valorBruto,
        desconto_aplicado:    descontoAplicado,
        valor_liquido:        valorLiquido,
        comissao_percentual:  afiliado.tipo_comissao === 'percentual' ? afiliado.valor_comissao : null,
        comissao_valor:       comissaoValor,
        produtos:             produtos,
        status_venda:         'confirmada',
        status_comissao:      'pendente',
        origem:               'webhook_nuvemshop',
        data_venda:           new Date().toISOString(),
      })

    if (error) {
      console.error('[webhook-nuvemshop] erro ao inserir venda:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, msg: 'Venda registrada com sucesso' })
  }

  // ── PEDIDO CANCELADO ───────────────────────────────────────────────────────
  if (evento === 'orders/cancelled') {
    const pedidoId = payload.id?.toString() ?? ''
    if (pedidoId) {
      await db
        .from('afiliado_vendas')
        .update({ status_venda: 'cancelada', status_comissao: 'cancelada' })
        .eq('pedido_id', pedidoId)
    }
    return NextResponse.json({ ok: true, msg: 'Venda cancelada' })
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Tenant único PURION — service_role não dispara o DEFAULT da coluna,
// então tenant_id é SEMPRE preenchido manualmente neste handler.
const PURION_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─────────────────────────────────────────────────────────────
// Mapeamento de eventos Appmax → status interno de vendas
// A Appmax envia o payload como { event: string, data: {...} }.
// Nomes de evento confirmados na documentação oficial (appmax.readme.io/
// reference/webhooks-en.md) — são snake_case, não PascalCase.
// ─────────────────────────────────────────────────────────────

const EVENTO_PARA_STATUS: Record<string, string> = {
  order_paid:                     'aprovado',
  order_paid_by_pix:              'aprovado',
  order_approved:                 'aprovado',
  order_authorized:               'aprovado',
  order_authorized_with_delay:    'aprovado',
  order_integrated:               'aprovado',
  order_pending_integration:      'pendente',
  order_pix_created:              'pendente',
  order_pix_expired:              'pendente',
  order_billet_created:           'pendente',
  order_billet_overdue:           'pendente',
  payment_authorized_with_delay:  'pendente',
  payment_not_authorized:         'recusado',
  order_refund:                   'reembolsado',
  order_chargeback_in_treatment:  'estornado',
}

type AppmaxData = Record<string, unknown>

// Status do gateway → vocabulário que o CRM usa no fluxo de pagamento (Despacho, KPIs, Clientes).
// Sem isso a venda do site ficava "pendente" para sempre e nunca entrava na fila de despacho.
const STATUS_PARA_PAGAMENTO: Record<string, 'pago' | 'pendente' | 'estornado' | 'cancelado'> = {
  aprovado: 'pago',
  pendente: 'pendente',
  recusado: 'cancelado',
  reembolsado: 'estornado',
  estornado: 'estornado',
}

// Eventos em que o cliente chegou ao pagamento e não concluiu → vira carrinho a recuperar.
const EVENTOS_CARRINHO_PERDIDO = new Set(['order_pix_expired', 'order_billet_overdue', 'payment_not_authorized'])

// IDs de produto do checkout (pay.puriongt.com.br) → SKU da escada. Mantenha igual ao site.
const PRODUTO_PARA_SKU: Record<string, { sku: string; frascos: number }> = {
  '12c09776-a3c7-11f1-a1eb-46da4690ad53': { sku: 'frasco_60ml', frascos: 1 },
  '5611c8a9-946a-11f1-a1eb-46da4690ad53': { sku: 'kit_2', frascos: 2 },
}

function primeiro(...vals: unknown[]): string {
  for (const v of vals) if (v != null && String(v).trim()) return String(v).trim()
  return ''
}

/** SKU pelo ID do produto no checkout; sem ID conhecido, pelo nome ("kit 3", "3 frascos"…). */
function inferirSku(produtos: Array<Record<string, unknown>>, nome: string): { sku: string; frascos: number } {
  for (const p of produtos) {
    const id = primeiro(p.id, p.sku, p.product_id, p.external_id)
    if (PRODUTO_PARA_SKU[id]) return PRODUTO_PARA_SKU[id]
  }
  const n = nome.toLowerCase()
  if (/kit\s*3|3\s*frascos/.test(n)) return { sku: 'kit_3', frascos: 3 }
  if (/kit\s*2|2\s*frascos/.test(n)) return { sku: 'kit_2', frascos: 2 }
  if (/discovery|amostra/.test(n)) return { sku: 'discovery', frascos: 0 }
  return { sku: 'frasco_60ml', frascos: 1 }
}

/** Endereço de entrega: a Appmax manda no cliente (address_*) ou num objeto shipping/address. */
function extrairEndereco(cliente: Record<string, unknown>, data: AppmaxData) {
  const end = ((data.shipping ?? data.address ?? cliente.address) as Record<string, unknown> | undefined) ?? {}
  return {
    cep:         primeiro(cliente.postcode, cliente.zip_code, cliente.cep, end.postcode, end.zip_code, end.cep) || null,
    endereco:    primeiro(cliente.address_street, end.street, end.address, end.logradouro) || null,
    numero:      primeiro(cliente.address_street_number, end.number, end.numero) || null,
    complemento: primeiro(cliente.address_street_complement, end.complement, end.complemento) || null,
    bairro:      primeiro(cliente.address_street_district, end.district, end.neighborhood, end.bairro) || null,
    cidade:      primeiro(cliente.address_city, end.city, end.cidade) || null,
    uf:          primeiro(cliente.address_state, end.state, end.uf) || null,
  }
}

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
    .select('id, status, status_pagamento')
    .eq('pedido_appmax', pedidoAppmax)
    .maybeSingle()

  // Eventos podem chegar fora de ordem: um "pendente" atrasado não desfaz um pedido já pago.
  let statusPagamento = STATUS_PARA_PAGAMENTO[status] ?? 'pendente'
  if (vendaExistente?.status_pagamento === 'pago' && statusPagamento === 'pendente') statusPagamento = 'pago'
  const statusFinal = vendaExistente?.status === 'aprovado' && status === 'pendente' ? 'aprovado' : status

  const { sku, frascos } = inferirSku(produtos, produtoNome)
  const documento = primeiro(cliente.document_number, cliente.cpf, cliente.document, cliente.cpf_cnpj, data.customer_document).replace(/\D/g, '')

  const vendaPayload: Record<string, unknown> = {
    pedido_appmax:    pedidoAppmax,
    cliente_nome:     str(cliente.fullname ?? cliente.name ?? data.customer_name ?? ''),
    cliente_email:    str(cliente.email ?? data.customer_email ?? '').trim().toLowerCase(),
    cliente_telefone: str(cliente.telephone ?? cliente.phone ?? data.customer_phone ?? ''),
    cliente_documento: documento || null,
    ...extrairEndereco(cliente, data),
    valor_bruto:      valorBruto,
    valor_liquido:    valorLiquido,
    valor_total:      valorBruto,
    taxa,
    status:           statusFinal,
    status_pagamento: statusPagamento,
    metodo_pagamento: extrairMetodoPagamento(data),
    parcelas:         Number((data.payment as Record<string, unknown> | undefined)?.installments ?? data.installments ?? 1) || 1,
    canal,
    afiliado_codigo:  afiliadoCodigo,
    produto:          produtoNome,
    quantidade,
    sku_codigo:          sku,
    frascos_por_unidade: frascos,
    tenant_id:        PURION_TENANT_ID,
  }
  // a data da venda é a do primeiro evento; os seguintes só atualizam o status
  if (!vendaExistente) vendaPayload.data_venda = new Date().toISOString()
  // endereço vazio num evento posterior não apaga o que já veio antes
  for (const k of ['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cliente_documento']) {
    if (vendaExistente && vendaPayload[k] == null) delete vendaPayload[k]
  }

  /** Antes da migration da escada (sku_codigo/frascos_por_unidade) o upsert não pode quebrar. */
  const semColunasNovas = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === 'PGRST204' || /sku_codigo|frascos_por_unidade|cliente_documento|status_pagamento|valor_total/.test(e.message ?? ''))
  const salvar = async (dados: Record<string, unknown>) => vendaExistente
    ? db.from('vendas').update(dados).eq('id', vendaExistente.id).select('id').single()
    : db.from('vendas').insert(dados).select('id').single()

  let vendaId: string | undefined
  let { data: salvo, error: erroSalvar } = await salvar(vendaPayload)
  if (semColunasNovas(erroSalvar)) {
    const { sku_codigo: _s, frascos_por_unidade: _f, ...semEscada } = vendaPayload
    ;({ data: salvo, error: erroSalvar } = await salvar(semEscada))
  }
  if (erroSalvar) {
    console.error('[webhook/appmax] erro ao salvar venda:', erroSalvar.message)
    if (logRow) await db.from('webhook_logs').update({ status_processamento: 'erro' }).eq('id', logRow.id)
    return NextResponse.json({ ok: true, msg: 'Erro ao registrar venda (logado)' })
  }
  vendaId = salvo?.id

  // ── Carrinho a recuperar: chegou ao pagamento e não pagou (Pix/boleto vencido, cartão recusado) ──
  const emailCliente = str(vendaPayload.cliente_email)
  if (EVENTOS_CARRINHO_PERDIDO.has(evento) && emailCliente) {
    const { error: errCarrinho } = await db.from('carrinhos_abandonados').insert({
      tenant_id:   PURION_TENANT_ID,
      nome:        vendaPayload.cliente_nome || null,
      email:       emailCliente,
      telefone:    vendaPayload.cliente_telefone || null,
      etapa:       'pagamento',
      produtos:    produtos.map((p) => ({ name: str(p.name), qty: Number(p.quantity) || 1, price: num(p.price) })),
      valor_total: valorBruto,
      utm_source:  primeiro(data.utm_source, (data as { utm?: Record<string, unknown> }).utm?.source) || null,
      recuperado:  false,
    })
    if (errCarrinho) console.error('[webhook/appmax] carrinho não registrado:', errCarrinho.message)
  }
  // Pagou: qualquer carrinho em aberto do mesmo e-mail conta como recuperado
  if (statusPagamento === 'pago' && emailCliente) {
    await db.from('carrinhos_abandonados').update({ recuperado: true, atualizado_em: new Date().toISOString() })
      .eq('email', emailCliente).eq('recuperado', false)
      .then(({ error }) => { if (error) console.error('[webhook/appmax] carrinho não marcado como recuperado:', error.message) })
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

    // Notificação best-effort — nunca quebra o fluxo do webhook se falhar
    await db.from('notificacoes').insert({
      tenant_id: PURION_TENANT_ID,
      papel: 'matheus',
      tipo: 'nova_venda',
      titulo: '💰 Nova venda aprovada',
      mensagem: `${nomeCliente} — R$${valorLiquido.toFixed(2)} (${canal.toUpperCase()})`,
      canal: ['sistema'],
      link: '/vendas',
    }).then(({ error }) => { if (error) console.error('[webhook/appmax] erro ao notificar:', error.message) })
  }

  if (logRow) {
    await db.from('webhook_logs').update({ status_processamento: 'processado' }).eq('id', logRow.id)
  }

  return NextResponse.json({ ok: true, vendaId, status })
}

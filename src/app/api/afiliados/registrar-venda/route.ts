import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'

type RegistrarVendaBody = {
  afiliadoId:  string
  pedidoId:    string
  pedidoRef?:  string
  valorBruto:  number
  produtos?:   { nome: string; sku?: string; quantidade: number; valor: number }[]
  origem?:     string
  notas?:      string
}

export async function POST(req: NextRequest) {
  // ── Verificar sessão do usuário via cookies ────────────────────────────────
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    },
  )

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // ── Parsear body ──────────────────────────────────────────────────────────
  let body: RegistrarVendaBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { afiliadoId, pedidoId, pedidoRef, valorBruto, produtos, origem, notas } = body

  if (!afiliadoId || !pedidoId || typeof valorBruto !== 'number') {
    return NextResponse.json({ error: 'Campos obrigatórios: afiliadoId, pedidoId, valorBruto' }, { status: 422 })
  }

  const db = supabaseAdmin()

  // ── Buscar afiliado e verificar se pertence ao mesmo tenant do usuário ────
  const { data: perfil } = await db
    .from('perfis')
    .select('tenant_id, id')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
  }

  const { data: afiliado } = await db
    .from('afiliados')
    .select('id, tenant_id, tipo_comissao, valor_comissao')
    .eq('id', afiliadoId)
    .eq('tenant_id', perfil.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!afiliado) {
    return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 })
  }

  // ── Idempotência ───────────────────────────────────────────────────────────
  const { data: existente } = await db
    .from('afiliado_vendas')
    .select('id')
    .eq('pedido_id', pedidoId)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Pedido já registrado' }, { status: 409 })
  }

  // ── Calcular comissão ─────────────────────────────────────────────────────
  const comissaoValor = afiliado.tipo_comissao === 'percentual'
    ? valorBruto * (afiliado.valor_comissao / 100)
    : afiliado.valor_comissao

  // ── Inserir venda ─────────────────────────────────────────────────────────
  const { data: venda, error } = await db
    .from('afiliado_vendas')
    .insert({
      afiliado_id:         afiliado.id,
      tenant_id:           perfil.tenant_id,
      pedido_id:           pedidoId,
      pedido_ref:          pedidoRef ?? null,
      valor_bruto:         valorBruto,
      desconto_aplicado:   0,
      valor_liquido:       valorBruto,
      comissao_percentual: afiliado.tipo_comissao === 'percentual' ? afiliado.valor_comissao : null,
      comissao_valor:      comissaoValor,
      produtos:            produtos ?? null,
      status_venda:        'confirmada',
      status_comissao:     'pendente',
      origem:              origem ?? 'manual',
      notas:               notas ?? null,
      data_venda:          new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, venda }, { status: 201 })
}

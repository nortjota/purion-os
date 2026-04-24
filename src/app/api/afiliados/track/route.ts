import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

const LOJA_URL = 'https://puriongt.com.br'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ref         = searchParams.get('ref')
  const utmSource   = searchParams.get('utm_source')   ?? ''
  const utmMedium   = searchParams.get('utm_medium')   ?? ''
  const utmCampaign = searchParams.get('utm_campaign') ?? ''

  if (!ref) return NextResponse.redirect(LOJA_URL)

  const db = supabaseAdmin()

  const { data: afiliado } = await db
    .from('afiliados')
    .select('id, codigo, status, tenant_id')
    .eq('codigo', ref.toUpperCase())
    .eq('status', 'ativo')
    .is('deleted_at', null)
    .single()

  if (!afiliado) return NextResponse.redirect(LOJA_URL)

  // Hash SHA-256 do IP — nunca armazenar IP bruto (LGPD)
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? 'unknown'
  const ipHash = createHash('sha256').update(rawIp).digest('hex')

  const { data: clique } = await db
    .from('afiliado_cliques')
    .insert({
      afiliado_id:  afiliado.id,
      tenant_id:    afiliado.tenant_id,
      ip_hash:      ipHash,
      user_agent:   req.headers.get('user-agent'),
      referrer:     req.headers.get('referer'),
      utm_source:   utmSource,
      utm_medium:   utmMedium,
      utm_campaign: utmCampaign,
    })
    .select('id')
    .single()

  const cookiePayload = JSON.stringify({
    codigo:     afiliado.codigo,
    afiliadoId: afiliado.id,
    cliqueId:   clique?.id ?? null,
    ts:         Date.now(),
  })

  const response = NextResponse.redirect(LOJA_URL)
  response.cookies.set('purion_ref', cookiePayload, {
    maxAge:   30 * 24 * 60 * 60, // 30 dias
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: false, // precisa ser lido pelo JS da Nuvemshop
    path:     '/',
  })

  return response
}

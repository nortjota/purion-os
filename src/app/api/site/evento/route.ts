import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Porta de entrada do SITE (puriongt.com.br) no CRM.
 * O site é público e não tem sessão no Supabase, então tudo que ele envia passa por aqui:
 * o servidor valida, preenche o tenant da PURION e grava com service role.
 *
 *  POST { tipo: 'lead', email, pagina?, cupom?, utm?, ref? }        → leads_site
 *  POST { tipo: 'clique_afiliado', codigo, utm?, pagina? }          → afiliado_cliques (+ valida o código)
 *  GET  ?afiliado=CODIGO                                            → { valido, nome } (sem registrar clique)
 */

const PURION_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Origens que podem chamar (site em produção, www e previews da Vercel do site)
const ORIGENS = (process.env.SITE_ORIGINS ?? 'https://puriongt.com.br,https://www.puriongt.com.br')
  .split(',').map((o) => o.trim()).filter(Boolean)

function cors(origin: string | null) {
  const permitido = origin && (ORIGENS.includes(origin) || /^https:\/\/newpuriongt[-a-z0-9]*\.vercel\.app$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin))
  return {
    'Access-Control-Allow-Origin': permitido ? origin! : ORIGENS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

// Limite simples em memória por IP (o site é público): 30 eventos/min por instância
const janela = new Map<string, { n: number; ate: number }>()
function excedeu(ip: string): boolean {
  const agora = Date.now()
  const atual = janela.get(ip)
  if (!atual || atual.ate < agora) { janela.set(ip, { n: 1, ate: agora + 60_000 }); return false }
  atual.n++
  return atual.n > 30
}

const limpar = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function buscarAfiliado(codigo: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const db = supabaseAdmin()
  const { data } = await db
    .from('afiliados')
    .select('id, codigo, nome, tenant_id')
    .ilike('codigo', codigo)
    .eq('status', 'ativo')
    .is('deleted_at', null)
    .maybeSingle()
  return data as { id: string; codigo: string; nome: string; tenant_id: string } | null
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get('origin')) })
}

export async function GET(req: NextRequest) {
  const headers = cors(req.headers.get('origin'))
  const codigo = limpar(new URL(req.url).searchParams.get('afiliado'), 40)
  if (!codigo) return NextResponse.json({ valido: false }, { headers })
  const af = await buscarAfiliado(codigo)
  return NextResponse.json(
    af ? { valido: true, codigo: af.codigo, nome: af.nome?.split(' ')[0] ?? '' } : { valido: false },
    { headers: { ...headers, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  )
}

export async function POST(req: NextRequest) {
  const headers = cors(req.headers.get('origin'))
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'desconhecido'
  if (excedeu(ip)) return NextResponse.json({ ok: false, erro: 'muitas requisições' }, { status: 429, headers })

  let corpo: Record<string, unknown>
  try { corpo = await req.json() } catch { return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400, headers }) }

  const utm = (corpo.utm && typeof corpo.utm === 'object' ? corpo.utm : {}) as Record<string, unknown>

  if (corpo.tipo === 'lead') {
    const email = limpar(corpo.email, 160).toLowerCase()
    if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, erro: 'e-mail inválido' }, { status: 400, headers })
    const db = supabaseAdmin()
    const base = { tenant_id: PURION_TENANT_ID, email, pagina: limpar(corpo.pagina, 120) || 'home', cupom: limpar(corpo.cupom, 40) || null, utm_source: limpar(utm.source, 80) || null }
    const completo = { ...base, utm_medium: limpar(utm.medium, 80) || null, utm_campaign: limpar(utm.campaign, 120) || null, ref_afiliado: limpar(corpo.ref, 40) || null }
    // colunas utm_medium/utm_campaign/ref_afiliado vêm da migration_integracao_site.sql; sem ela, grava o básico
    let { error } = await db.from('leads_site').insert(completo)
    if (error && (error.code === 'PGRST204' || /utm_medium|utm_campaign|ref_afiliado/.test(error.message))) ({ error } = await db.from('leads_site').insert(base))
    if (error) {
      console.error('[site/evento] lead:', error.message)
      return NextResponse.json({ ok: false }, { status: 500, headers })
    }
    return NextResponse.json({ ok: true }, { headers })
  }

  if (corpo.tipo === 'clique_afiliado') {
    const codigo = limpar(corpo.codigo, 40)
    const af = codigo ? await buscarAfiliado(codigo) : null
    if (!af) return NextResponse.json({ ok: true, valido: false }, { headers })
    const db = supabaseAdmin()
    const { error } = await db.from('afiliado_cliques').insert({
      afiliado_id: af.id,
      tenant_id: af.tenant_id ?? PURION_TENANT_ID,
      ip_hash: createHash('sha256').update(ip).digest('hex'), // nunca o IP bruto (LGPD)
      user_agent: req.headers.get('user-agent'),
      referrer: limpar(corpo.pagina, 300) || req.headers.get('referer'),
      utm_source: limpar(utm.source, 80),
      utm_medium: limpar(utm.medium, 80),
      utm_campaign: limpar(utm.campaign, 120),
    })
    if (error) console.error('[site/evento] clique:', error.message)
    return NextResponse.json({ ok: true, valido: true, codigo: af.codigo, nome: af.nome?.split(' ')[0] ?? '' }, { headers })
  }

  return NextResponse.json({ ok: false, erro: 'tipo desconhecido' }, { status: 400, headers })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function makeClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

export async function GET() {
  try {
    const supabase = await makeClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ passos_concluidos: [], concluido: false })

    const { data } = await supabase
      .from('onboarding')
      .select('*')
      .eq('usuario_id', user.id)
      .single()

    return NextResponse.json(data ?? { passos_concluidos: [], concluido: false })
  } catch {
    return NextResponse.json({ passos_concluidos: [], concluido: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await makeClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const body = await req.json()
    const { passo, concluido } = body as { passo?: string; concluido?: boolean }

    const { data: existing } = await supabase
      .from('onboarding')
      .select('passos_concluidos, concluido')
      .eq('usuario_id', user.id)
      .single()

    const passos = existing?.passos_concluidos ?? []
    const novosPasosos = passo && !passos.includes(passo) ? [...passos, passo] : passos

    await supabase.from('onboarding').upsert({
      usuario_id: user.id,
      passos_concluidos: novosPasosos,
      concluido: concluido ?? existing?.concluido ?? false,
      ...(concluido ? { concluido_em: new Date().toISOString() } : {}),
    }, { onConflict: 'usuario_id' })

    return NextResponse.json({ ok: true, passos_concluidos: novosPasosos })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

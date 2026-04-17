import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Supabase service key não configurada.' }, { status: 503 })
  }

  let body: { email: string; cargo?: string; tenant_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const { email, cargo, tenant_id } = body
  if (!email || !tenant_id) {
    return NextResponse.json({ error: 'E-mail e tenant_id são obrigatórios.' }, { status: 400 })
  }

  // Use admin client with service role key
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/accept`,
    data: { tenant_id, cargo },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Pre-create perfil row so tenant isolation works before first login
  await adminClient.from('perfis').upsert({
    id: data.user.id,
    tenant_id,
    nome: email.split('@')[0],
    email,
    cargo: cargo ?? null,
    role: 'membro',
  })

  return NextResponse.json({ ok: true })
}

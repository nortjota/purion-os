import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503 })
  }

  let body: { nomeEmpresa: string; nomeAdmin: string; email: string; password: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) }

  const { nomeEmpresa, nomeAdmin, email, password } = body
  if (!nomeEmpresa || !email || !password || !nomeAdmin) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Gera slug único a partir do nome da empresa
  const slugBase = nomeEmpresa
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Garante slug único incrementando sufixo se necessário
  let slug = slugBase
  let slugOk = false
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle()
    if (!data) { slugOk = true; break }
    slug = `${slugBase}-${i + 2}`
  }
  if (!slugOk) return NextResponse.json({ error: 'Não foi possível gerar slug único.' }, { status: 500 })

  // 1. Cria o tenant
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ nome: nomeEmpresa, slug, plano: 'starter' })
    .select('id')
    .single()

  if (tenantError) {
    return NextResponse.json({ error: 'Erro ao criar empresa: ' + tenantError.message }, { status: 500 })
  }

  // 2. Cria o usuário admin no Supabase Auth
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id: tenant.id, nome: nomeAdmin, cargo: 'Admin' },
  })

  if (userError) {
    // Rollback: remove o tenant criado
    await admin.from('tenants').delete().eq('id', tenant.id)
    const msg = userError.message.includes('already registered')
      ? 'Este e-mail já está cadastrado.'
      : 'Erro ao criar usuário: ' + userError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 3. Cria o perfil admin
  const { error: perfilError } = await admin.from('perfis').upsert({
    id:        userData.user.id,
    tenant_id: tenant.id,
    nome:      nomeAdmin,
    email,
    cargo:     'Admin',
    role:      'admin',
  }, { onConflict: 'id' })

  if (perfilError) {
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + perfilError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tenantId: tenant.id, slug })
}

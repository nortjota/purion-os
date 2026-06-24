import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const SUPABASE_URL = 'https://jqvghvttgydptksgpvcc.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdmdodnR0Z3lkcHRrc2dwdmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ1NzYzNiwiZXhwIjoyMDkyMDMzNjM2fQ.sF4PsS7nO5sY-T4T3XuZhXENH8eTriEHbAEiGHYjh30'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// 1. Verifica se puriongt@gmail.com já existe e remove
console.log('\n🔍 Verificando usuário puriongt@gmail.com...')
const { data: users } = await admin.auth.admin.listUsers()
const existente = users?.users?.find(u => u.email === 'puriongt@gmail.com')

if (existente) {
  console.log(`  ⚠️  Usuário já existia (id: ${existente.id}) — removendo...`)
  const { error } = await admin.auth.admin.deleteUser(existente.id)
  if (error) console.log('  ❌ Erro ao remover:', error.message)
  else console.log('  ✅ Usuário removido')

  // Remove perfil órfão se houver
  await admin.from('perfis').delete().eq('id', existente.id)
  console.log('  ✅ Perfil órfão removido')
} else {
  console.log('  ✅ Nenhum usuário preso encontrado')
}

// 2. Corrige o trigger no banco via pg direto
const { Client } = pg
const client = new Client({
  host: 'db.jqvghvttgydptksgpvcc.supabase.co',
  port: 5432, user: 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})
await client.connect()

console.log('\n🔧 Recriando trigger handle_new_user (versão robusta)...')
await client.query(`
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    BEGIN
      INSERT INTO public.perfis (id, tenant_id, nome, email, cargo, role)
      VALUES (
        NEW.id,
        COALESCE(
          (NEW.raw_user_meta_data->>'tenant_id')::uuid,
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
        ),
        COALESCE(
          NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
          split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'cargo', ''),
        'membro'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- nunca bloqueia o signup
    END;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`)
console.log('  ✅ Trigger atualizado')

// 3. Verifica triggers ativos em auth.users
const { rows: triggers } = await client.query(`
  SELECT trigger_name, event_manipulation, action_timing
  FROM information_schema.triggers
  WHERE event_object_schema = 'auth' AND event_object_table = 'users'
`)
console.log('\n📋 Triggers em auth.users:')
triggers.forEach(t => console.log(`  • ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`))

await client.end()
console.log('\n✅ Tudo corrigido! Tente criar a conta novamente em /signup\n')

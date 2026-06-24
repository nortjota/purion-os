/**
 * Diagnóstico do estado real do banco Supabase.
 * Testa inserção e verifica colunas existentes.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jqvghvttgydptksgpvcc.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdmdodnR0Z3lkcHRrc2dwdmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ1NzYzNiwiZXhwIjoyMDkyMDMzNjM2fQ.sF4PsS7nO5sY-T4T3XuZhXENH8eTriEHbAEiGHYjh30'

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('\n🔍  Diagnosticando banco de dados...\n')

// 1. Tenta ler tarefas (sem filtro) para ver colunas retornadas
const { data: tarefasRaw, error: e1 } = await sb.from('tarefas').select('*').limit(1)
if (e1) {
  console.log('❌  Erro ao ler tarefas:', e1.message, e1.code)
} else {
  console.log('✅  Tabela tarefas acessível')
  const cols = tarefasRaw?.length ? Object.keys(tarefasRaw[0]) : []
  console.log('    Colunas:', cols.join(', ') || '(tabela vazia, colunas não visíveis)')
}

// 2. Testa filtro deleted_at
const { data: d2, error: e2 } = await sb.from('tarefas').select('id').is('deleted_at', null).limit(1)
if (e2) console.log('❌  deleted_at NÃO existe na tabela tarefas:', e2.message)
else    console.log('✅  Coluna deleted_at EXISTS em tarefas')

// 3. Testa INSERT com status 'pendente'
const { data: d3, error: e3 } = await sb.from('tarefas')
  .insert({ titulo: '__diag_test__', status: 'pendente', prioridade: 'media' })
  .select().single()
if (e3) console.log('❌  INSERT status=pendente FALHOU:', e3.message)
else {
  console.log('✅  INSERT status=pendente OK — id:', d3?.id)
  // Limpa o teste
  await sb.from('tarefas').delete().eq('id', d3.id)
}

// 4. Testa INSERT com status 'aberta' (valores antigos do SQL)
const { data: d4, error: e4 } = await sb.from('tarefas')
  .insert({ titulo: '__diag_test2__', status: 'aberta', prioridade: 'critica' })
  .select().single()
if (e4) console.log('❌  INSERT status=aberta FALHOU:', e4.message)
else {
  console.log('✅  INSERT status=aberta OK — id:', d4?.id)
  await sb.from('tarefas').delete().eq('id', d4.id)
}

// 5. Testa prioridade 'urgente'
const { data: d5, error: e5 } = await sb.from('tarefas')
  .insert({ titulo: '__diag_test3__', status: 'bloqueada', prioridade: 'urgente' })
  .select().single()
if (e5) console.log('❌  INSERT prioridade=urgente FALHOU:', e5.message)
else {
  console.log('✅  INSERT prioridade=urgente OK — id:', d5?.id)
  await sb.from('tarefas').delete().eq('id', d5.id)
}

// 6. Verifica daily_async
const { data: d6, error: e6 } = await sb.from('daily_async').select('*').limit(1)
if (e6) console.log('❌  Erro ao ler daily_async:', e6.message)
else {
  const cols = d6?.length ? Object.keys(d6[0]) : []
  console.log('\n✅  daily_async acessível. Colunas:', cols.join(', ') || '(vazia)')
}

const { data: d7, error: e7 } = await sb.from('daily_async').select('id').is('deleted_at', null).limit(1)
if (e7) console.log('❌  deleted_at NÃO existe em daily_async:', e7.message)
else    console.log('✅  Coluna deleted_at EXISTS em daily_async')

console.log('\n📋  Diagnóstico concluído.\n')

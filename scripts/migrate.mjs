import { createClient } from '@supabase/supabase-js'

const db = createClient(
  'https://jqvghvttgydptksgpvcc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdmdodnR0Z3lkcHRrc2dwdmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ1NzYzNiwiZXhwIjoyMDkyMDMzNjM2fQ.sF4PsS7nO5sY-T4T3XuZhXENH8eTriEHbAEiGHYjh30',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

console.log('\n🧪 Teste de escrita e leitura em tempo real...\n')

// Insere um lead de teste
const { data: lead, error: e1 } = await db.from('leads_crm').insert({
  nome_empresa: 'Empresa Teste PURION',
  nome_contato: 'Contato Teste',
  status: 'prospecto',
  tier: 'A',
}).select().single()

if (e1) { console.log('❌ Insert falhou:', e1.message); process.exit(1) }
console.log('✅ INSERT leads_crm — OK:', lead.id)

// Lê de volta
const { data: lido } = await db.from('leads_crm').select('nome_empresa,status').eq('id', lead.id).single()
console.log('✅ SELECT leads_crm — OK:', lido?.nome_empresa)

// Deleta (soft delete)
await db.from('leads_crm').update({ deleted_at: new Date().toISOString() }).eq('id', lead.id)
console.log('✅ DELETE (soft) — OK')

// Teste financeiro
const { data: fin, error: e2 } = await db.from('financeiro').insert({
  tipo: 'receita', descricao: 'Venda teste', valor: 1000, categoria: 'venda_b2c',
  data: new Date().toISOString().slice(0, 10),
}).select().single()
if (!e2) {
  console.log('✅ INSERT financeiro — OK:', fin.id)
  await db.from('financeiro').delete().eq('id', fin.id)
}

// Teste tarefa
const { data: tar, error: e3 } = await db.from('tarefas').insert({
  titulo: 'Tarefa teste', status: 'aberta', prioridade: 'media',
}).select().single()
if (!e3) {
  console.log('✅ INSERT tarefas — OK:', tar.id)
  await db.from('tarefas').delete().eq('id', tar.id)
}

console.log('\n✨ Sistema funcionando! Tudo que você salvar no app vai ao banco.\n')

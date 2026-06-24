/**
 * Executa a migration de schema no Supabase via conexão direta pg.
 * Uso: node scripts/run-migration.mjs
 * Variáveis necessárias:
 *   DB_PASSWORD  — senha do banco (Supabase > Settings > Database)
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'supabase-migration-fix.sql'), 'utf8')

const PROJECT_REF = 'jqvghvttgydptksgpvcc'
const DB_HOST     = `db.${PROJECT_REF}.supabase.co`
const DB_PASSWORD = process.env.DB_PASSWORD

if (!DB_PASSWORD) {
  console.error('\n❌  DB_PASSWORD não definida.')
  console.error('    Defina a senha do banco (Supabase > Settings > Database > Connection string)')
  console.error('    e execute:  DB_PASSWORD=sua-senha node scripts/run-migration.mjs\n')
  process.exit(1)
}

const client = new pg.Client({
  host: DB_HOST,
  port: 5432,
  user: 'postgres',
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

console.log(`\n🔌  Conectando em ${DB_HOST}...`)
await client.connect()
console.log('✅  Conectado!\n')
console.log('🔧  Executando migration...')

await client.query(sql)
console.log('✅  Migration concluída!')

// Confirma colunas presentes
const { rows } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'tarefas'
  ORDER BY ordinal_position
`)
console.log('\n📋  Colunas de tarefas após migration:')
rows.forEach(r => console.log(`  • ${r.column_name}  (${r.data_type})`))

await client.end()
console.log('\n🚀  Pronto! Agora as tarefas vão persistir no Vercel.\n')

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Cliente Supabase. `null` quando as variáveis de ambiente não estão
 * configuradas — os hooks verificam isso antes de qualquer chamada.
 */
export const supabase = url && key ? createClient(url, key) : null

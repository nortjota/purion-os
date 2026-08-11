import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

let _client: SupabaseClient | null = null

/**
 * Único cliente Supabase do browser em toda a aplicação — NUNCA chame
 * createBrowserClient() fora deste arquivo. Múltiplas instâncias do
 * GoTrueClient disputam a mesma trava do token de auth no localStorage
 * (erro "Lock ... was not released" / "AbortError: Lock broken by another
 * request with the 'steal' option"). Toda a UI de browser deve importar
 * `supabase` daqui.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

export const supabase = getSupabaseBrowser()

import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY:     z.string().min(1),
  NEXT_PUBLIC_APP_URL:           z.string().url().optional(),
  // Optional — ad integrations
  META_ACCESS_TOKEN:             z.string().optional(),
  META_AD_ACCOUNT_ID:            z.string().optional(),
  GOOGLE_ADS_CLIENT_ID:          z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET:      z.string().optional(),
  GOOGLE_ADS_REFRESH_TOKEN:      z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN:    z.string().optional(),
  GOOGLE_ADS_CUSTOMER_ID:        z.string().optional(),
  TIKTOK_ACCESS_TOKEN:           z.string().optional(),
  TIKTOK_ADVERTISER_ID:          z.string().optional(),
  // Optional — rate limiting
  UPSTASH_REDIS_REST_URL:        z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN:      z.string().optional(),
})

// Only validate on server (build time or runtime)
// Client bundles don't have access to server-only vars
const _env = typeof window === 'undefined'
  ? envSchema.safeParse(process.env)
  : { success: true as const, data: process.env }

if (!_env.success) {
  console.error('❌  Variáveis de ambiente ausentes ou inválidas:')
  if ('error' in _env) {
    for (const issue of _env.error.issues) {
      console.error(`    ${issue.path.join('.')}: ${issue.message}`)
    }
  }
  // Fail hard at build time so bad config never reaches production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Configuração de ambiente inválida. Veja os logs acima.')
  }
}

export const env = (_env.data ?? {}) as z.infer<typeof envSchema>
